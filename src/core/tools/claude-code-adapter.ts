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

export class ClaudeCodeAdapter implements ToolAdapter {
  readonly id: string;
  readonly toolName = "Claude Code";
  readonly capabilities = CLAUDE_CODE_PROFILE;
  readonly supportedStages = ALL_STAGES;
  readonly supportedRoles = ALL_ROLES;
  private _status: AdapterStatus = "disconnected";
  private _invocations: Map<string, AgentInvocation> = new Map();

  constructor(id?: string) {
    this.id = id ?? `claude-code-${crypto.randomUUID().slice(0, 8)}`;
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
