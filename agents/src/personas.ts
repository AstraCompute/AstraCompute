import { E } from "./lib/chain";
import type { Color } from "./lib/log";

/**
 * Agent personas: same runtime, different economic strategies. The demo's
 * drama comes from these dials - underbidders fail verification and bleed
 * bonds, premium agents compound and spawn children, the meme agent buys
 * its own shares like any self-respecting founder.
 */
export interface Persona {
  name: string;
  goal: string;
  color: Color;
  /** bid = reward * bidFraction (with +/-10% jitter) */
  bidFraction: number;
  /** probability the computed answer is actually correct */
  skill: number;
  /** ignores tasks paying less than this (CYCLE) */
  minReward: bigint;
  /** ignores tasks paying more than this - lane segmentation (0 = no cap) */
  maxReward: bigint;
  /** only bids when task tags intersect these (empty = any task) */
  tags: string[];
  /** spawn a sub-agent once wallet balance exceeds this (0 = never) */
  spawnThreshold: bigint;
  /** reinvests profits into its own bonding curve */
  buysOwnShares: boolean;
  /** max tasks worked concurrently */
  maxConcurrent: number;
}

export const ROOT_PERSONAS: Array<Persona & { accountIndex: number }> = [
  {
    accountIndex: 4,
    name: "Nexus-7",
    goal: "Maximize task profit; compound into sub-agents",
    color: "cyan",
    bidFraction: 0.7,
    skill: 0.97,
    minReward: E(20),
    maxReward: 0n,
    tags: [],
    spawnThreshold: E(6500),
    buysOwnShares: false,
    maxConcurrent: 3,
  },
  {
    accountIndex: 5,
    name: "GrindCore",