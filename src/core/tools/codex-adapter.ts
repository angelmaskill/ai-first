import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  ToolAdapter,
  ToolCapabilityProfile,
  ToolMessage,
  AdapterStatus,
} from "./tool-adapter-protocol.ts";
import type { ProjectStage, AgentRole, CodexRunResult } from "../models.ts";

const execFileAsync = promisify(execFile);
type ExecFileError = Error & { stdout?: string | Buffer; stderr?: string | Buffer; code?: number };

const CODEX_PROFILE: ToolCapabilityProfile = {
  id: "codex-v1",
  toolName: "OpenAI Codex CLI",
  fileRead: true,
  fileWrite: true,
  commandExec: true,
  subAgents: false,
  memoryMode: "session",
  slashCommands: true,
  reviewMode: false,
  skillIntegration: false,
  contextMode: "manual",
  notes: ["Sub-agents and skill integration require custom orchestration layer"],
};

const CODEX_STAGES: ProjectStage[] = ["scaffold", "build", "qa", "operate"];

const CODEX_ROLES: AgentRole[] = ["builder", "reviewer"];

export type CodexExecutionMode = "dry-run" | "exec";

export type CodexAdapterOptions = {
  cliPath?: string;
  versionArgs?: string[];
  execArgs?: string[];
  cwd?: string;
  timeoutMs?: number;
  executionMode?: CodexExecutionMode;
};

export class CodexAdapter implements ToolAdapter {
  readonly id: string;
  readonly toolName = "OpenAI Codex CLI";
  readonly capabilities = CODEX_PROFILE;
  readonly supportedStages = CODEX_STAGES;
  readonly supportedRoles = CODEX_ROLES;
  private _status: AdapterStatus = "disconnected";
  private readonly cliPath: string;
  private readonly versionArgs: string[];
  private readonly execArgs: string[];
  private readonly cwd?: string;
  private readonly timeoutMs: number;
  private readonly executionMode: CodexExecutionMode;
  private cliVersion?: string;

  constructor(id?: string, options: CodexAdapterOptions = {}) {
    this.id = id ?? `codex-${crypto.randomUUID().slice(0, 8)}`;
    this.cliPath = options.cliPath ?? "codex";
    this.versionArgs = options.versionArgs ?? ["--version"];
    this.execArgs = options.execArgs ?? ["exec", "--skip-git-repo-check", "--color", "never"];
    this.cwd = options.cwd;
    this.timeoutMs = options.timeoutMs ?? 600_000;
    this.executionMode = options.executionMode ?? "dry-run";
  }

