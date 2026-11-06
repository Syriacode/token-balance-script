# Week 1 Fri — Token balance script (step-by-step guide)

**Goal:** build a small TypeScript command-line script with **viem** that reads any ERC-20 token: its name, symbol,
decimals and supply, a holder's balance, and the holder's recent `Transfer` events. Then you run it against a
**fork of Ethereum mainnet** on your own machine, move real USDC around with play money, and watch your script see it.

**Why this project:** most onchain products have a TypeScript layer: wallets, dashboards, scripts, support tools.
viem is the library most new TypeScript projects use for it. Today you also learn the two ways to read a chain:
**calling a view function** (what is the balance now?) and **reading event logs** (what happened?). The Week 2
indexer, the reserve service and the dApp front end all build on this.

| Job requirement | Where you practice it |
|---|---|
| TypeScript, APIs, explaining tech to customers (Alchemy Solutions, PwC) | Every step, Step 6 |
| Reading onchain data: ERC-20 calls and event logs (Coinbase Data Foundations) | Steps 3, 4, 6 |
| Correct money handling (Coinbase Stablecoins, Payments) | Step 3 (bigint and decimals) |
| *Well-tested code* | Steps 3, 4, 5 (a fake node, break-it test) |
| *Uses generative AI responsibly, with human oversight* | Step 2 (hooks), "You check" in every step |

**Claude Code technique today: hooks (auto-format on edit).** So far you've controlled Claude with *words*:
prompts and `CLAUDE.md`. Claude follows those most of the time, but not every time. A **hook** is a command that
Claude Code itself runs at a fixed moment, such as right after Claude edits a file, **every time**. Today's hook
formats every file Claude writes. That's three things you get:

1. **Every file comes out formatted,** so you never review formatting noise in a diff.
2. **The hook can talk back.** If a file has a syntax error, the hook tells Claude, and Claude fixes it.
3. **It's a file in the repo,** so it's versioned in git and works the same in every session.

**Time:** about 90 minutes. It's free. You read real mainnet, but every transaction runs on your local fork with
play money.

---

## How to use this guide with Claude Code

Every step has the same five parts:

- **Learn:** the concept, in a few sentences. Read it before prompting.
- **Prompt:** what to type into Claude Code. Use **plan mode** (`Shift+Tab` until the status bar shows
  `⏸ plan mode on`), read the plan, then approve it.
- **You check:** what *you* verify before accepting. Each check names the file and function to open.
- **Done when:** a command whose output proves the step works.
- **Commit:** the commit message to use. Ask Claude to commit, or run it yourself.

A leading `!` in the Claude Code prompt runs a shell command, as in `!npm test`.

Your permission rules already allow `npm test`, `git add` and `git commit`. Claude will ask before `npm install`,
`npm pkg`, `npm run ...` and `node ...`. Approve those.

Line numbers, hashes and exact wording in Claude's replies will differ from the examples here. Test names and test
counts should match, as long as you keep the prompts as written.

---

## Step 0 — Check your tools, create the repo, add this guide (10 min)

**Learn.** Node.js can now run TypeScript files directly. It **strips** the type annotations and runs what's left,
with no build step. That needs Node **22.18 or newer**. It doesn't *check* the types, though. That's the job of the
TypeScript compiler, `tsc`, which you'll run separately.

**Do it:** in Git Bash, check your tools:

```bash
node --version
npm --version
anvil --version
cast --version
```

You need Node **v22.18.0 or newer** (v24 is best). If yours is older, or `node` isn't found, run this, then open a
**new** Git Bash window and check again:

```bash
winget install OpenJS.NodeJS.LTS
```

Now go to the folder where you keep your project repos (**not** inside another git repo), then:

```bash
claude
```

**Prompt:**
> /new-project Week 1 Fri – Token balance script

When it proposes a name, accept **`token-balance`**. Confirm the language is **`typescript`**. Approve the
`npm install`, `gh repo create` and `git push` prompts when they appear.

When it finishes and reports green CI, quit Claude Code (`/exit`), then:

```bash
cd token-balance
```

Save **this file** as `GUIDE.md` in the `token-balance` folder. Then:

```bash
claude
```

**Prompt:**
> Commit GUIDE.md.

**You check:** `!git log --oneline` shows two commits. Open `package.json`: the `"test"` script is `"node --test"`.

**Done when:** `!npm test` ends with `# pass 0` and `# fail 0`. There are no tests yet, and that's fine.

**Commit:** `Add GUIDE.md`

---

## Step 1 — TypeScript, viem and Prettier (10 min)

**Learn.**
- **viem** is a TypeScript library for talking to Ethereum nodes. It knows the standard ERC-20 ABI, encodes your
  calls, and decodes the answers into typed values.
- **`bigint`** is JavaScript's whole number of any size, written with an `n` at the end: `10n ** 18n`. A normal
  JavaScript `number` is a float and loses precision above about 9 × 10¹⁵. That's the same trap as `float64` in
  Wednesday's Go project. viem returns every token amount as a `bigint`.
- **`"type": "module"`** in `package.json` means files use `import` and `export`, not `require`.
- **`tsconfig.json`** settings that make TypeScript fit Node's type stripping: `noEmit` (tsc only checks, Node runs the
  files), `allowImportingTsExtensions` (imports end in `.ts`), `verbatimModuleSyntax` (type-only imports must say
  `import type`, so Node knows to strip them), and `erasableSyntaxOnly` (forbids `enum` and other syntax Node can't
  just strip).
