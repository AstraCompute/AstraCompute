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