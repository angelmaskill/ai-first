import type { AgentDefinition, AgentRole, AgentType, ProjectStage, SubagentType } from "../models.ts";

export type { AgentDefinition, AgentRole, AgentType, SubagentType };

export type AgentRegistry = {
  agents: AgentDefinition[];
  byRole: Map<AgentRole, AgentDefinition>;
  bySubagentType: Map<SubagentType, AgentDefinition>;
  byStage: Map<ProjectStage, AgentDefinition[]>;
  bySkill: Map<string, AgentDefinition[]>;
  errors: AgentValidationError[];
};

export type AgentValidationError = {
  agentPath: string;
  field: string;
  message: string;
};
