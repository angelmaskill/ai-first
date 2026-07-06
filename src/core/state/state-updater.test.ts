import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeYaml } from "../io/yaml.ts";
import { advanceState, isValidAdvance, updateCurrentSymlink } from "./state-updater.ts";

function setupProject(tmp: string, currentStage: "build" | "qa" | "evolve" | "idea") {
  fs.mkdirSync(path.join(tmp, ".ai-first", "state", "current"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".ai-first", "logs"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, ".ai-first", "project.yml"),
    serializeYaml({
      id: "p",
      name: "x",
      slug: "x",
      mode: "brownfield",
      currentStage,
      codeDomains: [],
    }),
    "utf-8",
  );
}

describe("isValidAdvance", () => {
  it("相邻合法", () => {
    expect(isValidAdvance("build", "qa")).toBe(true);
    expect(isValidAdvance("qa", "release")).toBe(true);
  });
  it("evolve→discovery 闭环合法", () => {
    expect(isValidAdvance("evolve", "discovery")).toBe(true);
  });
  it("跨级非法", () => {
    expect(isValidAdvance("build", "release")).toBe(false);
  });
});

describe("advanceState", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-su-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("推进 build→qa：更新 project.yml + symlink + timeline，并锁 rules", () => {
    setupProject(tmp, "build");
    const result = advanceState(tmp, "build", "qa", {
      mode: "normal",
      timestamp: "2026-07-06T10:00:00.000Z",
    });
    // project.yml 更新
    const yml = fs.readFileSync(path.join(tmp, ".ai-first", "project.yml"), "utf-8");
    expect(yml).toMatch(/currentStage: qa/);
    // symlink 更新
    const symlinkPath = path.join(tmp, ".ai-first", "state", "current");
    expect(fs.existsSync(symlinkPath)).toBe(true);
    // timeline 追加
    const timeline = fs.readFileSync(path.join(tmp, ".ai-first", "logs", "timeline.md"), "utf-8");
    expect(timeline).toContain("build → qa");
    expect(timeline).toContain("mode: normal");
    // rules.lock 创建（qa 是 execution 阶段）
    expect(result.rulesLockPath).toBeDefined();
    expect(fs.existsSync(result.rulesLockPath!)).toBe(true);
  });

  it("推进 evolve→discovery：解锁 rules", () => {
    setupProject(tmp, "evolve");
    // 先放一个 rules.lock
    const locksDir = path.join(tmp, ".ai-first", "locks");
    fs.mkdirSync(locksDir, { recursive: true });
    fs.writeFileSync(path.join(locksDir, "rules.lock"), "locked\n", "utf-8");

    advanceState(tmp, "evolve", "discovery", {
      mode: "normal",
      timestamp: "2026-07-06T10:00:00.000Z",
    });
    expect(fs.existsSync(path.join(locksDir, "rules.lock"))).toBe(false);
  });

  it("break-glass 模式：timeline 留 operator + reason", () => {
    setupProject(tmp, "build");
    advanceState(tmp, "build", "qa", {
      mode: "break-glass",
      operator: "alice",
      reason: "prod incident",
      timestamp: "2026-07-06T11:00:00.000Z",
    });
    const timeline = fs.readFileSync(path.join(tmp, ".ai-first", "logs", "timeline.md"), "utf-8");
    expect(timeline).toContain("break-glass");
    expect(timeline).toContain("operator: alice");
    expect(timeline).toContain("prod incident");
  });

  it("跨级推进 → throw", () => {
    setupProject(tmp, "build");
    expect(() =>
      advanceState(tmp, "build", "release", {
        mode: "normal",
        timestamp: "2026-07-06T10:00:00.000Z",
      }),
    ).toThrow(/非法推进/);
  });

  it("symlink 创建失败时早失败，不写 current 文件回退", () => {
    setupProject(tmp, "build");
    const aiFirst = path.join(tmp, ".ai-first");
    const currentPath = path.join(tmp, ".ai-first", "state", "current");
    fs.writeFileSync(path.join(currentPath, "situation.md"), "old current\n", "utf-8");
    expect(() =>
      updateCurrentSymlink(aiFirst, "qa", () => {
        throw new Error("symlink denied");
      }),
    ).toThrow(/无法创建 .*current symlink/);
    expect(fs.existsSync(path.join(currentPath, "situation.md"))).toBe(true);
    expect(fs.readFileSync(path.join(currentPath, "situation.md"), "utf-8")).toBe("old current\n");
  });

  it("缺少 project.yml 时早失败，不改 current", () => {
    setupProject(tmp, "build");
    const projectYml = path.join(tmp, ".ai-first", "project.yml");
    const currentPath = path.join(tmp, ".ai-first", "state", "current");
    fs.writeFileSync(path.join(currentPath, "situation.md"), "old current\n", "utf-8");
    fs.rmSync(projectYml, { force: true });

    expect(() =>
      advanceState(tmp, "build", "qa", {
        mode: "normal",
        timestamp: "2026-07-06T10:00:00.000Z",
      }),
    ).toThrow(/缺少 .*project\.yml/);
    expect(fs.readFileSync(path.join(currentPath, "situation.md"), "utf-8")).toBe("old current\n");
  });

  it("创建下一阶段 state 目录", () => {
    setupProject(tmp, "build");
    const result = advanceState(tmp, "build", "qa", {
      mode: "normal",
      timestamp: "2026-07-06T10:00:00.000Z",
    });
    expect(fs.existsSync(result.nextStateDir)).toBe(true);
    expect(result.nextStateDir).toMatch(/stage-07-qa/);
  });
});
