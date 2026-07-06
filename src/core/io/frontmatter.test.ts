import { describe, it, expect } from "vitest";
import { parseFrontmatter, serializeWithFrontmatter } from "./frontmatter.ts";

describe("io/frontmatter", () => {
  it("parses frontmatter and body", () => {
    const text = [
      "---",
      "id: STANDARD-014",
      "domain: algorithm",
      "title: Algorithm Reproducibility",
      "stability: stable",
      "severity: must",
      "relatedPaths:",
      "  - algorithms/",
      "  - algorithms/eval.py",
      "---",
      "# Algorithm Reproducibility",
      "",
      "All eval scripts must be deterministic.",
    ].join("\n");
    const parsed = parseFrontmatter(text);
    expect(parsed.frontmatter).toEqual({
      id: "STANDARD-014",
      domain: "algorithm",
      title: "Algorithm Reproducibility",
      stability: "stable",
      severity: "must",
      relatedPaths: ["algorithms/", "algorithms/eval.py"],
    });
    expect(parsed.body).toContain("# Algorithm Reproducibility");
    expect(parsed.body).toContain("deterministic");
  });

  it("returns null frontmatter when file has no fence", () => {
    const text = "# Just markdown\n\nNo frontmatter here.";
    const parsed = parseFrontmatter(text);
    expect(parsed.frontmatter).toBeNull();
    expect(parsed.body).toBe(text);
  });

  it("returns null frontmatter when fence is never closed", () => {
    const text = "---\nid: dangling\n";
    const parsed = parseFrontmatter(text);
    expect(parsed.frontmatter).toBeNull();
  });

  it("round-trips frontmatter + body", () => {
    const fm = {
      id: "STANDARD-001",
      domain: "fullstack",
      title: "API Contract Consistency",
      stability: "draft",
      severity: "should",
      relatedPaths: ["src/api/", "src/clients/"],
    };
    const body = "# API Contract Consistency\n\nSome guidance.";
    const serialized = serializeWithFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body).toBe(body);
  });
});
