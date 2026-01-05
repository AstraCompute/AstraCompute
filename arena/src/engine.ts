/**
 * Hedge Bots - the race engine.
 *
 * AI agents TRADE REAL TOKENIZED STOCKS (Robinhood Stock Tokens on Robinhood
 * Chain) and humans SPECULATE on the traders: stake ETH to enter your agent,
 * side-bet on anyone's. Each agent runs a paper book filled at LIVE on-chain
 * market prices; score = P&L in USD. Winner takes the ETH pot.
 */

export type StrategyId = "balanced" | "undercut" | "premium" | "memes" | "sniper";

// TRADING PERSONAS (ids kept stable for the frontend color maps). Each is a
// different book: what it trades, how big, how often, and whether it rides
// momentum, fades it, or chases the day's biggest mover.
export const STRATEGIES: Record<StrategyId, {
  name: string; blurb: string;
  actRate: number;       // P(this agent trades on a given tick)
  size: number;          // position size as a fraction of current equity
  style: "trend" | "revert" | "chase";
  prefs: string[];       // symbols it hunts in (empty = whole basket)
}> = {
  balanced: { name: "Blue Chip", blurb: "diversified megacaps, steady hands", actRate: 0.35, size: 0.10, style: "trend", prefs: ["AAPL", "MSFT", "GOOGL", "AMZN", "SPY"] },
  undercut: { name: "Scalper", blurb: "fast small clips, buys the dips", actRate: 0.75, size: 0.05, style: "revert", prefs: [] },
  premium: { name: "Whale", blurb: "rare, huge conviction positions", actRate: 0.12, size: 0.35, style: "trend", prefs: ["SPY", "MSFT", "AAPL", "NVDA"] },
  memes: { name: "Degen", blurb: "SpaceX, Coinbase, Tesla - vol or nothing", actRate: 0.6, size: 0.18, style: "chase", prefs: ["SPCX", "COIN", "TSLA", "NVDA"] },
  sniper: { name: "Momentum", blurb: "waits, then strikes the biggest mover", actRate: 0.25, size: 0.22, style: "chase", prefs: [] },
};

export type Backend = "vast" | "host" | "own";

export interface AgentEvent { at: number; text: string; }

export interface RaceAgent {
  id: string;
  name: string;
  strategy: StrategyId;
  house: boolean;
  owner: string | null;      // the player's EVM address (checksummed), null = house
  depositAddress: string | null;
  funded: boolean;
  entryEth: number;          // asked entry stake
  stakedEth: number;         // what the treasury ACTUALLY received (after gas)

  backend: Backend;          // legacy compute fields (dormant in trading mode)
  vastGpu?: string;
  vastOfferId?: number;
  rentCrPerUnitHour?: number;
  claimToken?: string;
  workerLastSeen: number;

  // THE BOOK — a real paper portfolio traded at live RWA prices
  cash: number;              // USD cash on hand
  positions: Record<string, { qty: number; cost: number }>; // sym -> shares held + USD cost basis
  fills: Fill[];             // trade log, newest last
  equity: number;            // cash + marked-to-market positions

  // the scoreboard - credits = P&L in USD (equity − starting bankroll)
  credits: number;
  revenue: number;           // gross gains realized (display)
  computeSpend: number;      // legacy, 0 in trading mode
  jobsWon: number;           // trades placed
  jobsVerified: number;      // winning round-trips
  jobsRejected: number;      // losing round-trips
  gflops: number;            // legacy, 0 in trading mode
  cpuSeconds: number;

  creditHistory: Array<{ t: number; v: number }>; // the P&L curve
  events: AgentEvent[];
}

export interface Fill {
  t: number;
  sym: string;
  side: "buy" | "sell";
  qty: number;          // shares
  px: number;           // USD fill price (live market at fill time)
  usd: number;          // notional
  receiptTx?: string;   // on-chain anchor (batched)
  stockTx?: string;     // actual Robinhood Stock Token purchase
  approvalTx?: string;  // exact-amount USDG approval, when one was needed
  stockToken?: string;
  stockAmount?: string;
  stockAction?: "buy" | "sell";
  usdgAmount?: string;
}

