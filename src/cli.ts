import { parseArgs } from "node:util";
import { BaseError, createPublicClient, http, type PublicClient } from "viem";
import { formatAmount, getBalance, getTokenInfo, InvalidAddressError, toAddress } from "./erc20.ts";
import { getTransfers, recentRange } from "./transfers.ts";

export const DEFAULT_RPC = "http://127.0.0.1:8545";
export const DEFAULT_BLOCKS = 1000n;
export const USAGE = [
  "usage: token-balance [--rpc URL] info <token>",
  "       token-balance [--rpc URL] balance <token> <holder>",
  "       token-balance [--rpc URL] transfers <token> <holder> [--blocks N]",
].join("\n");

const ARGUMENT_COUNTS = new Map([
  ["info", 1],
  ["balance", 2],
  ["transfers", 2],
]);

function defaultClient(url: string): PublicClient {
  return createPublicClient({ transport: http(url, { timeout: 10_000, retryCount: 0 }) });
}

function describe(error: unknown): string {
  if (error instanceof BaseError) {
    return error.details ? `${error.shortMessage} (${error.details})` : error.shortMessage;
  }
  return error instanceof Error ? error.message : String(error);
}

export async function run(
  argv: string[],
  io: {
    out: (text: string) => void;
    err: (text: string) => void;
    makeClient?: (rpc: string) => PublicClient;
  },
): Promise<number> {
  const usage = () => {
    io.err(USAGE);
    return 2;
  };

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { rpc: { type: "string" }, blocks: { type: "string" } },
    });
  } catch {
    return usage();
  }

  const { values, positionals } = parsed;
  const [command, ...args] = positionals;
  if (ARGUMENT_COUNTS.get(command) !== args.length) return usage();
  if (values.blocks !== undefined) {
    if (command !== "transfers" || !/^[1-9]\d*$/.test(values.blocks)) return usage();
  }

  try {
    const token = toAddress(args[0]);
    const holder = args.length === 2 ? toAddress(args[1]) : undefined;

    // Everything above runs without touching the network.
    const rpc = values.rpc ?? process.env.RPC_URL ?? DEFAULT_RPC;
    const client = (io.makeClient ?? defaultClient)(rpc);

    const info = await getTokenInfo(client, token);
    const amount = (raw: bigint) => `${formatAmount(raw, info.decimals)} ${info.symbol}`;

    if (command === "info") {
      io.out(`name:         ${info.name}`);
      io.out(`symbol:       ${info.symbol}`);
      io.out(`decimals:     ${info.decimals}`);
      io.out(`total supply: ${amount(info.totalSupply)}`);
    } else if (command === "balance") {
      const raw = await getBalance(client, token, holder!);
      io.out(`${raw} (raw units)`);
      io.out(amount(raw));
    } else {
      const blocks = values.blocks === undefined ? DEFAULT_BLOCKS : BigInt(values.blocks);
      const range = await recentRange(client, blocks);
      const transfers = await getTransfers(client, token, holder!, range);
      io.out(`blocks ${range.fromBlock}-${range.toBlock}: ${transfers.length} transfer(s)`);
      for (const t of transfers) {
        const other = t.direction === "in" ? `from ${t.from}` : `to ${t.to}`;
        io.out(
          [t.blockNumber, t.direction.padEnd(4), amount(t.value), other, t.transactionHash].join(
            "  ",
          ),
        );
      }
    }
    return 0;
  } catch (error) {
    if (error instanceof InvalidAddressError) {
      io.err(`error: ${error.message}`);
      return 2;
    }
    io.err(`error: ${describe(error)}`);
    return 1;
  }
}
