import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { chain, detectChain, decodeSecret, drainTo, getBalanceEth, ethToWei, validAddress, Wallet } from "./chain";

/**
 * HARVEST — move the house money to ANY wallet you choose, when you choose.
 * The operations wallet named in day-to-day txs is disposable; your real
 * treasury stays unnamed on-chain until the moment you run this.
 *
 *   npm run sweep -- --to <ADDRESS>              drain ops treasury (keeps 0.0005 ETH for gas)
 *   npm run sweep -- --to <ADDRESS> --eth 0.05   send a fixed amount instead
 *   npm run sweep -- --to <ADDRESS> --agents     ALSO drain the 5 agent wallets
 *   npm run sweep -- --to <ADDRESS> --keep 0.001 keep a different gas reserve
 */

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] ?? "" : null;
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function drain(from: Wallet, to: string, label: string, keepEth: number, fixedEth?: number): Promise<void> {
  const bal = await getBalanceEth(from.address);
  const r = await drainTo(from, to, {
    keepWei: ethToWei(keepEth),
    fixedWei: fixedEth !== undefined ? ethToWei(fixedEth) : undefined,
  });
  if (!r) { console.log(`  ${label.padEnd(14)} ${bal.toFixed(6)} ETH — nothing to sweep`); return; }
  console.log(`  ${label.padEnd(14)} sent ${r.ethMoved.toFixed(6)} ETH -> ${to.slice(0, 10)}…  tx ${r.hash.slice(0, 18)}…`);
}