- **Prettier** is the standard code formatter for TypeScript, JSON and more. Step 2 hooks it up to Claude.
- **`node --test` with no pattern runs every file inside a `test/` folder,** including helpers that aren't tests.
  The pattern `"test/**/*.test.ts"` limits it to real test files. The quotes matter: they pass the pattern to Node
  instead of letting the shell expand it.

**Prompt (plan mode):**
> Set up this project for TypeScript run directly by Node. Run exactly these commands:
> - `npm install viem@2.57.16`
> - `npm install --save-dev typescript@7.0.2 @types/node@22 prettier@3.9.10`
> - `npm pkg set type=module`
> - `npm pkg delete main`
> - `npm pkg set scripts.typecheck="tsc" scripts.format="prettier --write ." scripts.format:check="prettier --check ."`
> - `npm pkg set 'scripts.test=node --test "test/**/*.test.ts"'`
>
> Then create these three files with exactly this content.
>
> tsconfig.json:
> ```json
> {
>   "compilerOptions": {
>     "target": "es2023",
>     "module": "nodenext",
>     "strict": true,
>     "noEmit": true,
>     "allowImportingTsExtensions": true,
>     "verbatimModuleSyntax": true,
>     "erasableSyntaxOnly": true,
>     "types": ["node"],
>     "skipLibCheck": true
>   },
>   "include": ["src", "test"]
> }
> ```
>
> .prettierrc.json:
> ```json
> { "printWidth": 100 }
> ```
>
> .prettierignore:
> ```text
> package-lock.json
> *.md
> ```
>
> Then run npm test and npm run format:check. Don't create any .ts files yet.

**You check:**
- `package.json`: `"type": "module"`, four scripts (`test` is now `node --test \"test/**/*.test.ts\"`, plus
  `typecheck`, `format` and `format:check`), `viem` under
  `dependencies`, and the other three under `devDependencies`. Ask Claude: *"Why is viem a dependency but typescript
  a devDependency?"*
- `.prettierignore` skips all Markdown. Ask Claude: *"What would happen to GUIDE.md and README.md if I removed the
  `*.md` line?"* (Prettier would rewrap them, and your diffs would fill up with changes you never made.)
- Don't run `npm run typecheck` yet. With no `.ts` files it fails with `TS18003: No inputs were found`. That goes away
  in Step 3.

**Done when:** `!npm test` ends with `# fail 0`, and `!npm run format:check` prints
`All matched files use Prettier code style!`

**Commit:** `Set up TypeScript, viem and Prettier`

---

## Step 2 — The hook: format every file Claude writes (15 min)

**Learn (Claude Code).**
- **Hooks live in a settings file.** `.claude/settings.json` in the repo is shared through git.
  `~/.claude/settings.json` applies to all your projects. (`.claude/settings.local.json` is for you only, and isn't
  committed.)
- **An event says *when* it runs.** `PreToolUse` runs before Claude uses a tool, and can block it. `PostToolUse`
  runs after a tool succeeded. Others include `Stop`, when Claude finishes its reply.
- **A matcher says *which tools*.** `"Edit|Write"` matches Claude's two file-editing tools. A file changed through a
  `Bash` command (`sed`, `echo >`) doesn't match, and a file *you* change in your editor never triggers a hook at all.
- **The command gets a JSON description of the tool call on stdin.** For an edit, `tool_input.file_path` is the file.
  `$CLAUDE_PROJECT_DIR` holds the project's root folder, so the command works from any working directory.
- **The exit code is the answer.** `0` means fine. `2` means "tell Claude": for `PostToolUse` the file is already
  written, so Claude gets your stderr message as feedback, and can fix the problem. Any other code is shown to you as
  a hook error, and Claude doesn't see it.
- On Windows, Claude Code runs hook commands with Git Bash.

> ℹ️ Why a Node script instead of `npx prettier --write`? `npx` starts slowly on Windows, and this hook runs after
> every single edit. Loading Prettier as a library in one `node` process is much faster, and the same file works on
> Windows, macOS and Linux.

**Prompt (plan mode):**
> Create .claude/hooks/format-on-edit.mjs with exactly this content:
>
> ```js
> // PostToolUse hook: formats the file Claude just wrote or edited with Prettier.
> // Claude Code sends a JSON description of the tool call on stdin.
> import { readFile, writeFile } from "node:fs/promises";
> import path from "node:path";
> import * as prettier from "prettier";
>
> const FORMATTED = new Set([".ts", ".mts", ".js", ".mjs", ".json"]);
>
> let input = "";
> for await (const chunk of process.stdin) input += chunk;
> const event = JSON.parse(input);
>
> const filePath = event.tool_input?.file_path;
> const projectDir = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
>
> // Only touch source files inside this project.
> if (!filePath || !FORMATTED.has(path.extname(filePath))) process.exit(0);
> const relative = path.relative(projectDir, filePath);
> if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);
>
> const ignorePath = path.join(projectDir, ".prettierignore");
> const info = await prettier.getFileInfo(filePath, { ignorePath });
> if (info.ignored) process.exit(0);
>
> const source = await readFile(filePath, "utf8");
> const options = (await prettier.resolveConfig(filePath)) ?? {};
> try {
>   const formatted = await prettier.format(source, { ...options, filepath: filePath });
>   if (formatted !== source) await writeFile(filePath, formatted);
> } catch (error) {
>   // Exit code 2 sends stderr back to Claude, so it sees the problem and can fix it.
>   console.error(`Prettier could not format ${relative}:\n${error.message}`);
>   process.exit(2);
> }
> ```
>
> And .claude/settings.json with exactly this content:
>
> ```json
> {
>   "hooks": {
>     "PostToolUse": [
>       {
>         "matcher": "Edit|Write",
>         "hooks": [
>           {
>             "type": "command",
>             "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format-on-edit.mjs",
>             "timeout": 30
>           }
>         ]
>       }
>     ]
>   }
> }
> ```
>
> Then add this section to @CLAUDE.md under "How to work with me":
>
> ### Hooks
> - A PostToolUse hook (.claude/hooks/format-on-edit.mjs) runs Prettier on every file you write or edit. Don't format
>   files by hand or run Prettier yourself.
> - If the hook reports an error, fix the syntax error it names before doing anything else.
>
> Run npm run format:check.

