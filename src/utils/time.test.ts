import { describe, it, expect } from "vitest";
import { nowIso, compactTimestamp } from "./time.ts";

describe("nowIso", () => {
  it("returns ISO 8601 string", () => {
    const iso = nowIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("returns current time", () => {
    const before = new Date();
    const iso = nowIso();
    const after = new Date();
    const parsed = new Date(iso).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(parsed).toBeLessThanOrEqual(after.getTime() + 1000);
  });
});

describe("compactTimestamp", () => {
  it("replaces colons with dashes", () => {
    const ts = compactTimestamp(new Date("2026-04-26T12:34:56Z"));
    expect(ts).toBe("2026-04-26T12-34-56.000Z");
  });

  it("defaults to current time", () => {
    const ts = compactTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/);
  });
});
