---
id: KNOW-002
title: TypeScript→Markdown Refactoring Changelog
type: changelog
created: 2026-04-26
tags: [refactoring, changelog, typescript, markdown, claude-book]
---

# TypeScript → Claude-Book 重构变更记录

## 概述

将 AI-first 项目从 TypeScript CLI + 文件 manifest + 编程化编排 重构为 Claude-Book 模式（纯 Markdown 配置 + Claude Code 原生 agent/skill + 实际 AI 调度）。

本文档记录所有被删除、保留、转换的文件及其关键接口签名，以便将来如需恢复原始代码时有据可查。

---

## 保留的 TypeScript 文件

### 1. `src/core/harness/subagent-dispatcher.ts`

**保留原因**：拓扑排序和复杂度评分是真正的算法，无法用自然语言替代。

关键函数签名：
```typescript
interface Subtask {
  id: string;
  description: string;
  dependencies: string[];
  estimatedComplexity: number;
}

interface DispatchPlan {
  groups: Subtask[][];  // each inner array can run in parallel
  totalComplexity: number;
  estimatedDuration: number;
}

function createDispatchPlan(subtasks: Subtask[]): DispatchPlan
// 拓扑排序算法：给定带依赖的 Subtask DAG，计算并行执行分组

function calculateComplexity(
  fileCount: number,
  domainCount: number,
  descLength: number,
  mode: 'greenfield' | 'brownfield' | 'maintenance'
): number
// 公式: min(fileCount/50, 0.4) + min(domainCount/5, 0.3) + min(descLength/500, 0.2) + modeFactor
// modeFactor: greenfield=0.15, brownfield=0.05, maintenance=0.0

function splitTask(changeScope: ChangeScope, strategy?: 'domain' | 'file' | 'single'): Subtask[]
// 多策略任务拆分：按代码域 / 按文件组 / 单任务透传
// file strategy uses directory-level clustering
```

### 2. `src/core/harness/dispatch-cli.ts`

**保留原因**：CLI 桥接，连接 TypeScript 算法和 Claude Code agent 系统。

关键函数签名：
```typescript
interface DispatchManifest {
  taskId: string;
  createdAt: string;
  complexity: number;
  strategy: 'single' | 'domain' | 'file';
  groups: {
    level: number;
    parallel: boolean;
    subtasks: { id: string; description: string; files: string[] }[];
  }[];
}

function parseTaskYaml(filePath: string): TaskDefinition
// 轻量 YAML 解析器（手写，零依赖）

function main(): void
// CLI 入口：npx tsx src/core/harness/dispatch-cli.ts <task-yaml>
// 读取 task YAML → 计算复杂度 → 决定是否拆分 → 写 dispatch manifest
```

### 3. `src/core/tools/tool-adapter-protocol.ts`

**保留原因**：接口定义，零依赖的纯类型文件，保留作为文档参考。

关键类型：
```typescript
type MessageType = 'register' | 'discover' | 'invoke' | 'query' | 'sync'
  | 'broadcast' | 'response' | 'error' | 'heartbeat' | 'shutdown';

interface ToolCapability {
  name: string;
  version: string;
  parameters: Record<string, unknown>;
}

interface ToolAdapter {
  readonly platform: string;
  readonly version: string;
  connect(config: ToolAdapterConfig): Promise<void>;
  send(message: ToolMessage): Promise<ToolResponse>;
  query(capability: string): Promise<ToolCapability | null>;
  healthCheck(): Promise<HealthStatus>;
  disconnect(): Promise<void>;
}

function createToolAdapter(platform: string, config?: ToolAdapterConfig): ToolAdapter
```

### 4. `src/core/tools/claude-code-adapter.ts`

**保留原因**：第一个适配器实现，作为 adapter 模式的参考实现。

关键接口：
```typescript
class ClaudeCodeAdapter extends BaseToolAdapter implements ToolAdapter {
  readonly platform = 'claude-code';
  readonly version = '1.0.0';
  // 完整实现 ToolAdapter 协议
  // Claude Code profile: 有 sub-agents, persistent memory, skill 集成
}

interface ClaudeCodeProfile {
  hasSubAgents: true;
  memoryPersistence: 'persistent';
  skillIntegration: 'native';
  contextMode: 'automatic';
}
```

### 5. `src/core/tools/codex-adapter.ts`

**保留原因**：第二个适配器实现，满足 MVP 要求的 1-2 个适配器。

