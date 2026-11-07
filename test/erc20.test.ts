import assert from "node:assert/strict";
import { test } from "node:test";
import type { Address } from "viem";
import {
  formatAmount,
  getBalance,
  getTokenInfo,
  InvalidAddressError,
  toAddress,
} from "../src/erc20.ts";
import { fakeNode, type FakeToken } from "./fake-node.ts";

const USDC: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ALICE: Address = "0x00000000000000000000000000000000000A11cE";
const BOB: Address = "0x0000000000000000000000000000000000000B0b";

const TOKEN: FakeToken = {
  address: USDC,
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  totalSupply: 7000000n,
  balances: { [ALICE]: 2500000n },
  transfers: [],
  latestBlock: 20n,
};

test("getTokenInfo reads name, symbol, decimals and total supply", async () => {
  const { client } = fakeNode(TOKEN);
  assert.deepEqual(await getTokenInfo(client, USDC), {
    address: USDC,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    totalSupply: 7000000n,
  });
});

test("getBalance returns the raw amount as a bigint", async () => {
  const { client } = fakeNode(TOKEN);
  assert.equal(await getBalance(client, USDC, ALICE), 2500000n);
  assert.equal(await getBalance(client, USDC, BOB), 0n);
});

test("formatAmount uses the token's decimals", () => {
  assert.equal(formatAmount(2500000n, 6), "2.5");
  assert.equal(formatAmount(1n, 18), "0.000000000000000001");
  assert.equal(formatAmount(2500000n, 18), "0.0000000000025");
  assert.equal(formatAmount(123456789012345678901234567890n, 18), "123456789012.34567890123456789");
});

test("toAddress accepts lowercase and correctly checksummed addresses", () => {
  for (const input of [
    "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  ]) {
    assert.equal(toAddress(input), input);
  }
});

test("toAddress rejects bad input before any network call", () => {
  for (const input of [
    "",
    "hello",
    "0x1234",
    "0xZZZZ6BF26964aF9D7eEd9e03E53415D37aA96045",
    "0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  ]) {
    assert.throws(() => toAddress(input), InvalidAddressError);
  }
});
