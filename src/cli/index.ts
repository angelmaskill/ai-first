#!/usr/bin/env node
// §7 第五批 M1 — unified `ai-first` CLI dispatcher.
//
// One entry point for the whole deterministic control plane:
//   ai-first adopt [path]              → bootstrap a brownfield project
//   ai-first scan [--write] [path]     → detect code domains (+ write configs)
//   ai-first guide [path]              → show stage / next-step navigator
//   ai-first task:create ...           → create a task + inferred scope
//   ai-first task:exec ...             → run a task end-to-end
//   ai-first sync [opts]               → generate doc-rot sync suggestions
//   ai-first pilot [path]              → dry-run the full main line
//   ai-first check                     → typecheck + test + lint + format
//
// Thin delegation to the per-domain CLIs already shipped in src/core/*/.
// Behaviour stays defined in each three-layer module — this is just a router.

import { spawnSync } from "node:child_process";
import * as path from "node:path";
import * as url from "node:url";
import { pathToFileURL } from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");

const ENTRY_POINTS = {
  adopt: "src/core/adoption/adopt-cli.ts",
  scan: "src/core/scanners/repo-scan-cli.ts",
  guide: "src/core/guide/guide-cli.ts",
  "task:create": "src/core/task/task-cli.ts",
  "task:exec": "src/core/task/task-exec-cli.ts",
  sync: "src/core/sync/sync-cli.ts",
} as const;

type SubCommand = keyof typeof ENTRY_POINTS | "scan:write" | "pilot" | "check" | "help";

const KNOWN: ReadonlySet<SubCommand> = new Set<SubCommand>([
  ...(Object.keys(ENTRY_POINTS) as SubCommand[]),
  "scan:write",
  "pilot",
  "check",
  "help",
]);

function usage(): string {
  return [
    "ai-first — deterministic control plane for AI-assisted development",
    "",
    "Usage:",
    "  ai-first adopt [path]                bootstrap a brownfield project",
    "  ai-first scan [--write] [path]       detect code domains (+ write configs)",
    "  ai-first guide [path]                show stage / next-step navigator",
    '  ai-first task:create "<title>" [opts] create a task + inferred scope',
    "  ai-first task:exec --task <id> [opts] run a task end-to-end (Codex or dry-run)",
    "  ai-first sync [opts]                 generate doc-rot sync suggestions",
    "  ai-first pilot [path]                dry-run the full main line",
    "  ai-first check                       typecheck + test + lint + format",
    "",
    "Each subcommand forwards its remaining args to the matching per-domain CLI",
    "in src/core/<domain>/. See .claude/CLAUDE.md for the dispatch table.",
  ].join("\n");
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    process.stdout.write(usage() + "\n");
    process.exit(cmd ? 0 : 1);
  }

  if (!KNOWN.has(cmd as SubCommand)) {
    process.stderr.write(`未知命令: ${cmd}\n\n${usage()}\n`);
    process.exit(1);
  }
  const sub = cmd as SubCommand;

  if (sub === "check") {
    const r = spawnSync("npm", ["run", "check"], { stdio: "inherit", cwd: REPO_ROOT });
    process.exit(r.status ?? 1);
  }

  if (sub === "pilot") {
    const script = path.join(REPO_ROOT, "scripts", "pilot-walkthrough.sh");
    const r = spawnSync("bash", [script, ...rest], { stdio: "inherit" });
    process.exit(r.status ?? 1);
  }

  // scan:write → scan entry + --write-domains flag
  let entryRel: string;
  let extraFlags: string[] = [];
  if (sub === "scan:write") {
    entryRel = ENTRY_POINTS.scan;
    extraFlags = ["--write-domains"];
  } else if (sub === "task:create") {
    entryRel = ENTRY_POINTS["task:create"];
    extraFlags = ["create"];
  } else {
    entryRel = ENTRY_POINTS[sub as Exclude<SubCommand, "scan:write" | "pilot" | "check" | "help">];
  }

  const entryAbs = path.resolve(REPO_ROOT, entryRel);
  process.argv = [process.argv[0]!, entryAbs, ...extraFlags, ...rest];
  await import(pathToFileURL(entryAbs).href);
}

void main();
