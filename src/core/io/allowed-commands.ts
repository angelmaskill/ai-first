// §3.2 / §4.3.1 P0-2 — Safe command registry.
//
// Acceptance checks of kind `test`/`typecheck`/`lint` reference a `commandId`
// that MUST be registered here (or in .ai-first/allowed-commands.yml). The
// acceptance-runner never accepts an arbitrary command from a task YAML — only
// registered argv vectors with a hard timeout and output cap.

import * as fs from "node:fs";
import * as path from "node:path";
import type { AllowedCommand, CodeDomain } from "../models.ts";
import { parseYaml, serializeYaml } from "./yaml.ts";

export const REGISTRY_FILENAME = "allowed-commands.yml";

/** Conservative defaults that ship with every ai-first project. */
export const DEFAULT_ALLOWED_COMMANDS: AllowedCommand[] = [
  {
    id: "npm-test",
    command: ["npm", "test"],
    timeoutMs: 180_000,
    maxOutputBytes: 2_000_000,
  },
  {
    id: "npm-typecheck",
    command: ["npm", "run", "typecheck"],
    timeoutMs: 120_000,
    maxOutputBytes: 1_000_000,
  },
  {
    id: "npm-lint",
    command: ["npm", "run", "lint"],
    timeoutMs: 120_000,
    maxOutputBytes: 1_000_000,
  },
];

/** Read the registry from `.ai-first/allowed-commands.yml`, falling back to defaults. */
export function readAllowedCommands(projectRoot: string): AllowedCommand[] {
  const filePath = path.join(projectRoot, ".ai-first", REGISTRY_FILENAME);
  if (!fs.existsSync(filePath)) {
    return [...DEFAULT_ALLOWED_COMMANDS];
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const parsed = (parseYaml(text) as { commands?: unknown } | null) ?? {};
  const commands = parsed.commands;
  if (!Array.isArray(commands)) return [...DEFAULT_ALLOWED_COMMANDS];
  return commands.map((c) => normalizeCommand(c)).filter((c): c is AllowedCommand => c !== null);
}

/** Persist the registry (CLI helper — the file is the source of truth). */
export function writeAllowedCommands(projectRoot: string, commands: AllowedCommand[]): string {
  const dir = path.join(projectRoot, ".ai-first");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, REGISTRY_FILENAME);
  const payload = { commands: commands.map((c) => ({ ...c, env: c.env ?? undefined })) };
  fs.writeFileSync(filePath, serializeYaml(payload), "utf-8");
  return filePath;
}

export function findCommand(
  registry: AllowedCommand[],
  commandId: string,
): AllowedCommand | undefined {
  return registry.find((c) => c.id === commandId);
}

/**
 * Promote domain `testCommands` (free-form argv strings from .ai-first/domains/<kind>.yml)
 * into registered AllowedCommands with safe defaults. Idempotent: ids derived
 * deterministically from `domain-<kind>-test-<n>`.
 */
export function mergeDomainCommands(
  registry: AllowedCommand[],
  domains: CodeDomain[],
): AllowedCommand[] {
  const next = [...registry];
  const existing = new Set(next.map((c) => c.id));
  for (const domain of domains) {
    const testCommands = (domain as CodeDomain & { testCommands?: string[] }).testCommands ?? [];
    testCommands.forEach((raw, idx) => {
      const id = `domain-${domain.kind}-test-${idx + 1}`;
      if (existing.has(id)) return;
      next.push({
        id,
        command: splitArgv(raw),
        timeoutMs: 180_000,
        maxOutputBytes: 2_000_000,
      });
      existing.add(id);
    });
  }
  return next;
}

function splitArgv(raw: string): string[] {
  // minimal shell-argv split: respects double quotes. Domains normally provide
  // space-separated argv like "npm test -- --grep auth".
  const out: string[] = [];
  let buf = "";
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      inDouble = !inDouble;
      continue;
    }
    if (ch === " " && !inDouble) {
      if (buf.length > 0) {
        out.push(buf);
        buf = "";
      }
      continue;
    }
    buf += ch;
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

function normalizeCommand(value: unknown): AllowedCommand | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const id = typeof v.id === "string" ? v.id : null;
  const command = Array.isArray(v.command)
    ? (v.command.filter((x) => typeof x === "string") as string[])
    : null;
  const timeoutMs = typeof v.timeoutMs === "number" ? v.timeoutMs : 120_000;
  const maxOutputBytes = typeof v.maxOutputBytes === "number" ? v.maxOutputBytes : 1_000_000;
  const cwd = typeof v.cwd === "string" ? v.cwd : undefined;
  const env =
    v.env && typeof v.env === "object" && !Array.isArray(v.env)
      ? (v.env as Record<string, string>)
      : undefined;
  if (!id || !command || command.length === 0) return null;
  return { id, command, timeoutMs, maxOutputBytes, cwd, env };
}
