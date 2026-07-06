import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  ToolAdapter,
  ToolCapabilityProfile,
  ToolMessage,
  AdapterStatus,
  PromptExecutor,
} from "./tool-adapter-protocol.ts";
import type { ProjectStage, AgentRole, CodexRunResult } from "../models.ts";

const execFileAsync = promisify(execFile);
type ExecFileError = Error & { stdout?: string | Buffer; stderr?: string | Buffer; code?: number };

const CLAUDE_CODE_PROFILE: ToolCapabilityProfile = {
  id: "claude-code-v1",
  toolName: "Claude Code",
  version: ">=2.0",
  fileRead: true,
  fileWrite: true,
  commandExec: true,
  subAgents: true,
  memoryMode: "hybrid",
  slashCommands: true,
  reviewMode: true,
  skillIntegration: true,
  contextMode: "auto",
};

const ALL_STAGES: ProjectStage[] = [
  "idea",
  "discovery",
  "spec",
  "architecture",
  "scaffold",
  "build",
  "qa",
  "release",
  "operate",
  "evolve",
];

const ALL_ROLES: AgentRole[] = [
  "intake",
  "planner",
  "architect",
  "builder",
  "reviewer",
  "security_reviewer",
  "release",
  "team_lead",
  "repo_scanner",
  "stage_assessor",
  "knowledge_sync",
  "state_updater",
  "skill_recommend",
  "smoke_case",
  "marketplace_skill",
];

export type AgentInvocation = {
  id: string;
  agentId: string;
  subtaskId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
};

export type ClaudeExecutionMode = "dry-run" | "exec";

export type ClaudeCodeAdapterOptions = {
  cliPath?: string;
  execArgs?: string[];
  cwd?: string;
  timeoutMs?: number;
  executionMode?: ClaudeExecutionMode;
};

export class ClaudeCodeAdapter implements ToolAdapter, PromptExecutor {
  readonly id: string;
  readonly toolName = "Claude Code";
  readonly capabilities = CLAUDE_CODE_PROFILE;
  readonly supportedStages = ALL_STAGES;
  readonly supportedRoles = ALL_ROLES;
  private _status: AdapterStatus = "disconnected";
  private _invocations: Map<string, AgentInvocation> = new Map();
  private readonly cliPath: string;
  private readonly execArgs: string[];
  private readonly cwd?: string;
  private readonly timeoutMs: number;
  private readonly executionMode: ClaudeExecutionMode;

  constructor(id?: string, options: ClaudeCodeAdapterOptions = {}) {
    this.id = id ?? `claude-code-${crypto.randomUUID().slice(0, 8)}`;
    this.cliPath = options.cliPath ?? "claude";
    this.execArgs = options.execArgs ?? ["-p"];
    this.cwd = options.cwd;
    this.timeoutMs = options.timeoutMs ?? 600_000;
    this.executionMode = options.executionMode ?? "dry-run";
  }

  get status(): AdapterStatus {
    return this._status;
  }

  get invocations(): ReadonlyMap<string, AgentInvocation> {
    return this._invocations;
  }

  async connect(): Promise<void> {
    this._status = "healthy";
  }

  async send(message: ToolMessage): Promise<ToolMessage> {
    if (this._status !== "healthy") {
      return {
        type: "error",
        source: this.id,
        target: message.source,
        payload: { error: `Adapter not healthy (status: ${this._status})` },
        timestamp: new Date().toISOString(),
        correlationId: message.correlationId,
      };
    }

    switch (message.type) {
      case "invoke": {
        const action = message.payload.action as string;
        if (action === "execute_subtask") {
          return this.handleSubtaskInvoke(message);
        }
        return this.echoResponse(message);
      }
      case "query":
        return this.handleQuery(message);
      default:
        return this.echoResponse(message);
    }
  }

  private handleSubtaskInvoke(message: ToolMessage): ToolMessage {
    const subtask = message.payload.subtask as Record<string, unknown> | undefined;
    const subtaskId = (subtask?.id as string) ?? message.correlationId ?? "unknown";
    const agent = message.payload.agent as Record<string, unknown> | undefined;
    const agentId = (agent?.id as string) ?? message.target;

    const invocation: AgentInvocation = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      agentId,
      subtaskId,
      status: "running",
      startedAt: new Date().toISOString(),
      payload: message.payload,
    };
    this._invocations.set(invocation.id, invocation);