  get status(): AdapterStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    await this.healthCheck();
  }

  async send(message: ToolMessage): Promise<ToolMessage> {
    if (this._status !== "healthy") {
      return {
        type: "error",
        source: this.id,
        target: message.source,
        payload: { error: `Codex adapter not healthy (status: ${this._status})` },
        timestamp: new Date().toISOString(),
        correlationId: message.correlationId,
      };
    }

    if (message.type === "invoke" && message.payload.action === "execute_subtask") {
      return this.executeSubtask(message);
    }

    return this.dryRunResponse(message, "Codex CLI is connected; no executable action matched");
  }

  async query(resource: string, params?: Record<string, unknown>): Promise<ToolMessage> {
    const result: Record<string, unknown> = { resource };

    switch (resource) {
      case "capabilities":
        result.data = this.capabilities;
        break;
      case "health":
        result.data = { status: this._status, cliVersion: this.cliVersion };
        break;
      case "profile":
        result.data = {
          toolName: this.toolName,
          version: this.cliVersion ?? this.capabilities.version,
          supportedStages: this.supportedStages,
          supportedRoles: this.supportedRoles,
          executionMode: this.executionMode,
          execArgs: this.execArgs,
        };
        break;
      case "cli-version":
        result.data = await this.readCliVersion();
        break;
      default:
        if (params) Object.assign(result, params);
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

  async healthCheck(): Promise<AdapterStatus> {
    try {
      this.cliVersion = await this.readCliVersion();
      this._status = "healthy";
    } catch {
      this.cliVersion = undefined;
      this._status = "unhealthy";
    }
    return this._status;
  }

  async disconnect(): Promise<void> {
    this._status = "disconnected";
  }

  private async readCliVersion(): Promise<string> {
    const { stdout, stderr } = await execFileAsync(this.cliPath, this.versionArgs, {
      timeout: 5000,
    });
    const version = `${stdout}${stderr}`.trim();
    if (!version) {
      throw new Error(`No version output from ${this.cliPath}`);
    }
    return version;
  }

  /**
   * §4.6: Execute a free-form prompt through Codex CLI, returning a structured
   * {@link CodexRunResult}. Unlike send()/executeSubtask (which carry the
   * ToolMessage ceremony), this takes a raw prompt string — the new task:exec
   * pipeline renders the prompt itself (renderPromptV0) and only needs Codex's
   * raw stdout/stderr/exit back.
   *
   * dry-run mode short-circuits with a synthetic result (no process spawn).
   * Timeouts never throw to the caller: they are captured as
   * `{ timedOut: true, exitCode: 124 }` so the report collector can still
   * write a blocked ExecutionReport to disk.
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

  private async executeSubtask(message: ToolMessage): Promise<ToolMessage> {
    const prompt = buildCodexSubtaskPrompt(message);

    if (this.executionMode === "dry-run") {
      return this.dryRunResponse(message, "Codex exec contract prepared", prompt);
    }

    try {
      const { stdout, stderr } = await execFileAsync(this.cliPath, [...this.execArgs, prompt], {
        cwd: this.cwd,
        timeout: this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        type: "response",
        source: this.id,
        target: message.source,
        payload: {
          ok: true,
          executionMode: this.executionMode,
          command: [this.cliPath, ...this.execArgs, "<prompt>"].join(" "),
          stdout,
          stderr,
        },
        timestamp: new Date().toISOString(),
        correlationId: message.correlationId,
      };
    } catch (err) {
      const execErr = err as ExecFileError;
      return {
        type: "error",
        source: this.id,
        target: message.source,
        payload: {
          error: execErr.message,
          exitCode: execErr.code,
          stdout: bufferToString(execErr.stdout),
          stderr: bufferToString(execErr.stderr),
          executionMode: this.executionMode,
        },
        timestamp: new Date().toISOString(),
        correlationId: message.correlationId,
      };
    }
  }

  private dryRunResponse(message: ToolMessage, note: string, prompt?: string): ToolMessage {
    return {
      type: "response",
      source: this.id,
      target: message.source,
      payload: {
        ok: true,
        executionMode: this.executionMode,
        command: [this.cliPath, ...this.execArgs, "<prompt>"].join(" "),
        prompt,
        echo: message.payload,
        note,
      },
      timestamp: new Date().toISOString(),
      correlationId: message.correlationId,
    };
  }
}

export function createCodexAdapter(id?: string, options?: CodexAdapterOptions): CodexAdapter {
  return new CodexAdapter(id, options);
}

function buildCodexSubtaskPrompt(message: ToolMessage): string {
  const subtask = message.payload.subtask as Record<string, unknown> | undefined;
  const agent = message.payload.agent as Record<string, unknown> | undefined;

  return [
    "You are executing an AI-first project subtask through Codex CLI.",
    "",
    "Follow the repository instructions and stay within the supplied task scope.",
    "Return a concise completion report with files changed, verification run, and blockers.",
    "",
    "Agent:",
    JSON.stringify(agent ?? {}, null, 2),
    "",
    "Subtask:",
    JSON.stringify(subtask ?? {}, null, 2),
  ].join("\n");
}

function bufferToString(value: string | Buffer | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Buffer.isBuffer(value) ? value.toString("utf-8") : value;
}
