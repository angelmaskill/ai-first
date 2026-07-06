# AI-first vibe coding 核心数据模型设计

## 1. 文档信息

- 文档名称：AI-first vibe coding 核心数据模型设计
- 文档目标：定义平台核心对象、关键字段和对象关系，为 `.ai-first/` 落盘、协议设计和工程实现提供统一模型
- 适用阶段：架构设计、存储设计、协议设计、MVP 工程实现
- 当前版本：v0.1
- 状态：可进入元数据结构与协议实现设计

---

## 2. 设计目标

本文件解决以下问题：

1. 平台最核心的对象有哪些
2. 每个对象需要承载哪些最小字段
3. 对象之间如何关联
4. 哪些对象需要落盘到 `.ai-first/`
5. 哪些对象应作为 agent、skill、tool adapter 的统一输入输出

核心原则：

1. 优先定义稳定抽象，不绑定具体 AI coding tool
2. 优先支持项目推进闭环，而不是一次性覆盖所有细节
3. 优先支持老项目接入和全栈闭环任务
4. 模型要同时支持自动化和手动兜底

---

## 3. 总体对象图

建议第一版围绕以下 12 个核心对象建模：

1. `Project`
2. `ProjectSnapshot`
3. `GuidanceCard`
4. `StageAssessment`
5. `Task`
6. `ChangeScope`
7. `ReviewReport`
8. `KnowledgeItem`
9. `StandardItem`
10. `SkillSpec`
11. `ToolCapabilityProfile`
12. `SyncEvent`

这些对象之间的关系为：

- `Project` 是顶层对象
- `ProjectSnapshot` 是项目当前状态快照
- `StageAssessment` 是当前阶段判断结果
- `GuidanceCard` 是对用户输出的引导视图
- `Task` 是推进单元
- `ChangeScope` 是任务的影响边界
- `ReviewReport` 是检查结果
- `KnowledgeItem` 是项目知识沉淀单元
- `StandardItem` 是升级后的团队标准单元
- `SkillSpec` 是可编排能力单元
- `ToolCapabilityProfile` 是工具适配能力单元
- `SyncEvent` 是知识同步触发和记录单元

---

## 4. 顶层项目对象

### 4.1 `Project`

`Project` 是平台对一个项目的稳定身份定义。

建议结构：

```ts
type Project = {
  id: string
  name: string
  slug: string
  description?: string
  mode: "greenfield" | "brownfield"
  teamMode: "fullstack" | "frontend_backend_split" | "hybrid"
  ownershipModel: "domain_based" | "module_based" | "mixed"
  rootPath: string
  codeDomains: CodeDomain[]
  currentStage: ProjectStage
  status: "active" | "paused" | "archived"
  createdAt: string
  updatedAt: string
  tags?: string[]
}
```

### 4.2 `CodeDomain`

用于表示前端、后端、共享包或其他代码域。

```ts
type CodeDomain = {
  id: string
  name: string
  kind: "frontend" | "backend" | "shared" | "infra" | "docs" | "other"
  paths: string[]
  description?: string
}
```

说明：

1. 老项目全栈模式下，前后端属于同一个 `Project` 下的多个 `CodeDomain`
2. 不为前端和后端创建两个独立 `Project`

---

## 5. 项目认知对象

### 5.1 `ProjectSnapshot`

用于表达平台在某一时刻对项目现状的结构化认知。

```ts
type ProjectSnapshot = {
  id: string
  projectId: string
  createdAt: string
  currentStage: ProjectStage
  stageConfidence: number
  goals: string[]
  blockers: string[]
  risks: string[]
  missingArtifacts: string[]
  healthSignals: HealthSignal[]
  activeTasks: string[]
  suggestedNextActions: NextAction[]
  affectedKnowledgeIds: string[]
}
```

### 5.2 `HealthSignal`

```ts
type HealthSignal = {
  name: string
  status: "good" | "warning" | "critical" | "unknown"
  summary: string
  source?: string
}
```

### 5.3 `StageAssessment`

用于保留阶段判断细节。

```ts
type StageAssessment = {
  id: string
  projectId: string
  currentStage: ProjectStage
  confidence: number
  reasons: string[]
  alternativeStages: ProjectStage[]
  blockers: string[]
  missingArtifacts: string[]
  assessedAt: string
}
```

---

## 6. 引导对象

### 6.1 `GuidanceCard`

这是平台最重要的用户可见结构之一。`/guide` 的输出应统一映射到它。

```ts
type GuidanceCard = {
  id: string
  projectId: string
  generatedAt: string
  projectMode: "greenfield" | "brownfield"
  currentStage: ProjectStage
  confidence: number
  summary: string
  whyNow: string[]
  primaryAction: NextAction
  alternativeActions: NextAction[]
  risks: string[]
  suggestedLeadAgent: AgentRole
  reviewStatus: "not_started" | "pending" | "in_progress" | "passed" | "failed"
}
```

