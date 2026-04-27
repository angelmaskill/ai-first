import type {
  ToolAdapter,
  ToolCapabilityProfile,
  ToolMessage,
  AdapterStatus,
} from "./tool-adapter-protocol.ts";
import type { ProjectStage, AgentRole } from "../models.ts";

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

export class CodexAdapter implements ToolAdapter {
  readonly id: string;
  readonly toolName = "OpenAI Codex CLI";
  readonly capabilities = CODEX_PROFILE;
  readonly supportedStages = CODEX_STAGES;
  readonly supportedRoles = CODEX_ROLES;
  private _status: AdapterStatus = "disconnected";

  constructor(id?: string) {
    this.id = id ?? `codex-${crypto.randomUUID().slice(0, 8)}`;
  }

  get status(): AdapterStatus {
    return this._status;
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
        payload: { error: `Codex adapter not healthy (status: ${this._status})` },
        timestamp: new Date().toISOString(),
        correlationId: message.correlationId,
      };
    }

    return {
      type: "response",
      source: this.id,
      target: message.source,
      payload: {
        ok: true,
        echo: message.payload,
        note: "Codex CLI — no native sub-agent/skill dispatch",
      },
      timestamp: new Date().toISOString(),
      correlationId: message.correlationId,
    };
  }

  async query(resource: string, params?: Record<string, unknown>): Promise<ToolMessage> {
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
    this._status = "healthy";
    return this._status;
  }

  async disconnect(): Promise<void> {
    this._status = "disconnected";
  }
}

export function createCodexAdapter(id?: string): CodexAdapter {
  return new CodexAdapter(id);
}