    // Simulate agent dispatch — in production this would use the Agent tool
    const result: Record<string, unknown> = {
      invocationId: invocation.id,
      agentId,
      subtaskId,
      dispatched: true,
      message: `Agent "${agentId}" dispatched for subtask "${subtaskId}"`,
    };

    invocation.status = "completed";
    invocation.completedAt = new Date().toISOString();
    invocation.result = result;
    this._invocations.set(invocation.id, invocation);

    return {
      type: "response",
      source: this.id,
      target: message.source,
      payload: result,
      timestamp: new Date().toISOString(),
      correlationId: message.correlationId,
    };
  }

  private handleQuery(message: ToolMessage): ToolMessage {
    const resource = message.payload.resource as string | undefined;
    const result: Record<string, unknown> = { resource };

    switch (resource) {
      case "capabilities":
        result.data = this.capabilities;
        break;
      case "health":
        result.data = { status: this._status };
        break;
      case "profile":
        result.data = {
          toolName: this.toolName,
          version: this.capabilities.version,
          supportedStages: this.supportedStages,
          supportedRoles: this.supportedRoles,
        };
        break;
      case "invocations":
        result.data = Array.from(this._invocations.values());
        break;
      default:
        if (message.payload.params) {
          Object.assign(result, message.payload.params as Record<string, unknown>);
        }
        break;
    }

    return {
      type: "response",
      source: this.id,
      target: "orchestrator",
      payload: result,
      timestamp: new Date().toISOString(),
    };
  }

  private echoResponse(message: ToolMessage): ToolMessage {
    return {
      type: "response",
      source: this.id,
      target: message.source,
      payload: { ok: true, echo: message.payload },
      timestamp: new Date().toISOString(),
      correlationId: message.correlationId,
    };
  }

  async query(resource: string, params?: Record<string, unknown>): Promise<ToolMessage> {
    return this.handleQuery({
      type: "query",
      source: "orchestrator",
      target: this.id,
      payload: { resource, params },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * §4.6 / M-4: Execute a free-form prompt through `claude -p` (print mode),
   * returning a structured {@link CodexRunResult}. Mirrors CodexAdapter so
   * task:exec can treat both runtimes uniformly via the PromptExecutor contract.
   *
   * dry-run short-circuits with a synthetic result (no process spawn). Timeouts
   * never throw to the caller: they are captured as
   * `{ timedOut: true, exitCode: 124 }` so the report collector can still write
   * a blocked ExecutionReport to disk.
   */
  async executePrompt(prompt: string, options: { cwd?: string } = {}): Promise<CodexRunResult> {
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const argv = [...this.execArgs, prompt];
    const command = [this.cliPath, ...argv];

    if (this.executionMode === "dry-run") {
      return {
        executionMode: "dry-run",
        command,
        stdout: "<dry-run>",
        stderr: "",
        exitCode: 0,
        timedOut: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: 0,
      };
    }

    try {
      const { stdout, stderr } = await execFileAsync(this.cliPath, argv, {
        cwd: options.cwd ?? this.cwd,
        timeout: this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });
      return {
        executionMode: "exec",
        command,
        stdout,
        stderr,
        exitCode: 0,
        timedOut: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
      };
    } catch (err) {
      const execErr = err as ExecFileError & { signal?: string; killed?: boolean };
      const timedOut = Boolean(execErr.killed && execErr.signal === "SIGTERM");
      return {
        executionMode: "exec",
        command,
        stdout: bufferToString(execErr.stdout) ?? "",
        stderr: bufferToString(execErr.stderr) ?? execErr.message ?? "",
        exitCode: typeof execErr.code === "number" ? execErr.code : timedOut ? 124 : 1,
        timedOut,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
      };
    }
  }

  async healthCheck(): Promise<AdapterStatus> {
    this._status = "healthy";
    return this._status;
  }

  async disconnect(): Promise<void> {
    this._status = "disconnected";
  }
}

export function createClaudeCodeAdapter(
  id?: string,
  options?: ClaudeCodeAdapterOptions,
): ClaudeCodeAdapter {
  return new ClaudeCodeAdapter(id, options);
}

function bufferToString(value: string | Buffer | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Buffer.isBuffer(value) ? value.toString("utf-8") : value;
}
