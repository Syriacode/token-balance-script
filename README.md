# token-balance-script

TypeScript script that reads ERC-20 token balances and Transfer events using viem.

Part of my [learning roadmap](https://github.com/Syriacode/Mini-Blockchain/blob/main/ROADMAP.md).

| | |
|---|---|
| Language | typescript |
| Claude Code technique practiced | **hooks** (auto-format on edit) |

## Run it

```bash
npm ci
npm run format:check
npm run typecheck
npm test

# The first command needs Anvil (for example: anvil --fork-url https://ethereum-rpc.publicnode.com)
node src/main.ts info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
node src/main.ts --rpc https://ethereum-rpc.publicnode.com transfers 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640 --blocks 20
```

## Design decisions

- **Node runs the TypeScript directly.** Node 22.18+ strips the types at runtime, so there is no build step. `tsc` only checks types (`noEmit`).
- **`bigint` and decimals, no floats.** Raw amounts stay `bigint` and are formatted with the token's `decimals`, because a float would lose precision on 256-bit values.
- **Addresses are validated before any network call.** This includes the EIP-55 checksum on mixed-case input, so a mistyped address fails straight away. All-lowercase addresses have no checksum to check and are accepted.
- **Two `eth_getLogs` queries.** Different topic positions combine with AND, so one filter can't say "from = holder OR to = holder". One query covers the sender and one the recipient. A transfer to yourself matches both, so results are de-duplicated on `transactionHash:logIndex`.
- **Tests use a fake JSON-RPC node.** It plugs in through viem's `custom` transport, so real viem encoding and decoding runs with no network. It also records the methods called, so tests can assert that bad input makes no RPC calls.
- **`run()` returns an exit code.** `0` is success, `1` is a runtime or RPC failure, and `2` is bad usage or an invalid address. Output and the client are passed in, so tests can call it without spawning a process.
- **Formatting is enforced twice.** A Prettier PostToolUse hook formats the source files Claude Code edits (`.ts`, `.mts`, `.js`, `.mjs`, `.json`), and `format:check` in CI catches anything that didn't go through the hook. Markdown is excluded from both.

## Known limitations

- **Only the last N blocks, with no chunking.** The range goes to `eth_getLogs` as one request, so public nodes reject large ranges.
- **`latest` can be reorged.** Recent blocks aren't final, and their logs can be removed.
- **It trusts the RPC provider.** Responses aren't verified, so a dishonest or faulty node can return wrong data.
- **`bytes32` metadata fails to decode.** Tokens whose `name()` and `symbol()` return `bytes32` instead of `string` (like MKR) fail, and every command fails with them because they all read the token info first.
- **Balances are only read with `balanceOf`.** Rebasing tokens like stETH change balance without Transfer events, so the transfer history won't add up to the balance.
- **Four separate calls instead of Multicall3.** Token info takes four `eth_call` requests, which may not all read the same block.
- **No retries.** A failed or timed-out request (10 second limit) ends the command with exit code `1`.
