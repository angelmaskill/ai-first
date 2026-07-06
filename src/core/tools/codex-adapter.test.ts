import { describe, it, expect, beforeEach } from "vitest";
import { CodexAdapter, createCodexAdapter } from "./codex-adapter.ts";
import type { ToolMessage } from "./tool-adapter-protocol.ts";

function makeMsg(overrides?: Partial<ToolMessage>): ToolMessage {
  return {
    type: "invoke",
    source: "orchestrator",
    target: "codex",
    payload: { action: "test" },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("CodexAdapter", () => {
  let adapter: CodexAdapter;

  beforeEach(() => {
    adapter = new CodexAdapter("test-codex", {
      cliPath: process.execPath,
      versionArgs: ["--version"],
    });
  });

  describe("construction", () => {
    it("uses provided id", () => {
      expect(adapter.id).toBe("test-codex");
    });

    it("generates id when not provided", () => {
      const a = new CodexAdapter();
      expect(a.id).toMatch(/^codex-/);
    });

    it("starts disconnected", () => {
      expect(adapter.status).toBe("disconnected");
    });
  });

  describe("capabilities", () => {
    it("does not support sub-agents or skill integration", () => {
      expect(adapter.capabilities.subAgents).toBe(false);
      expect(adapter.capabilities.skillIntegration).toBe(false);
      expect(adapter.capabilities.reviewMode).toBe(false);
      expect(adapter.capabilities.memoryMode).toBe("session");
    });
  });

  describe("supported stages and roles", () => {
    it("supports only execution-oriented stages", () => {
      expect(adapter.supportedStages).toContain("scaffold");
      expect(adapter.supportedStages).toContain("build");
      expect(adapter.supportedStages).toContain("qa");
      expect(adapter.supportedStages).toContain("operate");
      expect(adapter.supportedStages).not.toContain("idea");
      expect(adapter.supportedStages).not.toContain("discovery");
    });

    it("supports only builder and reviewer roles", () => {
      expect(adapter.supportedRoles).toHaveLength(2);
      expect(adapter.supportedRoles).toContain("builder");
      expect(adapter.supportedRoles).toContain("reviewer");
    });
  });

  describe("connect/disconnect", () => {
    it("sets status to healthy on connect", async () => {
      await adapter.connect();
      expect(adapter.status).toBe("healthy");
    });

    it("sets status to disconnected on disconnect", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.status).toBe("disconnected");
    });
  });

  describe("send", () => {
    it("returns error when not connected", async () => {
      const resp = await adapter.send(makeMsg());
      expect(resp.type).toBe("error");
      expect(resp.payload.error).toContain("Codex adapter not healthy");
    });

    it("returns a dry-run execution contract when healthy", async () => {
      await adapter.connect();
      const resp = await adapter.send(
        makeMsg({
          payload: {
            action: "execute_subtask",
            subtask: { id: "st-1", title: "Test subtask", inputs: { paths: ["src/a.ts"] } },
            agent: { id: "builder-agent", role: "builder" },
          },
        }),
      );
      expect(resp.type).toBe("response");
      expect(resp.payload.executionMode).toBe("dry-run");
      expect(resp.payload.prompt).toContain("Test subtask");
      expect(resp.payload.command).toContain("<prompt>");
    });

    it("preserves correlationId", async () => {
      await adapter.connect();
      const resp = await adapter.send(makeMsg({ correlationId: "corr-codex" }));
      expect(resp.correlationId).toBe("corr-codex");
    });
  });

  describe("query", () => {
    it("queries capabilities", async () => {
      const resp = await adapter.query("capabilities");
      expect(resp.payload.data).toEqual(adapter.capabilities);
    });

    it("queries profile", async () => {
      const resp = await adapter.query("profile");
      const data = resp.payload.data as any;
      expect(data.toolName).toBe("OpenAI Codex CLI");
      expect(data.supportedStages).toHaveLength(4);
      expect(data.supportedRoles).toHaveLength(2);
      expect(data.executionMode).toBe("dry-run");
    });

    it("passes through unknown params", async () => {
      const resp = await adapter.query("other", { x: 1 });
      expect(resp.payload.x).toBe(1);
    });

    it("queries the configured CLI version", async () => {
      const resp = await adapter.query("cli-version");
      expect(resp.type).toBe("response");
      expect(resp.payload.data).toMatch(/^v?\d+\./);
    });
  });

  describe("healthCheck", () => {
    it("returns healthy when the configured CLI responds", async () => {
      const status = await adapter.healthCheck();
      expect(status).toBe("healthy");
      expect(adapter.status).toBe("healthy");
    });

    it("returns unhealthy when the configured CLI is unavailable", async () => {
      const missing = new CodexAdapter("missing-codex", {
        cliPath: "/definitely/missing/codex",
      });
      const status = await missing.healthCheck();
      expect(status).toBe("unhealthy");
      expect(missing.status).toBe("unhealthy");
    });
  });

  describe("exec mode", () => {
    it("runs the configured CLI command for execute_subtask", async () => {
      const script = [
        'const prompt = process.argv.at(-1) ?? "";',
        'console.log(JSON.stringify({ received: prompt.includes("Codex real task") }));',
      ].join("");
      const execAdapter = new CodexAdapter("exec-codex", {
        cliPath: process.execPath,
        versionArgs: ["--version"],
        execArgs: ["-e", script],
        executionMode: "exec",
      });

      await execAdapter.connect();
      const resp = await execAdapter.send(
        makeMsg({
          payload: {
            action: "execute_subtask",
            subtask: { id: "st-1", title: "Codex real task", inputs: { paths: ["src/a.ts"] } },
            agent: { id: "builder-agent", role: "builder" },
          },
        }),
      );

      expect(resp.type).toBe("response");
      expect(resp.payload.executionMode).toBe("exec");
      expect(resp.payload.stdout).toContain('"received":true');
    });

    it("returns an error response when the CLI exits unsuccessfully", async () => {
      const execAdapter = new CodexAdapter("failing-codex", {
        cliPath: process.execPath,
        versionArgs: ["--version"],
        execArgs: ["-e", 'console.error("nope"); process.exit(7);'],
        executionMode: "exec",
      });

      await execAdapter.connect();
      const resp = await execAdapter.send(
        makeMsg({
          payload: {
            action: "execute_subtask",
            subtask: { id: "st-1", title: "Failing task" },
            agent: { id: "builder-agent", role: "builder" },
          },
        }),
      );

      expect(resp.type).toBe("error");
      expect(resp.payload.exitCode).toBe(7);
      expect(resp.payload.stderr).toContain("nope");
    });
  });
});

