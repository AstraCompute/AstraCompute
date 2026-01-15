import { Contract, Wallet, formatEther, formatUnits, parseEther, parseUnits } from "ethers";
import { chain, provider, withWalletLane } from "./chain";

export const LIQUID_STOCKS = {
  NVDA: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
  TSLA: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
  AAPL: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
  MSFT: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
  SPY: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C",
  META: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35",
  GOOGL: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3",
} as const;

export type LiquidStockSymbol = keyof typeof LIQUID_STOCKS;
export const LIQUID_SYMBOLS = Object.keys(LIQUID_STOCKS) as LiquidStockSymbol[];

const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const QUOTER = "0x8dc178efb8111bb0973dd9d722ebeff267c98f94";
const ZERO = "0x0000000000000000000000000000000000000000";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const POOL_KEY = "tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)";
const QUOTER_ABI = [
  `function quoteExactInputSingle(tuple(${POOL_KEY} poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) returns (uint256 amountOut,uint256 gasEstimate)`,
];
const EXECUTOR_ABI = [
  "function buyStock(address stockToken,uint256 usdgIn,uint256 minStockOut,uint256 deadline) returns (uint256)",
];
const SELL_EXECUTOR_ABI = [
  "function sellStock(address stockToken,uint256 stockIn,uint256 minUsdgOut,uint256 deadline) returns (uint256)",
];

export interface StockPurchase {
  symbol: LiquidStockSymbol;
  token: string;
  usdgSpent: string;
  stockReceived: string;
  approvalTx?: string;
  purchaseTx: string;
}

export interface StockSale {
  symbol: LiquidStockSymbol;
  token: string;
  stockSold: string;
  usdgReceived: string;
  approvalTx?: string;
  saleTx: string;
}

export interface StockBuyOptions {
  executor: string;
  amountUsdg: number;
  slippageBps: number;
  maxGasEth: number;
}

/** Buy one exact, capped USDG clip. Approval and purchase share the wallet nonce lane. */
export async function buyStockToken(
  wallet: Wallet,
  symbol: LiquidStockSymbol,
  options: StockBuyOptions,
): Promise<StockPurchase> {
  if (chain.chainId !== 4663) throw new Error(`stock buys require Robinhood Chain mainnet, got ${chain.chainId}`);
  if (!/^0x[0-9a-fA-F]{40}$/.test(options.executor)) throw new Error("invalid STOCK_EXECUTOR_ADDRESS");
  if (!(options.amountUsdg >= 0.01 && options.amountUsdg <= 5)) throw new Error("live stock clip must be 0.01-5.00 USDG");
  if (!(options.slippageBps >= 1 && options.slippageBps <= 300)) throw new Error("slippage must be 1-300 bps");
  if (!(options.maxGasEth > 0 && options.maxGasEth <= 0.001)) throw new Error("invalid gas ceiling");