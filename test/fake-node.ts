import {
  createPublicClient,
  custom,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  erc20Abi,
  numberToHex,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

export type FakeTransfer = { block: bigint; from: Address; to: Address; value: bigint };

export type FakeToken = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  balances: Record<Address, bigint>;
  transfers: FakeTransfer[];
  latestBlock: bigint;
};

type LogFilter = {
  address?: Address;
  fromBlock?: Hex;
  toBlock?: Hex;
  topics?: (Hex | null)[];
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function fakeNode(token: FakeToken): { client: PublicClient; calls: string[] } {
  const calls: string[] = [];

  function answerCall({ to, data }: { to: Address; data: Hex }): Hex {
    if (!same(to, token.address)) return "0x";
    const call = decodeFunctionData({ abi: erc20Abi, data });
    switch (call.functionName) {
      case "name":
        return encodeFunctionResult({ abi: erc20Abi, functionName: "name", result: token.name });
      case "symbol":
        return encodeFunctionResult({
          abi: erc20Abi,
          functionName: "symbol",
          result: token.symbol,
        });
      case "decimals":
        return encodeFunctionResult({
          abi: erc20Abi,
          functionName: "decimals",
          result: token.decimals,
        });
      case "totalSupply":
        return encodeFunctionResult({
          abi: erc20Abi,
          functionName: "totalSupply",
          result: token.totalSupply,
        });
      case "balanceOf": {
        const [holder] = call.args;
        const entry = Object.entries(token.balances).find(([address]) => same(address, holder));
        return encodeFunctionResult({
          abi: erc20Abi,
          functionName: "balanceOf",
          result: entry?.[1] ?? 0n,
        });
      }
      default:
        throw new Error(`fake node: unsupported function ${call.functionName}`);
    }
  }

  function answerLogs(filter: LogFilter) {
    const fromBlock = filter.fromBlock?.startsWith("0x") ? BigInt(filter.fromBlock) : 0n;
    const toBlock = filter.toBlock?.startsWith("0x") ? BigInt(filter.toBlock) : token.latestBlock;
    if (filter.address && !same(filter.address, token.address)) return [];

    return token.transfers
      .map((transfer, index) => ({
        block: transfer.block,
        log: {
          address: token.address,
          topics: encodeEventTopics({
            abi: erc20Abi,
            eventName: "Transfer",
            args: { from: transfer.from, to: transfer.to },
          }) as Hex[],
          data: encodeAbiParameters([{ type: "uint256" }], [transfer.value]),
          blockNumber: numberToHex(transfer.block),
          blockHash: numberToHex(transfer.block, { size: 32 }),
          transactionHash: numberToHex(index + 1, { size: 32 }),
          transactionIndex: "0x0",
          logIndex: numberToHex(index),
          removed: false,
        },
      }))
      .filter(({ block }) => block >= fromBlock && block <= toBlock)
      .filter(({ log }) =>
        (filter.topics ?? []).every((topic, i) => topic == null || same(topic, log.topics[i])),
      )
      .map(({ log }) => log);
  }

  const transport = custom(
    {
      async request({ method, params }: { method: string; params?: unknown }) {
        calls.push(method);
        switch (method) {
          case "eth_chainId":
            return "0x7a69";
          case "eth_blockNumber":
            return numberToHex(token.latestBlock);
          case "eth_call":
            return answerCall((params as [{ to: Address; data: Hex }])[0]);
          case "eth_getLogs":
            return answerLogs((params as [LogFilter])[0]);
          default:
            throw new Error(`fake node: unsupported method ${method}`);
        }
      },
    },
    { retryCount: 0 },
  );

  return { client: createPublicClient({ transport }), calls };
}