describe("createCodexAdapter", () => {
  it("factory creates adapter", () => {
    const a = createCodexAdapter();
    expect(a).toBeInstanceOf(CodexAdapter);
    expect(a.id).toMatch(/^codex-/);
  });
});

describe("CodexAdapter.executePrompt (§4.6)", () => {
  it("dry-run returns a synthetic result without spawning a process", async () => {
    const adapter = new CodexAdapter("dry-prompt", {
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
    const adapter = new CodexAdapter("exec-prompt", {
      cliPath: process.execPath,
      versionArgs: ["--version"],
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
    const adapter = new CodexAdapter("failing-prompt", {
      cliPath: process.execPath,
      versionArgs: ["--version"],
      execArgs: ["-e", 'console.error("boom"); process.exit(7);'],
      executionMode: "exec",
    });
    const result = await adapter.executePrompt("anything");
    expect(result.exitCode).toBe(7);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("boom");
  });

  it("reports timedOut=true and exit 124 when the child exceeds timeoutMs", async () => {
    const adapter = new CodexAdapter("slow-prompt", {
      cliPath: process.execPath,
      versionArgs: ["--version"],
      execArgs: ["-e", "setTimeout(() => process.exit(0), 5000);"],
      executionMode: "exec",
      timeoutMs: 300,
    });
    const result = await adapter.executePrompt("slow");
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
    // caller still gets a result object, not a thrown error
    expect(result.executionMode).toBe("exec");
  });
});
