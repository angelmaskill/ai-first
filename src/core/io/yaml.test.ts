import { describe, it, expect } from "vitest";
import { serializeYaml, parseYaml } from "./yaml.ts";

function roundTrip(value: unknown): unknown {
  return parseYaml(serializeYaml(value));
}

describe("io/yaml serialize+parse round-trip", () => {
  it("round-trips scalars", () => {
    expect(roundTrip({ a: "hello", b: 42, c: true, d: false, e: null })).toEqual({
      a: "hello",
      b: 42,
      c: true,
      d: false,
      e: null,
    });
  });

  it("round-trips strings that look like other types", () => {
    expect(roundTrip({ id: "proj-001", count: "12", flag: "true", empty: "" })).toEqual({
      id: "proj-001",
      count: "12",
      flag: "true",
      empty: "",
    });
  });

  it("round-trips strings containing special characters", () => {
    expect(roundTrip({ note: "a: b # c", dash: "- leading", bracket: "[x]" })).toEqual({
      note: "a: b # c",
      dash: "- leading",
      bracket: "[x]",
    });
  });

  it("round-trips block arrays of scalars", () => {
    expect(roundTrip({ paths: ["src/a.ts", "src/b.ts", "src/c.ts"] })).toEqual({
      paths: ["src/a.ts", "src/b.ts", "src/c.ts"],
    });
  });

  it("round-trips empty array and empty object", () => {
    expect(roundTrip({ emptyArr: [], emptyObj: {} })).toEqual({
      emptyArr: [],
      emptyObj: {},
    });
  });

  it("round-trips nested objects (≤3 levels)", () => {
    const value = {
      outer: { inner: { leaf: "value", n: 3 }, sibling: true },
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it("round-trips arrays of objects (Task/codeDomains shape)", () => {
    const value = {
      codeDomains: [
        { id: "domain-frontend", name: "Frontend", kind: "frontend", paths: ["src/frontend/"] },
        { id: "domain-backend", name: "Backend", kind: "backend", paths: ["src/"] },
      ],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it("round-trips inline {k: v} objects via nested mapping", () => {
    const value = { binding: { role: "builder", agent: "builder-agent" } };
    expect(roundTrip(value)).toEqual(value);
  });

  it("round-trips ExecutionReport-like nested arrays of objects", () => {
    const value = {
      scopeViolations: [
        { path: "src/x.ts", severity: "review", reason: "out of scope" },
        { path: "README.md", severity: "risk", reason: "doc" },
      ],
      acceptanceResults: [
        { criterionId: "ac-1", passed: true, detail: "ok" },
        { criterionId: "ac-2", passed: false, detail: "nope" },
      ],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it("round-trips StageRule-like with params Record<string, unknown>", () => {
    const value = {
      rules: [
        {
          stage: "build",
          enterWhen: [
            {
              kind: "file_pattern",
              params: { include: ["src/**", "apps/*/src/**"] },
              weight: 0.3,
              humanHint: "源码",
            },
          ],
        },
      ],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it("preserves key order (stable serialization)", () => {
    const text = serializeYaml({ z: 1, a: 2, m: 3 });
    const lines = text
      .trim()
      .split("\n")
      .map((l: string) => l.trim());
    expect(lines).toEqual(["z: 1", "a: 2", "m: 3"]);
  });

  it("strips standalone comments on parse", () => {
    const text = ["# header comment", "id: x", "", "# middle", "name: y"].join("\n");
    expect(parseYaml(text)).toEqual({ id: "x", name: "y" });
  });

  it("strips line-end comments on parse", () => {
    const text = ["id: x # the id", "name: y # the name"].join("\n");
    expect(parseYaml(text)).toEqual({ id: "x", name: "y" });
  });

  it("parses folded scalar (>- and >) by joining lines with spaces", () => {
    const text = [
      "description: >-",
      "  An intelligent orchestration layer",
      "  that guides projects.",
      "mode: brownfield",
    ].join("\n");
    const parsed = parseYaml(text) as { description: string; mode: string };
    expect(parsed.description).toContain("An intelligent orchestration layer");
    expect(parsed.description).toContain("that guides projects.");
    expect(parsed.mode).toBe("brownfield");
  });

  it("parses both > and >- as folded scalars in the supported YAML subset", () => {
    const folded = parseYaml(["description: >", "  first line", "  second line"].join("\n")) as {
      description: string;
    };
    const stripped = parseYaml(["description: >-", "  first line", "  second line"].join("\n")) as {
      description: string;
    };
    expect(folded.description).toBe("first line second line");
    expect(stripped.description).toBe("first line second line");
  });

  it("parses the existing project.yml format", () => {
    const text = [
      "id: proj-h7k3m",
      "name: AI-First",
      "description: >-",
      "  Multi-line description here.",
      "  Second line.",
      "mode: brownfield",
      "tags: [ai, orchestration, multi-agent]",
      "codeDomains:",
      "  - id: domain-frontend",
      "    name: Frontend",
      "    kind: frontend",
      "    paths: [src/frontend/]",
      "currentStage: build",
    ].join("\n");
    const parsed = parseYaml(text) as Record<string, unknown>;
    expect(parsed.id).toBe("proj-h7k3m");
    expect(parsed.tags).toEqual(["ai", "orchestration", "multi-agent"]);
    const domains = parsed.codeDomains as Array<Record<string, unknown>>;
    expect(domains[0]).toEqual({
      id: "domain-frontend",
      name: "Frontend",
      kind: "frontend",
      paths: ["src/frontend/"],
    });
    expect(parsed.currentStage).toBe("build");
  });

  it("throws a clear error on unsupported literal block scalar (|)", () => {
    expect(() => parseYaml("text: |\n  line\n")).toThrow(/literal block|not supported/i);
  });
});
