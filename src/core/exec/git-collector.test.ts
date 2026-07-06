import { describe, it, expect } from "vitest";
import {
  parseGitStatusPorcelain,
  buildBaseline,
  buildChangeSet,
  collectGitStatus,
} from "./git-collector.ts";
import type { GitBaseline } from "../models.ts";

describe("git-collector pure parsing", () => {
  it("parses tracked modified / staged / deleted", () => {
    const out = parseGitStatusPorcelain(
      [" M src/a.ts", "M  src/b.ts", "D  src/old.ts", "A  src/new.ts"].join("\n"),
    );
    expect(out.untracked).toEqual([]);
    expect(out.trackedDirty).toEqual(["src/a.ts", "src/b.ts", "src/old.ts", "src/new.ts"]);
  });

  it("parses untracked files (??)", () => {
    const out = parseGitStatusPorcelain(["?? src/new.ts", "?? fixtures/samples/"].join("\n"));
    expect(out.untracked).toEqual(["src/new.ts", "fixtures/samples/"]);
    expect(out.trackedDirty).toEqual([]);
  });

  it("takes the new path on rename (R)", () => {
    const out = parseGitStatusPorcelain(["R  src/old.ts -> src/new.ts"].join("\n"));
    expect(out.trackedDirty).toEqual(["src/new.ts"]);
  });

  it("unwraps double-quoted paths", () => {
    const out = parseGitStatusPorcelain(['?? "path with space.ts"'].join("\n"));
    expect(out.untracked).toEqual(["path with space.ts"]);
  });

  it("ignores blank / short lines", () => {
    const out = parseGitStatusPorcelain(["", " M src/a.ts", "", "xy"].join("\n"));
    expect(out.trackedDirty).toEqual(["src/a.ts"]);
  });
});

describe("git-collector buildBaseline", () => {
  it("marks clean when no dirty or untracked", () => {
    const b = buildBaseline({ headSha: "abc123", trackedDirty: [], untracked: [] });
    expect(b.clean).toBe(true);
    expect(b.preExistingChanges).toEqual([]);
    expect(b.preExistingUntracked).toEqual([]);
    expect(b.headSha).toBe("abc123");
  });

  it("marks dirty when tracked changes present", () => {
    const b = buildBaseline({
      headSha: "abc",
      trackedDirty: ["src/a.ts"],
      untracked: [],
    });
    expect(b.clean).toBe(false);
    expect(b.preExistingChanges).toEqual(["src/a.ts"]);
  });

  it("marks dirty when untracked present", () => {
    const b = buildBaseline({
      headSha: "abc",
      trackedDirty: [],
      untracked: ["fixtures/x/"],
    });
    expect(b.clean).toBe(false);
  });
});

describe("git-collector buildChangeSet (attribution)", () => {
  const baseline: GitBaseline = {
    headSha: "abc",
    preExistingChanges: ["src/dirty-before.ts"],
    preExistingUntracked: ["fixtures/old/"],
    clean: false,
  };

  it("tracks newly-dirty tracked files as trackedChanges (Codex's real impact)", () => {
    const post = {
      headSha: "abc",
      trackedDirty: ["src/dirty-before.ts", "src/codex-edited.ts"],
      untracked: ["fixtures/old/"],
    };
    const cs = buildChangeSet(baseline, post);
    expect(cs.trackedChanges).toEqual(["src/codex-edited.ts"]);
  });

  it("tracks newly-created untracked files as untrackedChanges", () => {
    const post = {
      headSha: "abc",
      trackedDirty: ["src/dirty-before.ts"],
      untracked: ["fixtures/old/", "src/brand-new.ts"],
    };
    const cs = buildChangeSet(baseline, post);
    expect(cs.untrackedChanges).toEqual(["src/brand-new.ts"]);
  });

  it("flags tainted paths that were dirty before AND after (ambiguous)", () => {
    const post = {
      headSha: "abc",
      trackedDirty: ["src/dirty-before.ts"],
      untracked: ["fixtures/old/"],
    };
    const cs = buildChangeSet(baseline, post);
    expect(cs.taintedPaths).toEqual(
      expect.arrayContaining(["src/dirty-before.ts", "fixtures/old/"]),
    );
    expect(cs.trackedChanges).toEqual([]);
    expect(cs.untrackedChanges).toEqual([]);
  });

  it("clean baseline + clean post → empty change set", () => {
    const clean: GitBaseline = {
      headSha: "abc",
      preExistingChanges: [],
      preExistingUntracked: [],
      clean: true,
    };
    const cs = buildChangeSet(clean, { headSha: "abc", trackedDirty: [], untracked: [] });
    expect(cs.trackedChanges).toEqual([]);
    expect(cs.untrackedChanges).toEqual([]);
    expect(cs.taintedPaths).toEqual([]);
  });
});

describe("git-collector collectGitStatus (integration, runs against this repo)", () => {
  it("returns a snapshot with a non-empty head sha for a real git repo", async () => {
    const snapshot = await collectGitStatus(process.cwd());
    expect(snapshot.headSha).toMatch(/^[0-9a-f]{7,40}$/);
    expect(Array.isArray(snapshot.trackedDirty)).toBe(true);
    expect(Array.isArray(snapshot.untracked)).toBe(true);
  });
});
