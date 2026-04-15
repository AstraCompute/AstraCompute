import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { ADDR, read, write, provider, ensureApprovals, fmt, TASK_STATUS, getAddress } from "./agora";

export interface AgentRow {
  id: bigint; name: string; goal: string; wallet: string; owner: string; parentId: bigint;
  active: boolean; reputation: bigint; earnings: bigint; computeSpend: bigint;
  done: bigint; failed: bigint; epochEarnings: bigint;
  sharesSupply: bigint; sharePrice: bigint; myShares: bigint; myDividends: bigint;
}
export interface TaskRow {
  id: bigint; poster: string; spec: string; tags: string; reward: bigint;
  status: string; assignedAgentId: bigint; winningBid: bigint;
  biddingEnds: number; executionDeadline: number;
}
export interface ProviderRow {
  id: bigint; name: string; region: string; gpuModel: string;
  totalUnits: number; availableUnits: number; pricePerUnitHour: bigint;
  stake: bigint; active: boolean; totalEarned: bigint; completed: number; failed: number;
}
export interface MarketRow {
  id: bigint; epoch: bigint; resolved: boolean; voided: boolean;
  totalPool: bigint; bettingEnds: number; winners: bigint[];
  candidates: Array<{ agentId: bigint; name: string; pool: bigint; myBet: bigint }>;
  myClaimed: boolean;
}
export interface FeedItem { key: string; block: number; text: string; kind: string; }
export interface Point { t: number; v: number; }

export interface AgoraState {
  ready: boolean;
  error: string | null;
  block: number;
  epoch: { number: bigint; endsAt: number; duration: number };
  me: { address: string; balance: bigint; staked: bigint; pending: bigint; claimedFaucet: boolean };
  stats: {
    activeAgents: number; totalAgents: number; openTasks: number;
    taskVolume: bigint; computeVolume: bigint; vaultFees: bigint;
    totalStaked: bigint; tvl: bigint; utilization: number; computeIndex: bigint;
  };
  agents: AgentRow[];
  tasks: TaskRow[];
  providers: ProviderRow[];
  markets: MarketRow[];
  feesHistory: Point[];
  volumeHistory: Point[];
  events: FeedItem[];
}

const EMPTY: AgoraState = {
  ready: false, error: null, block: 0,
  epoch: { number: 0n, endsAt: 0, duration: ADDR.epochDuration },
  me: { address: getAddress(), balance: 0n, staked: 0n, pending: 0n, claimedFaucet: false },
  stats: { activeAgents: 0, totalAgents: 0, openTasks: 0, taskVolume: 0n, computeVolume: 0n, vaultFees: 0n, totalStaked: 0n, tvl: 0n, utilization: 0, computeIndex: 0n },
  agents: [], tasks: [], providers: [], markets: [], feesHistory: [], volumeHistory: [], events: [],
};

async function fetchSnapshot(prev: AgoraState, lastBlockRef: { v: number }, events: FeedItem[]): Promise<AgoraState> {
  const me = getAddress(); // burner locally; the visitor's wallet (or zero = spectator) in public
  const block = await provider.getBlockNumber();
  const [epochNum, agentsRaw, openIds, taskCount, providersRaw, marketCount] = await Promise.all([
    read.registry.currentEpoch(),
    read.registry.getAgents(0, 60),
    read.tasks.getOpenTaskIds(),
    read.tasks.taskCount(),