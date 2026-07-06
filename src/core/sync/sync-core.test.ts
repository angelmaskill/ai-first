import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeWithFrontmatter } from "../io/frontmatter.ts";
import { serializeYaml } from "../io/yaml.ts";
import { analyzeImpact, analyzeProjectImpact } from "./sync-core.ts";

describe("sync-core analyzeImpact (pure)", () => {
  it("links changed files to standards whose relatedPaths overlap", () => {
    const events = analyzeImpact({
      changedFiles: ["src/backend/auth.ts", "src/backend/api/handler.ts", "docs/README.md"],
      standards: [
        { id: "STANDARD-BE", name: "Backend", relatedPaths: ["src/backend/"] },
        {
          id: "STANDARD-API",
          name: "API",
          relatedPaths: ["src/backend/api/", "src/frontend/api/"],
        },
      ],
      knowledge: [],
    });
    expect(events.some((e) => e.impactedStandardIds?.includes("STANDARD-BE"))).toBe(true);
    expect(events.some((e) => e.impactedStandardIds?.includes("STANDARD-API"))).toBe(true);
  });

  it("links changed files to knowledge items", () => {
    const events = analyzeImpact({
      changedFiles: ["algorithms/eval.py"],
      standards: [],
      knowledge: [{ id: "KNOW-1", name: "Eval pipeline", relatedPaths: ["algorithms/"] }],
    });
    const know = events.find((e) => e.impactedKnowledgeIds?.includes("KNOW-1"));
    expect(know).toBeDefined();
    expect(know?.status).toBe("suggested");
  });

  it("produces no events when nothing overlaps", () => {
    const events = analyzeImpact({
      changedFiles: ["unrelated/file.ts"],
      standards: [{ id: "S", name: "x", relatedPaths: ["src/backend/"] }],
      knowledge: [],
    });
    expect(events).toEqual([]);
  });
});

describe("sync-core analyzeProjectImpact (reads .ai-first/)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-sync-"));
    fs.mkdirSync(path.join(tmp, ".ai-first", "standards", "backend"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "knowledge"), { recursive: true });
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("picks up relatedPaths from standard frontmatter", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "standards", "backend", "STANDARD-012.md"),
      serializeWithFrontmatter(
        {
          id: "STANDARD-012",
          domain: "backend",
          title: "API Design",
          stability: "stable",
          severity: "must",
          relatedPaths: ["src/backend/"],
        },
        "# API Design\n",
      ),
    );
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "knowledge", "KNOW-1.yml"),
      serializeYaml({
        id: "KNOW-1",
        name: "auth model",
        relatedPaths: ["src/backend/auth.ts"],
      }),
    );
    const events = analyzeProjectImpact(["src/backend/auth.ts"], tmp);
    expect(events.some((e) => e.impactedStandardIds?.includes("STANDARD-012"))).toBe(true);
    expect(events.some((e) => e.impactedKnowledgeIds?.includes("KNOW-1"))).toBe(true);
  });
});
