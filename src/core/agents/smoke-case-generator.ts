// ⚠ EXPERIMENTAL / UNWIRED (§11.3): no /smoke command consumes this yet.
// Either wire it to a /smoke entry point or delete it (with its tests).
import type { ProjectStage } from "../models.ts";
import { nowIso } from "../../utils/time.ts";

export type SmokeTestPriority = "P0" | "P1" | "P2";

export type CriticalPath = {
  id: string;
  category:
    | "entrypoint"
    | "api"
    | "service"
    | "data"
    | "route"
    | "middleware"
    | "websocket"
    | "webhook"
    | "graphql"
    | "static";
  path: string;
  description: string;
  filePath?: string;
};

export type SmokeTestCase = {
  id: string;
  priority: SmokeTestPriority;
  path: string;
  description: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  expectedStatus?: number;
  expectedBodyContains?: string[];
  maxDurationMs: number;
  retry: number;
  failureAction: "rollback" | "hotfix" | "next_release";
};

export type SmokeTestPlan = {
  projectName: string;
  date: string;
  stage: ProjectStage;
  cases: SmokeTestCase[];
  executionOrder: {
    phase: string;
    priority: SmokeTestPriority;
    mode: "sequential" | "parallel";
    stopOnFailure: boolean;
  }[];
  rollbackCriteria: {
    p0Failures: number;
    p1Failures: number;
    action: string;
  }[];
};

const PRIORITY_RULES: Array<{
  priority: SmokeTestPriority;
  categories: CriticalPath["category"][];
  keywords: string[];
}> = [
  {
    priority: "P0",
    categories: ["entrypoint", "api", "middleware", "data"],
    keywords: [
      "health",
      "auth",
      "login",
      "startup",
      "bootstrap",
      "init",
      "database",
      "session",
      "token",
      "cors",
      "csrf",
      "rate-limit",
      "connection",
    ],
  },
  {
    priority: "P1",
    categories: ["service", "route", "websocket", "webhook", "graphql"],
    keywords: [
      "search",
      "upload",
      "download",
      "notification",
      "email",
      "payment",
      "checkout",
      "subscribe",
      "publish",
      "stream",
      "webhook",
      "query",
      "mutation",
      "cron",
      "job",
    ],
  },
];

export function classifyPriority(path: CriticalPath): SmokeTestPriority {
  const lowerDesc = path.description.toLowerCase();
  const lowerPath = path.path.toLowerCase();

  for (const rule of PRIORITY_RULES) {
    if (rule.categories.includes(path.category)) {
      for (const kw of rule.keywords) {
        if (lowerDesc.includes(kw) || lowerPath.includes(kw)) {
          return rule.priority;
        }
      }
      // Category matched but no keyword matched — continue to next rule
      // instead of auto-assigning the rule's priority
    }
  }

  // Fallback priorities by category
  if (path.category === "entrypoint" || path.category === "api" || path.category === "middleware")
    return "P0";
  if (
    path.category === "data" ||
    path.category === "service" ||
    path.category === "websocket" ||
    path.category === "webhook" ||
    path.category === "graphql"
  )
    return "P1";
  return "P2";
}

export function generateSmokeCases(paths: CriticalPath[], _stage?: ProjectStage): SmokeTestCase[] {
  const cases: SmokeTestCase[] = [];
  let counter = 1;

  for (const cp of paths) {
    const priority = classifyPriority(cp);
    const c = newCase(cp, priority, counter);
    cases.push(c);
    counter++;
  }

  return cases.sort((a, b) => {
    const order = { P0: 0, P1: 1, P2: 2 };
    return order[a.priority] - order[b.priority];
  });
}

