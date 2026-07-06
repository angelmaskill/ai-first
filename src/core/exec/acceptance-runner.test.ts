import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { runAcceptancePlan } from "./acceptance-runner.ts";
import type { AcceptanceCriterion, AllowedCommand } from "../models.ts";

describe("acceptance-runner", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-accept-"));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("kind=manual → passed=false, detail mentions manual", async () => {
    const checks: AcceptanceCriterion[] = [
      { id: "ac-manual", description: "manual review", check: { kind: "manual" }, required: true },
    ];
    const results = await runAcceptancePlan(checks, [], tmp);
    expect(results[0].passed).toBe(false);
    expect(results[0].detail).toContain("人工");
  });

  it("kind=file_exists detects present and missing files", async () => {
    fs.writeFileSync(path.join(tmp, "exists.txt"), "hi");
    const checks: AcceptanceCriterion[] = [
      {
        id: "ac-1",
        description: "present",
        check: { kind: "file_exists", path: "exists.txt" },
        required: true,
      },
      {
        id: "ac-2",
        description: "missing",
        check: { kind: "file_exists", path: "nope.txt" },
        required: true,
      },
    ];
    const results = await runAcceptancePlan(checks, [], tmp);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
    expect(results[1].detail).toContain("缺失");
  });

  it("kind=file_contains matches a regex in the file", async () => {
    fs.writeFileSync(path.join(tmp, "code.ts"), "export function login() { return token; }");
    const checks: AcceptanceCriterion[] = [
      {
        id: "ac-hit",
        description: "hit",
        check: { kind: "file_contains", path: "code.ts", pattern: "function login" },
        required: true,
      },
      {
        id: "ac-miss",
        description: "miss",
        check: { kind: "file_contains", path: "code.ts", pattern: "nope_xyz" },
        required: true,
      },
    ];
    const results = await runAcceptancePlan(checks, [], tmp);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });

  it("kind=file_contains on a missing file fails with a clear detail", async () => {
    const checks: AcceptanceCriterion[] = [
      {
        id: "ac",
        description: "x",
        check: { kind: "file_contains", path: "absent.ts", pattern: "x" },
        required: true,
      },
    ];
    const [result] = await runAcceptancePlan(checks, [], tmp);
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("不存在");
  });

  it("command-kind with an UNregistered commandId refuses to execute", async () => {
    const checks: AcceptanceCriterion[] = [
      {
        id: "ac-sneaky",
        description: "arbitrary",
        check: { kind: "test", commandId: "rm-rf-root" },
        required: true,
      },
    ];
    const [result] = await runAcceptancePlan(checks, [], tmp);
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("未在 allowed-commands.yml 登记");
  });

  it("command-kind with a registered id runs it and reports pass/fail", async () => {
    const okScript = "console.log('all good'); process.exit(0);";
    const failScript = "console.error('boom'); process.exit(2);";
    const allowed: AllowedCommand[] = [
      {
        id: "ok-cmd",
        command: [process.execPath, "-e", okScript],
        timeoutMs: 10_000,
        maxOutputBytes: 100_000,
      },
      {
        id: "fail-cmd",
        command: [process.execPath, "-e", failScript],
        timeoutMs: 10_000,
        maxOutputBytes: 100_000,
      },
    ];
    const checks: AcceptanceCriterion[] = [
      {
        id: "ac-ok",
        description: "ok",
        check: { kind: "test", commandId: "ok-cmd" },
        required: true,
      },
      {
        id: "ac-fail",
        description: "fail",
        check: { kind: "test", commandId: "fail-cmd" },
        required: true,
      },
    ];
    const results = await runAcceptancePlan(checks, allowed, tmp);
    expect(results[0].passed).toBe(true);
    expect(results[0].detail).toContain("all good");
    expect(results[1].passed).toBe(false);
    expect(results[1].detail).toContain("退出码 2");
  });

  it("command-kind enforces timeoutMs", async () => {
    const allowed: AllowedCommand[] = [
      {
        id: "slow-cmd",
        command: [process.execPath, "-e", "setTimeout(()=>process.exit(0), 5000)"],
        timeoutMs: 300,
        maxOutputBytes: 100_000,
      },
    ];
    const checks: AcceptanceCriterion[] = [
      {
        id: "ac-slow",
        description: "slow",
        check: { kind: "test", commandId: "slow-cmd" },
        required: true,
      },
    ];
    const [result] = await runAcceptancePlan(checks, allowed, tmp);
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("超时");
  });
});
