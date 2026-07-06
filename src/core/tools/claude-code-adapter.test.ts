import { describe, it, expect, beforeEach } from "vitest";
import { ClaudeCodeAdapter, createClaudeCodeAdapter } from "./claude-code-adapter.ts";
import type { ToolMessage } from "./tool-adapter-protocol.ts";

function makeMsg(overrides?: Partial<ToolMessage>): ToolMessage {
  return {
    type: "invoke",
    source: "orchestrator",
    target: "claude-code",
    payload: { action: "test" },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("ClaudeCodeAdapter", () => {
  let adapter: ClaudeCodeAdapter;

  beforeEach(() => {
    adapter = new ClaudeCodeAdapter("test-cc");
  });

  describe("construction", () => {
    it("uses provided id", () => {
      expect(adapter.id).toBe("test-cc");
    });

    it("generates id when not provided", () => {
      const a = new ClaudeCodeAdapter();
      expect(a.id).toMatch(/^claude-code-/);
    });

    it("starts disconnected", () => {
      expect(adapter.status).toBe("disconnected");
    });

    it("has correct toolName", () => {
      expect(adapter.toolName).toBe("Claude Code");
    });
  });

  describe("capabilities", () => {
    it("supports all sub-agent and skill features", () => {
      expect(adapter.capabilities.subAgents).toBe(true);
      expect(adapter.capabilities.skillIntegration).toBe(true);
      expect(adapter.capabilities.reviewMode).toBe(true);
      expect(adapter.capabilities.memoryMode).toBe("hybrid");
      expect(adapter.capabilities.slashCommands).toBe(true);
    });
  });

  describe("supported stages and roles", () => {
    it("supports all 10 lifecycle stages", () => {
      expect(adapter.supportedStages).toHaveLength(10);
      expect(adapter.supportedStages).toContain("idea");
      expect(adapter.supportedStages).toContain("evolve");
    });

    it("supports all 15 agent roles", () => {
      expect(adapter.supportedRoles).toHaveLength(15);
      expect(adapter.supportedRoles).toContain("builder");
      expect(adapter.supportedRoles).toContain("security_reviewer");
      expect(adapter.supportedRoles).toContain("smoke_case");
    });
  });

  describe("connect", () => {
    it("sets status to healthy on connect", async () => {
      await adapter.connect();
      expect(adapter.status).toBe("healthy");
    });
  });

  describe("disconnect", () => {
    it("sets status to disconnected", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.status).toBe("disconnected");
    });
  });

  describe("send", () => {
    it("returns error when not connected", async () => {
      const resp = await adapter.send(makeMsg());
      expect(resp.type).toBe("error");
      expect(resp.payload.error).toContain("not healthy");
    });

    it("returns response with echoed payload when healthy", async () => {
      await adapter.connect();
      const msg = makeMsg({ payload: { action: "my-test", data: 42 } });
      const resp = await adapter.send(msg);
      expect(resp.type).toBe("response");
      expect(resp.payload.ok).toBe(true);
      expect(resp.payload.echo).toEqual(msg.payload);
    });

    it("preserves correlationId", async () => {
      await adapter.connect();
      const msg = makeMsg({ correlationId: "corr-42" });
      const resp = await adapter.send(msg);
      expect(resp.correlationId).toBe("corr-42");
    });

    it("uses adapter id as source in response", async () => {
      await adapter.connect();
      const resp = await adapter.send(makeMsg());
      expect(resp.source).toBe("test-cc");
    });
  });

  describe("query", () => {
    it("queries capabilities", async () => {
      const resp = await adapter.query("capabilities");
      expect(resp.type).toBe("response");
      expect(resp.payload.data).toEqual(adapter.capabilities);
    });

    it("queries health", async () => {
      const resp = await adapter.query("health");
      expect(resp.payload.data).toEqual({ status: "disconnected" });
    });

    it("queries profile", async () => {
      const resp = await adapter.query("profile");
      const data = resp.payload.data as any;
      expect(data.toolName).toBe("Claude Code");
      expect(data.supportedStages).toHaveLength(10);
      expect(data.supportedRoles).toHaveLength(15);
    });

    it("passes through unknown resources with params", async () => {
      const resp = await adapter.query("unknown", { foo: "bar" });
      expect(resp.payload.foo).toBe("bar");
      expect(resp.payload.resource).toBe("unknown");
    });
  });

  describe("healthCheck", () => {
    it("returns healthy and updates status", async () => {
      const status = await adapter.healthCheck();
      expect(status).toBe("healthy");
      expect(adapter.status).toBe("healthy");
    });
  });
});

describe("createClaudeCodeAdapter", () => {
  it("factory creates adapter with generated id", () => {
    const a = createClaudeCodeAdapter();
    expect(a).toBeInstanceOf(ClaudeCodeAdapter);
    expect(a.id).toMatch(/^claude-code-/);
  });

  it("factory accepts custom id", () => {
    const a = createClaudeCodeAdapter("my-id");
    expect(a.id).toBe("my-id");
  });
});

describe("ClaudeCodeAdapter.executePrompt (M-4)", () => {
  it("dry-run returns a synthetic result without spawning a process", async () => {
    const adapter = new ClaudeCodeAdapter("dry-cc-prompt", {
      cliPath: "/never/invoked",
      executionMode: "dry-run",
    });
    const result = await adapter.executePrompt("do something useful");
    expect(result.executionMode).toBe("dry-run");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toBe("<dry-run>");
    expect(result.command.join(" ")).toContain("do something useful");
    expect(result.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.finishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("exec mode returns real stdout/stderr and exit 0 on success", async () => {
    const script = "console.log(JSON.stringify({ ok: true }));";
    const adapter = new ClaudeCodeAdapter("exec-cc-prompt", {
      cliPath: process.execPath,
      execArgs: ["-e", script],
      executionMode: "exec",
    });
    const result = await adapter.executePrompt("the prompt payload");
    expect(result.executionMode).toBe("exec");
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toContain('"ok":true');
    expect(result.command[0]).toBe(process.execPath);
    expect(result.command.at(-1)).toBe("the prompt payload");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures non-zero exit without throwing", async () => {
    const adapter = new ClaudeCodeAdapter("failing-cc-prompt", {
      cliPath: process.execPath,
      execArgs: ["-e", 'console.error("boom"); process.exit(7);'],
      executionMode: "exec",
    });
    const result = await adapter.executePrompt("anything");
    expect(result.exitCode).toBe(7);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("boom");
  });

  it("reports timedOut=true and exit 124 when the child exceeds timeoutMs", async () => {
    const adapter = new ClaudeCodeAdapter("slow-cc-prompt", {
      cliPath: process.execPath,
      execArgs: ["-e", "setTimeout(() => process.exit(0), 5000);"],
      executionMode: "exec",
      timeoutMs: 300,
    });
    const result = await adapter.executePrompt("slow");
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
    expect(result.executionMode).toBe("exec");
  });
});
