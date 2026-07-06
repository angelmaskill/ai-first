import { describe, expect, it } from "vitest";
import { DEFAULT_RUNTIME_PROFILES, getRuntimeProfile } from "./runtime-profiles.ts";

describe("runtime profiles", () => {
  it("declares Claude Code as the native full-lifecycle runtime", () => {
    const profile = getRuntimeProfile("claude-code");

    expect(profile.executionMode).toBe("native");
    expect(profile.supportedStages).toContain("idea");
    expect(profile.supportedStages).toContain("evolve");
    expect(profile.roleBindings.some((binding) => binding.agent === "builder-agent")).toBe(true);
  });

  it("declares Codex as an exec runtime for implementation and review roles", () => {
    const profile = getRuntimeProfile("codex");

    expect(profile.executionMode).toBe("exec");
    expect(profile.supportedStages).toContain("build");
    expect(profile.supportedRoles).toContain("builder");
    expect(profile.supportedRoles).toContain("reviewer");
    expect(profile.roleBindings.every((binding) => binding.command?.includes("codex"))).toBe(true);
  });

  it("keeps runtime ids aligned with the default profile registry", () => {
    expect(Object.keys(DEFAULT_RUNTIME_PROFILES).sort()).toEqual(["claude-code", "codex"]);
  });
});
