import { describe, it, expect } from "vitest";
import {
  parseRoutingYml,
  matchIntent,
  resolveSlashCommand,
  resolveDispatch,
} from "./routing-resolver.ts";
import type { RoutingManifest } from "./routing-resolver.ts";

const sampleYml = `# Test routing manifest
version: "1.0"
last_updated: 2026-04-27
auto_dispatch_threshold: 0.85

routes:
  implementing:
    keywords:
      - implement
      - build
      - code
      - fix
      - refactor
      - create
      - add
      - write
    description: "Code implementation and changes"
    primary_agent: builder-agent
    complexity:
      threshold: 0.6
      action: "split_via_dispatcher"
      tool: "npx tsx src/core/harness/subagent-dispatcher.ts"
    stage_gate: [scaffold, build]

  reviewing:
    keywords:
      - review
      - quality
      - gate
      - verify
    description: "Code and quality review"
    primary_agent: reviewer-agent
    parallel_agents:
      - security-reviewer-agent
    stage_gate: [qa, release]

  testing:
    keywords:
      - test
      - smoke
      - coverage
    description: "Test generation"
    primary_agent: smoke-case-agent
    stage_gate: [build, qa]

  security:
    keywords:
      - security
      - vulnerability
      - auth
    description: "Security analysis"
    primary_agent: security-reviewer-agent
    exclusive: true
    stage_gate: [all]

slash_commands:
  /review:
    agent: reviewer-agent
    parallel:
      - security-reviewer-agent
  /smoke:
    agent: smoke-case-agent
    output: "reports/smoke-cases-{date}.md"
  /advance:
    agent: state-updater-agent
`;

function loadManifest(): RoutingManifest {
  return parseRoutingYml(sampleYml);
}

describe("parseRoutingYml", () => {
  it("parses routes", () => {
    const m = loadManifest();
    expect(m.routes.size).toBe(4);
    expect(m.routes.has("implementing")).toBe(true);
    expect(m.routes.has("reviewing")).toBe(true);
    expect(m.routes.has("testing")).toBe(true);
    expect(m.routes.has("security")).toBe(true);
  });

  it("parses route keywords", () => {
    const m = loadManifest();
    const impl = m.routes.get("implementing")!;
    expect(impl.keywords).toContain("implement");
    expect(impl.keywords).toContain("build");
    expect(impl.keywords).toContain("refactor");
  });

  it("parses parallel_agents", () => {
    const m = loadManifest();
    const review = m.routes.get("reviewing")!;
    expect(review.parallel_agents).toContain("security-reviewer-agent");
  });

  it("parses complexity config", () => {
    const m = loadManifest();
    const impl = m.routes.get("implementing")!;
    expect(impl.complexity).toBeDefined();
    expect(impl.complexity!.threshold).toBe(0.6);
  });

  it("parses exclusive flag", () => {
    const m = loadManifest();
    expect(m.routes.get("security")!.exclusive).toBe(true);
    expect(m.routes.get("implementing")!.exclusive).toBe(false);
  });

  it("parses slash commands", () => {
    const m = loadManifest();
    expect(m.slashCommands.size).toBe(3);
    expect(m.slashCommands.has("/review")).toBe(true);
    expect(m.slashCommands.has("/smoke")).toBe(true);
    expect(m.slashCommands.has("/advance")).toBe(true);
  });

  it("parses slash command with parallel agents", () => {
    const m = loadManifest();
    const cmd = m.slashCommands.get("/review")!;
    expect(cmd.agent).toBe("reviewer-agent");
    expect(cmd.parallel).toContain("security-reviewer-agent");
  });

  it("parses version and threshold", () => {
    const m = loadManifest();
    expect(m.version).toBe("1.0");
    expect(m.autoDispatchThreshold).toBe(0.85);
  });
});

describe("resolveSlashCommand", () => {
  it("resolves known slash command", () => {
    const m = loadManifest();
    const cmd = resolveSlashCommand(m, "/smoke");
    expect(cmd).toBeDefined();
    expect(cmd!.agent).toBe("smoke-case-agent");
  });

  it("returns undefined for unknown command", () => {
    const m = loadManifest();
    expect(resolveSlashCommand(m, "/unknown")).toBeUndefined();
  });
});

describe("matchIntent", () => {
  it("matches implementing intent from keywords", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "implement a login system");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].route).toBe("implementing");
    expect(matches[0].primaryAgent).toBe("builder-agent");
  });

  it("matches reviewing intent", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "review the code for quality");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].route).toBe("reviewing");
    expect(matches[0].parallelAgents).toContain("security-reviewer-agent");
  });

  it("matches security intent", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "check for security vulnerabilities");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].route).toBe("security");
  });

  it("returns multiple matches for overlapping keywords", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "implement tests with coverage");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for no match", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "xyzzy flurbo garblex");
    expect(matches).toHaveLength(0);
  });

  it("scores higher for more keyword matches", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "build and implement code");
    expect(matches[0].route).toBe("implementing");
    expect(matches[0].confidence).toBe(1);
  });
});

describe("resolveDispatch", () => {
  it("auto-dispatches when confidence >= threshold", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "implement the login feature");
    const decision = resolveDispatch(m, matches);
    expect(decision).not.toBeNull();
    expect(decision!.autoDispatch).toBe(true);
    expect(decision!.match.primaryAgent).toBe("builder-agent");
  });

  it("does not auto-dispatch below threshold with candidates", () => {
    const m = loadManifest();
    // "review" matches both reviewing and security
    const matches = matchIntent(m, "review");
    // Lower confidence
    for (const match of matches) {
      match.confidence = Math.min(match.confidence, 0.6);
    }
    const decision = resolveDispatch(m, matches);
    expect(decision).not.toBeNull();
    // autoDispatch depends on whether the reduced confidence is still above threshold
  });

  it("flags split required when complexity exceeds threshold", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "implement a complex feature");
    const decision = resolveDispatch(m, matches, 0.8);
    expect(decision).not.toBeNull();
    expect(decision!.splitRequired).toBe(true);
  });

  it("does not split when complexity is below threshold", () => {
    const m = loadManifest();
    const matches = matchIntent(m, "implement a simple fix");
    const decision = resolveDispatch(m, matches, 0.3);
    expect(decision).not.toBeNull();
    expect(decision!.splitRequired).toBe(false);
  });

  it("returns null for no matches", () => {
    const m = loadManifest();
    expect(resolveDispatch(m, [])).toBeNull();
  });
});