### 6.2 `NextAction`

```ts
type NextAction = {
  id: string
  title: string
  description: string
  actionType:
    | "analyze"
    | "generate"
    | "reuse"
    | "skip"
    | "implement"
    | "review"
    | "sync"
    | "release"
  priority: "p0" | "p1" | "p2" | "p3"
  recommendedOwner: AgentRole | "user"
  requiresConfirmation: boolean
}
```

---

## 7. 任务与协作对象

### 7.1 `Task`

任务是平台最基础的推进单元。

```ts
type Task = {
  id: string
  projectId: string
  title: string
  description: string
  stage: ProjectStage
  mode: "generate" | "reuse" | "skip" | "execute"
  domainIds: string[]
  owner: OwnerRef
  reviewer?: OwnerRef
  status:
    | "todo"
    | "in_progress"
    | "blocked"
    | "review_pending"
    | "done"
    | "canceled"
  priority: "p0" | "p1" | "p2" | "p3"
  changeScopeId?: string
  linkedKnowledgeIds?: string[]
  linkedStandardIds?: string[]
  createdAt: string
  updatedAt: string
}
```

### 7.2 `OwnerRef`

```ts
type OwnerRef = {
  type: "user" | "agent" | "team"
  id: string
  name: string
}
```

### 7.3 `ChangeScope`

这是多人协作防冲突的核心对象。

```ts
type ChangeScope = {
  id: string
  projectId: string
  taskId: string
  summary: string
  frontendPaths: string[]
  backendPaths: string[]
  sharedPaths: string[]
  docsPaths: string[]
  excludedPaths?: string[]
  riskLevel: "low" | "medium" | "high"
  parallelSafe: boolean
  lockMode: "none" | "soft" | "hard"
  createdAt: string
  updatedAt: string
}
```

说明：

1. 老项目全栈模式中，`ChangeScope` 要同时表达前后端影响范围
2. 任务不是围绕单文件协作，而是围绕 `ChangeScope` 协作

---

## 8. 检查对象

### 8.1 `ReviewReport`

统一承接代码检查、安全扫描、文档检查和知识同步检查。

```ts
type ReviewReport = {
  id: string
  projectId: string
  taskId?: string
  stage: ProjectStage
  reviewer: OwnerRef
  status: "passed" | "passed_with_warnings" | "failed"
  findings: ReviewFinding[]
  gates: ReviewGate[]
  recommendations: string[]
  knowledgeSyncRequired: boolean
  createdAt: string
}
```

### 8.2 `ReviewFinding`

```ts
type ReviewFinding = {
  id: string
  severity: "critical" | "high" | "medium" | "low"
  category:
    | "logic"
    | "security"
    | "architecture"
    | "docs"
    | "knowledge"
    | "testing"
    | "consistency"
  title: string
  detail: string
  relatedPaths?: string[]
  resolutionHint?: string
}
```

### 8.3 `ReviewGate`

```ts
type ReviewGate = {
  name: string
  status: "passed" | "failed" | "skipped"
  reason?: string
}
```

---

## 9. 知识沉淀对象

### 9.1 `KnowledgeItem`

项目知识的基础单元。

```ts
type KnowledgeItem = {
  id: string
  projectId: string
  type:
    | "project_fact"
    | "decision"
    | "wiki"
    | "pattern"
    | "risk"
    | "glossary"
    | "workflow_note"
  title: string
  summary: string
  contentRef?: string
  sourceRefs?: string[]
  relatedPaths?: string[]
  stage?: ProjectStage
  stability: "draft" | "confirmed" | "deprecated"
  updatedAt: string
}
```

### 9.2 `StandardItem`

用于表达从项目经验升级而来的团队标准。

```ts
type StandardItem = {
  id: string
  name: string
  domain: "frontend" | "backend" | "fullstack" | "docs" | "security" | "workflow"
  summary: string
  ruleType: "guideline" | "checklist" | "template" | "convention"
  sourceKnowledgeIds: string[]
  status: "candidate" | "approved" | "deprecated"
  updatedAt: string
}
```

说明：

1. `KnowledgeItem` 服务于单项目认知
2. `StandardItem` 服务于团队跨项目复用

---

## 10. skill 与工具对象

### 10.1 `SkillSpec`

用于定义本地 skill 和技能市场 skill 的统一协议。

```ts
type SkillSpec = {
  id: string
  name: string
  source: "local" | "marketplace"
  version: string
  description: string
  supportedStages: ProjectStage[]
  supportedTaskTypes: string[]
  inputs: SkillIO[]
  outputs: SkillIO[]
  riskLevel: "low" | "medium" | "high"
  requiresReview: boolean
  enabled: boolean
}
```

### 10.2 `SkillIO`

