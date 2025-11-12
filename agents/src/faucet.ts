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