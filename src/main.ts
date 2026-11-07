import { run } from "./cli.ts";

process.exitCode = await run(process.argv.slice(2), { out: console.log, err: console.error });
