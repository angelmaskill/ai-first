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

const rateLimitMiddleware: CriticalPath = {
  id: "cp-8",
  category: "middleware",
  path: "/api/rate-limit",
  description: "Rate limiting middleware blocks excessive requests",
};

const corsMiddleware: CriticalPath = {
  id: "cp-9",
  category: "middleware",
  path: "/api/cors",
  description: "CORS headers are set correctly",
};

const wsEndpoint: CriticalPath = {
  id: "cp-10",
  category: "websocket",
  path: "/ws/events",
  description: "WebSocket event stream endpoint",
};

const webhookReceiver: CriticalPath = {
  id: "cp-11",
  category: "webhook",
  path: "/webhooks/stripe",
  description: "Stripe webhook receiver",
};

const graphqlEndpoint: CriticalPath = {
  id: "cp-12",
  category: "graphql",
  path: "/graphql",
  description: "GraphQL query endpoint",
};

const createApi: CriticalPath = {
  id: "cp-13",
  category: "api",
  path: "/api/users/create",
  description: "Create new user",
};

const deleteApi: CriticalPath = {
  id: "cp-14",
  category: "api",
  path: "/api/users/delete",
  description: "Delete user account",
};

const staticFile: CriticalPath = {
  id: "cp-15",
  category: "static",
  path: "/assets/bundle.js",
  description: "Static asset delivery",
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

  it("classifies data layer as P0 (database keyword now P0)", () => {
    expect(classifyPriority(dbLayer)).toBe("P0");
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

describe("new categories", () => {
  it("classifies rate-limit middleware as P0", () => {
    expect(classifyPriority(rateLimitMiddleware)).toBe("P0");
  });

  it("classifies CORS middleware as P0 via fallback", () => {
    expect(classifyPriority(corsMiddleware)).toBe("P0");
  });

  it("classifies websocket as P1", () => {
    expect(classifyPriority(wsEndpoint)).toBe("P1");
  });

  it("classifies webhook as P1", () => {
    expect(classifyPriority(webhookReceiver)).toBe("P1");
  });

  it("classifies graphql as P1", () => {
    expect(classifyPriority(graphqlEndpoint)).toBe("P1");
  });

  it("classifies static as P2", () => {
    expect(classifyPriority(staticFile)).toBe("P2");
  });

  it("classifies database keyword under data as P0", () => {
    const dbPath: CriticalPath = {
      id: "cp-db",
      category: "data",
      path: "/api/database/status",
      description: "Database health check",
    };
    expect(classifyPriority(dbPath)).toBe("P0");
  });
});

describe("method inference", () => {
  it("infers POST for create paths", () => {
    const cases = generateSmokeCases([createApi]);
    expect(cases[0].method).toBe("POST");
    expect(cases[0].expectedStatus).toBe(201);
  });

  it("infers DELETE for delete paths", () => {
    const cases = generateSmokeCases([deleteApi]);
    expect(cases[0].method).toBe("DELETE");
  });

  it("infers POST for webhook category", () => {
    const cases = generateSmokeCases([webhookReceiver]);
    expect(cases[0].method).toBe("POST");
    expect(cases[0].expectedBodyContains).toEqual(["received"]);
  });

  it("infers POST for graphql category", () => {
    const cases = generateSmokeCases([graphqlEndpoint]);
    expect(cases[0].method).toBe("POST");
  });
});

describe("status code inference", () => {
  it("returns 101 for websocket upgrade", () => {
    const cases = generateSmokeCases([wsEndpoint]);
    expect(cases[0].expectedStatus).toBe(101);
  });

  it("returns 429 for rate-limit middleware", () => {
    const cases = generateSmokeCases([rateLimitMiddleware]);
    expect(cases[0].expectedStatus).toBe(429);
  });
});

describe("body content inference", () => {
  it("returns [token] for auth endpoints", () => {
    const cases = generateSmokeCases([authApi]);
    expect(cases[0].expectedBodyContains).toEqual(["token"]);
  });

  it("returns [data] for graphql endpoints", () => {
    const cases = generateSmokeCases([graphqlEndpoint]);
    expect(cases[0].expectedBodyContains).toEqual(["data"]);
  });

  it("returns undefined for CORS paths", () => {
    const cases = generateSmokeCases([corsMiddleware]);
    expect(cases[0].expectedBodyContains).toBeUndefined();
  });

  it("returns [event] for websocket stream paths", () => {
    const cases = generateSmokeCases([wsEndpoint]);
    expect(cases[0].expectedBodyContains).toEqual(["event"]);
  });
});

describe("static asset cases", () => {
  it("sets fast maxDuration for static files", () => {
    const cases = generateSmokeCases([staticFile]);
    expect(cases[0].maxDurationMs).toBe(3000);
  });

  it("uses GET method for static files", () => {
    const cases = generateSmokeCases([staticFile]);
    expect(cases[0].method).toBe("GET");
    expect(cases[0].expectedStatus).toBe(200);
  });
});

describe("expanded priority keywords", () => {
  it("classifies connection keyword as P0", () => {
    const conn: CriticalPath = {
      id: "cp-conn",
      category: "api",
      path: "/api/connection/pool",
      description: "Connection pool status",
    };
    expect(classifyPriority(conn)).toBe("P0");
  });

  it("classifies stream keyword as P1", () => {
    const stream: CriticalPath = {
      id: "cp-stream",
      category: "websocket",
      path: "/ws/stream",
      description: "Real-time data stream",
    };
    expect(classifyPriority(stream)).toBe("P1");
  });

  it("classifies cron job as P1", () => {
    const cron: CriticalPath = {
      id: "cp-cron",
      category: "service",
      path: "/jobs/cleanup",
      description: "Nightly cleanup cron job",
    };
    expect(classifyPriority(cron)).toBe("P1");
  });
});
