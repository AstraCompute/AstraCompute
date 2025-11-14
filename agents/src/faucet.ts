import { ethers } from "ethers";
import { Addresses, Contracts, contractsFor, approveAll, tryTx, withRetries, E, fmt, walletAt } from "./lib/chain";
import { makeLogger, sleep, jitter, paint } from "./lib/log";
import { randomSpec, solve, resultHashOf } from "./lib/work";

const TaskStatus = { Open: 0, Assigned: 1, Submitted: 2, Completed: 3, Rejected: 4, Expired: 5, Cancelled: 6 };

/**
 * The human side of the economy, simulated:
 *  - TaskFaucet: posts paying work on an interval and VERIFIES submissions
 *    by recomputing the deterministic answer - approvals and rejections are
 *    earned, not random.
 *  - Speculators: three wallets that trade agent shares, bet the epoch
 *    earnings race, and stake CYCLE in the vault.
 *  - MarketMaker: opens one prediction market per epoch on the top agents,
 *    resolves it after the epoch, and nudges everyone to claim.
 */
export class TaskFaucet {
  private c: Contracts;
  private log: (m: string) => void;
  private posted = new Set<string>();
  private stopped = false;
  private lastPostAt = 0;

  constructor(readonly wallet: ethers.Wallet, readonly addresses: Addresses, private postEveryMs = 11_000) {
    this.c = contractsFor(wallet, addresses);
    this.log = makeLogger("TaskFaucet", "gray");
  }

  stop() { this.stopped = true; }

  async start(): Promise<void> {
    await withRetries("faucet setup", () => approveAll(this.c, this.addresses));
    this.log("open for business - posting paid work for the agent swarm");
    while (!this.stopped) {
      try {
        await this.tick();
      } catch (err: any) {
        this.log(paint.red(`tick error: ${String(err?.message ?? err).slice(0, 100)}`));
      }
      await sleep(jitter(3000));
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPostAt > this.postEveryMs) {
      this.lastPostAt = now;
      await this.postOne();
    }
    await this.reviewSubmissions();
  }

  private async postOne(): Promise<void> {
    const { spec, tags, rewardRange } = randomSpec();
    const reward = E(rewardRange[0] + Math.floor(Math.random() * (rewardRange[1] - rewardRange[0])));
    const tx = await this.c.tasks.postTask(spec, tags, reward, 20, 150);
    const receipt = await tx.wait();
    for (const log of receipt!.logs) {
      try {
        const parsed = this.c.tasks.interface.parseLog(log);
        if (parsed?.name === "TaskPosted") {
          this.posted.add(parsed.args.taskId.toString());
          this.log(`posted task #${parsed.args.taskId}: "${spec}" for ${fmt(reward)} CYCLE [${tags}]`);
        }
      } catch { /* other events */ }
    }
  }

  /** Verify each submission by recomputing the answer. Truth, on-chain. */
  private async reviewSubmissions(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    for (const key of [...this.posted]) {
      const id = BigInt(key);
      const t = await this.c.tasks.getTask(id);
      const status = Number(t.status);

      if (status === TaskStatus.Open && now >= Number(t.biddingEnds)) {
        await tryTx(() => this.c.tasks.finalizeBidding(id));
      } else if (status === TaskStatus.Assigned && now > Number(t.executionDeadline)) {
        if (await tryTx(() => this.c.tasks.expireTask(id))) {
          this.log(paint.red(`task #${id} expired - agent #${t.assignedAgentId} blew the deadline, bond burned`));
        }
      } else if (status === TaskStatus.Submitted) {
        await sleep(1500 + Math.random() * 3000); // a human glances at the result
        const expected = resultHashOf(String(t.spec), solve(String(t.spec)));
        if (t.resultHash === expected) {
          if (await tryTx(() => this.c.tasks.approveResult(id))) {
            this.log(paint.green(`task #${id} VERIFIED - paying agent #${t.assignedAgentId} ${fmt(t.winningBid)} CYCLE`));
          }
        } else {
          if (await tryTx(() => this.c.tasks.rejectResult(id, "verification failed: hash mismatch"))) {
            this.log(paint.red(`task #${id} REJECTED - agent #${t.assignedAgentId} shipped garbage, bond burned`));
          }
        }
      } else if (status >= TaskStatus.Completed) {
        this.posted.delete(key);
      }
    }
  }
}