```ts
type SkillIO = {
  name: string
  type: string
  required: boolean
  description?: string
}
```

### 10.3 `ToolCapabilityProfile`

用于表达不同 AI coding tools 的能力画像。

```ts
type ToolCapabilityProfile = {
  id: string
  toolName: string
  version?: string
  fileRead: boolean
  fileWrite: boolean
  commandExec: boolean
  subAgents: boolean
  memoryMode: "none" | "session" | "project" | "hybrid"
  slashCommands: boolean
  reviewMode: boolean
  skillIntegration: boolean
  contextMode: "manual" | "auto" | "mixed"
  notes?: string[]
}
```

---

## 11. 同步对象

### 11.1 `SyncEvent`

用于表示一次知识同步或同步建议。

```ts
type SyncEvent = {
  id: string
  projectId: string
  triggerType:
    | "code_change"
    | "docs_change"
    | "stage_exit"
    | "manual_command"
    | "review_required"
  relatedTaskId?: string
  relatedPaths?: string[]
  impactedKnowledgeIds?: string[]
  impactedStandardIds?: string[]
  status: "pending" | "suggested" | "confirmed" | "dismissed"
  summary: string
  createdAt: string
  updatedAt: string
}
```

说明：

1. 自动同步和 `/sync` 手动兜底都通过 `SyncEvent` 统一建模
2. reviewer 可以对 `SyncEvent` 做确认或驳回

---

## 12. 枚举定义

### 12.1 `ProjectStage`

```ts
type ProjectStage =
  | "idea"
  | "discovery"
  | "spec"
  | "architecture"
  | "scaffold"
  | "build"
  | "qa"
  | "release"
  | "operate"
  | "evolve"
```

### 12.2 `AgentRole`

```ts
type AgentRole =
  | "intake"
  | "planner"
  | "architect"
  | "builder"
  | "reviewer"
  | "security_reviewer"
  | "release"
  | "team_lead"
```

---

## 13. 对象关系约束

建议建立以下约束：

1. 一个 `Project` 可以有多个 `ProjectSnapshot`
2. 一个 `Project` 在任一时刻只有一个主 `currentStage`
3. 一个 `Task` 最多关联一个主 `ChangeScope`
4. 一个 `ReviewReport` 可以对应一个阶段或一个任务
5. 一个 `KnowledgeItem` 可以由多个 `SyncEvent` 触发更新
6. 一个 `StandardItem` 可以从多个 `KnowledgeItem` 提升而来
7. 一个 `GuidanceCard` 应基于最新 `ProjectSnapshot` 和 `StageAssessment` 生成

---

## 14. 落盘优先级

第一版不是所有对象都要独立复杂存储，建议按优先级落盘。

### 14.1 MVP 必须落盘

1. `Project`
2. `ProjectSnapshot`
3. `Task`
4. `ChangeScope`
5. `ReviewReport`
6. `KnowledgeItem`
7. `SyncEvent`

### 14.2 MVP 可简化落盘

1. `StageAssessment`
2. `GuidanceCard`
3. `StandardItem`
4. `SkillSpec`
5. `ToolCapabilityProfile`

这些对象在 MVP 可先采用文件式 JSON/YAML 落盘。

---

## 15. 建议的文件组织映射

建议映射到 `.ai-first/` 时采用以下组织：

- `project.yml`：`Project`
- `snapshots/*.json`：`ProjectSnapshot`、`StageAssessment`
- `tasks/*.yml`：`Task`
- `change-scopes/*.yml`：`ChangeScope`
- `reviews/*.md|json`：`ReviewReport`
- `knowledge/*.md|yml`：`KnowledgeItem`
- `standards/*.md|yml`：`StandardItem`
- `sync/*.yml`：`SyncEvent`
- `skills/*.yml`：`SkillSpec`
- `tool-adapters/*.yml`：`ToolCapabilityProfile`

---

## 16. MVP 简化建议

为保证 0 到 1 实现速度，建议遵循以下简化策略：

1. `GuidanceCard` 可优先运行时生成，不必先单独持久化
2. `StandardItem` 第一版先做手动确认升级，不做全自动提升
3. `ToolCapabilityProfile` 第一版可内置静态配置
4. `SkillSpec` 第一版先支持最小元数据

---

## 17. 下一步设计建议

在本文件确认后，下一步建议继续推进：

1. `.ai-first/` 目录与元数据结构设计
2. 引导协议设计
3. 任务协议与 review 协议设计
4. 知识同步协议设计
5. tool adapter / skill adapter 协议设计

---

## 18. 当前结论

本项目的数据模型需要首先保证两件事：

1. 平台永远知道项目当前处在什么状态、下一步该做什么
2. 平台永远知道一次改动影响了什么、该由谁检查、哪些知识需要同步

只要这两个目标成立，后续 agent、skill、多工具适配和团队沉淀机制都能稳定落在同一套模型上。
