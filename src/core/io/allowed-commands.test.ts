import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  DEFAULT_ALLOWED_COMMANDS,
  REGISTRY_FILENAME,
  readAllowedCommands,
  writeAllowedCommands,
  findCommand,
  mergeDomainCommands,
} from "./allowed-commands.ts";
import type { AllowedCommand, CodeDomain } from "../models.ts";

describe("io/allowed-commands defaults", () => {
  it("ships npm-test / npm-typecheck / npm-lint with hard limits", () => {
    const ids = DEFAULT_ALLOWED_COMMANDS.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["npm-test", "npm-typecheck", "npm-lint"]));
    for (const cmd of DEFAULT_ALLOWED_COMMANDS) {
      expect(cmd.timeoutMs).toBeGreaterThan(0);
      expect(cmd.maxOutputBytes).toBeGreaterThan(0);
      expect(cmd.command.length).toBeGreaterThan(0);
    }
  });
});

describe("io/allowed-commands read/write", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-allowed-"));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns defaults when no registry file exists", () => {
    const commands = readAllowedCommands(tmp);
    expect(commands.map((c) => c.id)).toEqual(
      expect.arrayContaining(["npm-test", "npm-typecheck", "npm-lint"]),
    );
  });

  it("writes and reads back a custom registry", () => {
    const custom: AllowedCommand[] = [
      {
        id: "fe-typecheck",
        command: ["npm", "run", "typecheck"],
        timeoutMs: 30_000,
        maxOutputBytes: 100_000,
      },
      {
        id: "fe-test",
        command: ["npm", "test", "--", "--grep", "auth"],
        timeoutMs: 90_000,
        maxOutputBytes: 500_000,
        cwd: "src/frontend",
      },
    ];
    writeAllowedCommands(tmp, custom);
    const read = readAllowedCommands(path.join(tmp, "..", path.basename(tmp)));
    const ids = read.map((c) => c.id);
    expect(ids).toContain("fe-typecheck");
    expect(ids).toContain("fe-test");
    const fe = findCommand(read, "fe-test");
    expect(fe?.command).toEqual(["npm", "test", "--", "--grep", "auth"]);
    expect(fe?.cwd).toBe("src/frontend");
  });

  it("falls back to defaults when the file is malformed", () => {
    fs.mkdirSync(path.join(tmp, ".ai-first"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, ".ai-first", REGISTRY_FILENAME),
      "this is not: [valid yaml -> intentional",
      "utf-8",
    );
    const read = readAllowedCommands(tmp);
    expect(read.map((c) => c.id)).toContain("npm-test");
  });
});

describe("io/allowed-commands mergeDomainCommands", () => {
  it("promotes domain testCommands into safe AllowedCommands", () => {
    const domains: CodeDomain[] = [
      {
        id: "domain-frontend",
        name: "Frontend",
        kind: "frontend",
        paths: ["src/frontend/"],
        testCommands: ["npm test --silent"],
      } as CodeDomain & { testCommands: string[] },
    ];
    const merged = mergeDomainCommands(DEFAULT_ALLOWED_COMMANDS, domains);
    const dom = findCommand(merged, "domain-frontend-test-1");
    expect(dom).toBeDefined();
    expect(dom?.command).toEqual(["npm", "test", "--silent"]);
  });

  it("is idempotent on repeated merges", () => {
    const domains: CodeDomain[] = [
      {
        id: "domain-frontend",
        name: "Frontend",
        kind: "frontend",
        paths: ["src/frontend/"],
        testCommands: ["npm test"],
      } as CodeDomain & { testCommands: string[] },
    ];
    const once = mergeDomainCommands(DEFAULT_ALLOWED_COMMANDS, domains);
    const twice = mergeDomainCommands(once, domains);
    const count = twice.filter((c) => c.id === "domain-frontend-test-1").length;
    expect(count).toBe(1);
  });
});
