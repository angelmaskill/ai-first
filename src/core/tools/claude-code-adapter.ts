import type {
  ToolAdapter,
  ToolCapabilityProfile,
  ToolMessage,
  AdapterStatus,
} from "./tool-adapter-protocol.ts";
import type { ProjectStage, AgentRole } from "../models.ts";

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
];

export class ClaudeCodeAdapter implements ToolAdapter {
  readonly id: string;
  readonly toolName = "Claude Code";
  readonly capabilities = CLAUDE_CODE_PROFILE;
  readonly supportedStages = ALL_STAGES;
  readonly supportedRoles = ALL_ROLES;
  private _status: AdapterStatus = "disconnected";

  constructor(id?: string) {
    this.id = id ?? `claude-code-${crypto.randomUUID().slice(0, 8)}`;
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
        payload: { error: `Adapter not healthy (status: ${this._status})` },
        timestamp: new Date().toISOString(),
        correlationId: message.correlationId,
      };
    }

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

export function createClaudeCodeAdapter(id?: string): ClaudeCodeAdapter {
  return new ClaudeCodeAdapter(id);
}
