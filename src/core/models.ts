export type ProjectStage =
  | "idea"
  | "discovery"
  | "spec"
  | "architecture"
  | "scaffold"
  | "build"
  | "qa"
  | "release"
  | "operate"
  | "evolve";

export type ProjectMode = "greenfield" | "brownfield";
export type TeamMode = "fullstack" | "frontend_backend_split" | "hybrid";
export type CodeDomainKind = "frontend" | "backend" | "shared" | "infra" | "docs" | "other";

export type CodeDomain = {
  id: string;
  name: string;
  kind: CodeDomainKind;
  paths: string[];
  description?: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  mode: ProjectMode;
  teamMode: TeamMode;
  ownershipModel: "domain_based" | "module_based" | "mixed";
  rootPath: string;
  codeDomains: CodeDomain[];
  currentStage: ProjectStage;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  tags?: string[];
};

export type HealthSignal = {
  name: string;
  status: "good" | "warning" | "critical" | "unknown";
  summary: string;
  source?: string;
};

export type NextAction = {
  id: string;
  title: string;
  description: string;
  actionType:
    | "analyze"
    | "generate"
    | "reuse"
    | "skip"
    | "implement"
    | "review"
    | "sync"
    | "release";
  priority: "p0" | "p1" | "p2" | "p3";
  recommendedOwner: AgentRole | "user";
  requiresConfirmation: boolean;
};

export type ProjectSnapshot = {
  id: string;
  projectId: string;
  createdAt: string;
  currentStage: ProjectStage;
  stageConfidence: number;
  goals: string[];
  blockers: string[];
  risks: string[];
  missingArtifacts: string[];
  healthSignals: HealthSignal[];
  activeTasks: string[];
  suggestedNextActions: NextAction[];
  affectedKnowledgeIds: string[];
};

export type StageAssessment = {
  id: string;
  projectId: string;
  currentStage: ProjectStage;
  confidence: number;
  reasons: string[];
  alternativeStages: ProjectStage[];
  blockers: string[];
  missingArtifacts: string[];
  assessedAt: string;
};

export type GuidanceCard = {
  id: string;
  projectId: string;
  generatedAt: string;
  projectMode: ProjectMode;
  currentStage: ProjectStage;
  confidence: number;
  summary: string;
  whyNow: string[];
  primaryAction: NextAction;
  alternativeActions: NextAction[];
  risks: string[];
  suggestedLeadAgent: AgentRole;
  reviewStatus: "not_started" | "pending" | "in_progress" | "passed" | "failed";
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  stage: ProjectStage;
  mode: "generate" | "reuse" | "skip" | "execute";
  domainIds: string[];
  owner?: {
    type: "user" | "agent" | "team";
    id: string;
    name: string;
  };
  reviewer?: {
    type: "user" | "agent" | "team";
    id: string;
    name: string;
  };
  status: "todo" | "in_progress" | "blocked" | "review_pending" | "done" | "canceled";
  priority: "p0" | "p1" | "p2" | "p3";
  changeScopeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChangeScope = {
  id: string;
  projectId: string;
  taskId: string;
  summary: string;
  frontendPaths: string[];
  backendPaths: string[];
  sharedPaths: string[];
  docsPaths: string[];
  excludedPaths?: string[];
  riskLevel: "low" | "medium" | "high";
  parallelSafe: boolean;
  lockMode: "none" | "soft" | "hard";
  createdAt: string;
  updatedAt: string;
};

export type DomainMap = {
  id: string;
  name: string;
  description?: string;
  frontendPaths: string[];
  backendPaths: string[];
  sharedPaths: string[];
  relatedDocs: string[];
  owners: string[];
};

export type ReviewFinding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category:
    | "logic"
    | "security"
    | "architecture"
    | "docs"
    | "knowledge"
    | "testing"
    | "consistency";
  title: string;
  detail: string;
  relatedPaths?: string[];
  resolutionHint?: string;
};

