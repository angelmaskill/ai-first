import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "examples", "ai-project-lifecycle-sim");

const steps = [
  { label: "example test", command: "npm", args: ["test"], cwd: fixture },
  { label: "example typecheck", command: "npm", args: ["run", "typecheck"], cwd: fixture },
  { label: "example lint", command: "npm", args: ["run", "lint"], cwd: fixture },
  {
    label: "guide smoke",
    command: "npm",
    args: ["run", "guide", "--", fixture],
    cwd: root,
    assertStdout: ["当前阶段", "下一步", "推荐执行"],
  },
];

for (const step of steps) {
  process.stdout.write(`\n▶ ${step.label}\n`);
  const result = spawnSync(step.command, step.args, {
    cwd: step.cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    process.stderr.write(`\n${step.label} failed with exit code ${result.status}\n`);
    process.exit(result.status ?? 1);
  }
  for (const expected of step.assertStdout ?? []) {
    if (!result.stdout.includes(expected)) {
      process.stderr.write(`\n${step.label} stdout missing expected text: ${expected}\n`);
      process.exit(1);
    }
  }
}

process.stdout.write("\nexample lifecycle validation passed\n");
