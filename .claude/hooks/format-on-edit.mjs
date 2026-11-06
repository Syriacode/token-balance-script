// PostToolUse hook: formats the file Claude just wrote or edited with Prettier.
// Claude Code sends a JSON description of the tool call on stdin.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as prettier from "prettier";

const FORMATTED = new Set([".ts", ".mts", ".js", ".mjs", ".json"]);

let input = "";
for await (const chunk of process.stdin) input += chunk;
const event = JSON.parse(input);

const filePath = event.tool_input?.file_path;
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;

// Only touch source files inside this project.
if (!filePath || !FORMATTED.has(path.extname(filePath))) process.exit(0);
const relative = path.relative(projectDir, filePath);
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);

const ignorePath = path.join(projectDir, ".prettierignore");
const info = await prettier.getFileInfo(filePath, { ignorePath });
if (info.ignored) process.exit(0);

const source = await readFile(filePath, "utf8");
const options = (await prettier.resolveConfig(filePath)) ?? {};
try {
  const formatted = await prettier.format(source, { ...options, filepath: filePath });
  if (formatted !== source) await writeFile(filePath, formatted);
} catch (error) {
  // Exit code 2 sends stderr back to Claude, so it sees the problem and can fix it.
  console.error(`Prettier could not format ${relative}:\n${error.message}`);
  process.exit(2);
}