function newCase(cp: CriticalPath, priority: SmokeTestPriority, index: number): SmokeTestCase {
  const id = `smoke-${String(index).padStart(3, "0")}`;

  const base: SmokeTestCase = {
    id,
    priority,
    path: cp.path,
    description: cp.description,
    maxDurationMs: priority === "P0" ? 2000 : priority === "P1" ? 5000 : 10000,
    retry: priority === "P0" ? 3 : priority === "P1" ? 2 : 1,
    failureAction: priority === "P0" ? "rollback" : priority === "P1" ? "hotfix" : "next_release",
  };

  switch (cp.category) {
    case "api":
      return {
        ...base,
        endpoint: cp.path,
        method: inferMethod(cp),
        expectedStatus: inferExpectedStatus(cp),
        expectedBodyContains: inferBodyContains(cp),
      };
    case "entrypoint":
      return {
        ...base,
        endpoint: "/",
        method: "GET",
        expectedStatus: 200,
      };
    case "route":
      return {
        ...base,
        endpoint: cp.path,
        method: "GET",
        expectedStatus: 200,
      };
    case "middleware":
      return {
        ...base,
        endpoint: cp.path,
        method: "GET",
        expectedStatus: inferExpectedStatus(cp),
        expectedBodyContains: inferBodyContains(cp),
      };
    case "websocket":
      return {
        ...base,
        endpoint: cp.path,
        method: "GET",
        expectedStatus: 101,
        maxDurationMs: priority === "P0" ? 5000 : priority === "P1" ? 8000 : 15000,
        expectedBodyContains: inferBodyContains(cp),
      };
    case "webhook":
      return {
        ...base,
        endpoint: cp.path,
        method: "POST",
        expectedStatus: 200,
        expectedBodyContains: ["received"],
      };
    case "graphql":
      return {
        ...base,
        endpoint: cp.path,
        method: "POST",
        expectedStatus: 200,
        expectedBodyContains: inferBodyContains(cp),
      };
    case "data":
      return {
        ...base,
        endpoint: cp.path,
        method: inferMethod(cp),
        expectedStatus: 200,
      };
    case "static":
      return {
        ...base,
        endpoint: cp.path,
        method: "GET",
        expectedStatus: 200,
        maxDurationMs: 3000,
      };
    default:
      return base;
  }
}

function inferMethod(cp: CriticalPath): "GET" | "POST" | "PUT" | "DELETE" | "PATCH" {
  const lower = cp.path.toLowerCase();
  if (lower.includes("create") || lower.includes("new") || lower.includes("submit")) return "POST";
  if (lower.includes("update") || lower.includes("edit") || lower.includes("modify")) return "PUT";
  if (lower.includes("delete") || lower.includes("remove") || lower.includes("destroy"))
    return "DELETE";
  if (lower.includes("patch") || lower.includes("partial")) return "PATCH";
  return "GET";
}

function inferExpectedStatus(cp: CriticalPath): number {
  const lower = cp.path.toLowerCase();
  if (lower.includes("create") || lower.includes("new")) return 201;
  if (lower.includes("login") || lower.includes("auth")) return 200;
  if (lower.includes("health")) return 200;
  if (lower.includes("rate-limit")) return 429;
  if (lower.includes("unauthorized") || lower.includes("forbidden")) return 403;
  return 200;
}

function inferBodyContains(cp: CriticalPath): string[] | undefined {
  const lower = cp.path.toLowerCase();
  if (lower.includes("health")) return ["status"];
  if (lower.includes("auth") || lower.includes("login")) return ["token"];
  if (lower.includes("search")) return ["results"];
  if (lower.includes("user") || lower.includes("profile")) return ["id"];
  if (lower.includes("payment") || lower.includes("checkout")) return ["status"];
  if (lower.includes("upload")) return ["url"];
  if (lower.includes("graphql") || lower.includes("query")) return ["data"];
  if (lower.includes("webhook")) return ["received"];
  if (lower.includes("stream") || lower.includes("subscribe") || lower.includes("event"))
    return ["event"];
  if (lower.includes("cors") || lower.includes("csrf")) return undefined;
  return undefined;
}

export function createSmokeTestPlan(
  projectName: string,
  stage: ProjectStage,
  cases: SmokeTestCase[],
): SmokeTestPlan {
  return {
    projectName,
    date: nowIso(),
    stage,
    cases,
    executionOrder: [
      { phase: "P0 Critical Path", priority: "P0", mode: "sequential", stopOnFailure: true },
      { phase: "P1 Major Features", priority: "P1", mode: "parallel", stopOnFailure: false },
      { phase: "P2 Edge Cases", priority: "P2", mode: "parallel", stopOnFailure: false },
    ],
    rollbackCriteria: [
      { p0Failures: 1, p1Failures: 0, action: "Automatic rollback — any P0 failure" },
      { p0Failures: 0, p1Failures: 2, action: "Recommend rollback — 2+ P1 failures" },
      { p0Failures: 0, p1Failures: 0, action: "Proceed — flag P2 issues for next release" },
    ],
  };
}

