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
export type CodeDomainKind =
  | "frontend"
  | "backend"
  | "algorithm"
  | "ml"
  | "data"
  | "service"
  | "app"
  | "shared"
  | "infra"
  | "docs"
  | "other";

export type CodeDomain = {
  id: string;
  name: string;
  kind: CodeDomainKind;
  paths: string[];
  description?: string;
  // §5.6 B1: detected tech stack + commands (read from manifest files)
  techStack?: string[];
  testCommands?: string[];
  buildCommands?: string[];
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
  // §5.1 / P2-1: low-confidence semantic stages ask for human confirmation
  needsConfirmation: boolean;
  uncertaintyReason?: string;
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

export type OwnerRef = {
  type: "user" | "agent" | "team";
  id: string;
  name: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  stage: ProjectStage;
  mode: "generate" | "reuse" | "execute";
  domainIds: string[];
  owner?: OwnerRef;
  reviewer?: OwnerRef;
  status: "todo" | "in_progress" | "blocked" | "review_pending" | "done" | "canceled";
  priority: "p0" | "p1" | "p2" | "p3";
  changeScopeId?: string;
  // §3.2 / E1: objective acceptance criteria (tool-side checked, not Codex self-report)
  acceptanceCriteria: AcceptanceCriterion[];
  // §3.2: suggested execution runtime (claude-code | codex)
  runtime?: RuntimeToolId;
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
  algorithmPaths?: string[];
  dataPaths?: string[];
  infraPaths?: string[];
  sharedPaths: string[];
  docsPaths: string[];
  domainPaths?: Record<string, string[]>;
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
  algorithmPaths?: string[];
  dataPaths?: string[];
  infraPaths?: string[];
  sharedPaths: string[];
  relatedDocs: string[];
  owners: string[];
};

// §5.6 B3 — cross-domain contract (API/schema/event) definition. Stored in
// .ai-first/contracts/<id>.yml and consumed by sync-core to flag breakage when
// a contract's owning paths change.
export type Contract = {
  id: string;
  name: string;
  description?: string;
  domainIds: string[];
  kind: "api" | "schema" | "event" | "protocol";
  relatedPaths: string[];
  consumers?: string[];
  producers?: string[];
  stability?: "stable" | "draft" | "deprecated";
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
  category: "frontend" | "backend" | "algorithm" | "data" | "fullstack" | "security" | "workflow";
  content: string;
  examples: string[];
  status: "proposed" | "accepted" | "deprecated";
  createdAt: string;
  updatedAt: string;
};

export type RuntimeToolId = "claude-code" | "codex";

export type RuntimeExecutionMode = "native" | "exec" | "dry-run";

export type RuntimeRoleBinding = {
  role: AgentRole;
  command?: string;
  agent?: string;
  promptTemplate?: string;
  timeoutMs?: number;
};

export type RuntimeProfile = {
  id: RuntimeToolId;
  label: string;
  executionMode: RuntimeExecutionMode;
  configPath?: string;
  supportedStages: ProjectStage[];
  supportedRoles: AgentRole[];
  roleBindings: RuntimeRoleBinding[];
  notes?: string[];
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
  algorithmHints: string[];
  dataHints: string[];
  infraHints: string[];
  docsHints: string[];
  testHints: string[];
  configHints: string[];
  codeDomains: CodeDomain[];
};

// ──────────────────────────────────────────────────────────────────────────
// §3.2 Acceptance criteria + safe command registry (P0-2)
// Tool-side objective checks; never rely on Codex self-report.
// ──────────────────────────────────────────────────────────────────────────

export type AcceptanceCheck =
  | { kind: "test"; commandId: string }
  | { kind: "typecheck"; commandId: string }
  | { kind: "lint"; commandId: string }
  | { kind: "file_exists"; path: string }
  | { kind: "file_contains"; path: string; pattern: string }
  | { kind: "manual" };

export type AcceptanceCriterion = {
  id: string;
  description: string;
  check: AcceptanceCheck;
  required: boolean;
};

export type AllowedCommand = {
  id: string;
  command: string[];
  cwd?: string;
  timeoutMs: number;
  maxOutputBytes: number;
  env?: Record<string, string>;
};

// ──────────────────────────────────────────────────────────────────────────
// §3.2 Runtime execution report (F3 — tool-side collected, "lenient out")
// ──────────────────────────────────────────────────────────────────────────

export type AcceptanceResult = {
  criterionId: string;
  passed: boolean;
  detail: string;
};

export type ExecutionOutcomeReason =
  | "acceptance_passed"
  | "acceptance_failed"
  | "non_zero_exit"
  | "timeout"
  | "scope_violation"
  | "dirty_worktree_blocked";

export type ScopeViolation = {
  path: string;
  severity: "risk" | "review" | "block";
  reason: string;
};

export type ExecutionReport = {
  id: string;
  taskId: string;
  runtime: RuntimeToolId;
  startedAt: string;
  finishedAt: string;
  status: "done" | "review_pending" | "blocked";
  outcomeReason: ExecutionOutcomeReason;
  baselineRef?: string;
  preExistingChanges?: string[];
  preExistingUntracked?: string[];
  taintedPaths?: string[];
  filesChanged: string[];
  scopeViolations: ScopeViolation[];
  acceptanceResults: AcceptanceResult[];
  runtimeStdout?: string;
  runtimeStderr?: string;
  runtimeExitCode?: number;
  naturalLanguageSummary?: string;
  risks: string[];
  blockers: string[];
  followUps: string[];
  knowledgeSyncNeeded: boolean;
};

// §3.2 Prompt subprocess result (executePrompt return value)
export type PromptRunResult = {
  executionMode: "dry-run" | "exec";
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

// §3.2 git baseline / change set (covers untracked + attribution)
export type GitBaseline = {
  headSha: string;
  preExistingChanges: string[];
  preExistingUntracked: string[];
  clean: boolean;
};

export type GitChangeSet = {
  trackedChanges: string[];
  untrackedChanges: string[];
  taintedPaths: string[];
};

// ──────────────────────────────────────────────────────────────────────────
// §3.3 StageRule (D2 stage assessor rule expression)
// ──────────────────────────────────────────────────────────────────────────

export type SignalPredicate = {
  kind:
    | "artifact_exists"
    | "task_status"
    | "report_status"
    | "standards_coverage"
    | "file_pattern"
    | "stage_explicit";
  params: Record<string, unknown>;
  weight: number;
  humanHint: string;
};

export type StageRule = {
  stage: ProjectStage;
  enterWhen: SignalPredicate[];
  blockers: SignalPredicate[];
  requiredArtifacts: string[];
};

// ──────────────────────────────────────────────────────────────────────────
// §3.4 StandardFrontmatter (C1 — file-state, maps to StandardItem)
// ──────────────────────────────────────────────────────────────────────────

export type StandardSeverity = "must" | "should" | "may";
export type StandardStability = "draft" | "stable" | "deprecated";

export type StandardFrontmatter = {
  id: string;
  domain: StandardItem["category"];
  title: string;
  stability: StandardStability;
  severity: StandardSeverity;
  relatedPaths: string[];
};

// ──────────────────────────────────────────────────────────────────────────
// 阶段门与编码自由（docs/AI-first-阶段门与编码自由-技术方案.md）
// GateCheck / AdvanceDecision: canAdvance() 的输入输出
// BreakGlassRecord: 显式绕过门的审计记录（永久，写入 .ai-first/logs/break-glass/）
// ──────────────────────────────────────────────────────────────────────────

export type GateCheck = {
  name: string; // 如 "active-tasks-done"
  passed: boolean;
  detail: string; // 通过/未过的原因（含具体 task id / artifact 路径）
  evidence: string[]; // 客观证据指针（文件路径 / task id / report id）
};

export type AdvanceDecision = {
  from: ProjectStage;
  to: ProjectStage;
  allowed: boolean; // 全部 check 过才 true
  checks: GateCheck[]; // 5 项检查的明细
  blockers: string[]; // = checks.filter(!passed).map(detail)，便于 CLI 直读
  evidence: string[]; // = checks.filter(passed).flatMap(evidence)，便于审计
  checkedAt: string; // ISO 时间戳
};

export type BreakGlassRecord = {
  id: string; // breakglass-<compactTs>
  operator: string; // 必填，触发者
  from: ProjectStage;
  to: ProjectStage;
  reason: string; // 必填，为什么绕过门
  risk: string; // 必填，承担的风险
  timestamp: string; // ISO 时间戳
  priorBlockers: string[]; // 绕过前 canAdvance 报告的 blockers（留痕）
};