**You check:** open `.claude/hooks/format-on-edit.mjs` and follow the path of one event, top to bottom.
- The `FORMATTED` set and the `path.relative` check. Ask Claude: *"Which files does this hook leave alone, and why
  should a hook ever skip a file outside the project?"*
- The `catch` block uses `process.exit(2)` and writes to `console.error`. Ask: *"What would change if this were
  `process.exit(1)`?"* (You'd see an error notice, but Claude wouldn't get the message, so it couldn't fix anything.)
- `.claude/settings.json`: `"$CLAUDE_PROJECT_DIR"` is in **escaped quotes**. Ask: *"What breaks without them if my
  project folder has a space in its path?"*

**2a. Test the hook by hand, before trusting Claude Code to run it.** A hook is just a program that reads JSON. So
you can feed it the same JSON Claude Code would. Quit Claude Code (`/exit`). In Git Bash, in `token-balance`:

```bash
P=$(pwd -W)
mkdir -p src
printf 'export   const x = {a:1,b:2}\n' > src/ugly.ts
echo "{\"tool_input\":{\"file_path\":\"$P/src/ugly.ts\"}}" | CLAUDE_PROJECT_DIR="$P" node .claude/hooks/format-on-edit.mjs; echo "exit $?"
cat src/ugly.ts
```

`pwd -W` gives the Windows form of the path (`C:/Users/...`), which is what Claude Code sends. Expect `exit 0`, and
the file now reads `export const x = { a: 1, b: 2 };`

Now a file with a syntax error:

```bash
printf 'export const y = {\n' > src/ugly.ts
echo "{\"tool_input\":{\"file_path\":\"$P/src/ugly.ts\"}}" | CLAUDE_PROJECT_DIR="$P" node .claude/hooks/format-on-edit.mjs; echo "exit $?"
rm src/ugly.ts
```

Expect `Prettier could not format src/ugly.ts:` and `'}' expected. (2:1)`, then `exit 2`. That message is what
Claude will see.

**2b. Watch Claude Code run it.** Start Claude Code again, so it loads the new settings file:

```bash
claude
```

Type `/hooks`. You should see `PostToolUse`, and under it the `Edit|Write` matcher with your `node` command. Press
`Esc` to close it.

**Prompt (no plan mode needed):**
> Create src/scratch.ts containing exactly this one line, with the spacing exactly as written. Don't format it
> yourself: `export   const   answer={value:42}`

Then:

```text
!cat src/scratch.ts
```

Expect `export const answer = { value: 42 };`. Claude wrote the ugly version, and the hook fixed it.

**Now the feedback path:**
> Replace the whole content of src/scratch.ts with exactly this one line, and don't fix anything:
> `export const answer = {value: 42`

Watch Claude's reply. It should mention the Prettier error from the hook (`'}' expected`), and then fix the file.
That's exit code 2 at work: the hook found a problem, and Claude acted on it without you saying a word. Check:

```text
!cat src/scratch.ts
```

> ℹ️ If Claude says a file *changed since it last read it*, that's the hook: it rewrote the file after Claude's edit.
> Claude reads the file again and carries on. That's normal with formatting hooks.

**2c. Find the hook's blind spot.** Open `src/scratch.ts` in **your editor**, change it by hand to
`export const answer={value:43}`, and save. Then:

```text
!npm run format:check
```

Expect `[warn] src/scratch.ts`. The hook didn't run, because hooks only run on Claude's tool calls. Your own edits,
and anything changed through `Bash`, skip it. That's why Step 5 also puts `format:check` in **CI**: the hook keeps
Claude's code clean as it's written, and CI catches everything else. Now clean up:

```text
!rm src/scratch.ts
```

**Done when:** `!npm run format:check` prints `All matched files use Prettier code style!`, and `!git status` shows
`CLAUDE.md` modified and a new `.claude/` folder, and nothing else.

**Commit:** `Add a PostToolUse hook that formats every file Claude edits`

---

## Step 3 — Read an ERC-20 token, tested against a fake node (15 min)

**Learn (blockchain).**
- **ERC-20** is the standard token interface. Today you use its view functions: `name()`, `symbol()`, `decimals()`,
  `totalSupply()` and `balanceOf(address)`.
- **Amounts are whole numbers.** `decimals` only says where the decimal point goes. USDC has **6**, so a raw balance
  of `2500000` means **2.5 USDC**. Most tokens, and ETH, use 18. Mixing them up is a classic money bug.
