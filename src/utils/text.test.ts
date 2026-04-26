import { describe, it, expect } from "vitest";
import { toSlug, toId, titleFromPath } from "./text.ts";

describe("toSlug", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(toSlug("API v2.0!")).toBe("api-v2-0");
  });

  it("trims leading/trailing dashes", () => {
    expect(toSlug("--hello--")).toBe("hello");
  });

  it("returns 'project' for empty input", () => {
    expect(toSlug("")).toBe("project");
    expect(toSlug("   ")).toBe("project");
  });

  it("falls back to 'project' for non-ASCII-only input", () => {
    // toSlug strips non-ASCII chars; empty result falls back to "project"
    expect(toSlug("你好")).toBe("project");
  });
});

describe("toId", () => {
  it("returns string with prefix and random suffix", () => {
    const id = toId("TASK");
    expect(id).toMatch(/^TASK_[a-z0-9]{6}$/);
  });

  it("produces unique values", () => {
    const ids = new Set(Array.from({ length: 20 }, () => toId("SUB")));
    expect(ids.size).toBe(20);
  });
});

describe("titleFromPath", () => {
  it("extracts last segment", () => {
    expect(titleFromPath("src/utils/text.ts")).toBe("text.ts");
  });

  it("returns 'project' for empty path", () => {
    expect(titleFromPath("")).toBe("project");
  });

  it("handles trailing slash", () => {
    expect(titleFromPath("a/b/c/")).toBe("c");
  });
});
