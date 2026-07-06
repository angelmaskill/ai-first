// §4.3.2 Git baseline + change-set collector (side-effect layer).
//
// Per the core-boundary rule (§2.1): git commands belong to the side-effect
// layer. This module spawns `git status --porcelain` + `git rev-parse HEAD`,
// turns the output into a structured snapshot, and exposes PURE builders that
// derive GitBaseline / GitChangeSet from one or two snapshots. The pure
// builders are unit-tested directly; `collectGitStatus` is a thin shell.
//
// Coverage of `git status --porcelain`:
//   - tracked modified / staged / deleted / renamed  → trackedDirty
//   - untracked (`??`)                                → untracked
// Renames (`R `) print `old -> new`; we keep `new`.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";
import type { GitBaseline, GitChangeSet } from "../models.ts";

const execFileAsync = promisify(execFile);

export type GitStatusSnapshot = {
  headSha: string;
  trackedDirty: string[];
  untracked: string[];
};

// ──────────────────────────────────────────────────────────────────────────
// Pure parsing + building (unit-tested without any git process)
// ──────────────────────────────────────────────────────────────────────────

export type ParsedStatus = {
  trackedDirty: string[];
  untracked: string[];
};

/** Parse `git status --porcelain` (v1) output into tracked/untracked buckets. */
export function parseGitStatusPorcelain(text: string): ParsedStatus {
  const trackedDirty: string[] = [];
  const untracked: string[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.length < 4) continue; // need at least "XY path"
    const xy = line.slice(0, 2);
    const raw = line.slice(3);
    if (raw.length === 0) continue;
    const filePath = unwrapRename(unwrapQuotes(raw.trim()));
    if (!filePath) continue;
    if (xy === "??") {
      // untracked — may itself be a directory; we keep the path as reported
      untracked.push(filePath);
    } else {
      trackedDirty.push(filePath);
    }
  }
  return { trackedDirty, untracked };
}

function unwrapQuotes(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    // minimal unescape of porcelain's double-quoted paths
    return s.slice(1, -1).replace(/\\(.)/g, (_m, ch: string) => ch);
  }
  return s;
}

function unwrapRename(s: string): string {
  // porcelain rename: "old -> new"  → take new
  const idx = s.indexOf(" -> ");
  if (idx >= 0) return s.slice(idx + 4);
  return s;
}

/** Pure: build a GitBaseline from a single status snapshot. */
export function buildBaseline(snapshot: GitStatusSnapshot): GitBaseline {
  return {
    headSha: snapshot.headSha,
    preExistingChanges: [...snapshot.trackedDirty],
    preExistingUntracked: [...snapshot.untracked],
    clean: snapshot.trackedDirty.length === 0 && snapshot.untracked.length === 0,
  };
}

/**
 * Pure: build a GitChangeSet from a baseline + a post-execution snapshot.
 *
 * - trackedChanges:   dirty tracked AFTER, that were clean BEFORE (Codex's real impact)
 * - untrackedChanges: untracked AFTER, that didn't exist BEFORE (Codex created but didn't git-add)
 * - taintedPaths:     dirty in BOTH snapshots — attribution ambiguous (flag only)
 */
export function buildChangeSet(baseline: GitBaseline, post: GitStatusSnapshot): GitChangeSet {
  const preTracked = new Set(baseline.preExistingChanges);
  const preUntracked = new Set(baseline.preExistingUntracked);

  const trackedChanges = post.trackedDirty.filter((p) => !preTracked.has(p));
  const untrackedChanges = post.untracked.filter((p) => !preUntracked.has(p));

  const taintedTracked = post.trackedDirty.filter((p) => preTracked.has(p));
  const taintedUntracked = post.untracked.filter((p) => preUntracked.has(p));
  const taintedPaths = [...new Set([...taintedTracked, ...taintedUntracked])];

  return { trackedChanges, untrackedChanges, taintedPaths };
}

// ──────────────────────────────────────────────────────────────────────────
// Side-effect: spawn git
// ──────────────────────────────────────────────────────────────────────────

/** Collect the current status snapshot of the working tree. */
export async function collectGitStatus(projectRoot: string): Promise<GitStatusSnapshot> {
  const root = path.resolve(projectRoot);
  const [statusResult, headResult] = await Promise.all([
    execFileAsync("git", ["status", "--porcelain", "-unormal"], {
      cwd: root,
      maxBuffer: 10 * 1024 * 1024,
    }).catch((err) => {
      const e = err as Error & { stdout?: string };
      // git status should not fail on a normal repo; surface whatever we got
      return { stdout: e.stdout ?? "", stderr: String(err) };
    }),
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })
      .then((r) => r.stdout.trim())
      .catch(() => ""),
  ]);

  const parsed = parseGitStatusPorcelain(statusResult.stdout);
  return {
    headSha: headResult,
    trackedDirty: parsed.trackedDirty,
    untracked: parsed.untracked,
  };
}

/** Convenience: collect a baseline snapshot + built GitBaseline in one call. */
export async function collectGitBaseline(projectRoot: string): Promise<GitBaseline> {
  const snapshot = await collectGitStatus(projectRoot);
  return buildBaseline(snapshot);
}
