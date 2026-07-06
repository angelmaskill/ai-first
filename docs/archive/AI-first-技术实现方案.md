# AI-first 技术实现方案

> 业务方案：`docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md`
> 评审记录：`docs/AI-first-剩余工作总清单-评审意见.md`（三轮）
> 本文档：把业务方案翻译成技术实现视角（架构 / 数据模型 / 模块接口 / 关键算法 / 目录 / 实现顺序 / 测试）。

## 文档导航

- [0. 设计哲学：与 Codex 协作的最高原则](#0-设计哲学与-codex-协作的最高原则)
- [1. 设计目标与约束](#1-设计目标与约束)
- [2. 系统架构](#2-系统架构)
- [3. 核心数据模型](#3-核心数据模型)
- [4. Codex 协作架构（核心章节）](#4-codex-协作架构核心章节)
- [5. 关键模块技术方案](#5-关键模块技术方案)
- [6. 目录结构演进](#6-目录结构演进)
- [7. 实现顺序与依赖](#7-实现顺序与依赖)
- [8. 测试与验证策略](#8-测试与验证策略)
- [9. 风险与技术债（消解评审 M1–M7）](#9-风险与技术债消解评审-m1m7)
- [10. 覆盖性说明](#10-覆盖性说明)
- [11. 存量代码盘点与去留决策](#11-存量代码盘点与去留决策实现前清债)

---

## 0. 设计哲学：与 Codex 协作的最高原则

业务方案 §2.4–§2.5、F 节、§5.2 引入了一系列"与 Codex 的协作规范"。**这些规范的目的不是约束 Codex，而是服务 Codex**。本方案把这条原则提升为最高设计准则：

> **丰饶上下文 in，宽容产出 out（Rich Context In, Lenient Out）**
>
> - **Inbound**：把 `.ai-first/` 里 Codex 需要的信息组织成一份充分、清晰的任务上下文包，让 Codex 拿到就能干活、不必到处翻找；prompt 用自然语言 + 轻量结构，不要求 Codex 按固定 schema 回答。
> - **Outbound**：Codex 该怎么写代码就怎么写代码。产出报告由**工具侧基于客观事实**自动收集（git diff、测试结果、验收条件核对），而不是逼 Codex 填一张九字段表格。Codex 自愿写的自然语言总结，我们 best-effort 提取，解析失败永远不影响主流程。

### 0.1 这条原则如何落地为工程约束

| 维度 | 反模式（限制 Codex） | 本方案（服务 Codex） |
|---|---|---|
| prompt | 强制 JSON schema、固定字段顺序、要求"输出 status: done" | 自然语言任务说明 + change scope + 验收条件；末尾请它"简述改了什么"，非强制 |
| 状态判定 | 解析 Codex 自报的 status 字段 | 工具侧跑验收条件核对 + git diff 客观判定 |
| filesChanged | 要求 Codex 列出 | `GitChangeSet.trackedChanges ∪ untrackedChanges`（含 untracked） |
| 失败处理 | parse_failed / partial 五态机 | 进程失败→blocked；验收未过→review_pending；验收过→done。三态 |
| 改动边界 | 靠 Codex 自觉 | 工具侧基于 changeSet 核对 scope，按 §4.3.3 分级（risk/review/block）处理 |

### 0.2 与现有代码的关系（重要）

现有 `src/core/tools/codex-adapter.ts` 已经是这套哲学的雏形：它用 `execFile` 调 `codex exec --skip-git-repo-check --color never <prompt>`，捕获 stdout/stderr，prompt 里只轻声建议 "Return a concise completion report"。**本方案不重写它，而是扩展它**——补上"上下文包组装"和"宽容产出收集"两端，保留它"不限制 Codex"的内核。

---

## 1. 设计目标与约束

### 1.1 业务目标映射（每条技术决策可回溯）

| 业务目标（方案 §20） | 技术落点 |
|---|---|
| init/adopt 一条命令建立控制层 | §2 架构 + §6 目录 + §7 第一批 |
| 前后端算法数据等被识别为 domain | §5.6 复用现有 `repo-domain-detector` + 扩展 |
| 每个 domain 有可维护规范 | §3.4 StandardFrontmatter + §5.5 standards check |
| 任务有 owner/reviewer/scope/验收 | §3.2 Task 扩展 + §5.3 |
| Codex 执行任务并写回 report（不给 Codex 添麻烦） | §4 Codex 协作架构（全文核心） |
| Claude Code 共用同一套控制层 | §2.3 三层约束 + §5 各 core 模块 |
| guide 输出位置感/下一步感 | §5.2 |
| 前后端算法跨域质量检查 | §5.5 + §8 验收核对 |
| 文档/规范变化生成同步建议 | §5.7 |
| Git 仍是版本主入口 | §5.7 通过统一 git collector 产出 `GitBaseline` / `GitChangeSet`，不自建状态 |
| v0.1 最小可用线 | §7 第一批结束即 v0.1 |

### 1.2 硬约束

- **语言/运行时**：TypeScript + Node ≥25，ESM（`"type": "module"`，源码用 `.ts` 直跑 + `tsx`）。
- **依赖**：零新增运行时依赖（现有仅 `react`/`react-dom` 用于 dashboard）。YAML 用自带的极简读写（现有 `project-adopter.ts` 已是手写序列化/解析，保持一致）；如必须加，需 ADR 级理由。
- **三层架构**（方案 §5.3）：`core`（纯函数，读 `.ai-first/` 返回结构化结果）/ `cli`（参数解析 + 调 core + 写文件 + 格式化）/ `claude-command`（调 core/cli 并解释）。第一批所有 guide/task/exec 必须三层落地，避免 G1 返工。
- **先采样**（方案 §5.2）：stage assessor / scope 推断 / Codex 产出 / standards check 必须先有 fixture 再实现核心。
- **工具无关**（方案 D2）：stage assessor 核心是无 LLM 的规则函数；LLM 只作可选增强层。
- **Codex 不被限制**（本文档 §0）：任何"Codex 必须输出 X"的设计都要改成"工具侧自动收集 X"。

---

## 2. 系统架构

### 2.1 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│  claude-command 层 (.claude/commands/*.md + 自然语言编排)    │
│  职责：调用 core/cli、解释结果、保留自然语言体验             │
│  规则：不写业务判断，只转发到 core                           │
└────────────────────────┬────────────────────────────────────┘
                         │ 直接 import core 模块函数
┌────────────────────────▼────────────────────────────────────┐
│  cli 层 (src/core/<domain>/<domain>-cli.ts, 通过 npm script) │
│  职责：参数解析、调 core、写 .ai-first 文件、格式化输出      │
│  规则：无业务判断；所有副作用（写文件）集中在这一层          │
└────────────────────────┬────────────────────────────────────┘
                         │ 纯函数调用
┌────────────────────────▼────────────────────────────────────┐
│  core 层 (src/core/<domain>/<domain>-core.ts)                │
│  职责：读 .ai-first/ + RepoFacts，返回结构化结果             │
│  规则：纯函数；可读文件系统但不写；返回结果由上层决定如何落盘│
└─────────────────────────────────────────────────────────────┘
                         │ 读
┌─────────────────────────────────────────────────────────────┐
│  .ai-first/ 文件协议（YAML/MD，唯一状态来源）                │
└─────────────────────────────────────────────────────────────┘
```

**现有样板**：`src/core/adoption/` 已是这个分层的雏形——`project-adopter.ts` 承担 core 职责（读 RepoFacts、决定该写什么），`adopt-cli.ts` 是 cli。本方案要求**新模块**从一开始就严格三层；adopter 现状保留（见 §6.1 / P1-3），主链路跑通后再单独重构对齐。

> **core 边界精确定义（二轮 P1-3）**：core **不写文件、不 spawn、不执行外部命令**。core 含两类函数：① 纯计算函数（结构化对象进、结构化对象出）；② repository reader 函数（只读本地 `.ai-first/` 文件，转为结构化对象）。git 命令、runtime 子进程、acceptance 命令、写文件——全部属于 runner/cli 副作用层，产出的客观事实（`GitBaseline` / `GitChangeSet` / `PromptRunResult` / `AcceptanceResult`）作为参数传入 core。这样单测、dry-run、CI fixture 都能稳定复现。

### 2.2 runtime 抽象

复用现有 `RuntimeProfile` / `RuntimeRoleBinding`（`models.ts`）和 `DEFAULT_RUNTIME_PROFILES`（`runtime-profiles.ts`）。三个执行模式：

| 模式 | 含义 | 用途 |
|---|---|---|
| `native` | Claude Code 自己跑 agent | Claude 入口的规划/复杂 review |
| `exec` | 通过 `codex exec` 子进程跑 | Codex 局部实现/补测/修 bug（F 节） |
| `dry-run` | 只生成 prompt + 命令串，不执行 | 调试、CI 校验、Z2 主链路模拟 |

`codex-adapter.ts` 的 `executionMode` 已支持 `dry-run | exec`，本方案复用。

### 2.3 `.ai-first/` 文件协议（唯一状态来源）

坚持方案 §2.2"不把 `.ai-first/` 做成数据库"。所有状态都是人可读、可 git diff、可 code review 的 YAML/MD 文件。core 层每次从文件读，不维护内存缓存（项目规模允许）。这与 `project-adopter.ts` 现有的"每次 `scanRepositoryFacts` 重算"一致。

---

## 3. 核心数据模型

### 3.1 现有类型清单（`src/core/models.ts`，已具备，直接复用）

- `Project`、`CodeDomain`、`CodeDomainKind`（含 frontend/backend/algorithm/ml/data/service/app/shared/infra/docs/other）
- `Task`（**需扩展**，见 §3.2）
- `ChangeScope`（已含 frontend/backend/algorithm/data/infra/shared/docs paths + domainPaths + riskLevel + parallelSafe + lockMode，**完全够用**）
- `StageAssessment`（currentStage/confidence/reasons/alternativeStages/blockers/missingArtifacts —— **需扩展** `needsConfirmation: boolean` + `uncertaintyReason?: string`，见 §5.1 / P2-1）
- `ReviewReport` / `ReviewFinding` / `ReviewGate`
- `SyncEvent`（triggerType/relatedTaskId/relatedPaths/impactedKnowledgeIds/impactedStandardIds/status，**够用**）
- `StandardItem`（category/status，需协调 frontmatter，见 §3.4）
- `KnowledgeItem`、`RuntimeProfile`、`RuntimeRoleBinding`、`RepoFacts`、`ProjectSnapshot`/`GuidanceCard`/`NextAction`

### 3.2 需要扩展的类型

**Task 扩展**（方案 E1 要求 `acceptanceCriteria`，现有缺）：

```ts
export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  stage: ProjectStage;
  mode: "generate" | "reuse" | "skip" | "execute";
  domainIds: string[];
  owner?: OwnerRef;
  reviewer?: OwnerRef;
  status: "todo" | "in_progress" | "blocked" | "review_pending" | "done" | "canceled";
  priority: "p0" | "p1" | "p2" | "p3";
  changeScopeId?: string;
  acceptanceCriteria: AcceptanceCriterion[]; // ← 新增
  runtime?: RuntimeToolId;                    // ← 新增：建议执行 runtime
  createdAt: string;
  updatedAt: string;
};

// 新增类型
export type AcceptanceCriterion = {
  id: string;
  description: string;            // 自然语言，如"登录接口返回 200 + token"
  check: AcceptanceCheck;         // 如何客观核对
  required: boolean;              // 是否必须通过才判 done
};

export type AcceptanceCheck =
  | { kind: "test"; commandId: string }          // 映射到 AllowedCommand，不直接持命令串
  | { kind: "typecheck"; commandId: string }
  | { kind: "lint"; commandId: string }
  | { kind: "file_exists"; path: string }
  | { kind: "file_contains"; path: string; pattern: string }
  | { kind: "manual" };

// 安全命令登记表（P0-2）：命令类 check 只能引用此处登记的 commandId，
// 默认仅 npm test / npm run typecheck / npm run lint 及 domain testCommands。
export type AllowedCommand = {
  id: string;                  // 如 "npm-test"、"fe-typecheck"
  command: string[];           // argv 形式，如 ["npm","test"]，不经 shell
  cwd?: string;                // 相对 projectRoot
  timeoutMs: number;           // 必填，杜绝挂起
  maxOutputBytes: number;      // 必填，防输出爆炸
  env?: Record<string, string>;
};
```

> 设计要点（P0-2 修正）：① 验收条件"工具侧可客观核对"，不依赖 Codex 自报；② **命令类 check 不在 core 执行**——core 只把 `AcceptanceCriterion[]` 传给 runner（P2-1：不引入额外 plan 抽象），实际 spawn 由副作用层 `acceptance-runner` 完成（§4.3.1、§6.1）；③ `commandId` 必须在 `AllowedCommand` 登记表内，杜绝 task YAML 引入任意命令执行风险。

**ExecutionReport（新增，F3 的九字段由工具侧填）**：

```ts
export type ExecutionReport = {
  id: string;
  taskId: string;
  runtime: RuntimeToolId;
  startedAt: string;
  finishedAt: string;
  status: "done" | "review_pending" | "blocked";     // 决策态，三态
  outcomeReason: ExecutionOutcomeReason;             // ← P2-2：诊断原因，不参与状态决策
  baselineRef?: string;                              // ← P0-3：执行前 HEAD sha
  preExistingChanges?: string[];                     // ← P0-3：执行前已存在的 tracked 改动
  preExistingUntracked?: string[];                    // ← P2-3：执行前已存在的 untracked（审计）
  taintedPaths?: string[];                            // ← P2-3：归因不确定的路径（审计）
  // —— 以下字段全部由工具侧客观收集，不靠 Codex 自报 ——
  filesChanged: string[];            // ← trackedChanges ∪ untrackedChanges（见 GitChangeSet）
  scopeViolations: ScopeViolation[]; // ← 分级 risk/review/block，见 §4.3.3
  acceptanceResults: AcceptanceResult[];
  runtimeStdout?: string;              // ← 原样留存，便于排查
  runtimeStderr?: string;
  runtimeExitCode?: number;
  naturalLanguageSummary?: string;   // ← best-effort 从 stdout 末尾提取，可能为空
  risks: string[];                   // ← 低级别越界 + 验收失败项 + 可选 NL 提取
  blockers: string[];                // ← 进程失败原因 + 高级别越界
  followUps: string[];               // ← 建议的后续任务（可选）
  knowledgeSyncNeeded: boolean;      // ← filesChanged 非空则 true
};

export type AcceptanceResult = {
  criterionId: string;
  passed: boolean;
  detail: string;                    // 命令输出摘要或缺失原因
};

// P2-2：诊断原因枚举（只用于报告与排查，不参与状态机决策，避免退化成五态机）
export type ExecutionOutcomeReason =
  | "acceptance_passed" | "acceptance_failed"
  | "non_zero_exit" | "timeout"
  | "scope_violation" | "dirty_worktree_blocked";

// P1-1：scope 越界分级（severity 影响 status，见 §4.3.3）
export type ScopeViolation = {
  path: string;
  severity: "risk" | "review" | "block";
  reason: string;                    // 落在哪个 domain / 哪个敏感区
};

// P2-2（二轮）：Codex 运行结果，executePrompt() 的返回值（不是 ToolMessage）
export type PromptRunResult = {
  executionMode: "dry-run" | "exec";
  command: string[];                 // argv，便于审计复现
  stdout: string;
  stderr: string;
  exitCode: number;                  // timeout 时为非零
  timedOut: boolean;                 // 超时不抛到上层，置 true，保证 report 能写盘
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

// P1-1（二轮）：git baseline / change set，覆盖 untracked 与归因
export type GitBaseline = {
  headSha: string;
  preExistingChanges: string[];      // 执行前已修改/暂存/删除/重命名的 tracked 文件
  preExistingUntracked: string[];    // 执行前已存在的 untracked 文件
  clean: boolean;                    // preExisting* 均空时为 true
};

export type GitChangeSet = {
  trackedChanges: string[];          // ← P2-2：执行后新增/修改/删除/重命名的 tracked 文件，且执行前不脏
  untrackedChanges: string[];        // 执行后新增的 untracked 文件（与 trackedChanges 不重叠）
  taintedPaths: string[];            // 执行前已脏、执行后仍变化——归因不确定，仅提示
};
```

> 对照方案 F3 的九字段（status/summary/filesChanged/commandsRun/testsRun/risks/blockers/followUps/knowledgeSyncNeeded）：本方案**保留语义、改变来源**——全部由工具侧收集，Codex 不必填表。`commandsRun`/`testsRun` 折叠进 `acceptanceResults`（因为"跑了什么测试"现在通过验收条件里的 `test` check 客观得到）。

### 3.3 StageRule（D2 stage assessor 的规则表达，新增）

```ts
export type StageSignal = {
  // 每个阶段的"进入信号"和"未满足信号"
  stage: ProjectStage;
  enterWhen: SignalPredicate[];   // 满足则候选此阶段
  blockers: SignalPredicate[];    // 满足则此阶段未完成
  requiredArtifacts: string[];    // .ai-first/artifacts/ 下应有的产物
};

export type SignalPredicate = {
  kind: "artifact_exists" | "task_status" | "report_status"
      | "standards_coverage" | "file_pattern" | "stage_explicit";
  params: Record<string, unknown>;
  weight: number;                 // 对置信度的贡献
  humanHint: string;              // 低置信时给研发人员的解释
};
```

详见 §5.1。

### 3.4 StandardFrontmatter（C1 要求，协调 StandardItem）

方案 C1 要求每个标准 md 文件含 frontmatter（id/domain/title/stability/severity/relatedPaths）。现有 `StandardItem` 有 `status: proposed|accepted|deprecated`，与 `stability` 语义重叠；缺 `severity`、`relatedPaths`。

**协调方案**：md 文件头 frontmatter 是"文件态"，`StandardItem` 是"内存态"，二者通过一个 `parseStandardFile()` 映射。frontmatter schema：

```yaml
---
id: STANDARD-014
domain: algorithm          # frontend|backend|algorithm|data|fullstack|security|workflow
title: Algorithm Reproducibility
stability: stable          # draft|stable|deprecated（映射 StandardItem.status: proposed|accepted|deprecated）
severity: must             # must|should|may
relatedPaths:
  - algorithms/
  - algorithms/eval.py
---
<正文 markdown>
```

---

## 4. Codex 协作架构（核心章节）

> 本章节是"不限制 Codex 发挥"哲学的工程落地，对应业务方案 F 节。F2（prompt 模板）/ F3（输出协议）/ F0（契约测试）都被重新诠释。

### 4.1 上下文包（Task Context Bundle）—— Inbound

core 层组装一份纯文本上下文，目标是"让 Codex 充分理解任务和边界，但自由决定怎么实现"。

```ts
// src/core/task/context-bundle-core.ts
export type TaskContextBundle = {
  task: { title: string; description: string; acceptanceCriteria: AcceptanceCriterion[] };
  scope: ChangeScope;
  stage: ProjectStage;
  domainContexts: DomainContext[];     // scope 涉及的 domain 摘要
  relevantStandards: StandardDigest[]; // 按 scope 命中的标准摘要（不是全文）
  runtime: RuntimeToolId;
};

export type DomainContext = {
  kind: CodeDomainKind;
  paths: string[];
  techStack?: string[];
  testCommands?: string[];
  buildCommands?: string[];
};

export type StandardDigest = { id: string; title: string; severity: string; must: string[] };

// 纯函数：从 .ai-first/ 读出并组装
export function buildTaskContextBundle(
  projectRoot: string,
  task: Task,
  scope: ChangeScope,
): TaskContextBundle { /* ... */ }
```

### 4.2 Prompt v0 模板（轻量、自然语言、不限制）

**不要求 Codex 输出结构化字段。** 模板只做两件事：把上下文包摆清楚 + 末尾请 Codex 写一段自然语言总结（可选）。

```text
# 任务
{task.title}

{task.description}

# 改动范围（请只在这些路径内改动）
- frontend: {scope.frontendPaths}
- backend:  {scope.backendPaths}
- algorithm: {scope.algorithmPaths}
- data:     {scope.dataPaths}
- docs:     {scope.docsPaths}

# 相关 domain 上下文
{对每个 domainContext: kind + paths + 技术栈 + 测试/构建命令}

# 相关规范（团队约定，请遵守）
{对每个 standardDigest: [id] title (severity) — must 条目}

# 验收条件（完成后这些应当成立）
{对每条 acceptanceCriteria: - [id] description (check kind)}

# 当前阶段
{stage}

---
请完成上述任务。你可以自由决定实现方式。
完成后，用一段话简述：改了哪些主要文件、跑了什么验证、有没有遗留问题或风险。
不需要输出 JSON 或任何固定格式。
```

> 对比业务方案 F2"prompt 必须包含阶段/任务/scope/标准/验收/输出格式"：本方案**保留前五项**（这些都是"喂给 Codex 的上下文"），**把"输出格式"降级为"末尾请简述"**——这就是"不限制 Codex"的具体体现。Codex 不会因为"必须输出 JSON"而束手束脚。

### 4.3 宽容产出收集 —— Outbound（工具侧客观收集）

Codex 跑完后，**工具侧**基于客观事实生成 `ExecutionReport`。本节是"不限制 Codex"与"工程严谨"的平衡点，集中落实 P0-2 / P0-3 / P1-1 / P2-2。

#### 4.3.1 分层：core 生成计划，runner 执行命令（P0-2 修正）

`collectExecutionReport()` 是 **core 纯函数**（core compute，见 §2.1），**不直接执行任何命令、不调 git**。它只做客观事实的归集与判定：消费上层传入的 `GitChangeSet`、acceptance-runner 已产出的结果，归集 scope 违规。命令的实际 spawn 在独立的副作用层 `src/core/exec/acceptance-runner.ts`：

```ts
// src/core/exec/report-collector-core.ts —— 纯函数：不 spawn、不调 git、不写文件（P1-3 二轮）
// git 读取由上层 git-collector 完成，产出 GitBaseline/GitChangeSet 后传入；core 只消费
export function collectExecutionReport(params: {
  task: Task;
  scope: ChangeScope;
  runResult: PromptRunResult;
  baseline: GitBaseline;                  // 见 4.3.2
  changeSet: GitChangeSet;                // ← P1-3：上层 git collector 传入，core 不读 git
  acceptanceResults: AcceptanceResult[];  // ← runner 预先跑好，core 只消费
  startedAt: string;
}): ExecutionReport {
  const filesChanged = [...params.changeSet.trackedChanges, ...params.changeSet.untrackedChanges]; // 二者不重叠（P2-2）
  const tainted = params.changeSet.taintedPaths;                // 归因不确定，仅进 risks
  const scopeViolations = classifyScopeViolations(filesChanged, params.scope);
  const naturalLanguageSummary = extractTailSummary(params.runResult.stdout);

  const requiredPassed = params.acceptanceResults
    .filter(r => params.task.acceptanceCriteria.find(c => c.id === r.criterionId)?.required)
    .every(r => r.passed);

  // status 三态决策；outcomeReason 只诊断，不参与决策（P2-2）
  let status: ExecutionReport["status"];
  let outcomeReason: ExecutionOutcomeReason;
  if (params.runResult.timedOut)              { status = "blocked";        outcomeReason = "timeout"; }
  else if (params.runResult.exitCode !== 0)   { status = "blocked";        outcomeReason = "non_zero_exit"; }
  else if (scopeViolations.some(v => v.severity === "block"))  { status = "blocked";        outcomeReason = "scope_violation"; }
  else if (scopeViolations.some(v => v.severity === "review")) { status = "review_pending"; outcomeReason = "scope_violation"; }
  else if (!requiredPassed)                     { status = "review_pending"; outcomeReason = "acceptance_failed"; }
  else                                          { status = "done";           outcomeReason = "acceptance_passed"; }

  return { /* 填齐字段，含 baselineRef、preExistingChanges、preExistingUntracked、taintedPaths、filesChanged、outcomeReason、scopeViolations */ };
}
```

```ts
// src/core/exec/acceptance-runner.ts —— 唯一的命令执行副作用层
export async function runAcceptancePlan(
  checks: AcceptanceCriterion[],          // 直接接收验收条件（P2-1：不引入 plan 抽象）
  allowed: AllowedCommand[],               // 安全命令登记表
  projectRoot: string,
): Promise<AcceptanceResult[]>
// 只执行 allowed 里的 commandId；kind=manual 直接返回 passed=false,detail="需人工核对"
// timeout / cwd / maxOutputBytes 来自 AllowedCommand，runner 不接受调用方传入任意命令
```

#### 4.3.2 git baseline 策略（P0-3 + 二轮 P1-1）

事实来源必须有干净基线，且**必须覆盖 untracked 文件与 allow-dirty 归因**——只靠 `git diff --name-only` 会漏掉 Codex 新建未 git add 的文件，且脏区归因不准：

1. baseline 采集用 `git status --porcelain` 语义（不只是 `git diff --name-only`），覆盖 tracked modified / staged / deleted / renamed / **untracked**，产出 §3.2 的 `GitBaseline { headSha, preExistingChanges, preExistingUntracked, clean }`。
2. **默认要求工作区干净**：`!clean` 且未传 `--allow-dirty` → **preflight 直接 blocked（`outcomeReason: dirty_worktree_blocked`），不启动 Codex**（见 §4.5 时序）。
3. `--allow-dirty` 下，Codex 结束后用同样语义采集 `GitChangeSet` 并做归因：
   - `trackedChanges`：执行后新增/修改/删除/重命名的 tracked 文件，且执行前不脏（Codex 真实影响）。
   - `untrackedChanges`：执行后新出现且未跟踪的文件（Codex 新建但未 git add）。
   - `taintedPaths`：执行前已脏、执行后仍变化的路径——**归因不确定**，写入 risks 供人复核，不静默计入或排除。
4. **只有 `trackedChanges ∪ untrackedChanges` 参与状态判定与 scope 核对**（即 `ExecutionReport.filesChanged`）；`taintedPaths` 仅作风险提示。
5. ExecutionReport 必含 `baselineRef`，便于复现与审计。

> git 读取由上层 `git-collector`（cli/runner 副作用层）完成，产出 `GitBaseline` / `GitChangeSet` 后传入 core，**core 不直接调 git**（见 §2.1 core 边界，P1-3）。

#### 4.3.3 scope 越界分级（P1-1 修正）

原方案"越界只标 risk"过于宽容。修正为**按越界目标分级影响 status**——保护基础设施，但不限制正常代码发挥：

| 越界目标 | severity | 对 status 的影响 |
|---|---|---|
| scope 外的测试文件、文档、局部 helper | `risk` | 不影响（done 仍成立，仅写入 risks） |
| 同 domain 但 scope 外的源码 | `review` | 升级为 review_pending |
| 跨 domain 契约 / API / schema | `review` | 升级为 review_pending |
| security / release / CI / runtime / `.ai-first/standards/` / `.ai-first/project.yml` | `block` | 升级为 blocked |

> 这与"不限制 Codex 发挥"**不冲突**：Codex 自由的是**任务范围内的代码实现**；触及安全/发布/规范基础设施必须拦——这恰是业务方案 §2.2"用本地执行边界和 Git/CI 约束"的体现。`classifyScopeViolations()` 用 path 前缀匹配 domain 归属 + 敏感目录清单判定 severity。

#### 4.3.4 preflight blocked report（P1-1 三轮）

§4.5 时序里 preflight 阶段（工作区脏且未 `--allow-dirty`）要写 blocked report，但**此时尚未启动运行时、也不该跑 acceptance-runner**，所以不能复用 `collectExecutionReport()`（它强制要 `runResult` / `acceptanceResults`）。新增独立纯函数：

```ts
// src/core/exec/report-collector-core.ts —— core compute，纯函数
export function createPreflightBlockedReport(params: {
  task: Task;
  scope: ChangeScope;
  runtime: RuntimeToolId;           // ← P1-1：必填，preflight 知道用户打算用哪个 runtime
  baseline: GitBaseline;
  reason: "dirty_worktree_blocked";
  startedAt: string;
  finishedAt: string;
}): ExecutionReport {
  return {
    id: `report-${params.task.id}-${params.finishedAt}`,
    taskId: params.task.id,
    runtime: params.runtime,         // ← P1-1：补齐必填字段
    startedAt: params.startedAt,
    finishedAt: params.finishedAt,
    status: "blocked",
    outcomeReason: "dirty_worktree_blocked",
    baselineRef: params.baseline.headSha,
    preExistingChanges: params.baseline.preExistingChanges,
    preExistingUntracked: params.baseline.preExistingUntracked,
    taintedPaths: [],
    filesChanged: [],
    scopeViolations: [],
    acceptanceResults: [],
    runtimeStdout: undefined,          // 无运行时执行，可空字段留 undefined
    runtimeStderr: undefined,
    runtimeExitCode: undefined,
    naturalLanguageSummary: undefined,
    blockers: ["工作区不干净且未传 --allow-dirty，preflight 拦截，未启动 Codex"],
    risks: [],
    followUps: [],
    knowledgeSyncNeeded: false,
  };
}
```

主 collector 专注"运行时已执行后"的归集，preflight 走独立入口，避免伪造 `PromptRunResult`。

### 4.4 自然语言总结的 best-effort 提取

```ts
// 永远不抛错，提取不到就返回 undefined
function extractTailSummary(stdout: string): string | undefined {
  // 启发式：取 stdout 最后一个非空段落（Codex 通常在结尾写总结）
  const trimmed = stdout.trimEnd();
  if (!trimmed) return undefined;
  const paragraphs = trimmed.split(/\n\s*\n/);
  const tail = paragraphs[paragraphs.length - 1];
  return tail.length > 0 && tail.length < 2000 ? tail : undefined;
}
```

> 关键：这个函数**永远不影响状态判定**。它只是"锦上添花"——把 Codex 自愿写的总结挂到 report 上，方便人读。

### 4.5 task:exec 端到端时序

```
npm run task:exec -- --task .ai-first/tasks/task-xxx.yml --runtime codex
  │
  ├─ cli: 解析参数 → 读 task yml → 读 scope yml
  ├─ runner: collect GitBaseline（git status --porcelain，§4.3.2）
  ├─ preflight: if !baseline.clean && !--allow-dirty → 写 blocked report，stop（不启动 Codex）
  ├─ core/task: buildTaskContextBundle() → renderPromptV0()（§4.1/4.2）
  ├─ runner: CodexAdapter.executePrompt(prompt)（§4.6，codex 自由运行）
  ├─ runner: collect GitChangeSet（再次 git status --porcelain）
  ├─ runner: runAcceptancePlan()（§4.3.1，唯一执行验收命令的地方）
  ├─ core/exec: collectExecutionReport({ baseline, changeSet, runResult, acceptanceResults })（纯函数，§4.3）
  ├─ cli: 写 .ai-first/reports/exec-{date}-{id}.yml
  ├─ cli: 更新 task.status（done/review_pending/blocked）
  ├─ cli: 追加 logs/timeline.md（task executed）
  └─ cli: 输出人类可读摘要（位置感 + 下一步建议）
```

### 4.6 与现有 `codex-adapter.ts` 的关系

不重写，做一处增量（P2-4 修正封装）：在 `CodexAdapter` 类上新增方法（而非 free function），天然访问其 private 的 `cliPath/execArgs/timeoutMs/executionMode`，不破坏封装：

```ts
// 在 codex-adapter.ts 的 CodexAdapter 类中新增
async executePrompt(prompt: string, options?: { cwd?: string }): Promise<PromptRunResult> {
  // 复用现有 executeSubtask() 的 execFile 逻辑（timeout、maxBuffer、错误捕获），
  // 但入参直接是 prompt 字符串，绕开 ToolMessage 样板。
  // dry-run 模式下返回 { exitCode: 0, stdout: "<dry-run>", timedOut: false }。
}
```

现有 `send()` 保留以兼容 ToolMessage 协议，内部可改为调用 `executePrompt()`。`buildCodexSubtaskPrompt`（现有）保留兼容；新链路（task:exec）用 §4.2 的 `renderPromptV0(bundle)` + `executePrompt()`。

---

## 5. 关键模块技术方案

### 5.1 stage assessor（D2 + D0）

**架构决策**：核心是无 LLM 规则函数。规则集 `StageRule[]` 定义每个阶段的进入信号/阻塞/必要产物。

**规则示例（build 阶段）**：
```yaml
stage: build
enterWhen:
  - kind: artifact_exists
    params: { path: "artifacts/architecture.md" }
    weight: 0.2
    humanHint: "已有架构产物"
  - kind: file_pattern
    params: { include: ["src/**", "apps/*/src/**"] }
    weight: 0.3
    humanHint: "存在源码目录"
  - kind: task_status
    params: { status: in_progress }
    weight: 0.2
    humanHint: "有进行中的实现任务"
blockers:
  - kind: task_status
    params: { status: blocked }
    weight: 0.4
    humanHint: "存在阻塞任务"
requiredArtifacts: []
```

**置信度算法（纯函数）**：
```ts
export function assessStage(projectRoot: string): StageAssessment {
  const facts = scanRepositoryFacts(projectRoot);        // 复用现有
  const project = readProjectYml(projectRoot);
  const tasks = readAllTasks(projectRoot);
  const reports = readAllReports(projectRoot);
  // 对每个 StageRule 累加 enterWhen 中满足谓词的 weight → 候选阶段得分
  // 取最高分阶段为 currentStage，归一化为 confidence ∈ [0,1]
  // 收集未满足的 blockers、missingArtifacts
  // 若 top-2 得分接近（差 < 0.15）→ alternativeStages 非空 + confidence 压低
  // 若 confidence < 阈值 → reasons 里写 "需要研发人员确认阶段"
}
```

**D0 样本验证**：`fixtures/stage-samples/` 放 5–8 个真实/接近真实项目快照（空仓库、adopt 前、build 中、qa、evolve），每个含期望阶段。测试断言规则判定的准确率。

**阈值（回应评审 M3/M4）**：
- 初始可用线：≥10 样本中准确率 ≥ 70%。低于则进入降级。
- **降级策略（回应 M4 的体验张力 + P2-1 类型表达）**：在产物驱动阶段（build/qa/release/operate）纯规则通常置信度高，独立判定（`needsConfirmation = false`）；在语义阶段（idea/discovery/spec/architecture/scaffold/evolve）若 confidence < 0.6，**置 `needsConfirmation = true`** 并在 `uncertaintyReason` 写明候选区间（如"介于 discovery/spec"），guide 据此显示"阶段候选，需确认"而非确定的 currentStage，**不伪装成高确定**。后续可选挂一个 LLM 增强函数 `enhanceWithLLM(assessment)`，默认不启用。

**LLM 增强挂点**：
```ts
// 可选，默认 no-op
export function enhanceWithLLM?(assessment: StageAssessment, projectRoot: string): StageAssessment
```

### 5.2 guide 输出（D3 + K1）

```ts
// src/core/guide/guide-core.ts（纯函数，cli 调它）
export type GuideOutput = {
  stage: ProjectStage;             // 最佳猜测（候选）
  needsConfirmation: boolean;      // ← P2-3：低置信时 true，guide/CLI 据此改展示
  uncertaintyReason?: string;      // ← 为何不确定（候选区间）
  alternativeStages: ProjectStage[]; // ← 候选阶段，避免被展示成确定结论
  stageGoal: string;               // 从 stages/*.yml 读
  confidence: number;
  blocker: string | null;          // 最重要的一个
  nextSteps: NextStepSuggestion[]; // 最多 3 条，第一条是推荐动作
  recommendedRuntime: RuntimeToolId | "human";
  recommendedCommand: string | null;
  whatWillBeChecked: string[];
  infoMissing: string[];           // 信息不足时明确告知
};

export type NextStepSuggestion = {
  title: string;
  reason: string;
  risk: string;
  command?: string;
};

export function buildGuide(projectRoot: string): GuideOutput {
  const assessment = assessStage(projectRoot);
  const tasks = readActiveTasks(projectRoot);
  const syncs = readPendingSyncs(projectRoot);
  const stageMeta = readStageMeta(projectRoot, assessment.currentStage);
  // 规则：阻塞任务优先 → 缺规范 → 待同步 → 阶段缺口
  // 推荐动作映射到 command（如"补 backend 错误码规范"→ npm run task:create -- "..."）
}
```

guide 的 cli 层负责把 `GuideOutput` 格式化成方案 §2.3 的导航器文本。Claude 入口（自然语言"现在啥情况"）也调同一个 `buildGuide()`，由 §2.5 行为裁决分发。

### 5.3 task + changeScope（E1 + E2）

**E1 task:create**：
```ts
// src/core/task/task-core.ts
export function createTask(params: {
  projectRoot: string;
  title: string;
  description: string;
  domainIds: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  owner?: OwnerRef;
  runtime?: RuntimeToolId;
}): { task: Task; scope: ChangeScope } {
  const scope = inferChangeScope(params);  // E2
  const task: Task = { /* 填齐 */ };
  return { task, scope };
}
```
cli 层写 `.ai-first/tasks/task-*.yml` 和 `.ai-first/change-scopes/scope-*.yml`，追加 timeline。

**E2 ChangeScope 推断（三路融合，纯启发式）**：
```ts
export function inferChangeScope(params): ChangeScope {
  // 路径 1：domain paths —— 从 domainIds 取该 domain 的 paths 作为候选
  // 路径 2：git diff —— 若有未提交改动，纳入相关路径
  // 路径 3：自然语言 —— 标题/描述里的路径词（如 "登录接口" → backend auth 路径，靠关键词表）
  // 三路 union，按 domainKind 分类落入 frontendPaths/backendPaths/...
  // riskLevel：跨 ≥2 domain 或改动 standards/ → high；单 domain → low
  // parallelSafe：scope 不重叠其他 active task → true
}
```
E2 先采样（§5.2 横切原则）：`fixtures/scope-samples/` 放若干"标题+描述+domainIds+期望 scope"样本。

**E3 冲突检测**：`detectScopeConflict(newScope, activeTasks)` → 只预警，不锁。

### 5.4 standards check（C8）

```ts
// src/core/standards/standards-core.ts
export type StandardsCheckResult = {
  applicable: StandardItem[];      // 当前 task scope 命中的标准
  missingDomains: CodeDomainKind[]; // 缺标准的 domain
  draftStandards: StandardItem[];  // stability=draft，引用需谨慎
  syncCandidates: StandardItem[];  // 变更可能需要同步的标准
};

export function checkStandards(projectRoot: string, scope: ChangeScope): StandardsCheckResult {
  const all = readAllStandards(projectRoot);          // 解析 md frontmatter
  const applicable = all.filter(s => scopeOverlaps(s.relatedPaths, scope));
  // ...
}
```
集成点：`guide` / `task:create` / `task:exec`（生成 report 时引用）/ review 都调它，保证"同一套标准来源"。

### 5.5 quality gates（H1–H5）

按 domain 的 gate 不是新引擎，而是**复用 §3.2 的 AcceptanceCheck**：
- 前端 gate = 一组 `test/typecheck/file_contains` check（a11y、i18n 用 `file_contains` 或专项命令）
- 后端 gate = `test`（含 integration）+ 契约 check
- 算法 gate = dataset version / 复现性 → 映射为 `test`（跑 eval 脚本）+ `file_exists`（model artifact）

gate 模板放 `.ai-first/standards/<domain>/` 作为"默认验收条件集"，task 可引用。这样 H 节没有独立引擎，复用 §4.3 的验收核对机制。

### 5.6 scan:domains 增强（B1/B2/B4）

现有 `repo-domain-detector.ts` 输出 `RepoFacts`（含 frontendHints 等）。增量：
- B1：把 hints 升级为 `techStack`/`testCommands`/`buildCommands` 候选（读 package.json/go.mod/requirements.txt/pyproject.toml）。
- B2：写 `.ai-first/domains/<kind>.yml`（含 id/name/kind/paths/techStack/testCommands/buildCommands/standards/commonRisks）。
- B4：monorepo 识别 `apps/*/packages/*/services/*/libs/*`。

### 5.7 sync + Git 集成（I + J，二轮 P2-5 / 三轮 P1-2）

**关键：不重复实现另一套 changed files 逻辑**，两条路径分明：

| 触发场景 | changed files 来源 |
|---|---|
| task:exec 之后自动 sync | `ExecutionReport.filesChanged`（已含 tracked + untracked）—— 不再跑 git |
| 手动 `/sync` 或 `npm run sync` | 调 git collector 扫当前工作区，产出 `GitChangeSet` |

```ts
// src/core/sync/sync-core.ts —— core compute
export function analyzeImpact(changedFiles: string[], projectRoot: string): SyncEvent[] {
  // 对每个文件查：是否在某 contract/standard/knowledge 的 relatedPaths 里
  // 生成 SyncEvent: { triggerType: "code_change", relatedPaths, impactedStandardIds, status: "suggested" }
}
```
J1：changed files 统一由 git collector 产出 `GitChangeSet`（覆盖 tracked/untracked），**不再用裸 `git diff --name-only`**；task 后的 sync 直接复用 report 的 filesChanged，二者绝不对同一任务给出不同的 changed files。J2：CI 跑 `npm run check && npm run scan`，PR 展示 gate 结果（后续 GitHub App）。J3：timeline 只追加（现有 `logs/timeline.md` 模式）。

---

## 6. 目录结构演进

### 6.1 `src/core/` 目标布局

```
src/core/
├── models.ts                       # 现有，扩展 Task/ExecutionReport/StageRule/StandardFrontmatter
├── runtime-profiles.ts             # 现有，不变
├── adoption/                       # 现有，保留现状（P1-3：不在第一批重构）
│   ├── adopt-cli.ts                # cli（现有可用）
│   └── project-adopter.ts          # core（现有可用；写副作用暂留，主链路跑通后再单独重构为纯 core）
├── scanners/                       # 现有，扩展 B1/B2/B4
│   ├── repo-domain-detector.ts
│   └── repo-scan-cli.ts
├── tools/                          # 现有
│   ├── codex-adapter.ts            # 增量：executePrompt() 类方法（§4.6）
│   ├── claude-code-adapter.ts
│   └── tool-adapter-protocol.ts
├── harness/                        # 现有（调度器，保留）
├── init/                           # 新（A1）
│   ├── init-cli.ts
│   └── project-init.ts
├── stage/                          # 新（D0/D2）
│   ├── stage-core.ts               # assessStage()
│   ├── stage-rules.ts              # StageRule[]
│   └── stage-samples.test.ts       # D0
├── guide/                          # 新（D3/K1）
│   ├── guide-cli.ts
│   └── guide-core.ts               # buildGuide()
├── task/                           # 新（E1/E2/E3）
│   ├── task-cli.ts                 # task:create / task:exec 入口
│   ├── task-core.ts
│   ├── context-bundle-core.ts      # Codex 上下文包
│   └── scope-core.ts
├── exec/                           # 新（F1）
│   ├── report-collector-core.ts    # collectExecutionReport()（纯函数，不 spawn）
│   ├── acceptance-runner.ts        # 副作用层：唯一执行命令的地方（P0-2）
│   └── codex-runner.ts
├── io/                             # 新（P1-2）：统一 .ai-first 文件读写/校验
│   ├── yaml.ts                     # YAML 子集序列化/解析（集中，禁止各模块手写正则）
│   ├── frontmatter.ts              # MD frontmatter 解析（明确子集，不支持格式给清晰错误）
│   └── allowed-commands.ts         # AllowedCommand 登记表读写
├── standards/                      # 新（C1/C8）
│   ├── standards-cli.ts
│   ├── standards-core.ts           # checkStandards()
│   └── frontmatter.ts              # parseStandardFile()
├── contracts/                      # 新（B3）
│   └── contracts-core.ts
└── sync/                           # 新（I/J）
    ├── sync-cli.ts
    └── sync-core.ts
```

### 6.2 `.ai-first/` 增量目录

现有目录（adopter 已建）基本够。新增：
- `stages/` —— 10 个阶段 meta yml（D1）
- `contracts/` —— 跨域契约 yml（B3）
- `runtime/prompts/codex/` —— prompt 模板（F2，v0 先一份）
- `reports/` —— ExecutionReport yml（F1 写入）

### 6.3 `fixtures/`（测试样本，新增）

```
fixtures/
├── codex-output/        # F0：report collector 样本（目录式，P2-3，见下）
│   └── sample-001/      #   codex-result.json + git-baseline.json + git-change-set.json
│                        #   + acceptance-results.json + expected-report.json
├── stage-samples/       # D0：阶段判定样本
├── scope-samples/       # E2：scope 推断样本
└── standards-samples/   # C8：标准命中样本
```

> **F0 fixture 目录式结构（P2-3）**：每个样本是"录制事实 + 期望 report"——含 `PromptRunResult` / `GitBaseline` / `GitChangeSet` / `AcceptanceResult[]` 的录制 JSON + 一份 `expected-report.json`。CI 只断言 `collectExecutionReport(录制输入) ≈ expected-report`，**不依赖真实运行时 或真实 git 工作区**。真实运行时采样仅作为零号批次手动 go/no-go，沉淀后才进 CI。

### 6.4 YAML / frontmatter 子集协议（P1-2 / 二轮 P2-4）

`src/core/io/yaml.ts` 实现一个**极简 YAML 子集**，覆盖 `.ai-first/` 全部文件类型（Task / ChangeScope / ExecutionReport / StageRule / Standard frontmatter / Domain config / SyncEvent）。明确支持的边界：

| 维度 | 是否支持 |
|---|---|
| scalar（字符串/数字/布尔/null） | ✅ |
| array（`- item` 块状 或 行内 `[a, b]`） | ✅ |
| object（嵌套映射，≤3 层，够 StageRule/Domain） | ✅ |
| 行内 `{k: v}` | ✅（现有 project-adopter 已用） |
| 引号（单/双） | ✅（值含 `: # -` 等特殊字符时必须） |
| 多行 block | `>-` / `>` folded scalar ✅（最小形式；现有 `project.yml` 的 `description: >-` 已用，必须支持以保 round-trip）；`|` literal block ❌（多行正文放 MD，不放 YAML） |
| 注释 `#` | ✅（仅行尾/独立行，不支持行内） |
| key 顺序 | ✅ serializer 稳定排序（按定义顺序），减少 git diff 噪声 |
| 不支持格式 | ❌ 抛清晰错误（指明文件/行/期望），不静默吞 |

**纪律**：所有 `.ai-first/*.yml` 读写必须经 `io/yaml.ts`，禁止各模块手写正则/字符串拼接（现有 `project-adopter.ts` 的私有序列化函数将迁入 io/）。每种文件类型至少一个 round-trip 测试（`parse(serialize(x)) ≈ x`）。若子集无法覆盖新需求，**先扩子集 + 测试，而非绕过**；若反复不够用，触发 ADR 评估引入 YAML 库（见 §10.2 YAML 策略）。frontmatter 同理，由 `io/frontmatter.ts` 统一处理明确子集，不支持格式给清晰错误。

---

## 7. 实现顺序与依赖

### 零号批次（校准，半天–1天）

| 任务 | 产出 | 对应方案 |
|---|---|---|
| Z0 行为裁决落 CLAUDE.md | 修订 `.claude/CLAUDE.md` 的 Step 2–4 dispatch 段落，收编 §2.5 六类分发（查询→guide core；实现→create task + 推荐 task:exec） | M2 |
| Z1 双形态定位文档同步 | README + 使用指南措辞更新 | §2.4 |
| Z2 主链路模拟脚本 + 摩擦点报告模板 | `scripts/pilot-walkthrough.sh` + `.ai-first/reports/pilot-*.md` 模板 | M5 |
| Z3 Codex prompt v0 + ≥2 真实样本 | `.ai-first/runtime/prompts/codex/v0.md` + `fixtures/codex-output/*.txt` | M7 |
| Z4 三层骨架 | `src/core/{stage,guide,task,exec}/` 空壳 + 一个 hello 示例验证分层 | §5.3 |

> M7 边界：Z3 = go/no-go 探针（采样验证可解析），第一批 F0 = 工程化（fixture 进 CI + 解析器单测）。

### 第一批（v0.1 主链路，三层约束横切）

按评审 §6 建议，**先搭横切基建再组装端到端**，避免一开始把 Codex 执行、命令验收、report 收集、task 状态更新全耦在一起。

| # | 工程任务 | 产出文件 | 验收 | 依赖 |
|---|---|---|---|---|
| 0a | io 基建 + 类型定义 | `io/yaml.ts`、`io/frontmatter.ts`、models 扩展（Task/AcceptanceCheck/ExecutionReport/StageAssessment） | YAML/frontmatter round-trip 测试通过 | — |
| 0b | `CodexAdapter.executePrompt` | `tools/codex-adapter.ts` | dry-run 返回结构正确；exec 跑通 hello | 0a |
| 0c | git baseline + diff collector | `exec/codex-runner.ts` baseline 部分 | 干净/脏工作区差集正确 | 0a |
| 0d | acceptance-runner（allowlist） | `exec/acceptance-runner.ts` + `io/allowed-commands.ts` | 只跑登记命令；timeout/输出截断生效 | 0a |
| 1 | D0 stage 样本 + 规则 | `stage/stage-rules.ts` + `fixtures/stage-samples/` | 样本准确率 ≥70% | 0a |
| 2 | D2 assessStage（含 needsConfirmation） | `stage/stage-core.ts` | 无 LLM 也能判阶段；低置信置 needsConfirmation | 1 |
| 3 | D3 guide core + cli + `npm run guide` | `guide/*` + package.json script | 运行 `npm run guide` 得导航输出 | 2 |
| 4 | K1 状态输出（与 D3 共用 core） | 同上 | — | 3 |
| 5 | E1 task:create + `npm run task:create` | `task/task-core.ts` + cli + script | 生成 task + scope yml | 0a |
| 6 | E2 scope 推断 | `task/scope-core.ts` + samples | 多域能生成 scope | 5 |
| 7 | F0 Runtime report collector + fixture | `exec/report-collector-core.ts` + `fixtures/codex-output/` | ≥2 真实样本能生成 report（手动 go/no-go，不进 CI）；CI 只跑沉淀 fixture + 1 失败走降级 | 0b,0c,0d |
| 8 | F1 task:exec + `npm run task:exec` | `task/task-cli.ts` + script | 真实小任务写回 report，含 baselineRef/scopeViolations/outcomeReason | 5,6,7 |
| 9 | F2 prompt v0 完整化 | `.ai-first/runtime/prompts/codex/` | 不同任务类型生成不同 prompt | 8 |
| 10 | F3 ExecutionReport yml 写盘 | cli 写盘 | report 可被 guide 引用 | 8 |

> **P2-6（真实样本务实）**：F0 的"≥2 真实 Codex 样本"依赖本地 Codex 环境/网络/认证，是**手动 go/no-go 验证，不进 CI**。无真实环境时允许 dry-run 开发，但**不能宣称 F0 完成**。CI 只对沉淀后的 fixture 跑 collector 单测。
>
> **P2-3（命名）**：原"F0 Codex 解析器"改名为"Runtime report collector"——因不再解析 Codex schema，而是工具侧收集。
>
> **P2-5（package script）**：每新增一个 cli（#3/#5/#8）必须同步在 `package.json` 加 npm script，文档里的命令必须真实可运行。

**第一批完成 = v0.1 可用线**（§20.1）：init/adopt ✓、规范可导入 ✓、任务有 scope/验收 ✓、Codex 闭环 ✓、Claude 共用 core ✓、guide 输出 ✓、主链路验证 ✓。

### 第二批–第五批

按业务方案 §19 顺序：
- **第二批**（规范+质量）：C1/C2/C3–C6/C8 + H1–H5（复用 §5.5 验收机制）。
- **第三批**（结构+同步）：B1/B2/B3 + I1/I2/I3。
- **第四批**（Claude/Codex 对齐）：G1（由于第一批已三层，此处主要是收编剩余 slash command）/G2/G3 + J1/J2。
- **第五批**（产品化）：M1 统一 `ai-first` CLI（包壳）/L1 fixture 项目/L2 指南/M2 npm 发布/M3 schema 兼容。

---

## 8. 测试与验证策略

| 层 | 策略 |
|---|---|
| core 纯函数 | 单元测试为主，输入 `.ai-first/` fixture 目录 → 断言结构化输出 |
| Runtime report collector（F0） | fixture 驱动：`fixtures/codex-output/<sample>/`（录制的 `PromptRunResult` + `GitBaseline` + `GitChangeSet` + `AcceptanceResult[]`）→ `collectExecutionReport()` → 断言 status/filesChanged/scopeViolations/outcomeReason/taintedPaths |
| stage assessor（D0） | 样本集准确率阈值（≥70%）|
| scope 推断（E2） | 样本驱动 |
| 端到端 | `fixtures/codex-output/` 配合 `executionMode: dry-run`，CI 跑通 task:exec 全链路 |
| 真实 Codex | 不在 CI 跑（需 API key + 不稳定）；手动跑，产物沉淀进 fixture |
| 现有测试 | 不破坏（现有 `*.test.ts` 全绿）|

CI 接入（J2）：`npm run check`（typecheck + test + lint + format）已具备，增量加 `npm run pilot:dry-run`（用 dry-run 跑主链路）。

---

## 9. 风险与技术债（消解评审 M1–M7）

| 评审项 | 本方案消解方式 |
|---|---|
| M1 runtime 选择不写死 | guide 的 `recommendedRuntime` 由规则给出（局部实现→codex；规划→claude），§2.5 行为裁决引用此结果而非硬编码"局部实现=codex" |
| M2 Z0 落 CLAUDE.md | 零号批次 Z0 明确产物 = 收编 CLAUDE.md 的 dispatch 段落 |
| M3 D0 阈值 | §5.1 给 ≥70% 初始阈值 |
| M4 低置信体验张力 | §5.1 降级策略：语义阶段低置信输出"需确认"，不伪装；可选 LLM 增强挂点 |
| M5 Z2 摩擦点落点 | Z2 产物定 `.ai-first/reports/pilot-*.md` |
| M6 E2/C8 先采样 | 第一批 E2 带 samples；C8 在第二批前补 samples（§6.3） |
| M7 Z3/F0 边界 | §7 零号批次注 M7 边界（go/no-go vs 工程化） |

**新增技术风险**：
- **风险**：宽容产出依赖 changeSet 事实，脏工作区会污染归因。**对策**：task:exec 开始采集 `GitBaseline`（`git status --porcelain`），preflight 拦脏（§4.3.4）；结束后采集 `GitChangeSet`（tracked/untracked/tainted 分离），只用 `tracked ∪ untracked` 参与判定（§4.3.2）。
- **风险**：纯规则 stage assessor 在语义阶段置信度低。**对策**：§5.1 降级 + D0 样本暴露，不隐藏。
- **风险**：Codex 改动越界（改了 scope 外的文件）。**对策**：按 §4.3.3 / ADR-002 分级——测试/文档/helper 只标 risks；同/跨 domain 源码升 review_pending；security/release/standards 升 blocked。不再"一刀切只标 risk"。

---

## 10. 覆盖性说明

### 10.1 业务方案 A–M + 零号批次覆盖情况

| 业务项 | 技术落点 |
|---|---|
| A 初始化接入 | §2.1 三层 + §6.1 `init/` + 现有 `adoption/` |
| B 结构识别 | §5.6（复用并扩展 `repo-domain-detector`） |
| C 规范补全 | §3.4 frontmatter + §5.4 standards check |
| D 阶段导航 | §5.1 assessor + §5.2 guide |
| E 任务范围 | §5.3 |
| F Codex 闭环 | §4（全文核心，重新诠释为"不限制 Codex"） |
| G Claude 对齐 | §2.1 三层约束使 G1 几乎零成本 |
| H 质量检查 | §5.5（复用验收机制，无独立引擎） |
| I 信息对齐 | §5.7 |
| J Git/CI | §5.7 + §8 |
| K 研发视图 | §5.2 guide 复用 |
| L 示例文档 | §7 第五批 |
| M 产品化 CLI | §7 第五批 |
| Z0–Z4 零号批次 | §7 零号批次表 |

### 10.2 关键决策记录（ADR）与业务方案修订项

本方案相对业务方案的有意变更，经评审（`docs/AI-first-技术实现方案-评审意见.md`）决议如下（P0-1：把"口径分歧"升级为正式 ADR，避免两份文档打架）：

**ADR-001：F3 输出协议——从"Codex 必须输出"改为"工具侧客观收集"**
- 决议：ExecutionReport 九字段语义保留，但**来源全部改为工具侧客观收集**（git diff / 验收核对 / 进程状态）；Codex 仅 best-effort 提供自然语言总结，不要求结构化输出。
- 理由：直接源于"不限制 Codex"原则；不依赖 Codex 遵守 schema，更稳健。
- **业务方案修订项（待同步，二轮复评 §8.4 再次强调）**：业务方案 F3 当前仍保留"Codex 输出能稳定落入结构化协议""输出 schema 或解析器测试""至少 2 个真实 Codex 输出样本能被解析"等旧表述，需同步修订，否则实现者可能回到"让 Codex 填表"的旧路线。建议业务方案 F3 补一段：

  > F3 字段语义保留，但主要由工具侧基于 Git change set、acceptance runner、Codex 进程状态生成；Codex 自然语言总结仅 best-effort 提取，解析失败不影响主状态。F0 不验证 Codex 是否稳定输出 schema，而验证 report collector 是否能在真实/录制样本下稳定生成 ExecutionReport。

  后续测试以 ExecutionReport 字段是否生成为准，**不以 Codex 是否按 schema 输出为准**。

**ADR-002：scope 越界分级（修正原方案"只标 risk"）**
- 决议：按越界目标分 `risk / review / block` 三级影响 status（§4.3.3）。
- 理由：评审 P1-1 指出原方案过度宽容；Codex 自由的是任务内代码，触及 security/release/standards 基础设施必须拦，与"不限制 Codex"不冲突。

**ADR-003：H 节不建独立 gate 引擎**
- 决议：H1–H5 复用 `AcceptanceCheck`（§5.5）。
- 理由：任务验收 / Codex report / review / CI 共享一套检查，减少概念冗余。

**ADR-004：stage assessor 语义阶段不强定论**
- 决议：低置信时置 `needsConfirmation = true`（P2-1），guide 显示"候选，需确认"。
- 理由：以"位置感"体验为准，不伪装高确定。

**YAML 依赖策略（P1-2，保守）**
- 决议：第一批坚持零新增依赖，用 `src/core/io/` 统一手写 YAML 子集 + round-trip 测试。
- 触发 ADR 的条件：若子集无法覆盖 StageRule / Domain config 等嵌套结构，再开 ADR 评估引入 YAML 库；在此之前不轻易破坏"零依赖"。

> ADR-001 涉及业务方案同步（需改 F3 措辞），其余为实现层决议，无需业务侧确认。

---

## 11. 存量代码盘点与去留决策（实现前清债）

前十章讲"该建什么"，本节诚实盘点"已建但没接上的"，作为第一批实现前的清债清单（基于 2026-07 调用链核查）。

### 11.1 双轨现状（核心张力）

项目存在两条并行路径，目前只在 adopt/scan 两个点交集——这正是 §2.4 双形态定位要处理的现实基础：

| 路径 | 载体 | 现状 |
|---|---|---|
| Claude 原生编排 | `.claude/` 的 Markdown（CLAUDE.md + 15 agents + 14 commands） | 真正在跑 |
| TS 确定性 CLI | `src/core/*.ts` | 仅 adopt/scan 通车；harness 弱通车；**约 1300 行真孤岛** |

### 11.2 调用链核查结果（grep 实证）

| 模块 | 核心行数 | 调用方 | 判定 |
|---|---|---|---|
| `adoption/` | 292 | `npm run adopt` + `/adopt` | ✅ 在用（历史可用,**不作为新模块三层分离样板**——core 仍含写副作用,见 §2.1 / P1-3） |
| `scripts/pre-commit.sh` | — | 手动安装 / 本地 git hook | 🟡 质量辅助,非主链路;保留但不作 v0.1 必需入口 |
| `scanners/` | 325 | `npm run scan:domains`；`repo-scanner-agent`；`/adopt` 辅助路径；`/scan` 尚未直接复用 | ✅ 在用 |
| `harness/subagent-dispatcher` + `dispatch-cli` | 697 | `/task` 生成 manifest → `/complete` 读 manifest 让 Claude 执行 | 🟡 弱通车 |
| `harness/executor.ts` | 252 | 无（只 import 了 ToolAdapter 类型） | ❌ 真孤岛 |
| `harness/routing-resolver.ts` | 335 | 无 | ❌ 真孤岛 |
| `tools/` adapter 三件套 | ~640 | 只被孤岛 executor 引用 | 🟡 半孤岛（第一批 Codex 闭环会用） |
| `agents/registry-loader.ts` | 287 | 无（dispatch-cli 用 hardcoded 映射，不调它） | ❌ 真孤岛 |
| `agents/smoke-case-generator.ts` | 426 | 无（无 `/smoke` 命令消费） | ❌ 真孤岛 |
| `frontend/` dashboard | ~3600（含组件/i18n/测试/生成后的 data 文件；核心 Dashboard ~600 行，含此前漏统的 `.tsx`；另有 `scripts/generate-frontend-data.ts` 数据同步脚本,不计入本行） | `npm run dev` / `frontend:dev` | 🔵 可选展示（K3 降级） |

### 11.3 去留决策

**统一判定标准（P2-2）：**

| 判定 | 标准 |
|---|---|
| 保留 | 第一批主链路需要，或已有 CLI/Claude command 明确调用 |
| 接通 | 有明确业务价值，但当前无入口 |
| 标注实验性 | 有测试/原型价值，但短期不进主链路 |
| 归档/删除 | 与新方案方向冲突，且经复用审查确认无复用价值 |

> **弱通车判定证据（P2-3）**：`harness/subagent-dispatcher` 之所以不算真孤岛，是因为 `.claude/commands/task.md` 调 `npx tsx src/core/harness/dispatch-cli.ts` 生成 manifest，`.claude/commands/complete.md` 读取该 manifest 指示 Claude 按拓扑组执行——有明确的双向消费链。

**① 标注隔离 → 复用审查 → 再删（真孤岛，源码约 1300 行，不含测试）：**

> 行数按生产源文件估算，**不含测试**；对应测试仍会增加维护成本，清理时一并处理（P1-3）。

| 模块 | 决策（P1-4：先标注，再审查，最后删——不直接删） |
|---|---|
| `agents/smoke-case-generator.ts`（426 行） | ① 先标注 `experimental/unwired`；② 第一批前审查：补 `/smoke` 命令接通 **或** 删（含测试）；③ 禁止在 README 暗示在跑 |
| `agents/registry-loader.ts`（287 行） | ① 先标注；② 审查：让 `dispatch-cli` 改用 loader（消除 hardcoded 映射）**或** 删；可能含可复用的 agent 定义加载逻辑 |
| `harness/executor.ts` + `routing-resolver.ts`（587 行） | ① 先标注 `experimental/unwired`，从 README 移除；② 第一批 `task:exec` 前做**复用审查**：executor 的 adapter 执行编排、routing-resolver 的 manifest→action 解析，能被 report collector / codex runner 复用的函数迁移，不能的再删；③ 删时同步删测试 |

**② 接通（有业务价值，当前无入口）：**

- **`/scan` 接通 TS scanner（P1-1）**——当前 `scan.md` 用 shell find/grep + skill 各扫各的，未复用 TS scanner。**接通任务**：让 `/scan` 优先调 `scan:domains` 或未来统一 scan core，避免 Claude command 与 TS scanner 走两套。
- `harness/subagent-dispatcher` + `dispatch-cli` —— manifest 被 `/complete` 间接消费，保留；其"确定性拆分"价值要等 **`task:exec`（Codex 路径不会自己拆任务）** 兑现。对 Claude 路径（Claude 自己会拆）只是"可审计补充"，非必需。

**③ 第一批必须复用（保留，不得重写——P1-5）：**

- `tools/adapter` —— 第一批 Codex 闭环（`CodexAdapter.executePrompt`）的核心资产。**优先改造 `codex-adapter.ts`，不要重写一套 codex runner**。当前虽只被孤岛 executor 引用，但**明确排除孤岛清理候选**。

### 11.4 文档诚实性

README 宣传的"15 agents、9 gates、auto-orchestration"目前**几乎全部由 `.claude/` 的 Markdown 承担**，`src/core` 的 TS 代码不提供这些能力。第一批实现前：

- 孤岛代码（executor / routing-resolver / smoke-case-generator / registry-loader）要么接通、要么标注"实验性/未启用"，**不得在 README 算进"在跑的能力"**。
- 第一批 0a（io 基建）之前，建议先做一次"孤岛清理"提交，避免新代码和孤岛代码混在一起增加理解成本。
- **dashboard 不进 v0.1 主链路（P2-4）**：v0.1 所有关键动作必须能通过 CLI / Claude / Codex 完成，dashboard 仅作 showcase / health view，**不得成为必需入口**。
- README 能力分级：把"已可用 / 规划中 / 实验性 / 展示示例"分开标注，孤岛代码归入"实验性"，不冒充"已运行"。