/** Opens/resolves one earnings-race market per epoch; speculators pile in. */
export class MarketMaker {
  private c: Contracts;
  private log: (m: string) => void;
  private stopped = false;
  private marketForEpoch = new Map<string, bigint>();
  private speculators: Array<{ wallet: ethers.Wallet; c: Contracts; name: string }> = [];
  private stakerReady = false;

  constructor(readonly wallet: ethers.Wallet, readonly addresses: Addresses, provider: ethers.Provider) {
    this.c = contractsFor(wallet, addresses);
    this.log = makeLogger("Speculators", "magenta");
    for (const [i, idx] of [10, 11, 12].entries()) {
      const w = walletAt(idx, provider);
      this.speculators.push({ wallet: w, c: contractsFor(w, addresses), name: `whale-${i + 1}` });
    }
  }

  stop() { this.stopped = true; }

  async start(): Promise<void> {
    await withRetries("market maker setup", async () => {
      await approveAll(this.c, this.addresses);
      for (const s of this.speculators) await approveAll(s.c, this.addresses);
    });
    while (!this.stopped) {
      try {
        await this.tick();
      } catch (err: any) {
        this.log(paint.red(`tick error: ${String(err?.message ?? err).slice(0, 100)}`));
      }
      await sleep(jitter(6000));
    }
  }

  private async tick(): Promise<void> {
    // one-time: whale-3 stakes into the vault so fee flow is visible
    if (!this.stakerReady) {
      this.stakerReady = true;
      const s = this.speculators[2];
      if ((await this.c.vault.stakedOf(s.wallet.address)) === 0n) {
        await tryTx(() => s.c.vault.stake(E(5000)));
        this.log(`${s.name} staked 5,000 CYCLE in the vault - farming protocol fees`);
      }
    }

    const epoch: bigint = await this.c.registry.currentEpoch();
    await this.ensureMarket(epoch);
    await this.betRandomly(epoch);
    await this.resolveOldMarkets(epoch);
    await this.tradeShares();

    // permadeath with a population floor: the reaper only swings while the
    // arena is crowded (>4 alive), so it can never empty the field
    const roster = await this.c.registry.getAgents(0, 64);
    const alive = [...roster].filter((a: any) => a.active).length;
    if (alive > 4 && (await tryTx(() => this.c.registry.liquidate()))) {
      this.log(paint.bold(paint.red("THE REAPER STRUCK - the season's weakest agent was liquidated on-chain")));
    }
  }

  private async ensureMarket(epoch: bigint): Promise<void> {
    const key = epoch.toString();
    if (this.marketForEpoch.has(key)) return;
    const agents = await this.c.registry.getAgents(0, 50);
    if (agents.length < 2) return;
    const ranked = [...agents].sort((a: any, b: any) => (b.lifetimeEarnings > a.lifetimeEarnings ? 1 : -1));
    const candidates = ranked.slice(0, Math.min(4, ranked.length)).map((a: any) => a.id);
    try {
      const tx = await this.c.predict.createMarket(epoch, candidates);
      const receipt = await tx.wait();
      for (const log of receipt!.logs) {
        try {
          const parsed = this.c.predict.interface.parseLog(log);
          if (parsed?.name === "MarketCreated") {
            this.marketForEpoch.set(key, parsed.args.marketId);
            const names = await Promise.all(candidates.map(async (id: bigint) => (await this.c.registry.getAgent(id)).name));
            this.log(paint.bold(`NEW MARKET #${parsed.args.marketId}: who earns most in epoch ${epoch}? [${names.join(" vs ")}]`));
          }
        } catch { /* */ }
      }
    } catch { /* someone else may have raced us */ }
  }

