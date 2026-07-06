import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { writeBreakGlass, readAllBreakGlass, makeBreakGlassRecord } from "./break-glass.ts";

describe("break-glass makeBreakGlassRecord", () => {
  const base = {
    operator: "alice",
    from: "build" as const,
    to: "qa" as const,
    reason: "prod incident",
    risk: "manual verification only",
    priorBlockers: ["task-x in_progress"],
    timestamp: "2026-07-06T08:45:00.000Z",
  };

  it("合法参数构造记录，id 含 compactTs", () => {
    const r = makeBreakGlassRecord(base);
    expect(r.id).toBe("breakglass-20260706T084500Z");
    expect(r.operator).toBe("alice");
    expect(r.priorBlockers).toEqual(["task-x in_progress"]);
  });

  it("缺 operator → throw", () => {
    expect(() => makeBreakGlassRecord({ ...base, operator: " " })).toThrow(/operator/);
  });

  it("缺 reason → throw", () => {
    expect(() => makeBreakGlassRecord({ ...base, reason: "" })).toThrow(/reason/);
  });

  it("缺 risk → throw", () => {
    expect(() => makeBreakGlassRecord({ ...base, risk: "" })).toThrow(/risk/);
  });
});

describe("break-glass writeBreakGlass + readAllBreakGlass (round-trip)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-bg-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("写入 .ai-first/logs/break-glass/<id>.yml（不是 locks/）", () => {
    const r = makeBreakGlassRecord({
      operator: "alice",
      from: "build",
      to: "qa",
      reason: "incident",
      risk: "manual",
      priorBlockers: ["b1"],
      timestamp: "2026-07-06T08:45:00.000Z",
    });
    const written = writeBreakGlass(tmp, r);
    expect(written).toContain(path.join(".ai-first", "logs", "break-glass"));
    expect(written).not.toContain(path.join(".ai-first", "locks"));
    expect(fs.existsSync(written)).toBe(true);
  });

  it("读回 round-trip 等价（按 timestamp 倒序）", () => {
    const r1 = makeBreakGlassRecord({
      operator: "alice",
      from: "build",
      to: "qa",
      reason: "a",
      risk: "x",
      priorBlockers: [],
      timestamp: "2026-07-06T08:00:00.000Z",
    });
    const r2 = makeBreakGlassRecord({
      operator: "bob",
      from: "qa",
      to: "release",
      reason: "b",
      risk: "y",
      priorBlockers: ["blocker-2"],
      timestamp: "2026-07-06T09:00:00.000Z",
    });
    writeBreakGlass(tmp, r1);
    writeBreakGlass(tmp, r2);

    const records = readAllBreakGlass(tmp);
    expect(records.length).toBe(2);
    // 最新在前（倒序）
    expect(records[0].operator).toBe("bob");
    expect(records[1].operator).toBe("alice");
    expect(records[0].priorBlockers).toEqual(["blocker-2"]);
  });

  it("空目录返回空数组", () => {
    expect(readAllBreakGlass(tmp)).toEqual([]);
  });
});