- **A read is an `eth_call`.** The call data starts with a 4-byte **function selector**, the first 4 bytes of the
  keccak hash of the function signature, followed by the arguments, each padded to 32 bytes. Try it:

  ```text
  !cast sig "balanceOf(address)"
  !cast calldata "balanceOf(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  ```

  The first prints `0x70a08231`. The second is that selector followed by the address, padded with zeros.
- **EIP-55 checksums.** An address with mixed upper and lower case letters carries a checksum in its capitalization.
  viem's `isAddress` checks it. Wednesday's Go tool (`IsHexAddress`) didn't. That was one of your Known limitations,
  and today it's fixed.

**Learn (testing).** On Wednesday you faked the *Go interface*. Today you fake the **node itself**. viem lets you
plug in a `custom` transport: a function that receives each JSON-RPC request (`eth_call`, `eth_getLogs`, ...) and
returns the answer. Your production code runs unchanged, including viem's real encoding and decoding, and only the
network is fake.

**Prompt 1 (plan mode):**
> Create src/erc20.ts using viem's built-in `erc20Abi`, with:
> - `class InvalidAddressError extends Error`, whose message is `invalid address: ` followed by the input in
>   JSON.stringify form, and whose `name` is "InvalidAddressError"
> - `function toAddress(input: string): Address`: throws InvalidAddressError unless viem's `isAddress(input)` is true
> - `type TokenInfo = { address: Address; name: string; symbol: string; decimals: number; totalSupply: bigint }`
> - `async function getTokenInfo(client: PublicClient, token: Address): Promise<TokenInfo>`: four `readContract`
>   calls in parallel with `Promise.all`
> - `async function getBalance(client: PublicClient, token: Address, holder: Address): Promise<bigint>`: `balanceOf`
> - `function formatAmount(raw: bigint, decimals: number): string`: uses viem's `formatUnits`
>
> Use `import type` style for types (`type Address`, `type PublicClient`). Run npm run typecheck.

**Prompt 2 (plan mode):**
> Create test/fake-node.ts, a fake JSON-RPC node for one ERC-20 token, using viem's `custom` transport.
> - `type FakeTransfer = { block: bigint; from: Address; to: Address; value: bigint }`
> - `type FakeToken = { address, name, symbol, decimals, totalSupply, balances: Record<Address, bigint>,
>   transfers: FakeTransfer[], latestBlock: bigint }`
> - `function fakeNode(token: FakeToken): { client: PublicClient; calls: string[] }`. `calls` records every RPC
>   method name received, in order. Compare addresses in lower case. It answers:
>   - `eth_chainId`: `"0x7a69"`. `eth_blockNumber`: latestBlock as hex.
>   - `eth_call`: if `to` isn't the token, return `"0x"`. Otherwise decode the call with `decodeFunctionData` and
>     erc20Abi, and answer name, symbol, decimals, totalSupply and balanceOf (0n for unknown holders) with
>     `encodeFunctionResult`. Throw for any other function.
>   - `eth_getLogs`: build one Transfer log per entry in `transfers`: logIndex is its position in the array,
>     transactionHash is `numberToHex(index + 1, { size: 32 })`, topics come from `encodeEventTopics`, data is the
>     value from `encodeAbiParameters`. Filter by the request's address, fromBlock and toBlock, and topics, where a
>     null or missing topic matches anything. Return them with hex blockNumber and logIndex, plus blockHash,
>     transactionIndex "0x0" and removed false.
>   - anything else: throw `fake node: unsupported method <name>`.
>
> Then create test/erc20.test.ts using `node:test` and `node:assert/strict`. Use the real USDC address
> 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 with 6 decimals, ALICE = 0x00000000000000000000000000000000000A11cE
> holding 2500000, and BOB = 0x0000000000000000000000000000000000000B0b holding nothing. Tests, using exactly these names:
> 1. getTokenInfo reads name, symbol, decimals and total supply
> 2. getBalance returns the raw amount as a bigint: ALICE 2500000n, BOB 0n
> 3. formatAmount uses the token's decimals: (2500000n, 6) → "2.5", (1n, 18) → "0.000000000000000001",
>    (2500000n, 18) → "0.0000000000025", (123456789012345678901234567890n, 18) → "123456789012.34567890123456789"
> 4. toAddress accepts lowercase and correctly checksummed addresses: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045 and
>    0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 both come back unchanged
> 5. toAddress rejects bad input before any network call: "", "hello", "0x1234",
>    "0xZZZZ6BF26964aF9D7eEd9e03E53415D37aA96045", and "0xD8dA6BF26964aF9D7eEd9e03E53415D37aA96045" (one letter
>    changed to upper case, so the checksum fails) all throw InvalidAddressError
>
> Run npm test, npm run typecheck and npm run format:check.

**You check:**
- `src/erc20.ts`, `getTokenInfo`: four calls go out at the same time. Ask Claude: *"That's four HTTP requests. What
  is Multicall3, and why might it be better for a script that reads 100 tokens?"*
- `src/erc20.ts`, `getBalance`: it returns a `bigint`, never a `number`. Ask: *"What would `Number(raw)` do to a balance
  of 123456789012345678901234567890?"*
- `test/fake-node.ts`, the `eth_call` branch. Before asking, predict: how does the fake know which function was
  called? Then ask Claude to show you where the selector is read. (Answer: `decodeFunctionData` matches the first 4
  bytes against the ABI, the same `0x70a08231` you computed above.)
