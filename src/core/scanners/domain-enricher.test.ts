import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { enrichDomains, writeDomainsYml } from "./domain-enricher.ts";
import type { CodeDomain } from "../models.ts";

describe("domain-enricher enrichDomains (B1)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-enrich-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("reads package.json scripts and infers JS tech stack", () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "x",
        scripts: { test: "vitest run", build: "tsc", "build:watch": "tsc -w" },
        dependencies: { react: "*", express: "*" },
        devDependencies: { typescript: "*", vitest: "*" },
      }),
    );
    const domains: CodeDomain[] = [
      { id: "domain-frontend", name: "Frontend", kind: "frontend", paths: ["src/frontend/"] },
    ];
    const enriched = enrichDomains(domains, tmp);
    expect(enriched[0].techStack).toEqual(
      expect.arrayContaining(["react", "typescript", "vitest"]),
    );
    expect(enriched[0].testCommands).toContain("npm run test");
    expect(enriched[0].buildCommands).toEqual(expect.arrayContaining(["npm run build"]));
  });

  it("detects go.mod / pyproject / Cargo", () => {
    fs.writeFileSync(path.join(tmp, "go.mod"), "module x\n");
    const enriched = enrichDomains([{ id: "d", name: "Backend", kind: "backend", paths: [] }], tmp);
    expect(enriched[0].techStack).toContain("go");
    expect(enriched[0].testCommands).toContain("go test ./...");
  });

  it("leaves the domain unchanged when no manifest is present", () => {
    const domains: CodeDomain[] = [{ id: "d", name: "x", kind: "shared", paths: ["shared/"] }];
    const enriched = enrichDomains(domains, tmp);
    expect(enriched[0].techStack).toBeUndefined();
  });
});

describe("domain-enricher writeDomainsYml (B2)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-write-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("writes .ai-first/domains/<kind>.yml with enriched config", () => {
    const domains: CodeDomain[] = [
      {
        id: "domain-frontend",
        name: "Frontend",
        kind: "frontend",
        paths: ["src/frontend/"],
        techStack: ["react"],
        testCommands: ["npm test"],
        buildCommands: ["npm run build"],
      },
    ];
    const written = writeDomainsYml(tmp, domains);
    expect(written.length).toBe(1);
    expect(written[0]).toMatch(/frontend\.yml$/);
    const content = fs.readFileSync(written[0], "utf-8");
    expect(content).toContain("kind: frontend");
    expect(content).toContain("react");
    expect(content).toContain("npm test");
    expect(content).toContain("standards:");
    expect(content).toContain("commonRisks:");
  });
});
