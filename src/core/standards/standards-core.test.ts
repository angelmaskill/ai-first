import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeWithFrontmatter } from "../io/frontmatter.ts";
import { checkStandards } from "./standards-core.ts";
import type { ChangeScope, CodeDomain } from "../models.ts";

const scope: ChangeScope = {
  id: "s",
  projectId: "p",
  taskId: "t",
  summary: "x",
  frontendPaths: [],
  backendPaths: ["src/backend/"],
  sharedPaths: [],
  docsPaths: [],
  riskLevel: "low",
  parallelSafe: true,
  lockMode: "none",
  createdAt: "",
  updatedAt: "",
};

const domains: CodeDomain[] = [
  { id: "domain-backend", name: "Backend", kind: "backend", paths: ["src/backend/"] },
];

describe("standards-core checkStandards (fixture-driven)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-std-"));
    fs.mkdirSync(path.join(tmp, ".ai-first", "standards", "backend"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "standards", "frontend"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "standards", "workflow"), { recursive: true });
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("returns standards whose category matches the scope's domain", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "standards", "backend", "STANDARD-012.md"),
      serializeWithFrontmatter(
        {
          id: "STANDARD-012",
          domain: "backend",
          title: "Backend API Design",
          stability: "stable",
          severity: "must",
          relatedPaths: ["src/backend/"],
        },
        "# Backend API Design\n\nGuidance.",
      ),
    );
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "standards", "frontend", "STANDARD-010.md"),
      serializeWithFrontmatter(
        {
          id: "STANDARD-010",
          domain: "frontend",
          title: "Frontend Conventions",
          stability: "stable",
          severity: "must",
          relatedPaths: ["src/frontend/"],
        },
        "# Frontend Conventions\n\nGuidance.",
      ),
    );
    const result = checkStandards(tmp, scope, domains);
    expect(result.applicable.map((s) => s.id)).toContain("STANDARD-012");
    expect(result.applicable.map((s) => s.id)).not.toContain("STANDARD-010");
  });

  it("flags draft standards in the applicable set", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "standards", "backend", "STANDARD-DRAFT.md"),
      serializeWithFrontmatter(
        {
          id: "STANDARD-DRAFT",
          domain: "backend",
          title: "Draft Rule",
          stability: "draft",
          severity: "should",
          relatedPaths: [],
        },
        "draft",
      ),
    );
    const result = checkStandards(tmp, scope, domains);
    expect(result.draftStandards.map((s) => s.id)).toContain("STANDARD-DRAFT");
  });

  it("workflow standards apply to every scope", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "standards", "workflow", "STANDARD-WF.md"),
      serializeWithFrontmatter(
        {
          id: "STANDARD-WF",
          domain: "workflow",
          title: "Review Process",
          stability: "stable",
          severity: "must",
          relatedPaths: [],
        },
        "review",
      ),
    );
    const result = checkStandards(tmp, scope, domains);
    expect(result.applicable.map((s) => s.id)).toContain("STANDARD-WF");
  });

  it("missingDomains lists scope domains that have no standards", () => {
    // backend is in scope but no backend standard exists
    const result = checkStandards(tmp, scope, domains);
    expect(result.missingDomains).toContain("backend");
  });
});