- `test/erc20.test.ts`, test 5: the last address is Vitalik's address with one letter's case changed. Compare it with
  test 4 character by character, and find the one letter that differs.
- **You never ran Prettier,** and `format:check` passes anyway. Every file Claude wrote went through the hook.

**Done when:** `!npm test` shows `# pass 5` and `# fail 0`, `!npm run typecheck` shows no errors, and
`!npm run format:check` passes.

**Commit:** `Add ERC-20 reads with a fake JSON-RPC node for tests`

---

## Step 4 — Transfer history from event logs (15 min)

**Learn (blockchain).**
- A contract **emits events** to say what happened. They're stored as **logs** in the transaction receipt, and they
  cost far less gas than storage. Contracts can't read them, but off-chain code can. Every ERC-20 transfer emits
  `Transfer(address indexed from, address indexed to, uint256 value)`.
- A log has **topics** and **data**. `topics[0]` is the keccak hash of the event signature. Each `indexed` parameter
  becomes another topic (`from` is topic 1, `to` is topic 2), and the rest (`value`) goes in `data`. Try:

  ```text
  !cast sig-event "Transfer(address,address,uint256)"
  ```

  It prints `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`, the topic every ERC-20 transfer has.
- **`eth_getLogs`** filters by contract address, block range, and topic values. Different topic positions are
  combined with **AND**. So one filter can say "from = me", or "to = me", but **not** "from = me OR to = me". You need
  two queries, and you merge the results.
- A transfer **to yourself** matches both queries. Without care, it shows up twice.
- Logs are ordered by **block number**, then **log index** (the log's position inside its block).

**Prompt (plan mode):**
> Create src/transfers.ts with:
> - `type Direction = "in" | "out" | "self"`
> - `type Transfer = { blockNumber: bigint; logIndex: number; transactionHash: Hash; from: Address; to: Address;
>   value: bigint; direction: Direction }`
> - `type BlockRange = { fromBlock: bigint; toBlock: bigint }`
> - `async function getTransfers(client: PublicClient, token: Address, holder: Address, range: BlockRange):
>   Promise<Transfer[]>`: run two `client.getContractEvents` queries in parallel with erc20Abi, eventName
>   "Transfer", the range, `strict: true`, and `args: { from: holder }` or `args: { to: holder }`. Merge them into a
>   Map keyed by `${transactionHash}:${logIndex}`, so a self-transfer appears once. Set direction to "self" if both
>   sides are the holder, "out" if from is, otherwise "in" (compare in lower case). Return them sorted by blockNumber,
>   then logIndex. Add a doc comment explaining why there are two queries.
> - `async function recentRange(client: PublicClient, blocks: bigint): Promise<BlockRange>`: throws RangeError if
>   blocks < 1n. toBlock is `client.getBlockNumber()`, fromBlock is `toBlock - blocks + 1n`, but never below 0n.
>
> Then create test/transfers.test.ts using fakeNode from @test/fake-node.ts, the USDC address, ALICE, BOB and
> CAROL = 0x000000000000000000000000000000000000ca01, latestBlock 20n, and these transfers in this order:
> block 10 BOB→ALICE 5000000, block 12 ALICE→CAROL 1000000, block 12 BOB→CAROL 7, block 15 ALICE→ALICE 3,
> block 20 CAROL→ALICE 9. Tests, using exactly these names:
> 1. returns incoming and outgoing transfers, oldest first: for ALICE over blocks 0–20, the list of
>    [blockNumber, direction, value] is [10n, "in", 5000000n], [12n, "out", 1000000n], [15n, "self", 3n], [20n, "in", 9n]
> 2. ignores transfers between other accounts: every result has ALICE as from or to
> 3. a transfer to yourself appears once: blocks 15–15 give exactly one transfer, direction "self"
> 4. only returns transfers inside the block range: blocks 11–19 give block numbers [12n, 15n]
> 5. uses exactly two eth_getLogs queries: count them in `calls`
> 6. recentRange counts back from the latest block: 5n gives 16n–20n, 1000n gives 0n–20n, 0n rejects with RangeError
>
> Run npm test, npm run typecheck and npm run format:check.

**You check:**
- `src/transfers.ts`, `getTransfers`: find the `Map` and its key. Ask Claude: *"Why is the key the transaction hash
  plus the log index, and not just the transaction hash?"* (One transaction can emit many transfers, for example a
  swap through several pools.)
- `src/transfers.ts`, the sort: it compares `blockNumber` first. Ask: *"Why can't I subtract two bigints and return
  the result from a sort comparator, like I would with numbers?"*
- `test/transfers.test.ts`, test 5: ask *"What does this test protect against?"* (A "fix" that fetches every Transfer
  of the token and filters in JavaScript would pass tests 1–4 and download millions of logs on mainnet.)

**Done when:** `!npm test` shows `# pass 11` and `# fail 0`, and typecheck and format check pass.

**Commit:** `Add Transfer history from two eth_getLogs queries`

Commit **now**, before the experiment below.

**Break it on purpose (5 min).** Predict first: which tests fail if you remove the de-duplication?

**Prompt (no plan mode needed):**
> Break @src/transfers.ts on purpose: in getTransfers, replace the Map with a plain array, and push every log from
> both queries into it with no de-duplication. Keep the sort. Don't touch the tests. Run npm test and explain which
> tests fail and why.

