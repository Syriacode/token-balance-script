import { erc20Abi, formatUnits, isAddress, type Address, type PublicClient } from "viem";

export class InvalidAddressError extends Error {
  constructor(input: string) {
    super(`invalid address: ${JSON.stringify(input)}`);
    this.name = "InvalidAddressError";
  }
}

export function toAddress(input: string): Address {
  if (!isAddress(input)) throw new InvalidAddressError(input);
  return input;
}

export type TokenInfo = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
};

export async function getTokenInfo(client: PublicClient, token: Address): Promise<TokenInfo> {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: "name" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "totalSupply" }),
  ]);
  return { address: token, name, symbol, decimals, totalSupply };
}

export async function getBalance(
  client: PublicClient,
  token: Address,
  holder: Address,
): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [holder],
  });
}

export function formatAmount(raw: bigint, decimals: number): string {
  return formatUnits(raw, decimals);
}
