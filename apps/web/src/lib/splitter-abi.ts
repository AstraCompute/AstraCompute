// Minimal ABI for the ProtocolFeeSplitter (0x515c1243…1aB9) — the immutable contract
// that holds the treasury's 30% (claim-only) and pushes the flywheel's 10% (autonomous).
export const splitterAbi = [
  {
    type: "function",
    name: "sweep",
    stateMutability: "nonpayable",
    inputs: [{ name: "currency", type: "address" }],
    outputs: [{ name: "toFlywheel", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimTreasury",
    stateMutability: "nonpayable",
    inputs: [{ name: "currency", type: "address" }],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "treasuryClaimable",
    stateMutability: "view",
    inputs: [{ name: "currency", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "treasuryHeld",
    stateMutability: "view",
    inputs: [{ name: "currency", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
