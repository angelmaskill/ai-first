import { describe, it, expect } from "vitest";
import { selectPromptExecutor } from "./task-exec-cli.ts";
import { CodexAdapter } from "../tools/codex-adapter.ts";
import { ClaudeCodeAdapter } from "../tools/claude-code-adapter.ts";

describe("selectPromptExecutor (M-4)", () => {
  const opts = { executionMode: "dry-run" as const, timeoutMs: 600_000 };

  it("routes runtime=codex → CodexAdapter", () => {
    const executor = selectPromptExecutor("codex", "t-codex", opts);
    expect(executor).toBeInstanceOf(CodexAdapter);
    expect(executor).not.toBeInstanceOf(ClaudeCodeAdapter);
  });

  it("routes runtime=claude-code → ClaudeCodeAdapter", () => {
    const executor = selectPromptExecutor("claude-code", "t-cc", opts);
    expect(executor).toBeInstanceOf(ClaudeCodeAdapter);
    expect(executor).not.toBeInstanceOf(CodexAdapter);
  });

  it("both routes return an object exposing executePrompt", () => {
    const codex = selectPromptExecutor("codex", "t-codex", opts);
    const cc = selectPromptExecutor("claude-code", "t-cc", opts);
    expect(typeof codex.executePrompt).toBe("function");
    expect(typeof cc.executePrompt).toBe("function");
  });

  it("forwards executionMode to the constructed adapter (dry-run short-circuits)", async () => {
    const cc = selectPromptExecutor("claude-code", "t-cc", {
      executionMode: "dry-run",
      timeoutMs: 1_000,
    });
    const result = await cc.executePrompt("never spawned");
    expect(result.executionMode).toBe("dry-run");
    expect(result.exitCode).toBe(0);
  });
});
