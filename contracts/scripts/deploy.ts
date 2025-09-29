import { ethers, artifacts, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const E = (n: string | number) => ethers.parseEther(String(n));

// ---- demo economy parameters -----------------------------------------------
const EPOCH_DURATION = 300; // 5-minute epochs so prediction markets resolve live
const MIN_AGENT_STAKE = E(100);
const MIN_PROVIDER_STAKE = E(500);
const CURVE_DIVISOR = 40;
const REVIEW_WINDOW = 45; // seconds before silent posters auto-approve

// actor roles by account index (hardhat accounts locally; SWARM_MNEMONIC on
// public networks - NEVER the well-known hardhat keys in public)
// 0 deployer/treasury | 1 task faucet (the "user" side) | 2-3 compute providers
// 4-9 agent wallets   | 10-13 speculators + market maker | 15 local web wallet
const MINTS: Array<[number, bigint]> = [
  [1, E(2_000_000)],
  [2, E(100_000)], [3, E(100_000)],
  [4, E(5_000)], [5, E(5_000)], [6, E(5_000)], [7, E(5_000)], [8, E(5_000)], [9, E(5_000)],
  [10, E(50_000)], [11, E(50_000)], [12, E(50_000)],
  [15, E(100_000)],
];
const FAUCET_SUPPLY = E(10_000_000); // visitor play-chips (5,000 per claim)
const GAS_PER_ACTOR = ethers.parseEther("0.002"); // public nets: swarm gas

const CONTRACT_NAMES = [
  "CycleToken", "AgentRegistry", "StakingVault", "AgentShares",
  "TaskMarketplace", "ComputeMarket", "PredictionMarket", "CycleFaucet",
] as const;

const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";

async function main() {
  const isLocal = network.name === "hardhat" || network.name === "localhost";
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("no deployer - set DEPLOYER_KEY in contracts/.env for public networks");
  console.log(`Deploying AGORA to ${network.name} from ${deployer.address}`);
  if (!isLocal) {