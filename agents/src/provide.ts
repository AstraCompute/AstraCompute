import { loadAddresses, makeProvider, walletAt, contractsFor, E, fmt } from "./lib/chain";
import { HostProvider } from "./host-provider";
import { paint, sleep } from "./lib/log";

/**
 * `npm run provide` - turn THIS COMPUTER into a listed compute provider.
 *
 * Detects your real hardware, stakes CYCLE, lists your cores on the
 * ComputeMarket, confirms allocations, executes rented slices on actual
 * worker threads, and prints an earnings ticker. This is the supply-side
 * primitive: any machine, one command, on the market.
 *
 *   npm run provide -- --account 8 --price 20
 *
 * (Adapters for remote fleets - vast.ai, Akash, io.net - implement the same
 * HostProvider surface: list, confirm, execute, settle.)
 */
async function main() {
  const argv = process.argv;
  const arg = (name: string, dflt: number) => {
    const i = argv.indexOf(`--${name}`);
    return i > -1 ? Number(argv[i + 1]) : dflt;
  };
  const accountIndex = arg("account", 8);
  const price = arg("price", 20);

  const addresses = loadAddresses();
  const provider = makeProvider(addresses);
  try {
    await provider.getBlockNumber();
  } catch {
    console.error(paint.red(`chain unreachable at ${addresses.rpcUrl} - run: npm start (or npm run node + npm run deploy)`));
    process.exit(1);
  }
