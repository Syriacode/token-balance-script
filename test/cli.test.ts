import assert from "node:assert/strict";
import { test } from "node:test";
import { getAddress, type Address } from "viem";
import { run } from "../src/cli.ts";
import { fakeNode, type FakeToken } from "./fake-node.ts";

const TOKEN: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ALICE: Address = "0x00000000000000000000000000000000000A11cE";
const BOB: Address = "0x0000000000000000000000000000000000000B0b";

const USDC: FakeToken = {
  address: TOKEN,
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  totalSupply: 7000000n,
  balances: { [ALICE]: 2500000n },
  transfers: [
    { block: 5n, from: BOB, to: ALICE, value: 1000000n },
    { block: 9n, from: ALICE, to: BOB, value: 250000n },
  ],
  latestBlock: 10n,
};

async function runCli(args: string[]) {
  const { client, calls } = fakeNode(USDC);
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, {
    out: (text) => out.push(text),
    err: (text) => err.push(text),
    makeClient: () => client,
  });
  return { code, out: out.join("\n"), err: err.join("\n"), calls };
}

test("bad usage prints usage and returns 2 without calling the node", async () => {
  const badArgs = [
    [],
    ["nope"],
    ["info"],
    ["info", TOKEN, "extra"],
    ["balance", TOKEN],
    ["transfers", TOKEN],
    ["transfers", TOKEN, ALICE, "--blocks", "0"],
    ["transfers", TOKEN, ALICE, "--blocks", "abc"],
    ["info", TOKEN, "--blocks", "5"],
    ["info", TOKEN, "--unknown"],
  ];
  for (const args of badArgs) {
    const { code, err, calls } = await runCli(args);
    assert.equal(code, 2, `code for ${JSON.stringify(args)}`);
    assert.match(err, /usage:/);
    assert.deepEqual(calls, []);
  }
});

test("an invalid address returns 2 without calling the node", async () => {
  const { code, err, calls } = await runCli(["balance", TOKEN, "hello"]);
  assert.equal(code, 2);
  assert.equal(err, 'error: invalid address: "hello"');
  assert.deepEqual(calls, []);
});

test("info prints the token details", async () => {
  const { code, out } = await runCli(["info", TOKEN]);
  assert.equal(code, 0);
  assert.match(out, /symbol: +USDC/);
  assert.match(out, /total supply: 7 USDC/);
});

test("balance prints raw units and the formatted amount", async () => {
  const { code, out } = await runCli(["balance", TOKEN, ALICE]);
  assert.equal(code, 0);
  assert.equal(out, "2500000 (raw units)\n2.5 USDC");
});

test("transfers prints one line per transfer in the range", async () => {
  const { code, out } = await runCli(["transfers", TOKEN, ALICE, "--blocks", "3"]);
  const lines = out.split("\n");
  assert.equal(code, 0);
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "blocks 8-10: 1 transfer(s)");
  assert.ok(
    lines[1].startsWith(`9  out   0.25 USDC  to ${getAddress(BOB)}`),
    `unexpected line: ${lines[1]}`,
  );
});

test("a node error returns 1", async () => {
  const { code, err } = await runCli(["info", BOB]);
  assert.equal(code, 1);
  assert.ok(err.startsWith("error: "), `unexpected err: ${err}`);
});
