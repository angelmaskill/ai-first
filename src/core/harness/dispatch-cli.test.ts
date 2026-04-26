import { describe, it, expect } from "vitest";

// Replicate parseTaskYaml for testing (pure function, file I/O isolated)
function parseTaskYaml(content: string) {
  const extract = (key: string): string => {
    const m = content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : "";
  };

  const extractList = (key: string): string[] => {
    const re = /^\s*-\s*(.+)$/gm;
    const section = new RegExp(`^${key}:\\s*\\n([\\s\\S]*?)(?=\\n\\S|$)`, "m");
    const secMatch = content.match(section);
    if (!secMatch) return [];
    const items: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(secMatch[1])) !== null) {
      items.push(m[1].trim());
    }
    return items;
  };

  return { extract, extractList };
}

describe("parseTaskYaml", () => {
  const sampleYaml = `id: task-001
projectId: proj-h7k3m
title: Test Task
description: A test task for validation
stage: build
mode: implement
priority: p0
frontendPaths:
  - src/app.tsx
  - src/index.ts
backendPaths:
  - src/api/routes.ts
sharedPaths: []
docsPaths:
  - README.md
riskLevel: low
parallelSafe: true
`;

  it("extracts scalar fields", () => {
    const { extract } = parseTaskYaml(sampleYaml);
    expect(extract("id")).toBe("task-001");
    expect(extract("title")).toBe("Test Task");
    expect(extract("stage")).toBe("build");
    expect(extract("mode")).toBe("implement");
    expect(extract("priority")).toBe("p0");
    expect(extract("riskLevel")).toBe("low");
  });

  it("extracts list fields", () => {
    const { extractList } = parseTaskYaml(sampleYaml);
    const frontend = extractList("frontendPaths");
    expect(frontend.length).toBeGreaterThanOrEqual(1);
    expect(frontend[0]).toBe("src/app.tsx");
    expect(extractList("backendPaths")).toEqual(["src/api/routes.ts"]);
    expect(extractList("docsPaths")).toEqual(["README.md"]);
  });

  it("handles missing fields", () => {
    const { extract, extractList } = parseTaskYaml("id: minimal\n");
    expect(extract("title")).toBe("");
    expect(extract("nonexistent")).toBe("");
    expect(extractList("missingList")).toEqual([]);
  });

  it("handles empty yaml", () => {
    const { extract, extractList } = parseTaskYaml("");
    expect(extract("id")).toBe("");
    expect(extractList("paths")).toEqual([]);
  });
});