You should see 3 failures: `returns incoming and outgoing transfers, oldest first`, `a transfer to yourself appears
once`, and `only returns transfers inside the block range`. All three ranges include block 15, where ALICE pays
herself, so the self-transfer shows up twice. Notice the hook formatted Claude's broken code too: formatting doesn't
mean correct. Now undo it, and confirm:

```text
!git restore src/transfers.ts
!git status
!npm test
```

**Done when:** `git status` says `nothing to commit, working tree clean`, and the tests show `# pass 11`.

**Commit:** nothing for the experiment.

---

## Step 5 — The command-line script (10 min)

**Learn (TypeScript and Node).**
- `node:util` has a built-in argument parser, `parseArgs`, so you don't need a library.
- Same pattern as Wednesday's Go tool: a tiny `src/main.ts` calls `run(argv, io)`, which returns an exit code. Tests
  call `run` directly, with fake output functions and a fake node.
- **Exit codes:** `0` success, `1` the node or the token failed, `2` wrong usage. Usage and addresses are checked
  **before** any network call.
- viem errors have long messages. `BaseError` has a one-line `shortMessage`, plus `details` with the underlying cause.

**Prompt (plan mode):**
> Create src/cli.ts with:
> - exported `DEFAULT_RPC = "http://127.0.0.1:8545"` and `DEFAULT_BLOCKS = 1000n`
> - exported `USAGE`, exactly these three lines:
>   `usage: token-balance [--rpc URL] info <token>`
>   `       token-balance [--rpc URL] balance <token> <holder>`
>   `       token-balance [--rpc URL] transfers <token> <holder> [--blocks N]`
> - `export async function run(argv: string[], io: { out: (text: string) => void; err: (text: string) => void;
>   makeClient?: (rpc: string) => PublicClient }): Promise<number>`
>   - parse with `parseArgs` (allowPositionals, string options `rpc` and `blocks`). If parsing throws, print USAGE to
>     io.err and return 2.
>   - commands: `info <token>`, `balance <token> <holder>`, `transfers <token> <holder>`. Wrong command or argument
>     count: USAGE, return 2. `--blocks` is only allowed with transfers, and must match /^[1-9]\d*$/, else USAGE, return 2.
>   - convert addresses with toAddress. On InvalidAddressError print `error: <message>` and return 2.
>   - rpc comes from --rpc, then env RPC_URL, then DEFAULT_RPC. The default makeClient is
>     `createPublicClient({ transport: http(url, { timeout: 10_000, retryCount: 0 }) })`.
>   - always call getTokenInfo first (it's needed for decimals and symbol). Then:
>     - info prints aligned lines `name:`, `symbol:`, `decimals:`, `total supply: <formatted> <symbol>`
>     - balance prints `<raw> (raw units)` and then `<formatted> <symbol>`
>     - transfers uses recentRange (--blocks or DEFAULT_BLOCKS), prints `blocks <from>-<to>: <n> transfer(s)`, then
>       one line per transfer: block number, direction padded to 4 characters, formatted amount and symbol,
>       `from <address>` for "in" or `to <address>` otherwise, and the transaction hash, separated by two spaces
>   - any other error: print `error: ` followed by `describe(error)`, return 1. `describe` returns
>     `shortMessage (details)` for viem's BaseError (just shortMessage if there are no details), the message for
>     other Errors, and String(error) otherwise.
>
> Create src/main.ts that sets `process.exitCode` to the result of `run(process.argv.slice(2), ...)` with console.log
> and console.error.
>
> Create test/cli.test.ts using fakeNode, with a helper runCli(args) that collects out and err lines and returns
> { code, out, err, calls }. USDC address with 6 decimals and totalSupply 7000000n, ALICE holding 2500000n, latestBlock
> 10n, transfers block 5 BOB→ALICE 1000000 and block 9 ALICE→BOB 250000. Tests, using exactly these names:
> 1. bad usage prints usage and returns 2 without calling the node: for [], ["nope"], ["info"],
>    ["info", TOKEN, "extra"], ["balance", TOKEN], ["transfers", TOKEN], transfers with --blocks 0, transfers with
>    --blocks abc, ["info", TOKEN, "--blocks", "5"], ["info", TOKEN, "--unknown"]: code 2, err matches /usage:/,
>    calls is empty
> 2. an invalid address returns 2 without calling the node: balance with holder "hello", err is exactly
>    `error: invalid address: "hello"`
> 3. info prints the token details: code 0, out matches /symbol: +USDC/ and /total supply: 7 USDC/
> 4. balance prints raw units and the formatted amount: out is exactly "2500000 (raw units)\n2.5 USDC"
> 5. transfers prints one line per transfer in the range: with --blocks 3, the first line is exactly
>    "blocks 8-10: 1 transfer(s)", and the second starts with block 9, "out", "0.25 USDC" and "to " BOB
> 6. a node error returns 1: info with BOB as the token (no contract there), code 1, err starts with "error: "
>
> Finally, in @.github/workflows/ci.yml add two steps before "Test": "Format check" running
> `npm run format:check`, then "Type check" running `npm run typecheck`.
>
> Run npm test, npm run typecheck and npm run format:check.

**You check:**
- `src/cli.ts`, `run`: find where `makeClient` is called. Everything above that line is checked without touching the
  network. Test 1 proves it: `calls` stays empty.
- `src/cli.ts`, `run`: the default client has `retryCount: 0`. Ask Claude: *"viem retries failed requests by default.
  Why turn that off in a command-line tool, and when would I want it back?"*
- `test/cli.test.ts`, test 6: a token address with no contract behind it. Ask Claude: *"What does `eth_call` return
  for an address with no code, and why is that dangerous for a script that reads balances?"*
- `.github/workflows/ci.yml`: the format check runs in CI, which is the backstop for the hook's blind spot from Step 2c.

**Done when:**

```text
!npm run format:check && npm run typecheck && npm test
```

ends with `# pass 17` and `# fail 0`.

**Commit:** `Add info, balance and transfers commands`

---

## Step 6 — Run it for real: a mainnet fork, then mainnet (10 min)

**Learn.** `anvil --fork-url <mainnet RPC>` starts a local chain that **copies mainnet's state** at the latest
block. It fetches contracts and balances from mainnet as you use them. The real USDC contract is there, with every
real balance. Two Anvil features make it a testing tool:
- **Impersonation:** `anvil_impersonateAccount` lets you send transactions **from any address**, with no private
  key. On a fork you can move tokens from a big holder to your test account.
- **Anvil's 10 test accounts** are funded with 10,000 play ETH. Their keys are **public and well-known**. Never send
  real money to them.

Nothing you do on the fork touches real mainnet.

**Failure first.** With no node running, in the Claude Code prompt:

```text
!node src/main.ts info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; echo "exit $?"
```

Expect `error: HTTP request failed. (fetch failed)` and `exit 1`.

**Start the fork.** Open a **second** Git Bash window and leave it running:

```bash
anvil --fork-url https://ethereum-rpc.publicnode.com
```

Wait for `Listening on 127.0.0.1:8545`. Note the `Block number:` it prints. That's the fork point.

**Back in your first Git Bash window** (quit Claude Code with `/exit`), in `token-balance`, set some names so the
commands stay short:

```bash
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
ME=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
FRIEND=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
WHALE=0x55FE002aefF02F77364de339a1292923A15844B8
KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

`ME` and `FRIEND` are Anvil's first two test accounts, and `KEY` is the first one's public test key. `WHALE` is a
large real USDC holder on mainnet.

```bash
node src/main.ts info $USDC
node src/main.ts balance $USDC $WHALE
node src/main.ts balance $USDC $ME
```

Expect `USD Coin`, `USDC`, `decimals: 6`, a total supply in the tens of billions, millions of USDC for the whale, and
`0 USDC` for you. These are **real mainnet numbers**, read from your local fork.

> ℹ️ If the whale shows less than 2,000 USDC (big holders do move funds), pick another address from the "Holders" tab
> of the USDC page on etherscan.io, set `WHALE` to it, and run `cast rpc anvil_setBalance $WHALE 0xDE0B6B3A7640000`
> after the impersonate command below, so it has 1 ETH for gas.

**Move real USDC on your fork,** from the whale to you, with no key:

```bash
cast rpc anvil_impersonateAccount $WHALE
cast send $USDC "transfer(address,uint256)" $ME 1000000000 --from $WHALE --unlocked
cast rpc anvil_stopImpersonatingAccount $WHALE
node src/main.ts balance $USDC $ME
```

Each `cast rpc` line prints `null`, which is normal. In the `cast send` output, look for a `status` line reading
`1 (success)`. Then your balance shows `1000000000 (raw units)` and `1000 USDC`. You passed **1000000000** to
`transfer`, because USDC has 6 decimals. That's the raw-units rule from Step 3, done by hand.

Now send some to your friend, and some to yourself:

```bash
cast send $USDC "transfer(address,uint256)" $FRIEND 250000000 --private-key $KEY
cast send $USDC "transfer(address,uint256)" $ME 1 --private-key $KEY
node src/main.ts transfers $USDC $ME --blocks 10
```

Expect `3 transfer(s)`: an `in` of `1000 USDC` from the whale, an `out` of `250 USDC` to your friend, and a `self` of
`0.000001 USDC`. Each one is on its own block, because Anvil mines one block per transaction. The block range
starts **before** the fork point, so part of that query was answered by mainnet and part by Anvil. Your script
can't tell the difference.

Check against `cast`, which uses completely different code:

```bash
node src/main.ts balance $USDC $ME
cast call $USDC "balanceOf(address)(uint256)" $ME
```

Both say `750000000` (`cast` also prints `[7.5e8]`).

**Now read real mainnet,** by changing nothing but the URL:

```bash
RPC=https://ethereum-rpc.publicnode.com
POOL=0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640
node src/main.ts --rpc $RPC balance $USDC $POOL
node src/main.ts --rpc $RPC transfers $USDC $POOL --blocks 20
```

`POOL` is the Uniswap v3 USDC/WETH pool, one of the busiest addresses on Ethereum. Expect tens of millions of USDC,
and usually a few `in` and `out` transfers in the last 20 blocks (about 4 minutes). Copy one transaction hash and
look it up on etherscan.io: the amounts match.

**Hit the limit on purpose:**

```bash
node src/main.ts --rpc $RPC transfers $USDC $POOL --blocks 100000
```

Expect an error starting with `error: Invalid parameters were provided to the RPC method.` When I tested it,
publicnode explained that archive requests need a personal token. Other providers word it differently, or complain
about the block range. Free public nodes limit how far back `eth_getLogs`
can go, and how many blocks one query may cover. That's why the default is 1000 blocks, and why the Week 2 indexer
fetches logs in chunks. Keep this for Interview Q4.

**Bad input:**

```bash
node src/main.ts balance $USDC 0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

Expect `error: invalid address: "0xF39F..."`. One letter's case changed, and the checksum caught it.

**You check:** in `src/cli.ts`, nothing about Anvil, USDC or mainnet is hard-coded except `DEFAULT_RPC`. The same
script reads any ERC-20 on any EVM chain.

**Done when:** every "Expect" above matched. Close the Anvil window (`Ctrl+C`). A fork lives in memory, so your
1000 USDC disappears with it.

**Commit:** nothing. No files changed in this step.

---

## Step 7 — README, INTERVIEW.md, push, green CI (10 min)

Start Claude Code again if you quit it.

**Prompt 1 (README and CLAUDE.md):**
> In @README.md and @CLAUDE.md, replace the run commands with:
> `npm ci`, `npm run format:check`, `npm run typecheck`, `npm test`, and then
> `node src/main.ts info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` and
> `node src/main.ts --rpc https://ethereum-rpc.publicnode.com transfers 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640 --blocks 20`,
> with a comment that the first needs Anvil (for example `anvil --fork-url https://ethereum-rpc.publicnode.com`).
>
> In @README.md replace the "Design decisions" TODO with short bullets on: Node running TypeScript directly with tsc
> only checking types; bigint and decimals with no floats; validating addresses including the EIP-55 checksum before
> any network call; two eth_getLogs queries and why, with the de-duplication key; testing against a fake JSON-RPC node
> through viem's custom transport; run() with exit codes 0, 1 and 2; and the Prettier hook plus format:check in CI.
> Replace the "Known limitations" TODO with: only the last N blocks, with no chunking, so public nodes reject large
> ranges; "latest" can be reorged and logs can be removed; it trusts the RPC provider; tokens whose name() and
> symbol() return bytes32 instead of string (like MKR) fail to decode; balances are only read with balanceOf, so
> rebasing tokens like stETH change without Transfer events; four separate calls instead of Multicall3; no retries.
> Don't touch the "How I used Claude Code" section.

**Prompt 2 (INTERVIEW.md):**
> Fill in @INTERVIEW.md with these 5 questions and short model answers (5–8 sentences each), based on this code:
> 1. How do you represent token amounts in TypeScript, and what goes wrong with `number` or with ignoring decimals?
>    Use USDC's 6 decimals and my formatAmount tests.
> 2. Walk me through what happens from `token-balance balance <token> <holder>` to the printed number: the function
>    selector, ABI encoding, eth_call, the "latest" tag, decoding, and every place it can fail, including an address
>    with no contract.
> 3. How do ERC-20 Transfer events work at the log level? Explain topics, indexed parameters, data, why one
>    eth_getLogs filter can't express "from OR to", and how I avoid counting a self-transfer twice.
> 4. Could you rebuild every holder's balance by summing Transfer events instead of calling balanceOf? What breaks:
>    range limits on public nodes, reorgs and removed logs, rebasing tokens, and non-standard tokens. How would a
>    production indexer handle these?
> 5. How did you make Claude Code follow your formatting rules every time? Compare a CLAUDE.md instruction, a
>    PostToolUse hook and a CI check: which are guaranteed, what each one can't catch, and why the hook exits with
>    code 2 on a syntax error.

**You check:** read every answer. Rewrite at least one in your own words. Q3 especially: you should be able to draw
a Transfer log (three topics plus data) on a whiteboard without looking. If an answer says something you can't
explain, ask Claude about it until you can.

**Write "How I used Claude Code" yourself** in `README.md`: what the hook changed in how you reviewed code, what
happened when Claude wrote the syntax error, the blind spot you found in Step 2c, and anything Claude got wrong.

**Done when:**

```text
!npm run format:check && npm run typecheck && npm test
```

ends with `# pass 17` and `# fail 0`. Then commit and push (Claude will ask before `git push`):

**Commit:** `Add README design notes and interview Q&A`

Then check CI:

```text
!gh run list --branch main --limit 1
```

Wait until the newest run shows success (a ✓, or `completed` / `success`). Re-run the command every few seconds
while it says `in_progress`. If it fails, open it with `!gh run view <id> --log-failed`, then ask Claude to fix it.

> ℹ️ The most likely CI failure is `format:check` on a file you edited by hand. Run `!npm run format` and commit the
> result. That's the Step 2c blind spot, caught by the backstop.

---

## When you're done

Tell the roadmap chat **"done"**. It will review the repo, run the tests, and tick this row in the roadmap.

## Level up

**Turn rules that must always hold into hooks, and keep CI as the backstop.** `CLAUDE.md` is advice: Claude follows
it most of the time. A hook is a program Claude Code runs every time, so use one for anything you'd be annoyed to
remind Claude about twice: formatting, a quick type check, refusing to edit certain files (`PreToolUse` with exit
code 2). Keep hooks fast and narrow, test them by piping in JSON before you trust them, and make them exit 2 with a
clear message when Claude needs to fix something. Then remember the blind spot: hooks only see Claude's own tool
calls, so the same check also belongs in CI. This weekend you'll write a `PreToolUse` rule that keeps Claude away
from your `.env` file.