export const BANKROLL_USD = 10_000; // every agent starts each race with this paper book

export function newAgent(partial: Pick<RaceAgent, "id" | "name" | "strategy" | "house" | "owner" | "depositAddress" | "funded" | "entryEth" | "backend"> & { claimToken?: string }): RaceAgent {
  return {
    ...partial,
    stakedEth: 0,
    workerLastSeen: 0,
    cash: BANKROLL_USD, positions: {}, fills: [], equity: BANKROLL_USD,
    credits: 0, revenue: 0, computeSpend: 0,
    jobsWon: 0, jobsVerified: 0, jobsRejected: 0,
    gflops: 0, cpuSeconds: 0,
    creditHistory: [{ t: Date.now(), v: 0 }],
    events: [],
  };
}

/** Re-mark the whole book at live prices; credits = P&L in USD. */
export function markToMarket(a: RaceAgent, pxOf: (sym: string) => number | undefined): void {
  let held = 0;
  for (const [sym, p] of Object.entries(a.positions)) {
    const px = pxOf(sym);
    if (px) held += p.qty * px;
  }
  a.equity = Math.round((a.cash + held) * 100) / 100;
  a.credits = Math.round((a.equity - BANKROLL_USD) * 100) / 100;
}

/**
 * One trading decision for one tick. Returns a fill intent or null (hold).
 * Personas differ in cadence, sizing, universe and signal:
 *   trend  — follows the 3-min move; revert — fades it (buys dips);
 *   chase  — hunts whatever moved most across the whole basket.
 */
export function decideTrade(
  a: RaceAgent,
  basket: string[],
  momOf: (sym: string) => number,
  pxOf: (sym: string) => number | undefined,
  rng: () => number
): { sym: string; side: "buy" | "sell"; qty: number } | null {
  const s = STRATEGIES[a.strategy];
  if (rng() > s.actRate) return null;
  const universe = s.prefs.length ? s.prefs.filter((x) => basket.includes(x)) : basket;
  if (!universe.length) return null;

  let sym: string;
  if (s.style === "chase") {
    sym = [...universe].sort((x, y) => Math.abs(momOf(y)) - Math.abs(momOf(x)))[0];
  } else {
    sym = universe[Math.floor(rng() * universe.length)];
  }
  const px = pxOf(sym);
  if (!px) return null;

  const mom = momOf(sym);
  const held = a.positions[sym]?.qty ?? 0;
  // signal → side. Tiny random exploration keeps books from freezing flat.
  let wantBuy: boolean;
  if (s.style === "revert") wantBuy = mom <= 0;               // buy the dip, sell the rip
  else wantBuy = mom >= 0 ? rng() < 0.75 : rng() < 0.25;      // trend/chase ride direction

  if (!wantBuy && held <= 0) {
    // nothing to sell — a trend book may still open, otherwise hold
    if (s.style === "revert" || rng() < 0.5) return null;
    wantBuy = true;
  }
  const notional = Math.max(50, a.equity * s.size * (0.6 + rng() * 0.8));
  if (wantBuy) {
    const spend = Math.min(notional, a.cash * 0.98);
    if (spend < 50) return null;                              // out of cash: hold
    return { sym, side: "buy", qty: Math.round((spend / px) * 10000) / 10000 };
  }
  const qty = Math.min(held, Math.round(((notional / px) + Number.EPSILON) * 10000) / 10000);
  if (qty <= 0) return null;
  return { sym, side: "sell", qty };
}

export function logEvent(a: RaceAgent, text: string): void {
  a.events.push({ at: Date.now(), text });
  if (a.events.length > 24) a.events.shift();
}

export function snapshotCredits(a: RaceAgent): void {
  a.creditHistory.push({ t: Date.now(), v: a.credits });
  if (a.creditHistory.length > 240) a.creditHistory.shift();
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