关键接口：
```typescript
class CodexAdapter extends BaseToolAdapter implements ToolAdapter {
  readonly platform = 'codex';
  readonly version = '1.0.0';
  // Codex profile: 无 sub-agents, session-only memory, 无 skill 集成
}
```

### 6. 其他保留的 TS 文件

| 文件 | 保留原因 |
|------|---------|
| `src/index.ts` | 项目入口，导出所有公共 API |
| `src/core/models.ts` | 核心数据模型类型定义 |
| `src/core/scanners/bug-scanner.ts` | 正则扫描引擎（197行），保留作为参考 |
| `src/core/analyzer/` | 分析器模块（占位） |
| `src/core/guidance/` | 指导模块（占位） |
| `src/core/review/` | 审查模块（占位） |
| `src/core/project/` | 项目管理模块（占位） |
| `src/core/reports/` | 报告模块（占位） |
| `src/core/standards/` | 标准模块（占位） |
| `src/core/sync/` | 同步引擎模块（占位） |
| `src/core/tasks/` | 任务管理模块（占位） |
| `src/core/wiki/` | Wiki 模块（占位） |
| `src/core/state-machine/` | 状态机模块（占位） |
| `src/core/skills/` | 技能模块（占位） |
| `src/commands/*.ts` | CLI 命令实现（9个文件） |
| `src/utils/` | 工具函数 |

---

## 已删除的 TypeScript 文件及签名

### 核心编排层（3 个文件）

#### `src/core/orchestrator/stages.ts` → 转换为 CLAUDE.md 阶段表格

```typescript
// 已删除。转换为 .claude/CLAUDE.md 中的 "The 10-Stage Lifecycle" 表格
type ProjectStage = 'idea' | 'discovery' | 'spec' | 'architecture'
  | 'scaffold' | 'build' | 'qa' | 'release' | 'operate' | 'evolve';

interface StageDefinition {
  name: ProjectStage;
  order: number;
  leadAgent: AgentRole;
  summary: string;
  requiredArtifacts: string[];
  exitChecklist: string[];
  nextStage: ProjectStage | null;
  prevStage: ProjectStage | null;
}

function getStageDefinition(stage: ProjectStage): StageDefinition
function getNextStage(current: ProjectStage): ProjectStage | null
function getStageByOrder(order: number): StageDefinition
function getAllStages(): StageDefinition[]
function validateStageTransition(from: ProjectStage, to: ProjectStage): boolean
```

#### `src/core/orchestrator/agent-runner.ts` → 转换为 `.claude/agents/*.md`

```typescript
// 已删除。转换为 14 个 .claude/agents/*.md 文件
type AgentRole = 'intake' | 'planner' | 'architect' | 'builder'
  | 'reviewer' | 'security-reviewer' | 'release' | 'team-lead';

interface AgentDefinition {
  role: AgentRole;
  model: 'opus' | 'sonnet' | 'haiku';
  description: string;
  tools: string[];
  skills: string[];
  stages: ProjectStage[];
  constraints: { must: string[]; mustNot: string[] };
}

interface AgentRegistry {
  agents: Map<AgentRole, AgentDefinition>;
  register(agent: AgentDefinition): void;
  findByRole(role: AgentRole): AgentDefinition | undefined;
  findByStage(stage: ProjectStage): AgentDefinition[];
  validate(agent: AgentDefinition): ValidationResult;
}

function createAgentRegistry(): AgentRegistry
function validateAgentDefinition(def: AgentDefinition): ValidationResult
function findAgentByRole(registry: AgentRegistry, role: string): AgentDefinition | undefined
```

#### `src/core/orchestrator/project-initializer.ts` → 转换为 CLAUDE.md 工作流指令

```typescript
// 已删除。转换为 CLAUDE.md 中的 "Init (First Run)" 和 "Adopt (Brownfield)" 工作流
type ProjectMode = 'greenfield' | 'brownfield';

interface ProjectConfig {
  name: string;
  mode: ProjectMode;
  currentStage: ProjectStage;
  codeDomains: string[];
  techStack: string[];
}

function initializeGreenfield(config: ProjectConfig): Promise<void>
// 创建 .ai-first/ 骨架（21个目录）→ 写 project.yml → 创建 symlink → 派发 intake-agent

function adoptBrownfield(rootPath: string): Promise<void>
// 扫描项目结构 → 检测技术栈 → 创建 .ai-first/ → 运行基线扫描

function validateProjectStructure(rootPath: string): ValidationResult
function createDirectorySkeleton(rootPath: string): Promise<void>
```

