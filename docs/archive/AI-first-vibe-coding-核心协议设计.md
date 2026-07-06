# AI-first vibe coding 核心协议设计

## 1. 文档信息

- 文档名称：AI-first vibe coding 核心协议设计
- 文档目标：定义平台核心运行协议，包括引导协议、任务协议、review 协议、知识同步协议、skill 接入协议和 tool adapter 协议
- 适用阶段：orchestrator 设计、adapter 设计、MVP 工程实现
- 当前版本：v0.1
- 状态：可进入模块接口实现

---

## 2. 协议设计目标

本项目的核心不是某个 prompt，而是统一协议。  
只有协议稳定，平台才能同时支持：

1. 新项目和老项目
2. 全栈和拆分协作模式
3. 人工和 agent 混合推进
4. 本地 skill 和技能市场 skill
5. 多种 AI coding tools

本文件中的“协议”指：

- 对象结构
- 输入输出约定
- 状态推进规则
- 调用前后条件

---

## 3. 协议总览

建议第一版定义六类核心协议：

1. `Guidance Protocol`
2. `Task Protocol`
3. `Review Protocol`
4. `Knowledge Sync Protocol`
5. `Skill Integration Protocol`
6. `Tool Adapter Protocol`

---

## 4. Guidance Protocol

### 4.1 目标

统一平台对用户的引导输出，确保任何时候都能回答：

1. 当前项目处在哪个阶段
2. 为什么这么判断
3. 下一步最该做什么
4. 还有哪些可选动作
5. 当前有什么风险
6. 谁最适合主导推进

### 4.2 输入

建议输入对象：

```ts
type GuidanceInput = {
  project: Project
  snapshot: ProjectSnapshot
  stageAssessment: StageAssessment
  activeTasks: Task[]
  latestReviews?: ReviewReport[]
}
```

### 4.3 输出

统一输出为：

```ts
type GuidanceOutput = GuidanceCard
```

### 4.4 协议规则

1. 每次 `/guide` 必须返回 `GuidanceCard`
2. 若阶段判断置信度低，应显式提示
3. 必须同时返回一个主动作和零到多个替代动作
4. 对于老项目，若扫描不完整，应优先建议 `scan`
5. 对于知识可能失效场景，应优先把 `sync` 作为候选动作之一

---

## 5. Task Protocol

### 5.1 目标

统一任务创建、分配、执行、检查和关闭的最小流程。

### 5.2 输入

创建任务时建议输入：

```ts
type CreateTaskInput = {
  projectId: string
  title: string
  description: string
  stage: ProjectStage
  mode: "generate" | "reuse" | "skip" | "execute"
  domainIds?: string[]
  owner?: OwnerRef
  reviewer?: OwnerRef
  priority?: "p0" | "p1" | "p2" | "p3"
}
```

### 5.3 输出

```ts
type CreateTaskOutput = {
  task: Task
  requiredNextStep: "define_scope" | "start_execution" | "pending_review"
}
```

### 5.4 协议规则

1. 所有 `build` 阶段任务在进入执行前，优先要求绑定 `ChangeScope`
2. `reuse` 模式任务必须记录复用来源
3. `skip` 模式任务必须记录跳过原因和风险
4. 任务在进入 `done` 前，如属于关键任务，应至少经过一次 `ReviewReport`
5. 老项目全栈任务必须允许在同一任务中覆盖前后端路径

### 5.5 状态流转

建议任务状态流转：

`todo -> in_progress -> review_pending -> done`

异常流：

- `todo -> canceled`
- `in_progress -> blocked`
- `blocked -> in_progress`
- `review_pending -> in_progress`

---

## 6. Review Protocol

### 6.1 目标

确保执行不是裸奔，任何关键结果都能被结构化检查。

### 6.2 输入

```ts
type ReviewInput = {
  project: Project
  task?: Task
  stage: ProjectStage
  changeScope?: ChangeScope
  relatedArtifacts?: string[]
  knowledgeSyncCandidates?: SyncEvent[]
}
```

### 6.3 输出

```ts
type ReviewOutput = ReviewReport
```

### 6.4 协议规则

1. `qa` 阶段必须输出 `ReviewReport`
2. `build` 阶段关键任务在关闭前应有 review
3. `release` 前必须完成 release-oriented review
4. review 不只检查代码，还要检查：
   - 逻辑
   - 安全
   - 文档
   - 知识同步
5. 若 `knowledgeSyncRequired = true`，任务不应直接视为完全结束

---

## 7. Knowledge Sync Protocol

### 7.1 目标

统一关键变更触发知识更新的机制。

### 7.2 触发源

建议以下情况触发：

1. 代码变更
2. 文档变更
3. 阶段退出
4. review 发现知识可能失效
5. 用户手动执行 `/sync`