export type ReviewGate = {
  name: string;
  status: "passed" | "failed" | "skipped";
  reason?: string;
};

export type ReviewReport = {
  id: string;
  projectId: string;
  taskId?: string;
  stage: ProjectStage;
  reviewer: {
    type: "user" | "agent" | "team";
    id: string;
    name: string;
  };
  status: "passed" | "passed_with_warnings" | "failed";
  findings: ReviewFinding[];
  gates: ReviewGate[];
  recommendations: string[];
  knowledgeSyncRequired: boolean;
  createdAt: string;
};

export type SyncEvent = {
  id: string;
  projectId: string;
  triggerType: "code_change" | "docs_change" | "stage_exit" | "manual_command" | "review_required";
  relatedTaskId?: string;
  relatedPaths?: string[];
  impactedKnowledgeIds?: string[];
  impactedStandardIds?: string[];
  status: "pending" | "suggested" | "confirmed" | "dismissed";
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeItem = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category:
    | "api-contract"
    | "data-model"
    | "architecture"
    | "security"
    | "config"
    | "dependency"
    | "feature"
    | "workflow";
  relatedPaths: string[];
  content: string;
  stability: "stable" | "draft" | "deprecated";
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type StandardItem = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: "frontend" | "backend" | "fullstack" | "security" | "workflow";
  content: string;
  examples: string[];
  status: "proposed" | "accepted" | "deprecated";
  createdAt: string;
  updatedAt: string;
};

export type SkillIO = {
  name: string;
  type: string;
  required: boolean;
  description?: string;
};

export type SkillSpec = {
  id: string;
  name: string;
  source: "local" | "marketplace";
  version: string;
  description: string;
  supportedStages: ProjectStage[];
  supportedTaskTypes: string[];
  inputs: SkillIO[];
  outputs: SkillIO[];
  riskLevel: "low" | "medium" | "high";
  requiresReview: boolean;
  enabled: boolean;
  assignedAgent?: AgentRole;
};

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

export type AgentRole =
  // Lifecycle agents
  | "intake"
  | "planner"
  | "architect"
  | "builder"
  | "reviewer"
  | "security_reviewer"
  | "release"
  | "team_lead"
  // Pipeline agents
  | "repo_scanner"
  | "stage_assessor"
  | "knowledge_sync"
  | "state_updater"
  // Infrastructure agents
  | "skill_recommend"
  | "smoke_case"
  | "marketplace_skill";

export type SubagentType =
  | "executor"
  | "planner"
  | "architect"
  | "debugger"
  | "verifier"
  | "code-reviewer"
  | "test-engineer"
  | "designer"
  | "writer"
  | "qa-tester"
  | "scientist"
  | "document-specialist"
  | "git-master";

export type AgentType = AgentRole | SubagentType;

export type AgentModelTier = "opus" | "sonnet" | "haiku";

export type AgentIO = {
  name: string;
  type: string;
  required: boolean;
  description?: string;
};

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  subagentType?: SubagentType;
  model: AgentModelTier;
  tools: string[];
  skills: string[];
  stages: ProjectStage[];
  inputs: AgentIO[];
  outputs: AgentIO[];
  systemPrompt: string;
  sourcePath: string;
};

export type AgentFrontmatter = {
  name?: string;
  description?: string;
  role?: string;
  subagent_type?: string;
  model?: string;
  tools?: string[];
  skills?: string[];
  stages?: string[];
  inputs?: Array<{ name: string; type: string; required: boolean; description?: string }>;
  outputs?: Array<{ name: string; type: string; required: boolean; description?: string }>;
};

export type RepoFacts = {
  rootPath: string;
  hasAiFirst: boolean;
  hasGit: boolean;
  topLevelEntries: string[];
  packageJson: boolean;
  frontendHints: string[];
  backendHints: string[];
  docsHints: string[];
  testHints: string[];
  configHints: string[];
  codeDomains: CodeDomain[];
};
