import assert from "node:assert/strict";
import { test } from "node:test";
import type { Address } from "viem";
import { getTransfers, recentRange } from "../src/transfers.ts";
import { fakeNode, type FakeToken } from "./fake-node.ts";

const USDC: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ALICE: Address = "0x00000000000000000000000000000000000A11cE";
const BOB: Address = "0x0000000000000000000000000000000000000B0b";
const CAROL: Address = "0x000000000000000000000000000000000000ca01";

const TOKEN: FakeToken = {
  address: USDC,
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  totalSupply: 7000000n,
  balances: {},
  transfers: [
    { block: 10n, from: BOB, to: ALICE, value: 5000000n },
    { block: 12n, from: ALICE, to: CAROL, value: 1000000n },
    { block: 12n, from: BOB, to: CAROL, value: 7n },
    { block: 15n, from: ALICE, to: ALICE, value: 3n },
    { block: 20n, from: CAROL, to: ALICE, value: 9n },
  ],
  latestBlock: 20n,
};

test("returns incoming and outgoing transfers, oldest first", async () => {
  const { client } = fakeNode(TOKEN);
  const transfers = await getTransfers(client, USDC, ALICE, { fromBlock: 0n, toBlock: 20n });
  assert.deepEqual(
    transfers.map((t) => [t.blockNumber, t.direction, t.value]),
    [
      [10n, "in", 5000000n],
      [12n, "out", 1000000n],
      [15n, "self", 3n],
      [20n, "in", 9n],
    ],
  );
});

test("ignores transfers between other accounts", async () => {
  const { client } = fakeNode(TOKEN);
  const transfers = await getTransfers(client, USDC, ALICE, { fromBlock: 0n, toBlock: 20n });
  const alice = ALICE.toLowerCase();
  assert.equal(transfers.length, 4);
  for (const t of transfers) {
    assert.ok(t.from.toLowerCase() === alice || t.to.toLowerCase() === alice);
  }
});

test("a transfer to yourself appears once", async () => {
  const { client } = fakeNode(TOKEN);
  const transfers = await getTransfers(client, USDC, ALICE, { fromBlock: 15n, toBlock: 15n });
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].direction, "self");
});

test("only returns transfers inside the block range", async () => {
  const { client } = fakeNode(TOKEN);
  const transfers = await getTransfers(client, USDC, ALICE, { fromBlock: 11n, toBlock: 19n });
  assert.deepEqual(
    transfers.map((t) => t.blockNumber),
    [12n, 15n],
  );
});

test("uses exactly two eth_getLogs queries", async () => {
  const { client, calls } = fakeNode(TOKEN);
  await getTransfers(client, USDC, ALICE, { fromBlock: 0n, toBlock: 20n });
  assert.equal(calls.filter((method) => method === "eth_getLogs").length, 2);
});

test("recentRange counts back from the latest block", async () => {
  const { client } = fakeNode(TOKEN);
  assert.deepEqual(await recentRange(client, 5n), { fromBlock: 16n, toBlock: 20n });
  assert.deepEqual(await recentRange(client, 1000n), { fromBlock: 0n, toBlock: 20n });
  await assert.rejects(recentRange(client, 0n), RangeError);
});
