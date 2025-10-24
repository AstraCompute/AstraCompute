import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployProtocol, registerAgent, E, EPOCH_DURATION, CURVE_DIVISOR } from "./helpers";

describe("AgentShares", () => {
  it("prices on a sum-of-squares curve and only the registry can init", async () => {
    const f = await loadFixture(deployProtocol);
    await expect(f.shares.connect(f.poster).initShares(99, f.poster.address)).to.be.revertedWith(
      "shares: not registry"
    );
    // supply 1, buy 1 -> 1^2 / 40 CYCLE
    expect(await f.shares.getPrice(1, 1)).to.equal(E(1) / CURVE_DIVISOR);
    // supply 1, buy 3 -> (1+4+9)/40
    expect(await f.shares.getPrice(1, 3)).to.equal((E(1) * 14n) / CURVE_DIVISOR);
    // monotonic in supply
    expect(await f.shares.getPrice(10, 1)).to.be.greaterThan(await f.shares.getPrice(9, 1));
  });

  it("buys route fees to the vault and the agent; reserve tracks the curve", async () => {
    const f = await loadFixture(deployProtocol);
    await registerAgent(f.registry, f.agentOwner, f.agentWallet1);
    await expect(f.shares.connect(f.speculator1).buyShares(99, 1)).to.be.revertedWith("shares: not initialized");

    const price = await f.shares.getBuyPrice(1, 4); // supply 1 -> (1+4+9+16)/40 = 0.75
    expect(price).to.equal(E(0.75));
    const protoFee = (price * 250n) / 10_000n;
    const subjFee = (price * 500n) / 10_000n;

    const buyerBefore = await f.cycle.balanceOf(f.speculator1.address);
    const walletBefore = await f.cycle.balanceOf(f.agentWallet1.address);
    const vaultBefore = await f.vault.totalFeesReceived();

    await f.shares.connect(f.speculator1).buyShares(1, 4);

    expect(await f.cycle.balanceOf(f.speculator1.address)).to.equal(buyerBefore - price - protoFee - subjFee);
    expect(await f.cycle.balanceOf(f.agentWallet1.address)).to.equal(walletBefore + subjFee);
    expect((await f.vault.totalFeesReceived()) - vaultBefore).to.equal(protoFee);
    expect(await f.shares.sharesSupply(1)).to.equal(5n);
    expect(await f.shares.reserveOf(1)).to.equal(price);
  });

  it("sell returns curve value minus fees; the genesis share can never be sold", async () => {
    const f = await loadFixture(deployProtocol);
    await registerAgent(f.registry, f.agentOwner, f.agentWallet1);
    await f.shares.connect(f.speculator1).buyShares(1, 4);

    await expect(f.shares.connect(f.speculator1).sellShares(1, 5)).to.be.revertedWith("shares: insufficient");
    // agentOwner holds only the genesis share; selling it would zero supply
    await f.shares.connect(f.speculator1).sellShares(1, 4);
    await expect(f.shares.connect(f.agentOwner).sellShares(1, 1)).to.be.revertedWith(
      "shares: cannot sell last share"
    );

    // roundtrip drains the reserve exactly
    expect(await f.shares.reserveOf(1)).to.equal(0n);
    expect(await f.shares.sharesSupply(1)).to.equal(1n);
  });

  it("streams dividends pro-rata to holders at deposit time", async () => {
    const f = await loadFixture(deployProtocol);
    await registerAgent(f.registry, f.agentOwner, f.agentWallet1);