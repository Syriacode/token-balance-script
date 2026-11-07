import { erc20Abi, type Address, type Hash, type PublicClient } from "viem";

export type Direction = "in" | "out" | "self";

export type Transfer = {
  blockNumber: bigint;
  logIndex: number;
  transactionHash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  direction: Direction;
};

export type BlockRange = { fromBlock: bigint; toBlock: bigint };

function directionOf(from: Address, to: Address, holder: Address): Direction {
  const isFrom = from.toLowerCase() === holder.toLowerCase();
  const isTo = to.toLowerCase() === holder.toLowerCase();
  if (isFrom && isTo) return "self";
  return isFrom ? "out" : "in";
}

/**
 * Returns the holder's Transfer events in the range, oldest first.
 *
 * This takes two queries because eth_getLogs combines different topic positions with AND. One
 * filter can say "from = holder" or "to = holder", but not "from = holder OR to = holder". A
 * transfer to yourself matches both queries, so results are merged by transaction hash and log
 * index to keep it from appearing twice.
 */
export async function getTransfers(
  client: PublicClient,
  token: Address,
  holder: Address,
  range: BlockRange,
): Promise<Transfer[]> {
  const query = { address: token, abi: erc20Abi, eventName: "Transfer", strict: true } as const;
  const { fromBlock, toBlock } = range;
  const [sent, received] = await Promise.all([
    client.getContractEvents({ ...query, fromBlock, toBlock, args: { from: holder } }),
    client.getContractEvents({ ...query, fromBlock, toBlock, args: { to: holder } }),
  ]);

  const merged = new Map<string, Transfer>();
  for (const log of [...sent, ...received]) {
    const { from, to, value } = log.args;
    merged.set(`${log.transactionHash}:${log.logIndex}`, {
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      transactionHash: log.transactionHash,
      from,
      to,
      value,
      direction: directionOf(from, to, holder),
    });
  }

  return [...merged.values()].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
    return a.logIndex - b.logIndex;
  });
}

export async function recentRange(client: PublicClient, blocks: bigint): Promise<BlockRange> {
  if (blocks < 1n) throw new RangeError(`blocks must be at least 1, got ${blocks}`);
  const toBlock = await client.getBlockNumber();
  const fromBlock = toBlock - blocks + 1n;
  return { fromBlock: fromBlock < 0n ? 0n : fromBlock, toBlock };
}
