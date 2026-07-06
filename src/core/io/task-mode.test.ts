import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeYaml } from "./yaml.ts";
import { normalizeTaskMode, collectTaskModeWarnings, readAllTasks } from "./project-reader.ts";

describe("normalizeTaskMode (阶段门 §7.2)", () => {
  it("合法 mode 原样返回，无 warning", () => {
    expect(normalizeTaskMode("generate")).toEqual({ mode: "generate" });
    expect(normalizeTaskMode("reuse")).toEqual({ mode: "reuse" });
    expect(normalizeTaskMode("execute")).toEqual({ mode: "execute" });
  });

  it("skip 降级为 execute 并返回 warning（不写 timeline）", () => {
    const r = normalizeTaskMode("skip");
    expect(r.mode).toBe("execute");
    expect(r.warning).toContain("已废弃");
  });

  it("未知/缺失值降级为 execute，无 warning", () => {
    expect(normalizeTaskMode(undefined)).toEqual({ mode: "execute" });
    expect(normalizeTaskMode("nonsense")).toEqual({ mode: "execute" });
  });
});

describe("collectTaskModeWarnings (reader 纯读，不写副作用)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-mode-"));
    fs.mkdirSync(path.join(tmp, ".ai-first", "tasks"), { recursive: true });
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("返回旧 yml mode:skip 的 warning，不写任何文件", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "tasks", "task-old.yml"),
      serializeYaml({ id: "task-old", title: "x", mode: "skip", stage: "build" }),
    );
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "tasks", "task-new.yml"),
      serializeYaml({ id: "task-new", title: "y", mode: "execute", stage: "build" }),
    );

    const warnings = collectTaskModeWarnings(tmp);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("task-old");
    expect(warnings[0]).toContain("已废弃");

    // reader 不写副作用：tasks 目录里没有 timeline 或额外文件
    const tasksDir = path.join(tmp, ".ai-first", "tasks");
    const entries = fs.readdirSync(tasksDir);
    expect(entries).toEqual(["task-new.yml", "task-old.yml"]);

    // readAllTasks 读出的 mode 已降级
    const tasks = readAllTasks(tmp);
    const oldTask = tasks.find((t) => t.id === "task-old");
    expect(oldTask?.mode).toBe("execute");
  });

  it("无 skip 任务时返回空数组", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "tasks", "task-ok.yml"),
      serializeYaml({ id: "task-ok", title: "x", mode: "execute", stage: "build" }),
    );
    expect(collectTaskModeWarnings(tmp)).toEqual([]);
  });
});