### 扫描与评估层（3 个文件）

#### `src/core/scanners/repo-scanner.ts` → 转换为 repo-scanner-agent.md 指令

```typescript
// 已删除。转换为 .claude/agents/repo-scanner-agent.md 中的 Phase 1-7 流程
interface RepoFacts {
  projectName: string;
  rootPath: string;
  techStack: string[];
  fileCount: number;
  languages: Map<string, number>;
  codeDomains: CodeDomain[];
  healthSignals: HealthSignal[];
  completeness: {
    docs: { score: number; level: 'good' | 'warning' | 'critical' };
    tests: { score: number; level: 'good' | 'warning' | 'critical' };
  };
}

interface ProjectSnapshot {
  facts: RepoFacts;
  capturedAt: string;
  stageConfidence: Record<ProjectStage, number>;
  recommendations: string[];
}

function scanRepository(rootPath: string): Promise<RepoFacts>
function detectTechStack(rootPath: string): Promise<string[]>
function detectCodeDomains(files: string[]): CodeDomain[]
function assessHealth(facts: RepoFacts): HealthSignal[]
function createSnapshot(facts: RepoFacts): ProjectSnapshot
```

#### `src/core/scanners/stage-assessor.ts` → 转换为 stage-assessor-agent.md 指令

```typescript
// 已删除。转换为 .claude/agents/stage-assessor-agent.md 中的决策树
interface StageAssessment {
  stage: ProjectStage;
  confidence: number;  // 0-100
  evidence: string[];
  missingArtifacts: string[];
}

function assessCurrentStage(snapshot: ProjectSnapshot): StageAssessment
function scoreStage(snapshot: ProjectSnapshot, stage: ProjectStage): number
function getAllStageScores(snapshot: ProjectSnapshot): Record<ProjectStage, number>
```

#### `src/core/scanners/generate-guidance.ts` → 转换为 team-lead-agent 自然输出

```typescript
// 已删除。转换为 .claude/agents/team-lead-agent.md 的自然语言输出
interface GuidanceCard {
  generatedAt: string;
  currentStage: ProjectStage;
  healthScore: number;
  nextActions: string[];
  risks: Risk[];
  recommendations: Recommendation[];
  skillSuggestions: SkillSuggestion[];
}

function generateGuidance(snapshot: ProjectSnapshot, assessment: StageAssessment): GuidanceCard
function calculateHealthScore(snapshot: ProjectSnapshot): number
function identifyRisks(snapshot: ProjectSnapshot): Risk[]
function suggestNextActions(assessment: StageAssessment): string[]
```

### 技能编排层（1 个文件）

#### `src/core/skills/skill-orchestrator.ts` → 转换为 `.claude/skills/*/SKILL.md`

```typescript
// 已删除。转换为 6 个 .claude/skills/*/SKILL.md 文件
interface SkillDefinition {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  riskLevel: 'low' | 'medium' | 'high';
  stages: ProjectStage[];
}

interface SkillRecommendation {
  skill: SkillDefinition;
  score: number;  // 40/30/20/10 加权算法
  reason: string;
}

function recommendSkills(
  stage: ProjectStage,
  context: ProjectSnapshot,
  skills: SkillDefinition[]
): SkillRecommendation[]
// 算法：stage match(40%) + domain match(30%) + health relevance(20%) + risk alignment(10%)

function loadSkills(skillsDir: string): SkillDefinition[]
function validateSkill(skill: SkillDefinition): ValidationResult
function matchSkillToTask(skill: SkillDefinition, task: TaskDefinition): number
```

### 内存管理层（1 个文件）

#### `src/core/memory/memory-manager.ts` → 被 Claude Code 原生 memory 替代

```typescript
// 已删除。Claude Code 原生提供 memory 持久化
interface MemoryEntry {
  id: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  content: string;
  createdAt: string;
  updatedAt: string;
  ttl: number | null;  // null = permanent
  accessCount: number;
}

interface MemoryStats {
  totalEntries: number;
  byType: Record<string, number>;
  totalSize: number;
  oldestEntry: string;
  newestEntry: string;
}

class MemoryManager {
  constructor(storageDir: string);
  add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): MemoryEntry;
  get(id: string): MemoryEntry | undefined;
  update(id: string, content: string): MemoryEntry;
  delete(id: string): boolean;
  query(type?: string, tag?: string): MemoryEntry[];
  getStats(): MemoryStats;
  prune(maxEntries?: number): number;  // TTL-based pruning
  export(format: 'json' | 'markdown'): string;
}
```

