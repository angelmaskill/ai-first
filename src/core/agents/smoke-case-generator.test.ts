import { describe, it, expect } from "vitest";
import {
  classifyPriority,
  generateSmokeCases,
  createSmokeTestPlan,
  generateReport,
  generateSmokeScript,
} from "./smoke-case-generator.ts";
import type { CriticalPath } from "./smoke-case-generator.ts";

const healthApi: CriticalPath = {
  id: "cp-1",
  category: "api",
  path: "/api/health",
  description: "Health check endpoint returns 200",
};

const authApi: CriticalPath = {
  id: "cp-2",
  category: "api",
  path: "/api/auth/login",
  description: "Authentication login endpoint",
};

const searchService: CriticalPath = {
  id: "cp-3",
  category: "service",
  path: "/api/search",
  description: "Search service returns paginated results",
};

const uploadRoute: CriticalPath = {
  id: "cp-4",
  category: "route",
  path: "/profile",
  description: "User profile page",
};

const dbLayer: CriticalPath = {
  id: "cp-5",
  category: "data",
  path: "database",
  description: "Database connection pool",
};

const appEntry: CriticalPath = {
  id: "cp-6",
  category: "entrypoint",
  path: "/",
  description: "App serves main page on startup",
};

const adminRoute: CriticalPath = {
  id: "cp-7",
  category: "route",
  path: "/admin/dashboard",
  description: "Admin dashboard loads",
};

describe("classifyPriority", () => {
  it("classifies health API as P0", () => {
    expect(classifyPriority(healthApi)).toBe("P0");
  });

  it("classifies auth API as P0", () => {
    expect(classifyPriority(authApi)).toBe("P0");
  });

  it("classifies entrypoint as P0", () => {
    expect(classifyPriority(appEntry)).toBe("P0");
  });

  it("classifies search service as P1", () => {
    expect(classifyPriority(searchService)).toBe("P1");
  });

  it("classifies data layer as P1", () => {
    expect(classifyPriority(dbLayer)).toBe("P1");
  });

  it("classifies generic routes as P2", () => {
    expect(classifyPriority(uploadRoute)).toBe("P2");
  });

  it("classifies admin dashboard as P2", () => {
    expect(classifyPriority(adminRoute)).toBe("P2");
  });
});

describe("generateSmokeCases", () => {
  it("generates cases sorted by priority (P0 first)", () => {
    const paths = [adminRoute, healthApi, uploadRoute];
    const cases = generateSmokeCases(paths);

    expect(cases).toHaveLength(3);
    // After sort: P0 healthApi, then P2 adminRoute and uploadRoute
    expect(cases[0].priority).toBe("P0");
    expect(cases[0].path).toBe("/api/health");
    expect(cases[1].priority).toBe("P2");
    expect(cases[2].priority).toBe("P2");
    // IDs are sequential regardless of sort order
    const ids = cases.map((c) => c.id).sort();
    expect(ids).toEqual(["smoke-001", "smoke-002", "smoke-003"]);
  });

  it("assigns sequential IDs", () => {
    const paths = [healthApi, authApi, searchService];
    const cases = generateSmokeCases(paths);

    expect(cases.map((c) => c.id)).toEqual(["smoke-001", "smoke-002", "smoke-003"]);
  });

  it("sets rollback failure action for P0", () => {
    const cases = generateSmokeCases([healthApi]);
    expect(cases[0].failureAction).toBe("rollback");
    expect(cases[0].retry).toBe(3);
    expect(cases[0].maxDurationMs).toBe(2000);
  });

  it("sets hotfix failure action for P1", () => {
    const cases = generateSmokeCases([searchService]);
    expect(cases[0].failureAction).toBe("hotfix");
    expect(cases[0].retry).toBe(2);
  });

  it("sets next_release failure action for P2", () => {
    const cases = generateSmokeCases([adminRoute]);
    expect(cases[0].failureAction).toBe("next_release");
  });

  it("infers endpoint and method for API paths", () => {
    const cases = generateSmokeCases([healthApi]);
    expect(cases[0].endpoint).toBe("/api/health");
    expect(cases[0].method).toBe("GET");
    expect(cases[0].expectedStatus).toBe(200);
  });

  it("infers body contains for health endpoint", () => {
    const cases = generateSmokeCases([healthApi]);
    expect(cases[0].expectedBodyContains).toEqual(["status"]);
  });

  it("handles empty paths", () => {
    const cases = generateSmokeCases([]);
    expect(cases).toHaveLength(0);
  });
});

describe("createSmokeTestPlan", () => {
  it("creates a plan with execution order", () => {
    const cases = generateSmokeCases([healthApi, searchService, adminRoute]);
    const plan = createSmokeTestPlan("test-project", "release", cases);

    expect(plan.projectName).toBe("test-project");
    expect(plan.stage).toBe("release");
    expect(plan.executionOrder).toHaveLength(3);
    expect(plan.executionOrder[0].stopOnFailure).toBe(true);
    expect(plan.rollbackCriteria).toHaveLength(3);
  });
});

describe("generateReport", () => {
  it("produces markdown with summary table", () => {
    const cases = generateSmokeCases([healthApi, searchService, adminRoute]);
    const plan = createSmokeTestPlan("test-project", "release", cases);
    const report = generateReport(plan);

    expect(report).toContain("# Smoke Test Plan");
    expect(report).toContain("**Project**: test-project");
    expect(report).toContain("| P0 | 1 | Rollback |");
    expect(report).toContain("| P1 | 1 | Hotfix |");
    expect(report).toContain("| P2 | 1 | Next release |");
    expect(report).toContain("smoke-001");
    expect(report).toContain("smoke-002");
    expect(report).toContain("smoke-003");
  });

  it("skips empty priority groups", () => {
    const cases = generateSmokeCases([healthApi]);
    const plan = createSmokeTestPlan("test-project", "release", cases);
    const report = generateReport(plan);

    expect(report).not.toContain("P1 Tests");
    expect(report).not.toContain("P2 Tests");
  });
});

describe("generateSmokeScript", () => {
  it("generates a bash script with check function", () => {
    const cases = generateSmokeCases([healthApi, searchService]);
    const plan = createSmokeTestPlan("test-project", "release", cases);
    const script = generateSmokeScript(plan);

    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain("check() {");
    expect(script).toContain('check "Health check endpoint returns 200"');
    expect(script).toContain('check "Search service returns paginated results"');
    expect(script).toContain("BASE_URL=");
  });

  it("adds rollback guard for P0 failures", () => {
    const cases = generateSmokeCases([healthApi]);
    const plan = createSmokeTestPlan("test-project", "release", cases);
    const script = generateSmokeScript(plan);

    expect(script).toContain("P0 FAILURE: initiating rollback");
    expect(script).toContain("exit 1");
  });

  it("accepts custom base URL", () => {
    const cases = generateSmokeCases([healthApi]);
    const plan = createSmokeTestPlan("test-project", "release", cases);
    const script = generateSmokeScript(plan, "https://staging.example.com");

    expect(script).toContain("https://staging.example.com");
  });

  it("handles empty cases", () => {
    const plan = createSmokeTestPlan("test-project", "release", []);
    const script = generateSmokeScript(plan);

    expect(script).toContain("#!/usr/bin/env bash");
    expect(script).toContain("exit $EXIT_CODE");
  });
});
