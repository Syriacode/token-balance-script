# token-balance-script

This repo is token-balance-script: TypeScript script that reads ERC-20 token balances and Transfer events using viem.

Language: typescript

## How to work with me

- I'm learning, so explain each change and the reasoning behind it.
- Always run the tests after changing code, and show me the output:

```bash
npm ci
npm run format:check
npm run typecheck
npm test

# The first command needs Anvil (for example: anvil --fork-url https://ethereum-rpc.publicnode.com)
node src/main.ts info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
node src/main.ts --rpc https://ethereum-rpc.publicnode.com transfers 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640 --blocks 20
```

### Hooks

- A PostToolUse hook (.claude/hooks/format-on-edit.mjs) runs Prettier on every file you write or edit. Don't format
  files by hand or run Prettier yourself.
- If the hook reports an error, fix the syntax error it names before doing anything else.

## Plan

- `GUIDE.md` holds the step-by-step plan once it's added.

## Environment

- My machine runs Windows with Git Bash. Shell commands are POSIX bash.