### 同步引擎（1 个文件）

#### `src/core/sync/sync-engine.ts` → 转换为 CLAUDE.md 触发规则

```typescript
// 已删除。转换为 knowledge-sync-agent 的自然语言触发规则
type SyncTriggerType = 'file_changed' | 'knowledge_stale' | 'standard_updated'
  | 'api_changed' | 'dependency_added' | 'breaking_change';

interface SyncEvent {
  id: string;
  type: SyncTriggerType;
  status: 'suggested' | 'pending' | 'confirmed' | 'dismissed';
  source: string;  // file path
  target: string;  // knowledge item ID
  reason: string;
  createdAt: string;
}

interface SyncEngine {
  detectChanges(changedFiles: string[]): SyncEvent[];
  checkStaleness(knowledgeItems: string[], changedFiles: string[]): SyncEvent[];
  confirmEvent(eventId: string): void;
  dismissEvent(eventId: string): void;
  getPendingEvents(): SyncEvent[];
}

function createSyncEngine(knowledgeDir: string, standardsDir: string): SyncEngine
function matchTriggerPatterns(filePath: string): SyncTriggerType[]
function calculateStalenessScore(knowledgeItem: string, changedFiles: string[]): number
```

### 工具适配层（1 个文件）

#### `src/core/tools/tool-adapter.ts` → 删除（单平台下无用）

```typescript
// 已删除。822 行，定义了跨 Codex/Claude/Trae/Qoder 的适配器协议
// ToolAdapter 接口和 BaseToolAdapter 抽象类保留在 tool-adapter-protocol.ts 中
// createToolAdapter() 工厂函数保留在 tool-adapter-protocol.ts 中

abstract class BaseToolAdapter implements ToolAdapter {
  abstract readonly platform: string;
  abstract readonly version: string;

  protected config: ToolAdapterConfig | null = null;
  protected connected: boolean = false;

  abstract connect(config: ToolAdapterConfig): Promise<void>;
  abstract send(message: ToolMessage): Promise<ToolResponse>;
  abstract query(capability: string): Promise<ToolCapability | null>;
  abstract healthCheck(): Promise<HealthStatus>;
  abstract disconnect(): Promise<void>;

  // 共享的工具方法
  protected validateMessage(message: ToolMessage): boolean;
  protected serializeMessage(message: ToolMessage): string;
  protected deserializeResponse(data: string): ToolResponse;
  protected createErrorResponse(code: string, message: string): ToolResponse;
  protected logOperation(operation: string, details: Record<string, unknown>): void;
}
```

### 其他已删除文件

