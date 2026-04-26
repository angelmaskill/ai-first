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
    adapter = new CodexAdapter("test-codex");
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

    it("returns response with note about missing sub-agent dispatch when healthy", async () => {
      await adapter.connect();
      const resp = await adapter.send(makeMsg());
      expect(resp.type).toBe("response");
      expect(resp.payload.note).toContain("no native sub-agent");
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
    });

    it("passes through unknown params", async () => {
      const resp = await adapter.query("other", { x: 1 });
      expect(resp.payload.x).toBe(1);
    });
  });

  describe("healthCheck", () => {
    it("returns healthy", async () => {
      const status = await adapter.healthCheck();
      expect(status).toBe("healthy");
      expect(adapter.status).toBe("healthy");
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
