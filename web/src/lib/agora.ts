import { ethers } from "ethers";
import addresses from "../generated/addresses.json";
import CycleTokenAbi from "../generated/abi/CycleToken.json";
import AgentRegistryAbi from "../generated/abi/AgentRegistry.json";
import StakingVaultAbi from "../generated/abi/StakingVault.json";
import AgentSharesAbi from "../generated/abi/AgentShares.json";
import TaskMarketplaceAbi from "../generated/abi/TaskMarketplace.json";
import ComputeMarketAbi from "../generated/abi/ComputeMarket.json";
import PredictionMarketAbi from "../generated/abi/PredictionMarket.json";
import CycleFaucetAbi from "../generated/abi/CycleFaucet.json";

export const ADDR = addresses as typeof addresses & Record<string, any>;

/** Local sandbox (hardhat) uses a funded burner key; public networks use the
 *  visitor's own wallet (MetaMask etc). Reads never need a wallet at all -
 *  spectator mode is first-class. */
export const isLocalChain = Number(ADDR.chainId) === 31337;

export const provider = new ethers.JsonRpcProvider(ADDR.rpcUrl, Number(ADDR.chainId), {
  pollingInterval: isLocalChain ? 1500 : 4000,
  cacheTimeout: -1, // instant-mining local chain: never serve stale nonces
  staticNetwork: true,
});

// ---------------------------------------------------------------- signing
const MNEMONIC = "test test test test test test test test test test test junk";

let signer: ethers.Signer | null = null;
let signerAddress: string | null = null;

if (isLocalChain) {
  const node = ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/15`);
  const w = new ethers.Wallet(node.privateKey, provider);
  signer = w;
  signerAddress = w.address;
} else if ((window as any).ethereum) {
  // silent reconnect if the site was previously authorized
  (window as any).ethereum.request({ method: "eth_accounts" })
    .then(async (accounts: string[]) => {
      if (accounts.length > 0) {
        const bp = new ethers.BrowserProvider((window as any).ethereum);
        signer = await bp.getSigner();
        signerAddress = ethers.getAddress(accounts[0]);
      }
    })
    .catch(() => { /* spectator mode */ });
}

export function getAddress(): string { return signerAddress ?? ethers.ZeroAddress; }
export function isConnected(): boolean { return signerAddress !== null; }

/** Connect the visitor's wallet and make sure it's on the right chain. */
export async function connectWallet(): Promise<string> {
  if (isLocalChain) return signerAddress!;
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found - install MetaMask (metamask.io), then reload");

  const hexChainId = "0x" + Number(ADDR.chainId).toString(16);