| 文件 | 行数 | 删除原因 |
|------|------|---------|
| `src/core/models.ts` (旧版完整版) | ~300 | 类型定义已内联到各 agent markdown 中 |
| `src/core/state-machine/state-machine.ts` | ~150 | 状态机被 symlink + project.yml 替代 |
| `src/core/project/project-manager.ts` | ~200 | 项目管理被 orchestrator 直接操作替代 |
| `src/core/tasks/task-manager.ts` | ~250 | 任务管理被 YAML 文件 + state-updater-agent 替代 |
| `src/core/review/review-engine.ts` | ~180 | 审查被 reviewer-agent markdown 替代 |
| `src/core/wiki/wiki-generator.ts` | ~120 | Wiki 生成被 wiki-generator skill 替代 |
| `src/core/reports/report-generator.ts` | ~100 | 报告生成被 agent 自然输出替代 |
| `src/core/standards/standards-engine.ts` | ~90 | 标准管理被 standards/ 目录 + markdown 替代 |
| `src/core/guidance/guidance-engine.ts` | ~80 | 指导生成被 team-lead-agent 替代 |
| `src/core/analyzer/dependency-analyzer.ts` | ~130 | 依赖分析被 reviewer-agent 架构风险扫描替代 |
| `src/core/agents/agent-definitions.ts` | ~200 | Agent 定义被 .claude/agents/*.md frontmatter 替代 |
| `tests/` (3 个文件) | ~150 | 单元测试不再适用（代码变配置） |

---

## 转换映射表

| 原 TypeScript 模块 | 转换为 | 转换类型 |
|-------------------|--------|---------|
| `orchestrator/stages.ts` | `CLAUDE.md` 阶段表格 | 数据→文档 |
| `orchestrator/agent-runner.ts` | `.claude/agents/*.md` (14个) | 代码→配置 |
| `orchestrator/project-initializer.ts` | `CLAUDE.md` Init/Adopt 工作流 | 逻辑→指令 |
| `scanners/repo-scanner.ts` | `repo-scanner-agent.md` | 代码→指令 |
| `scanners/stage-assessor.ts` | `stage-assessor-agent.md` | 代码→指令 |
| `scanners/generate-guidance.ts` | `team-lead-agent.md` | 代码→自然语言 |
| `skills/skill-orchestrator.ts` | `.claude/skills/*/SKILL.md` (6个) | 代码→配置 |
| `memory/memory-manager.ts` | Claude Code 原生 memory | 代码→平台功能 |
| `sync/sync-engine.ts` | `knowledge-sync-agent.md` | 代码→指令 |
| `tools/tool-adapter.ts` (822行) | 删除 | 过度工程 |
| `harness/subagent-dispatcher.ts` | **保留** | 真正的算法 |
| `harness/dispatch-cli.ts` | **保留** | CLI 桥接 |
| `tools/tool-adapter-protocol.ts` | **保留** | 接口参考 |
| `tools/claude-code-adapter.ts` | **保留** | 适配器参考 |
| `tools/codex-adapter.ts` | **保留** | MVP 要求 |

---

## 恢复指南

如果需要从当前 Markdown 配置恢复原始 TypeScript 代码：

### 第一步：恢复类型系统
1. 从 `tool-adapter-protocol.ts` 提取所有接口定义
2. 从本文档的"已删除文件"部分获取完整的函数签名
3. 重建 `src/core/models.ts` 作为所有类型的聚合导出

### 第二步：恢复核心编排
1. 从 `CLAUDE.md` 的阶段表格反向生成 `stages.ts`
2. 从 14 个 `.claude/agents/*.md` 的 frontmatter 反向生成 `agent-runner.ts` 和 `agent-definitions.ts`
3. 从 `CLAUDE.md` 的 Init/Adopt 工作流反向生成 `project-initializer.ts`

### 第三步：恢复扫描层
1. 从 `repo-scanner-agent.md` 的 Phase 1-7 流程反向生成 `repo-scanner.ts`
2. 从 `stage-assessor-agent.md` 的决策树反向生成 `stage-assessor.ts`

### 第四步：恢复技能和同步
1. 从 6 个 `SKILL.md` 文件反向生成 `skill-orchestrator.ts`
2. 从 `knowledge-sync-agent.md` 的触发规则反向生成 `sync-engine.ts`

### 关键算法（需要精确重现）
1. **拓扑排序**：参考 `subagent-dispatcher.ts` 中的 `createDispatchPlan()` — 这是保留的代码
2. **复杂度评分**：公式 `min(fileCount/50, 0.4) + min(domainCount/5, 0.3) + min(descLength/500, 0.2) + modeFactor`
3. **技能推荐权重**：stage match(40%) + domain match(30%) + health relevance(20%) + risk alignment(10%)
4. **文档完整性评分**：README(25pts) + doc pages(30pts) + API docs(20pts) + architecture docs(25pts)
5. **测试完整性评分**：test:source≥0.3(40pts) + ≥0.1(25pts) + test runner(20pts) + any tests(15pts)

### 注意事项
- `tool-adapter.ts` 的 822 行在恢复时建议跳过 — 它是过度工程
- `memory-manager.ts` 的 TTL + 统计功能已被 Claude Code 原生 memory 覆盖
- 3 个测试文件的测试用例不再适用于当前架构
- 恢复后的代码需要 `npx tsc --noEmit` 验证零错误

---

## 统计摘要

| 指标 | 重构前 | 重构后 | 变化 |
|------|--------|--------|------|
| TypeScript 文件 | ~25 | 10 | -60% |
| 代码行数 | ~4000 | ~500 (保留) | -87% |
| Markdown 配置 | 6 agent md | 14 agent md + 13 command md | +350% |
| Agent 数量 | 8 (TS 定义) | 14 (Markdown) | +75% |
| 类型安全 | 编译时检查 | 无（约定） | 降级 |
| 实际可运行 | 否（mock 为主） | 是（Claude Code 原生） | 升级 |