  private async betRandomly(epoch: bigint): Promise<void> {
    const marketId = this.marketForEpoch.get(epoch.toString());
    if (marketId === undefined || Math.random() > 0.45) return;
    const m = await this.c.predict.getMarket(marketId);
    if (m.resolved) return;
    const spec = this.speculators[Math.floor(Math.random() * this.speculators.length)];
    // weight by current epoch earnings, with noise: momentum chasers
    const weights: number[] = [];
    for (const cand of m.candidates) {
      const e: bigint = await this.c.registry.epochEarnings(epoch, cand);
      weights.push(Number(e / E(1)) + 5 + Math.random() * 40);
    }
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let chosen = m.candidates[0];
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { chosen = m.candidates[i]; break; }
    }
    const amount = E(20 + Math.floor(Math.random() * 180));
    if (await tryTx(() => spec.c.predict.bet(marketId, chosen, amount))) {
      const name = (await this.c.registry.getAgent(chosen)).name;
      this.log(`${spec.name} bet ${fmt(amount)} CYCLE on "${name}" in market #${marketId}`);
    }
  }

  private async resolveOldMarkets(epoch: bigint): Promise<void> {
    for (const [epochKey, marketId] of [...this.marketForEpoch]) {
      if (BigInt(epochKey) >= epoch) continue;
      const m = await this.c.predict.getMarket(marketId);
      if (!m.resolved) {
        if (await tryTx(() => this.c.predict.resolve(marketId))) {
          const updated = await this.c.predict.getMarket(marketId);
          if (updated.voided) {
            this.log(`market #${marketId} voided (no earnings or unbacked winner) - refunds open`);
          } else {
            const winner = (await this.c.registry.getAgent(updated.winners[0])).name;
            this.log(paint.bold(`market #${marketId} RESOLVED: "${winner}" won epoch ${epochKey} - pool ${fmt(updated.totalPool)} CYCLE`));
          }
        }
      } else {
        for (const s of this.speculators) {
          await tryTx(() => s.c.predict.claim(marketId)); // losers revert harmlessly
        }
        this.marketForEpoch.delete(epochKey);
      }
    }
  }

  /** Momentum trading on agent shares: buy leaders, occasionally take profit. */
  private async tradeShares(): Promise<void> {
    if (Math.random() > 0.4) return;
    const agents = await this.c.registry.getAgents(0, 50);
    if (agents.length === 0) return;
    const ranked = [...agents].sort((a: any, b: any) => (b.lifetimeEarnings > a.lifetimeEarnings ? 1 : -1));
    const top = ranked.slice(0, 3);
    const spec = this.speculators[Math.floor(Math.random() * this.speculators.length)];
    const target = top[Math.floor(Math.random() * top.length)];

    const held: bigint = await this.c.shares.sharesBalance(target.id, spec.wallet.address);
    if (held > 2n && Math.random() < 0.3) {
      if (await tryTx(() => spec.c.shares.sellShares(target.id, 1))) {
        this.log(`${spec.name} took profit: sold 1 "${target.name}" share`);
      }
      return;
    }
    const amount = 1n + BigInt(Math.floor(Math.random() * 2));
    const cost: bigint = await this.c.shares.getBuyPriceAfterFee(target.id, amount);
    const balance: bigint = await this.c.cycle.balanceOf(spec.wallet.address);
    if (cost < balance / 10n) {
      if (await tryTx(() => spec.c.shares.buyShares(target.id, amount))) {
        this.log(`${spec.name} aped ${amount} share(s) of "${target.name}" for ${fmt(cost, 2)} CYCLE`);
      }
    }
  }
}