### 7.3 输入

```ts
type SyncInput = {
  project: Project
  triggerType: SyncEvent["triggerType"]
  relatedTask?: Task
  changedPaths?: string[]
  latestReview?: ReviewReport
}
```

### 7.4 输出

```ts
type SyncOutput = {
  event: SyncEvent
  impactedKnowledge: KnowledgeItem[]
  impactedStandards: StandardItem[]
  suggestions: string[]
}
```

### 7.5 协议规则

1. 所有同步都统一落为 `SyncEvent`
2. 自动同步只生成建议，不直接覆盖关键知识
3. reviewer 或用户可以确认、修改或驳回同步建议
4. `/sync` 必须使用和自动同步同一套协议
5. 若变更影响前后端契约，应优先检查 `fullstack` 标准和 wiki

---

## 8. Skill Integration Protocol

### 8.1 目标

统一本地 skill 和技能市场 skill 的接入与治理方式。

### 8.2 输入

```ts
type SkillInvokeInput = {
  skill: SkillSpec
  project: Project
  stage: ProjectStage
  task?: Task
  payload: Record<string, unknown>
}
```

### 8.3 输出

```ts
type SkillInvokeOutput = {
  success: boolean
  artifacts?: string[]
  summary: string
  warnings?: string[]
}
```

### 8.4 协议规则

1. 所有 skill 都必须声明输入输出
2. 技能市场 skill 在接入前也必须映射为 `SkillSpec`
3. 高风险 skill 应要求 review
4. orchestrator 按阶段和任务类型选择 skill，而不是按名称硬编码
5. skill 执行结果应可回写到任务、知识或报告

---

## 9. Tool Adapter Protocol

### 9.1 目标

统一平台核心逻辑与具体 AI coding tool 的耦合边界。

### 9.2 输入

```ts
type ToolAdapterInput = {
  tool: ToolCapabilityProfile
  project: Project
  task?: Task
  guidance?: GuidanceCard
  skill?: SkillSpec
  payload?: Record<string, unknown>
}
```

### 9.3 输出

```ts
type ToolAdapterOutput = {
  success: boolean
  normalizedResult: {
    summary: string
    artifacts?: string[]
    findings?: ReviewFinding[]
    nextActions?: NextAction[]
  }
}
```

### 9.4 协议规则

1. tool adapter 负责把平台协议翻译为工具侧输入
2. tool adapter 负责把工具返回结果归一化
3. 工具特有行为不能污染平台顶层对象
4. 第一版至少保留 `codex` 和一个第二工具的适配扩展点
5. 所有 slash 命令最终仍回归平台协议，不走工具私有逻辑

---

## 10. 统一命令协议

建议所有斜杠命令都收敛成统一命令结构。

### 10.1 输入结构

```ts
type CommandInvocation = {
  command:
    | "/init"
    | "/adopt"
    | "/guide"
    | "/scan"
    | "/sync"
    | "/wiki"
    | "/review"
    | "/standards"
    | "/skills"
  args?: string[]
  projectId?: string
  context?: Record<string, unknown>
}
```

### 10.2 输出结构

```ts
type CommandResult = {
  success: boolean
  outputType: "guidance" | "review" | "report" | "sync" | "status"
  payload: unknown
}
```

---

## 11. 协议与老项目全栈场景的特殊约束

### 11.1 Task Protocol 约束

1. 同一任务允许同时覆盖前后端改动
2. `ChangeScope` 应显式包含前端与后端路径
3. reviewer 应检查契约一致性

### 11.2 Sync Protocol 约束

1. 前后端共享契约变更应触发高优先级同步
2. wiki 和 `fullstack` 标准必须进入候选影响列表

### 11.3 Guidance Protocol 约束

1. 不要把前后端任务拆成两个独立主动作
2. 对用户输出应优先使用“功能闭环动作”描述

---

## 12. MVP 协议落地建议

### 12.1 第一版必须实现

1. `Guidance Protocol`
2. `Task Protocol`
3. `Review Protocol`
4. `Knowledge Sync Protocol`

### 12.2 第一版可轻量实现

1. `Skill Integration Protocol`
2. `Tool Adapter Protocol`

说明：

第一版只要把统一输入输出边界定好，就已经为后续多工具和技能市场扩展打好了基础。

---

## 13. 当前结论

平台真正需要固化的，不只是“有哪些功能”，而是：

1. 如何判断项目状态
2. 如何引导下一步
3. 如何定义和推进任务
4. 如何做检查
5. 如何同步知识
6. 如何接入 skill 和不同 AI coding tools

这些能力一旦以协议形式稳定下来，后面的工程实现就会很清晰。