export function generateReport(plan: SmokeTestPlan): string {
  const p0 = plan.cases.filter((c) => c.priority === "P0");
  const p1 = plan.cases.filter((c) => c.priority === "P1");
  const p2 = plan.cases.filter((c) => c.priority === "P2");

  const lines: string[] = [
    `# Smoke Test Plan`,
    `**Project**: ${plan.projectName}`,
    `**Date**: ${plan.date}`,
    `**Stage**: ${plan.stage}`,
    ``,
    `## Summary`,
    `| Priority | Count | Failure Action |`,
    `|----------|-------|---------------|`,
    `| P0 | ${p0.length} | Rollback |`,
    `| P1 | ${p1.length} | Hotfix |`,
    `| P2 | ${p2.length} | Next release |`,
    ``,
  ];

  for (const [label, group] of [
    ["P0", p0],
    ["P1", p1],
    ["P2", p2],
  ] as const) {
    if (group.length === 0) continue;
    lines.push(`## ${label} Tests (${group.length})`, "");
    for (const c of group) {
      lines.push(
        `### ${c.id}: ${c.path}`,
        `- **Priority**: ${c.priority}`,
        `- **Description**: ${c.description}`,
        `- **Endpoint**: ${c.method ?? "GET"} ${c.endpoint ?? c.path}`,
        `- **Expected Status**: ${c.expectedStatus ?? 200}`,
        `- **Max Duration**: ${c.maxDurationMs}ms`,
        `- **Retry**: ${c.retry}`,
        `- **On Failure**: ${c.failureAction}`,
        "",
      );
    }
  }

  lines.push(
    `## Execution Order`,
    ...plan.executionOrder.map(
      (e) => `1. **${e.phase}** (${e.mode}) — stop on failure: ${e.stopOnFailure}`,
    ),
    "",
    `## Rollback Criteria`,
    ...plan.rollbackCriteria.map((r) => `- ${r.action}`),
    "",
    `---`,
    `*Generated by smoke-case-generator*`,
  );

  return lines.join("\n");
}

export function generateSmokeScript(
  plan: SmokeTestPlan,
  baseUrl = "http://localhost:3000",
): string {
  const lines: string[] = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    `BASE_URL="\${BASE_URL:-${baseUrl}}"`,
    "PASSED=0",
    "FAILED=0",
    "EXIT_CODE=0",
    "",
    "check() {",
    '  local name="$1" method="$2" path="$3" expected="$4"',
    "  local start=$(date +%s%N)",
    '  local status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$path" --max-time 10)',
    "  local end=$(date +%s%N)",
    "  local ms=$(( (end - start) / 1000000 ))",
    "",
    '  if [ "$status" = "$expected" ]; then',
    '    echo "  PASS [$name] ${status} (${ms}ms)"',
    "    PASSED=$((PASSED + 1))",
    "  else",
    '    echo "  FAIL [$name] expected ${expected}, got ${status} (${ms}ms)"',
    "    FAILED=$((FAILED + 1))",
    "    EXIT_CODE=1",
    "  fi",
    "}",
    "",
    'echo "=== SMOKE TEST: $(date) ==="',
    'echo "Target: $BASE_URL"',
    'echo ""',
    "",
  ];

  for (const c of plan.cases) {
    if (c.priority === "P0" && !c.endpoint) continue;

    if (c.priority === "P0") {
      lines.push("# P0 tests (stop on first failure)", "");
    } else if (c.priority === "P1") {
      lines.push("# P1 tests (continue on failure)", "");
    } else if (c.priority === "P2") {
      lines.push("# P2 tests (report only)", "");
    }

    const endpoint = c.endpoint ?? c.path;
    const method = c.method ?? "GET";
    const expected = c.expectedStatus ?? 200;

    lines.push(`check "${c.description}" "${method}" "${endpoint}" "${expected}"`);

    if (c.priority === "P0") {
      lines.push("if [ $EXIT_CODE -ne 0 ]; then");
      lines.push('  echo "P0 FAILURE: initiating rollback"');
      lines.push("  exit 1");
      lines.push("fi");
      lines.push("");
    }
  }

  lines.push(
    'echo ""',
    'echo "=== RESULTS ==="',
    'echo "Passed: $PASSED, Failed: $FAILED"',
    "exit $EXIT_CODE",
  );

  return lines.join("\n");
}
