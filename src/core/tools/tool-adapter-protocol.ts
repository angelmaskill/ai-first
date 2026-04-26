/**
 * Tool Adapter Protocol — type contract only.
 *
 * This file defines the interface for AI coding tool adapters. It is retained
 * as a type contract so that future implementations (Codex, Trae, Qoder) can
 * conform to the same shape. The message-passing runtime and BaseToolAdapter
 * abstract class have been removed in favor of Claude Code native dispatch.
 *
 * When adding a new tool backend, implement the ToolAdapter interface.
 */

import type { ProjectStage, AgentRole } from "../models.ts";

// ---- Capability Profile ----

export type ToolCapabilityProfile = {
  id: string;
  toolName: string;
  version?: string;
  fileRead: boolean;
  fileWrite: boolean;
  commandExec: boolean;
  subAgents: boolean;
  memoryMode: "none" | "session" | "project" | "hybrid";
  slashCommands: boolean;
  reviewMode: boolean;
  skillIntegration: boolean;
  contextMode: "manual" | "auto" | "mixed";
  notes?: string[];
};

// ---- Tool Message Types ----

export type ToolMessageType =
  | "register"
  | "discover"
  | "invoke"
  | "query"
  | "sync"
  | "broadcast"
  | "response"
  | "error"
  | "heartbeat"
  | "shutdown";

export type ToolMessage = {
  type: ToolMessageType;
  source: string;
  target: string;
  payload: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
};

// ---- Tool Adapter Interface ----

export type AdapterStatus = "healthy" | "degraded" | "unhealthy" | "disconnected";

export interface ToolAdapter {
  /** Unique identifier for this adapter instance */
  readonly id: string;

  /** The tool this adapter connects to */
  readonly toolName: string;

  /** Current connection status */
  readonly status: AdapterStatus;

  /** Capability profile for tool-aware routing */
  readonly capabilities: ToolCapabilityProfile;

  /** Stage mapping: which project stages this tool supports */
  readonly supportedStages: ProjectStage[];

  /** Agent role mapping: which agent roles this tool can execute */
  readonly supportedRoles: AgentRole[];

  /** Initialize connection to the tool */
  connect(): Promise<void>;

  /** Send a message to the tool */
  send(message: ToolMessage): Promise<ToolMessage>;

  /** Query tool state */
  query(resource: string, params?: Record<string, unknown>): Promise<ToolMessage>;

  /** Health check */
  healthCheck(): Promise<AdapterStatus>;

  /** Graceful shutdown */
  disconnect(): Promise<void>;
}

// ---- Factory ----

export type ToolAdapterFactory = {
  create(toolName: string, config?: Record<string, unknown>): Promise<ToolAdapter>;
};

// ---- Built-in Capability Profiles (for reference) ----

export const KNOWN_TOOL_PROFILES: Record<string, ToolCapabilityProfile> = {
  "claude-code": {
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
    notes: ["Native agent/skill dispatch via .claude/agents/*.md and .claude/skills/*/SKILL.md"],
  },
  codex: {
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
  },
  trae: {
    id: "trae-v1",
    toolName: "Trae",
    fileRead: true,
    fileWrite: true,
    commandExec: true,
    subAgents: false,
    memoryMode: "session",
    slashCommands: true,
    reviewMode: false,
    skillIntegration: false,
    contextMode: "mixed",
  },
  qoder: {
    id: "qoder-v1",
    toolName: "Qoder",
    fileRead: true,
    fileWrite: true,
    commandExec: true,
    subAgents: false,
    memoryMode: "none",
    slashCommands: false,
    reviewMode: false,
    skillIntegration: false,
    contextMode: "manual",
  },
};
