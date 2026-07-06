# 《AI-first 技术实现方案》评审意见

| 项 | 内容 |
| --- | --- |
| 评审对象 | `docs/AI-first-技术实现方案.md` |
| 评审日期 | 2026-07-05 |
| 评审范围 | 架构合理性、与业务方案一致性、Codex 友好性、实现可行性、风险和测试策略 |
| 参考材料 | `docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md`、`docs/AI-first-Codex友好性审查.md`、`src/core/` 现有代码、`package.json` |

## 1. 总体结论

技术方案整体方向正确，可以作为下一阶段实现的主方案，但建议在开工前先修正几个关键口径和工程风险。

最值得肯定的是：方案把 Codex 协作从“要求 Codex 严格填结构化表格”调整为“给 Codex 丰富任务上下文，执行结果由工具侧基于 git diff、验收条件和进程状态客观收集”。这个方向明显更符合“不给 Codex 添麻烦”的目标，也比依赖 Codex 自报 `status/filesChanged/testsRun` 更稳。

但当前方案仍有 5 个必须处理的问题：

1. 技术方案对 F3 的再诠释需要反向同步业务方案，否则文档之间会产生口径冲突。
2. `AcceptanceCheck` 执行命令的设计存在安全和边界风险，不能放在所谓“core 纯函数”里直接跑。
3. `git diff` 作为 report 事实来源必须有明确 baseline，否则脏工作区会污染 Codex 执行报告。
4. scope 越界只标 risk、不影响 status，可能让越界修改的任务被标记为 `done`，需要分级策略。
5. “零新增运行时依赖 + 手写 YAML 解析”在任务、标准、report 扩展后风险升高，需要明确文件协议子集和校验策略。

结论：**建议通过，但带条件通过。** 先修正上述 P0/P1 问题后，可以进入零号批次和第一批实现。

## 2. 方案亮点

### 2.1 Codex 协作哲学成熟

“丰饶上下文 in，宽容产出 out”是这份技术方案最大的亮点。

它解决了此前方案里一个潜在问题：如果强制 Codex 输出固定 JSON/schema，Codex 可能会把注意力放到服务协议，而不是编程本身。现在方案改为：

- prompt 给足任务目标、scope、相关标准、验收条件；
- Codex 自由实现；
- 工具侧用 git diff 和验收检查生成 ExecutionReport；
- Codex 自然语言总结只 best-effort 提取，不影响状态。

这个设计更稳，也更符合 Codex 的使用方式。

### 2.2 三层架构方向正确

`core / cli / claude-command` 三层约束很重要，可以避免 Claude command、npm script、Codex runtime 未来走出三套逻辑。

这也符合当前项目已经出现的方向：`adoption/project-adopter.ts` 和 `adopt-cli.ts` 已经有初步分层雏形。

### 2.3 复用现有能力，避免重造平台

方案明确复用：

- `repo-domain-detector`
- `runtime-profiles`
- `codex-adapter`
- `ChangeScope`
- `StageAssessment`
- `SyncEvent`

同时坚持 `.ai-first/` 作为文件协议，不引入数据库、不自建 Git 状态、不做重型看板。这符合产品边界。

### 2.4 用 AcceptanceCheck 统一质量门禁

把 H1-H5 的质量检查收敛到 `AcceptanceCheck`，避免另建一套 gate 引擎，这是正确的简化。

这让任务验收、Codex report、review、CI 可以共享同一套检查结果。

### 2.5 风险章节有真实工程意识

方案已经意识到：

- Codex 输出不稳定；
- stage assessor 低置信度；
- scope 越界；
- dirty worktree；
- Z3/F0 边界。

这些都不是纸面设计，而是实现时真的会遇到的问题。

## 3. 必须修正的问题

### P0-1. 业务方案与技术方案的 F3 口径需要统一

业务方案中 F3 仍表达为“Codex 输出协议”，字段包括 `status/filesChanged/commandsRun/testsRun/risks/blockers/followUps/knowledgeSyncNeeded`。技术方案则重新解释为“这些字段由工具侧客观收集，Codex 不必填表”。

这个再诠释是正确的，但必须明确同步，否则后续实现者可能不知道以哪个文档为准。

建议：

1. 在业务方案 F3 增加说明：字段语义保留，但来源改为工具侧收集，Codex 自然语言总结仅 best-effort。
2. 在技术方案中增加“业务方案修订项”或 ADR 小节，声明这是有意变更，不是实现细节偏离。
3. 后续测试以 ExecutionReport 字段是否生成作为验收，而不是以 Codex 是否按 schema 输出作为验收。

### P0-2. AcceptanceCheck 不能在 core 纯函数里直接执行命令

技术方案一方面要求 core 是纯函数或低副作用模块，另一方面在 `collectExecutionReport()` 中执行 `runAcceptanceCheck()`。如果 `AcceptanceCheck` 可以包含任意 `command`，这会带来几个问题：

- core 层不再纯，测试和复用变复杂；
- task YAML 可以引入任意命令执行风险；
- 命令超时、环境变量、cwd、输出截断、并发控制都没有定义；
- CI 和本地执行策略不同，结果可能不一致。

建议拆分：

1. `core` 只负责生成验收计划和汇总验收结果。
2. 新增 `verification-runner` 或 `acceptance-runner` 作为副作用层，专门执行命令。
3. `AcceptanceCheck.command` 必须受 allowlist 或 project/domain 配置约束，不能任意执行。
4. 每条 check 必须有 timeout、cwd、maxOutputBytes、safeDescription。
5. 默认只允许项目内已知命令，例如 `npm test`、`npm run typecheck`、`npm run lint` 或 domain 配置里的 testCommands。

建议模型：

```ts
export type AcceptanceCheck =
  | { kind: "test"; commandId: string }
  | { kind: "typecheck"; commandId: string }
  | { kind: "lint"; commandId: string }
  | { kind: "file_exists"; path: string }
  | { kind: "file_contains"; path: string; pattern: string }
  | { kind: "manual" };
```

其中 `commandId` 映射到 `.ai-first/domains/*.yml` 或 project config 里的安全命令。

### P0-3. git diff 必须有执行 baseline

方案提出用 `git diff --name-only` 客观收集 `filesChanged`，这是正确方向。但如果 task:exec 开始前工作区已经有未提交改动，执行后的 diff 会混入旧改动。

这会导致：

- report 把用户已有改动算成 Codex 改动；
- scope violation 误报；
- sync event 误报；
- task 状态和风险不可信。

建议在 F1 task:exec 中强制定义 baseline 策略：

1. 默认要求工作区干净；不干净则 blocked，除非显式传 `--allow-dirty`。
2. 如果允许 dirty，必须记录 pre-run changed files，并在结束时做差集。
3. report 中写入 `baselineRef`、`preExistingChanges`、`newChanges`。
4. 不要只用全局 `git diff --name-only` 作为最终事实。

### P1-1. scope 越界不应总是只标 risk

技术方案提出 scope 越界不直接阻断，只写入 risks。这个设计是 Codex 友好的，但需要分级，否则存在安全问题。

例如：

- Codex 为了修测试顺手改一个测试 helper，可能只是 warning。
- Codex 在 backend 任务里改了 auth/security/config，可能必须 review_pending。
- Codex 改了 `.ai-first/standards/` 或 release 配置，可能必须 blocked 或人工确认。

建议：

| 越界类型 | 建议状态 |
| --- | --- |
| scope 外测试文件、文档、局部 helper | `done` + risk |
| 同 domain 但 scope 外源码 | `review_pending` |
| 跨 domain 契约/API/schema | `review_pending` |
| security、release、CI、runtime、`.ai-first/standards/` | `blocked` 或 human approval required |

也就是说，scope violation 不一定阻断，但必须按风险类型影响 status。

### P1-2. “零新增运行时依赖 + 手写 YAML”需要更明确边界

当前项目已经有手写 YAML-like 解析逻辑，短期可用。但技术方案接下来要读写：

- Task
- ChangeScope
- ExecutionReport
- StageRule
- Standard frontmatter
- Domain config
- SyncEvent

如果继续用分散的正则和字符串拼接，维护风险会快速上升。

在坚持零新增依赖的前提下，建议：

1. 明确 `.ai-first/*.yml` 支持的 YAML 子集。
2. 建立统一的 `src/core/io/` 模块，集中读写和校验。
3. 所有 YAML-like 文件写入都由 serializer 负责，不允许各模块手写字符串。
4. frontmatter 解析只支持明确子集，并对不支持格式给出清晰错误。
5. 每个文件类型至少有 round-trip 测试。

如果未来要支持完整 YAML，建议用 ADR 明确是否引入依赖。

### P1-3. adopter “顺手重构为纯 core”可能扩大第一批风险

技术方案提到要把 `adoption/project-adopter.ts` 中写文件的行为上移到 cli。方向是对的，但它不是 v0.1 主链路的必要前置。

现有 `adoptProject()` 已经可用，也有测试。第一批如果同时重构 adopter，容易把稳定能力打散。

建议：

1. 第一批新模块严格按三层实现。
2. adopter 先保留现状，只补必要接口或 wrapper。
3. 等 guide/task/exec 主链路跑通后，再单独做 adopter 分层重构。
4. 如果必须重构，需要先补 adoption golden fixture 和重复 adopt 不覆盖配置的回归测试。

## 4. 建议优化的问题

### P2-1. StageAssessment 需要表达低置信度状态

现有 `StageAssessment.currentStage` 必须是 `ProjectStage`，技术方案计划低置信时仍输出候选和“需要确认”。这容易造成“类型上已经给了确定阶段，文案上又说不确定”的张力。

建议：

1. 保留 `currentStage` 作为最佳猜测。
2. 增加 `needsConfirmation: boolean`。
3. 增加 `confidenceReason` 或 `uncertaintyReason`。
4. guide 在 `needsConfirmation` 为 true 时显示“阶段候选”，不要展示为确定阶段。

### P2-2. ExecutionReport 三态可能过粗

技术方案将状态收敛为 `done/review_pending/blocked`，简洁是优点。但业务方案和 Codex 友好性审查里都多次提到 `partial/parse_failed`。

如果完全删除 `partial/parse_failed`，会损失诊断信息。

建议：

1. 顶层 `status` 保持三态。
2. 增加 `outcomeReason` 或 `failureKind`：
   - `timeout`
   - `non_zero_exit`
   - `acceptance_failed`
   - `scope_violation`
   - `partial_detected`
   - `parse_unavailable`
3. 这样既保持状态简单，也保留恢复信息。

### P2-3. “F0 解析器”命名需要调整

如果技术方案已经不依赖解析 Codex 结构化输出，F0 不应再叫“Codex 解析器 + fixture”。更准确应是：

- Codex prompt v0 fixture
- Codex execution report collector fixture
- Codex stdout summary best-effort fixture

建议在技术方案 §7 第一批第 7 项调整命名，避免实现者误解为仍要解析 Codex schema。

### P2-4. `runCodexPrompt(adapter, prompt, opts)` 设计需要更贴近现有类接口

技术方案建议在 `codex-adapter.ts` 新增 free function：

```ts
runCodexPrompt(adapter, prompt, opts)
```

但当前 `CodexAdapter` 的配置如 `cliPath/execArgs/timeoutMs/executionMode` 都是 private。free function 如果要复用这些配置，容易绕开封装。

建议改成类方法：

```ts
async executePrompt(prompt: string, options?: { cwd?: string }): Promise<CodexRunResult>
```

`send()` 可以继续兼容 ToolMessage 协议，并内部调用 `executePrompt()`。

### P2-5. 第一批验收需要补 package scripts

技术方案列出了 `npm run guide`、`npm run task:create`、`npm run task:exec`，但 `package.json` 当前只有：

- `adopt`
- `scan:domains`
- `dispatch`
- `check`
- frontend 相关命令

建议第一批每新增 CLI，必须同步增加 package script，并在文档里标注真实可运行命令。

### P2-6. F0 “至少 2 个真实 Codex 样本”不适合放进 CI

技术方案已经说明真实 Codex 不在 CI 跑，这是正确的。但 fixture 采集本身依赖本地 Codex 环境、网络、认证和模型状态，不一定能稳定在半天内完成。

建议：

1. 零号批次把真实样本采集作为 go/no-go 手动验证。
2. CI 只跑沉淀后的 fixture。
3. 如果没有真实 Codex 环境，允许用 `dry-run + recorded fixture` 开发，但不能宣称 F0 完成。

## 5. 与业务目标的一致性

整体一致。

特别是以下点高度一致：

- 轻量研发脚手架，不做重平台。
- Codex 和 Claude Code 共用 `.ai-first/`。
- Codex 友好，不把 Codex 变成填表工具。
- 依赖 Git，不复制 Git 状态。
- 前端、后端、算法、数据按 domain 管理。
- v0.1 先跑通主链路。

需要同步的唯一大口径是 F3：业务方案应明确 ExecutionReport 字段主要由工具侧收集，而不是 Codex 强制输出。

## 6. 建议的开工顺序调整

建议在技术方案当前顺序基础上稍作调整：

1. 先加 `src/core/io/` 文件读写基础设施，定义 YAML/frontmatter 子集。
2. 定义 `ExecutionReport`、`AcceptanceCriterion`、`AcceptanceResult`，但不要立即执行命令。
3. 实现 `CodexAdapter.executePrompt()`，保持现有 `send()` 兼容。
4. 实现 `TaskContextBundle` 和 prompt v0。
5. 实现 git baseline 采集和 diff collector。
6. 实现 acceptance runner，带 allowlist、timeout 和输出截断。
7. 再实现 `task:exec` 端到端。

这样可以避免一上来就把 Codex 执行、命令验收、report 收集、task 状态更新全部耦在一起。

## 7. 最终评审结论

这份技术实现方案是有价值的，而且比纯业务方案更进一步解决了 Codex 友好性问题。它最大的贡献是把 Codex 执行闭环从“让 Codex 按协议填表”升级为“Codex 自由实现，工具侧客观收集事实”。

建议结论：

> **带条件通过。**

开工前必须处理：

1. 同步业务方案 F3 口径。
2. 设计 acceptance command allowlist 和 runner 边界。
3. 明确 git diff baseline 策略。
4. 明确 scope violation 分级状态。
5. 定义统一 `.ai-first` 文件读写/校验子集。

这些修正完成后，可以进入零号批次和第一批实现。

---

## 8. 第二轮评审意见（完善版复评）

| 项 | 内容 |
| --- | --- |
| 评审对象 | `docs/AI-first-技术实现方案.md` 完善版 |
| 评审日期 | 2026-07-05 |
| 评审重点 | 第一轮 P0/P1 是否闭环、文档内部一致性、Codex 友好性、第一批实现可执行性 |
| 参考材料 | 本评审第一轮意见、`docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md`、`src/core/tools/codex-adapter.ts`、`src/core/models.ts`、`package.json` |

### 8.1 总体结论

完善版技术方案已经明显吸收了第一轮评审意见，整体可以从“带条件通过”提升为：

> **基本通过，可以进入零号批次和第一批实现准备。**

最关键的改进已经落到文档里：

- F3 已经正式改为“ExecutionReport 字段由工具侧客观收集，Codex 不必按 schema 填表”。
- `AcceptanceCheck` 已从任意命令改为 `commandId` + `AllowedCommand`，并明确由 `acceptance-runner` 执行。
- `ExecutionReport` 增加了 `baselineRef`、`preExistingChanges`、`scopeViolations`、`outcomeReason`。
- scope 越界已经改成 `risk/review/block` 分级，而不是一律只写 risk。
- 第一批实现顺序已调整为先做 `io/`、类型、adapter、baseline、runner，再做 `task:exec`。
- adopter 重构风险在 §6.1 已降级为“保留现状，主链路跑通后再单独重构”。

因此，方案的主方向已经稳定：**给 Codex 丰富上下文，不强迫 Codex 填管理表；由脚手架从 Git、验收命令和进程状态中恢复事实。** 这与“不要给 Codex 添麻烦”的业务目标是一致的。

但开工前仍建议修正 6 个问题。其中前 3 个会影响实现准确性，后 3 个主要是文档一致性和可维护性问题。

### 8.2 第一轮问题闭环情况

| 第一轮问题 | 第二轮状态 | 说明 |
| --- | --- | --- |
| P0-1 F3 口径冲突 | 技术方案内已闭环，业务方案仍待同步 | §10.2 ADR-001 已写清“工具侧收集”，但业务方案原文仍有“Codex 输出协议/可解析 schema”口径。 |
| P0-2 AcceptanceCheck 任意命令风险 | 已基本闭环 | `commandId`、`AllowedCommand`、`acceptance-runner` 分层已经解决主风险。 |
| P0-3 git diff baseline | 已提出机制，但需补 untracked/dirty attribution 细节 | 当前只写 `git diff --name-only`，不足以覆盖未跟踪文件和 allow-dirty 归因。 |
| P1-1 scope 越界只标 risk | 主体已闭环 | §4.3.3 已分级，但 §0.1 表格仍残留旧说法。 |
| P1-2 YAML/frontmatter 集中 IO | 方向已闭环，子集定义仍不足 | §6.1 加了 `io/`，§10.2 有策略，但还没有明确支持的 YAML 子集。 |
| P1-3 adopter 顺手重构风险 | 基本闭环，但有一处旧文案冲突 | §6.1 说第一批不重构，§2.1 仍说“顺手重构对齐”。 |
| P2-1 StageAssessment 低置信 | 已闭环 | 加了 `needsConfirmation` / `uncertaintyReason` 思路。 |
| P2-2 ExecutionReport 三态过粗 | 已闭环 | 加了 `outcomeReason`。 |
| P2-3 F0 解析器命名 | 大部分闭环 | §7 已改为 report collector，但 §8 测试表仍写“Codex 解析（F0）”。 |
| P2-4 CodexAdapter 方法形态 | 已闭环 | 改为 `CodexAdapter.executePrompt()`，方向正确。 |
| P2-5 package scripts | 已闭环为实施要求 | §7 明确新增 CLI 必须同步 package script。 |
| P2-6 真实 Codex 样本不进 CI | 已闭环 | 真实样本作为手动 go/no-go，CI 只跑沉淀 fixture。 |

### 8.3 仍需修正的问题

#### P1-1. git baseline 不能只依赖 `git diff --name-only`

完善版已经引入 baseline，这是重大改进。但文档仍多处表述为 `git diff --name-only`。这会漏掉两类关键情况：

1. **未跟踪文件**：`git diff --name-only` 默认不包含 untracked files。Codex 新建文件时，如果未进入 index，report 可能看不到这些文件。
2. **allow-dirty 归因不准**：如果执行前某文件已有未提交改动，Codex 又继续改了同一个文件，简单做“末态 diff - preExistingChanges”会把这个文件排除掉，导致 Codex 实际影响被低估。

建议修正：

- baseline 采集改为 `git status --porcelain` 语义，而不是只用 `git diff --name-only`。
- changed files 应覆盖 tracked modified、staged、deleted、renamed、untracked。
- `--allow-dirty` 下增加 `taintedPaths` 或 `attributionUncertainPaths`，标记执行前已脏且执行后仍变化的路径。
- 默认仍坚持 clean worktree；`--allow-dirty` 只作为人工确认后的调试/救急模式。

建议模型补充：

```ts
export type GitBaseline = {
  headSha: string;
  preExistingChanges: string[];
  preExistingUntracked: string[];
  clean: boolean;
};

export type GitChangeSet = {
  newChanges: string[];
  taintedPaths: string[];
  untrackedChanges: string[];
};
```

#### P1-2. `task:exec` 时序需要补上 preflight 和 acceptance-runner

§4.3.1 已经说 `collectExecutionReport()` 消费 `acceptanceResults`，但 §4.5 的端到端时序目前是：

`buildTaskContextBundle -> Codex -> collectExecutionReport -> 写 report`

这里缺两个关键步骤：

1. **Codex 启动前的 dirty preflight**：如果工作区脏且没有 `--allow-dirty`，应直接生成 blocked report 或直接返回错误，不应启动 Codex。
2. **Codex 结束后的 acceptance-runner**：验收命令必须在 collect report 之前执行，否则 `acceptanceResults` 没有来源。

建议把 §4.5 调整为：

```text
task:exec
  ├─ read task/scope
  ├─ collect GitBaseline
  ├─ if dirty && !allowDirty: write blocked/preflight report, stop before Codex
  ├─ build TaskContextBundle + prompt
  ├─ CodexAdapter.executePrompt()
  ├─ collect post-run GitChangeSet
  ├─ runAcceptancePlan()
  ├─ collectExecutionReport(baseline, changeSet, codexResult, acceptanceResults)
  ├─ write ExecutionReport
  └─ update task.status + guide next step
```

这样实现者不会误以为 `collectExecutionReport()` 会自己执行验收命令或自己处理 preflight。

#### P1-3. “core 纯函数”与“读 git diff/读文件系统”边界仍需更精确

方案多处说 core 是“纯函数”，但又写：

- core 层可读 `.ai-first/`；
- `collectExecutionReport()` 读 git diff；
- `buildTaskContextBundle(projectRoot, task, scope)` 从 `.ai-first/` 读 domain 和 standards。

这不是严格意义上的纯函数。建议文档统一为：

- `core` 不写文件、不 spawn、不执行外部命令；
- `core` 可以有两类函数：
  - 纯计算函数：输入结构化对象，输出结构化对象；
  - repository reader 函数：只读本地文件，负责把 `.ai-first/` 转为结构化对象；
- Git 命令、Codex 子进程、acceptance command 都属于 runner/cli 副作用层。

尤其是 `collectExecutionReport()`，建议不要让它内部“读 git diff”。更稳的接口是上层先通过 git collector 产生 `GitChangeSet`，再传入 core：

```ts
collectExecutionReport({
  task,
  scope,
  codexResult,
  baseline,
  changeSet,
  acceptanceResults,
  startedAt,
})
```

这样单测、dry-run 和 CI fixture 都更容易稳定。

#### P2-1. 文档内部仍有几处旧口径，需统一

完善版主体已经修正，但局部文字还会误导实现者：

- §0.1 表格“改动边界”仍写“越界只标 risk、不强阻断”，应改为“工具侧分级核对 scope，risk/review/block 分别处理”。
- §2.1 仍写“把 adopter 顺手重构对齐”，但 §6.1 已改为“保留现状，主链路跑通后再单独重构”。应以 §6.1 为准，删除“顺手重构”。
- §6.1 `codex-adapter.ts` 注释仍写“增量：runCodexPrompt()”，应改为 `executePrompt()`。
- §4.5 写“`CodexAdapter.executeSubtask(prompt) 或直接 execFile`”，应收敛为 `CodexAdapter.executePrompt(prompt)`，避免新链路绕开 adapter 封装。
- §8 测试表仍写“Codex 解析（F0）”，应改为“Codex report collector（F0）”。

这些都是文字级问题，但会影响第一批实现者的理解，建议开工前统一。

#### P2-2. `CodexRunResult` 需要正式定义

§4.6 设计了：

```ts
async executePrompt(prompt: string, options?: { cwd?: string }): Promise<CodexRunResult>
```

但 §3 数据模型没有定义 `CodexRunResult`。当前 `codex-adapter.ts` 的 `send()` 返回的是 `ToolMessage`，不是 report collector 容易消费的运行结果。

建议补充：

```ts
export type CodexRunResult = {
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
```

并明确：

- `executePrompt()` 不返回 `ToolMessage`；
- `send()` 继续兼容旧协议，内部可包装 `executePrompt()`；
- timeout 被捕获为 `timedOut: true` + 非零 `exitCode` 或专门字段，不抛出到上层破坏 report 写盘。

#### P2-3. `GuideOutput` 应透出低置信字段

§5.1 已明确 `StageAssessment` 增加 `needsConfirmation` 和 `uncertaintyReason`，但 §5.2 的 `GuideOutput` 只有：

```ts
stage;
confidence;
infoMissing;
```

为了让研发“时时刻刻明白自己当前所处的位置”，guide 应直接透出低置信状态，而不是只靠文案拼接。

建议补充：

```ts
export type GuideOutput = {
  stage: ProjectStage;
  confidence: number;
  needsConfirmation: boolean;
  uncertaintyReason?: string;
  alternativeStages: ProjectStage[];
  // ...
};
```

否则低置信阶段容易在 CLI/Claude command 层被展示成确定结论。

#### P2-4. YAML 子集仍需落成明确协议

方案已经新增 `src/core/io/yaml.ts` 和 round-trip 测试要求，这是正确方向。但目前还没有说明“极简 YAML”到底支持什么。

建议至少在技术方案或后续 `docs/guidance-schema.md` 中明确：

- 支持 scalar、array、object 的哪些层级；
- 是否支持引号、冒号、换行字符串、多行 block；
- 是否支持注释；
- 是否保留 key 顺序；
- 不支持格式如何报错；
- serializer 是否负责稳定排序，减少 git diff 噪声。

这个问题不阻塞零号批次，但会影响第一批 `Task/StageRule/Domain config/ExecutionReport` 的可维护性。

### 8.4 与业务方案的一致性

技术方案内部已经通过 ADR-001 说明 F3 口径变更，这是正确的。但业务方案 `docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md` 当前仍保留较多旧表述，例如：

- “Codex 输出能稳定落入结构化协议”；
- “输出 schema 或解析器测试”；
- “至少 2 个真实 Codex 输出样本能被解析”；
- “parse_failed / partial 写 report”。

如果后续以技术方案为实现依据，业务方案至少需要同步一段 F3 修订说明，否则不同实现者可能会回到“让 Codex 填表”的旧路线上。

建议业务方案同步为：

> F3 字段语义保留，但主要由工具侧基于 Git change set、acceptance runner、Codex 进程状态生成；Codex 自然语言总结仅 best-effort 提取，解析失败不影响主状态。F0 不验证 Codex 是否稳定输出 schema，而验证 report collector 是否能在真实/录制样本下稳定生成 ExecutionReport。

### 8.5 第二轮建议结论

建议进入实现，但在开工前做一次“小修订”：

1. 修正文档内部旧口径：scope risk、adopter 重构、`runCodexPrompt`、`executeSubtask/direct execFile`、F0 解析命名。
2. 把 git baseline 从 `git diff --name-only` 扩展为 `git status --porcelain` 语义，并覆盖 untracked 与 allow-dirty 归因问题。
3. 明确 `task:exec` 端到端时序：preflight → Codex → change set → acceptance-runner → report collector。
4. 定义 `CodexRunResult`。
5. 让 `GuideOutput` 透出 `needsConfirmation/uncertaintyReason/alternativeStages`。
6. 给 YAML/frontmatter 子集补一个最小协议说明。

完成这些修订后，本技术方案可以作为第一批实现的可靠蓝图。它已经抓住了项目最重要的产品边界：**脚手架负责提供地图、边界、验收和恢复上下文；Codex 负责写代码；Git 和本地工具负责提供事实。**

---

## 9. 第三轮评审意见（再完善版复评）

| 项 | 内容 |
| --- | --- |
| 评审对象 | `docs/AI-first-技术实现方案.md` 再完善版 |
| 评审日期 | 2026-07-05 |
| 评审重点 | 第二轮问题是否闭环、是否可进入实现、剩余接口风险、跨文档口径一致性 |
| 参考材料 | 本评审前两轮意见、`docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md`、当前 `src/core/` 代码和 `package.json` |

### 9.1 总体结论

第三版技术方案已经把第二轮评审的大部分关键问题收口，结论可以进一步提升为：

> **通过，可以作为第一批实现蓝图；开工前建议做一次轻量文档收尾。**

本轮最重要的改善包括：

- 已补 `CodexRunResult`，明确 `executePrompt()` 返回运行事实而不是 `ToolMessage`。
- 已补 `GitBaseline` / `GitChangeSet`，覆盖 untracked 和 allow-dirty 归因。
- `task:exec` 时序已补 preflight、Codex、GitChangeSet、acceptance-runner、report collector 的完整顺序。
- `collectExecutionReport()` 已改为消费 `GitChangeSet`，方向上不再由 core 直接调 git。
- `GuideOutput` 已透出 `needsConfirmation / uncertaintyReason / alternativeStages`。
- YAML/frontmatter 子集已经有最小协议和 round-trip 测试要求。
- 第二轮指出的 `runCodexPrompt`、`executeSubtask/direct execFile`、F0 “解析器”命名等主干旧口径基本已修掉。

因此，技术方案现在已经足够指导实现。剩余问题主要是**局部文案残留、preflight report 接口补缝、Git/YAML 术语进一步精确**，不再是架构方向问题。

### 9.2 第二轮问题闭环情况

| 第二轮问题 | 第三轮状态 | 说明 |
| --- | --- | --- |
| git baseline 只依赖 `git diff --name-only` | 主体已闭环 | §4.3.2 已改为 `git status --porcelain`，补了 untracked 与 taintedPaths；但 §0.1、§1.1、§5.7、§9 仍有 `git diff` 旧口径。 |
| `task:exec` 缺 preflight 和 acceptance-runner | 已闭环 | §4.5 时序已经补齐。 |
| core 纯函数边界不清 | 基本闭环 | §2.1 已精确定义 core 不写、不 spawn、不调 git；但 §4.3.1 第一段仍写“读 git diff”。 |
| 文档内部旧口径 | 大部分闭环 | adopter、`executePrompt`、F0 report collector 已修；仍有 Git 旧口径残留。 |
| `CodexRunResult` 未定义 | 已闭环 | §3.2 已定义。 |
| `GuideOutput` 未透出低置信字段 | 已闭环 | §5.2 已补。 |
| YAML 子集未定义 | 基本闭环 | §6.4 已补；但 `>` / `>-` 支持描述存在矛盾。 |
| 业务方案 F3 未同步 | 未闭环 | 技术方案已在 ADR-001 中声明待同步，但业务方案仍保留旧“Codex 输出协议/schema/parse_failed”口径。 |

### 9.3 仍建议修正的问题

#### P1-1. preflight blocked report 需要单独接口或允许无 `CodexRunResult`

§4.5 规定：工作区不干净且未传 `--allow-dirty` 时，preflight 直接写 blocked report，不启动 Codex。

但 §4.3.1 的 `collectExecutionReport()` 入参仍强制需要：

```ts
codexResult: CodexRunResult;
acceptanceResults: AcceptanceResult[];
```

preflight 阶段没有 Codex 执行，也不应该跑 acceptance-runner。因此这里需要一个明确接口，否则实现时会出现两种不好的做法：伪造一个 CodexRunResult，或者让 preflight 不写标准 ExecutionReport。

建议二选一：

1. 新增专门函数：

```ts
export function createPreflightBlockedReport(params: {
  task: Task;
  scope: ChangeScope;
  baseline: GitBaseline;
  reason: "dirty_worktree_blocked";
  startedAt: string;
  finishedAt: string;
}): ExecutionReport
```

2. 或让 `collectExecutionReport()` 支持 preflight variant：

```ts
type ReportCollectorInput =
  | { kind: "preflight_blocked"; task: Task; scope: ChangeScope; baseline: GitBaseline; reason: "dirty_worktree_blocked" }
  | { kind: "codex_completed"; task: Task; scope: ChangeScope; baseline: GitBaseline; changeSet: GitChangeSet; codexResult: CodexRunResult; acceptanceResults: AcceptanceResult[] };
```

推荐第一种，接口更简单，也能保持主 collector 专注“Codex 已执行后”的归集。

#### P1-2. Git 事实来源仍有旧口径残留，需要统一为 GitChangeSet

技术方案主干已经改为 `GitBaseline/GitChangeSet`，但以下位置仍保留旧表述：

- §0.1 `filesChanged` 仍写“直接 `git diff --name-only`”。
- §1.1 “Git 仍是版本主入口”仍写“全量依赖 `git diff`”。
- §4.3.1 第一段仍写 `collectExecutionReport()` “读 git diff”。
- §5.7 `sync + Git 集成` 仍写 changedFiles 来自 `git diff`，J1 一律 `git diff --name-only`。
- §9 风险对策仍写 “HEAD 或 stash 基线” 和 `git diff base..HEAD`。

建议统一为：

- `filesChanged` 来自 `GitChangeSet.newChanges ∪ GitChangeSet.untrackedChanges`。
- sync 的 changedFiles 也来自 `ExecutionReport.filesChanged` 或统一 git collector，而不是另跑 `git diff --name-only`。
- 风险章节改成“记录 GitBaseline，结束后采集 GitChangeSet”。

这样 Codex 执行报告、sync 分析、scope 核对会用同一套事实来源，不会出现同一任务不同模块看到不同 changed files 的情况。

#### P1-3. 业务方案仍未同步 F3 口径，容易拉回旧路线

技术方案已通过 ADR-001 正式改为“工具侧客观收集”，这是正确方向。但业务方案当前仍有多处旧口径：

- “Codex 输出能稳定落入结构化协议”；
- “必须输出的结构化字段”；
- “输出 schema 或解析器测试”；
- “解析器能区分 partial / parse_failed”；
- “Codex 输出协议有 fixture / schema 校验”。

如果后续实现者先看业务总清单，再看技术方案，仍可能以为要让 Codex 按 schema 填表。

建议把业务方案 F0/F3 同步改成：

- F0：Codex prompt v0 + report collector fixture；
- F3：ExecutionReport 字段语义保留，来源改为工具侧 GitChangeSet / AcceptanceResult / CodexRunResult；
- parse_failed 不再是主状态，解析自然语言总结失败只影响 `naturalLanguageSummary`，不影响 `status`。

这不是技术方案本身的阻塞项，但会影响项目协作一致性，建议作为开工前文档同步任务。

### 9.4 建议优化的问题

#### P2-1. YAML 子集对 `>` / `>-` 的描述自相矛盾

§6.4 表格写：

> 多行 block（`|` / `>`）不支持

但同一行又说：

> 描述字段用 `>-` 折叠或单行

而当前 `.ai-first/project.yml` 里已经使用了：

```yaml
description: >-
  ...
```

因此第一批 `io/yaml.ts` 如果不支持 folded scalar，会连现有 `project.yml` 都无法稳定 round-trip。

建议改为：

- 支持 `>-` / `>` folded scalar 的最小形式；
- 暂不支持 `|` literal block；
- 多行正文仍放 Markdown，不放 YAML；
- round-trip 测试必须覆盖现有 `project.yml` 的 `description: >-`。

#### P2-2. `GitChangeSet.newChanges` 与 `untrackedChanges` 语义有重叠

当前定义：

```ts
newChanges: 执行后存在、执行前不存在的改动
untrackedChanges: 执行后新出现且未跟踪的文件
```

`untrackedChanges` 从语义上也是“执行后存在、执行前不存在的改动”，容易导致实现者重复计数。§4.3.1 又写：

```ts
const newChanges = [...params.changeSet.newChanges, ...params.changeSet.untrackedChanges];
```

建议把字段改清楚：

```ts
export type GitChangeSet = {
  trackedChanges: string[];      // 执行后新增/修改/删除/重命名的 tracked 文件，且执行前不脏
  untrackedChanges: string[];    // 执行后新增的 untracked 文件
  taintedPaths: string[];        // 执行前已脏，归因不确定
};
```

然后 `ExecutionReport.filesChanged = trackedChanges ∪ untrackedChanges`。

#### P2-3. `ExecutionReport` 建议显式记录 `preExistingUntracked` 和 `taintedPaths`

§3.2 `GitBaseline` 有 `preExistingUntracked`，`GitChangeSet` 有 `taintedPaths`，但 `ExecutionReport` 当前只显式有：

```ts
preExistingChanges?: string[];
filesChanged: string[];
```

建议 ExecutionReport 也保留：

```ts
preExistingUntracked?: string[];
taintedPaths?: string[];
```

这样 allow-dirty 模式下的审计信息不会丢，用户也能知道哪些路径“不是 Codex 新改动，但本次报告归因不确定”。

#### P2-4. core 边界文案可以再统一一层

§2.1 已经把 core 边界说清楚，但文档其他位置仍用“core 纯函数”泛称。例如：

- §1.2 三层架构；
- §2.1 架构图；
- §4.3.1 collector 第一段；
- §8 测试表。

建议统一术语：

- `core compute`：纯计算；
- `core readers`：只读 repository 文件；
- `runner`：git/codex/acceptance 等外部命令；
- `cli`：参数解析、写文件、格式化输出。

这能避免实现时把 `scanRepositoryFacts()`、`readProjectYml()`、`collectGitBaseline()` 都混进 “core 纯函数” 里。

#### P2-5. `sync + Git 集成` 应显式复用 task execution 的 changed files

§5.7 当前仍像一个独立的 Git 扫描器。为了减少状态重复，建议明确：

- task 执行后的 sync 以 `ExecutionReport.filesChanged` 为输入；
- 手动 `/sync` 或 `npm run sync` 才使用 git collector 扫描当前工作区；
- 不自建状态，也不重复实现另一套 changed files 逻辑。

这样 sync 不会和 task:exec report 产生差异。

### 9.5 第三轮建议结论

第三版方案已经从“方向正确”进入“可实施”状态。建议接下来不要继续大改方案，而是做一次很小的收尾：

1. 补 `createPreflightBlockedReport()` 或 preflight report variant。
2. 全文把残留 `git diff --name-only` 口径统一成 GitBaseline/GitChangeSet。
3. 同步业务总清单 F0/F3，删除“Codex 必须稳定输出 schema”的旧路线。
4. YAML 子集明确支持 `>-` folded scalar。
5. 把 `GitChangeSet.newChanges` 改名为 `trackedChanges`，避免和 `untrackedChanges` 重叠。
6. ExecutionReport 增加 `preExistingUntracked` / `taintedPaths` 审计字段。

完成这 6 个小修订后，可以停止文档评审，直接进入实现。当前方案最核心的判断已经足够稳定：**让脚手架负责确定性事实收集和安全护栏，让 Codex 保持自然编码能力，这是正确的产品技术路线。**

---

## 10. 第四轮评审意见（收尾版复评）

| 项 | 内容 |
| --- | --- |
| 评审对象 | `docs/AI-first-技术实现方案.md` 收尾版 |
| 评审日期 | 2026-07-05 |
| 评审重点 | 第三轮 6 个收尾项是否闭环、类型/流程示例是否一致、是否可以停止文档评审进入实现 |
| 参考材料 | 本评审前三轮意见、`docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md`、当前 `src/core/` 代码和 `package.json` |

### 10.1 总体结论

第四版技术方案已经完成了绝大多数收尾工作，结论是：

> **通过，建议结束大范围方案评审，进入实现；开工前只需修正少量类型示例和跨文档口径。**

第三轮提出的 6 个小修订中，技术方案本体已经基本完成：

- 已新增 `createPreflightBlockedReport()`，避免 preflight 阶段伪造 `CodexRunResult`。
- 已把 `GitChangeSet.newChanges` 改为 `trackedChanges`，并明确与 `untrackedChanges` 不重叠。
- 已在 `ExecutionReport` 中补 `preExistingUntracked` 和 `taintedPaths`。
- YAML 子集已明确支持 `>` / `>-` folded scalar，暂不支持 `|` literal block。
- `sync + Git 集成` 已改为 task 后复用 `ExecutionReport.filesChanged`，手动 sync 才跑 git collector。
- 风险章节已改成 `GitBaseline` / `GitChangeSet` 口径。

所以现在的问题已经不是方向问题，而是**实现前的文字/类型对齐问题**。这些问题不需要再推翻方案，只要按下面清单补齐即可。

### 10.2 第三轮问题闭环情况

| 第三轮问题 | 第四轮状态 | 说明 |
| --- | --- | --- |
| preflight blocked report 接口 | 基本闭环 | 已新增 `createPreflightBlockedReport()`，但示例返回值漏了 `ExecutionReport` 的若干必填字段。 |
| 残留 `git diff --name-only` 口径 | 大部分闭环 | 主干已改为 git collector；§4.3.2 仍以“只靠 git diff 会漏”为说明性反例，可接受，但同段仍残留 `newChanges` 旧字段。 |
| 业务总清单 F0/F3 同步 | 未闭环 | 技术方案仍标注“待同步”，业务方案原文仍保留旧 schema/解析器路线。 |
| YAML `>-` folded scalar | 已闭环 | §6.4 已明确支持 `>` / `>-` folded scalar。 |
| `GitChangeSet.newChanges` 改名 | 主体闭环 | 类型已改为 `trackedChanges`，但 §4.3.2、§8 测试表和 collector 返回注释仍有 `newChanges` 残留。 |
| ExecutionReport 审计字段 | 已闭环 | 已增加 `preExistingUntracked` / `taintedPaths`。 |

### 10.3 仍需修正的问题

#### P1-1. `createPreflightBlockedReport()` 示例没有满足 `ExecutionReport` 必填字段

`ExecutionReport` 当前定义中这些字段是必填：

```ts
id
taskId
runtime
startedAt
finishedAt
status
outcomeReason
filesChanged
scopeViolations
acceptanceResults
risks
blockers
followUps
knowledgeSyncNeeded
```

但 §4.3.4 的 `createPreflightBlockedReport()` 示例只返回了部分字段，并写了：

```ts
// runtime/codexStdout 等字段留空（无 Codex 执行）
```

这里 `codexStdout` 可以留空，但 `runtime` 不能留空，因为它在类型里是必填。否则第一批实现时会出现类型不一致。

建议：

1. 给 `createPreflightBlockedReport()` 入参增加 `runtime: RuntimeToolId`，或者让 `runtime` 在 `ExecutionReport` 中改为可选。
2. 推荐保留 `runtime` 必填，因为 preflight 也知道用户打算用 `codex` 还是其他 runtime。
3. 示例返回值补齐 `id/taskId/runtime/startedAt/finishedAt`。

建议形态：

```ts
export function createPreflightBlockedReport(params: {
  task: Task;
  scope: ChangeScope;
  runtime: RuntimeToolId;
  baseline: GitBaseline;
  reason: "dirty_worktree_blocked";
  startedAt: string;
  finishedAt: string;
}): ExecutionReport
```

#### P1-2. `newChanges` 旧字段仍残留，需全量替换为 `trackedChanges` 或 `filesChanged`

技术方案已经把 `GitChangeSet` 类型改为：

```ts
trackedChanges
untrackedChanges
taintedPaths
```

但仍有几处旧字段：

- §4.3.1 `return` 注释仍写 `newChanges`。
- §4.3.2 第 3、4 点仍写 `newChanges`。
- §8 测试策略仍写断言 `status/newChanges/scopeViolations/outcomeReason`。

建议统一：

- GitChangeSet 内部字段只用 `trackedChanges / untrackedChanges / taintedPaths`。
- ExecutionReport 对外字段只用 `filesChanged`。
- 测试断言改为 `status/filesChanged/scopeViolations/outcomeReason/taintedPaths`。

这会让实现者不用在 `newChanges`、`trackedChanges`、`filesChanged` 三套名字之间猜。

#### P1-3. 业务总清单仍保留“Codex 输出 schema”旧路线

这是连续三轮都存在的跨文档问题。技术方案已经修正，但业务总清单仍有旧口径，例如：

- “Codex 输出能稳定落入结构化协议”；
- “必须输出的结构化字段”；
- “输出 schema 或解析器测试”；
- “解析器能区分 partial / parse_failed”；
- “Codex 输出协议有 fixture / schema 校验”。

现在技术方案已经可以实施，但为了团队协作一致性，建议把业务总清单也同步。否则不同人读不同文档，会继续产生“到底要不要强迫 Codex 输出 JSON/schema”的分歧。

建议把业务总清单中的 F0/F3 改成：

- F0：Codex prompt v0 + report collector fixture；
- F3：ExecutionReport 字段语义保留，来源由工具侧 `CodexRunResult / GitChangeSet / AcceptanceResult` 生成；
- `partial/parse_failed` 不作为主状态，转为 `outcomeReason` 或自然语言总结提取失败的诊断信息。

### 10.4 建议优化的问题

#### P2-1. `AcceptancePlan` 需要正式定义

多处已经引用：

```ts
runAcceptancePlan(plan: AcceptancePlan, ...)
```

但数据模型章节没有定义 `AcceptancePlan`。这不是大问题，但第一批实现 `acceptance-runner` 时需要这个类型。

建议补充：

```ts
export type AcceptancePlan = {
  taskId: string;
  checks: AcceptanceCriterion[];
  requiredCommandIds: string[];
};
```

或者更简单：`runAcceptancePlan()` 直接接收 `AcceptanceCriterion[]`，避免多一个抽象。

如果没有额外计划编排逻辑，建议先用 `AcceptanceCriterion[]`，减少概念。

#### P2-2. `core 纯函数` 与 `core readers` 术语仍可再统一，但不阻塞

§2.1 已经把边界说清楚了，不过文档其他地方仍写“core 纯函数”。这在概念上已经不再危险，因为 §2.1 有明确解释。

建议实现时遵守即可：

- `report-collector-core.ts`、`scope-core.ts` 这类保持纯计算；
- `guide-core.ts`、`stage-core.ts` 如果读 `.ai-first/`，应视为 core reader；
- `git-collector`、`codex-runner`、`acceptance-runner` 不放进 core compute。

这个问题不需要继续拖住方案评审。

#### P2-3. `codex-output` fixture 命名可以保持，但内容要包含录制事实

当前 fixtures 目录仍叫：

```text
fixtures/codex-output/
```

这可以保留，但 F0 已经不是“解析 Codex 输出”，而是“report collector 生成 ExecutionReport”。因此 fixture 里除了 stdout/stderr，最好还包含录制的：

- `CodexRunResult`
- `GitBaseline`
- `GitChangeSet`
- `AcceptanceResult[]`

建议第一批实现时把 fixture 结构设计为目录式样本：

```text
fixtures/codex-output/sample-001/
  codex-result.json
  git-baseline.json
  git-change-set.json
  acceptance-results.json
  expected-report.json
```

这样 CI 不依赖真实 Codex，也不依赖真实 git 工作区。

### 10.5 最终建议

当前技术方案已经足够成熟，可以停止反复方案评审，进入实现。建议只做一个很小的收尾提交：

1. 补齐 `createPreflightBlockedReport()` 示例字段。
2. 全文删除 `newChanges` 残留，统一为 `trackedChanges` / `filesChanged`。
3. 同步业务总清单 F0/F3 的旧 schema 口径。
4. 明确 `AcceptancePlan` 是否存在；若不需要，就让 runner 直接接收 `AcceptanceCriterion[]`。
5. 第一批实现 fixture 用“录制事实 + 期望 report”的目录结构。

做完这些，就可以直接进入第一批实现：`io/`、`CodexAdapter.executePrompt()`、git collector、acceptance runner、report collector、`task:exec`。这条路线已经很清楚了，不需要再发明新的平台层。

---

## 11. 存量代码盘点专项评审

| 项 | 内容 |
| --- | --- |
| 评审对象 | `docs/AI-first-技术实现方案.md` 第 11 节“存量代码盘点与去留决策” |
| 评审日期 | 2026-07-05 |
| 评审重点 | 是否准确回答“项目里代码/脚本有什么作用、是否必要”、调用链判断是否属实、去留决策是否利于第一批实现 |
| 参考材料 | `package.json`、`.claude/commands/*.md`、`src/core/`、`src/frontend/`、`scripts/` |

### 11.1 总体结论

新增第 11 节是有价值的，方向正确，建议保留。

它解决了一个此前方案里比较容易混淆的问题：这个项目不是纯文档，也不是完整可运行平台，而是同时存在三类资产：

1. 已经接上入口的确定性 CLI 能力，例如 `adopt`、`scan:domains`、`dispatch-cli`。
2. 有测试和实现、但还没有产品入口的存量代码，例如 `executor`、`routing-resolver`、`registry-loader`、`smoke-case-generator`。
3. 演示/可视化能力，例如 React dashboard 和 `generate-frontend-data.ts`。

第 11 节把这些资产从“都算产品能力”里拆开，明确哪些是真主链路、哪些是弱通车、哪些是孤岛，这对防止后续继续堆代码很重要。尤其“孤岛代码要么接通，要么标注实验性/未启用，不得在 README 算进在跑能力”这个判断是对的。

不过当前这节仍有几处事实口径需要修正，否则后续清债时可能误删、误判或误导实现顺序。

### 11.2 评审结论

> **通过，但建议修正事实口径后再作为实现前清债依据。**

这节不需要大改，核心方向是正确的。需要补的是“更精确的调用链”和“更稳妥的去留策略”。

### 11.3 亮点

#### 11.3.1 终于把“代码是否必要”说清楚了

第 11 节明确区分：

- `adoption/`、`scanners/`：必要，已经在用。
- `harness/subagent-dispatcher` + `dispatch-cli`：弱通车，可保留。
- `tools/adapter`：现在半孤岛，但第一批 Codex 闭环会用。
- `executor/routing-resolver/registry-loader/smoke-case-generator`：实现存在，但未接产品入口。
- `frontend`：可选展示，不是主链路。

这个分类符合当前项目目标：不要把脚手架做成大平台，而是优先让研发和 Codex/Claude 能稳定跑通主链路。

#### 11.3.2 对 README 宣传边界的提醒很必要

README 当前仍有较强的“15 agents / 9 gates / auto-orchestration / dashboard”产品化表述。第 11 节要求孤岛能力不能算作“在跑能力”，这个提醒非常重要。

建议后续实现前同步 README，把能力分成：

- 已可用；
- 规划中；
- 实验性；
- 展示/示例。

这样外部读者和后续实现者都不会误判成熟度。

#### 11.3.3 “实现前清债”时机正确

如果不先处理孤岛代码，第一批再新增 `io/`、`task:exec`、`report collector`，项目会很快出现两套执行引擎、两套路由和两套报告模型。第 11 节把清债放在第一批 0a 之前，是合理的。

### 11.4 需要修正的问题

#### P1-1. `/scan` 调用链表述不准确

第 11 节写：

> `scanners/` 调用方：`npm run scan:domains` + `/scan`

但当前 `.claude/commands/scan.md` 并没有调用 `npm run scan:domains`，它主要是 shell `find/grep` + skill 扫描 + 写 assessment/report。真正明确调用 `npm run scan:domains` 的是 `.claude/agents/repo-scanner-agent.md`，以及 `.claude/commands/adopt.md` 的 fallback/辅助路径。

建议改成：

| 模块 | 调用方 |
| --- | --- |
| `scanners/` | `npm run scan:domains`；`repo-scanner-agent`；`/adopt` 辅助路径；`/scan` 尚未直接复用 |

同时把这条列为清债任务：

> 让 `/scan` 优先调用 `scan:domains` 或未来统一的 scan core，避免 Claude command 和 TS scanner 各扫各的。

#### P1-2. `frontend/` 行数和作用低估

第 11 节写：

> `frontend/` dashboard | ~600 | `npm run dev`

但当前 `src/frontend/` 约 3600 行，包含 Dashboard、组件、i18n、主题、测试、自动生成数据等。单个 `Dashboard.tsx` 就约 600 行。

建议改成：

> `frontend/` dashboard | ~3600 行（含测试/组件/i18n；核心 Dashboard 约 600 行） | `npm run dev` / `frontend:dev` | 🔵 可选展示（K3 降级）

这不会改变“可选展示”的判断，但会更真实地表达维护成本：frontend 不是一个小装饰，而是一套完整展示层。

#### P1-3. “真孤岛约 1300 行”需要说明统计口径

第 11 节写“约 1300 行真孤岛”，对应：

- `smoke-case-generator.ts` 426 行
- `registry-loader.ts` 287 行
- `executor.ts` 252 行
- `routing-resolver.ts` 335 行

合计约 1300 行，这是按**源文件不含测试**统计，口径可以成立。但如果包含对应测试，孤岛相关代码量会更大。

建议补一句：

> 行数按生产源文件估算，不含测试；对应测试仍会增加维护成本。

这样后续清理时不会低估测试维护负担。

#### P1-4. “删除或归档 executor/routing-resolver”需要先确认是否有复用价值

第 11 节建议：

> `harness/executor.ts` + `routing-resolver.ts` 删除或归档

方向可以理解，因为当前它们没有产品入口。但这两个模块有测试，且可能包含可复用逻辑：

- `executor.ts` 里有 adapter 执行编排思路；
- `routing-resolver.ts` 可能包含从 routing manifest 到动作的确定性解析思路。

建议调整为更稳的顺序：

1. 先标注为 `experimental/unwired`，从 README 宣传能力中移除。
2. 在第一批实现 `task:exec` 前做一次“复用审查”：
   - 能被 report collector / codex runner 复用的函数迁移；
   - 不能复用的再删除或归档。
3. 删除时同步删除或调整对应测试，避免测试套件继续维护废弃 API。

这样既能清债，又不会误删将来可复用的执行编排经验。

#### P1-5. `tools/adapter` 不能只按“被孤岛 executor 引用”判断

第 11 节写：

> `tools/` adapter 三件套只被孤岛 executor 引用，半孤岛

从当前调用链看基本属实，但技术方案 §4.6 明确第一批会扩展 `CodexAdapter.executePrompt()`。因此对 `tools/adapter` 的判断应更强一点：

> 当前半孤岛，但属于第一批 Codex 闭环的保留资产，不能删除；应优先改造 `codex-adapter.ts`，而不是重写一套 codex runner。

建议把 `tools/adapter` 从“孤岛清理候选”中明确排除，列为“第一批必须复用”。

### 11.5 建议优化的问题

#### P2-1. 第 11 节应补入文档导航

技术方案顶部文档导航目前列到第 10 节，没有包含新增的第 11 节。

建议补：

```md
- [11. 存量代码盘点与去留决策](#11-存量代码盘点与去留决策实现前清债)
```

这属于文档可读性问题，不影响方案内容。

#### P2-2. 建议增加“保留/接通/归档/删除”的决策标准

现在第 11 节直接给出去留判断，但缺少统一标准。建议补一个小表：

| 判定 | 标准 |
| --- | --- |
| 保留 | 第一批主链路需要，或已有 CLI/Claude command 明确调用 |
| 接通 | 有明确业务价值，但当前无入口 |
| 标注实验性 | 有测试/原型价值，但短期不进入主链路 |
| 归档/删除 | 与新方案方向冲突，且无复用价值 |

这样后续清债不会变成按感觉删代码。

#### P2-3. `harness/subagent-dispatcher` 的“弱通车”判断应保留证据

当前证据是：

- `.claude/commands/task.md` 会在复杂任务时调用 `npx tsx src/core/harness/dispatch-cli.ts ...`
- `.claude/commands/complete.md` 会读取 `.ai-first/tasks/dispatch-{task-id}.yml`

建议第 11 节在“弱通车”旁补一句这个证据。这样未来读者能理解为什么 `subagent-dispatcher` 没被归到真孤岛。

#### P2-4. “dashboard 可选”应明确不进入 v0.1 主链路

第 11 节已写 frontend 是可选，但建议更明确：

> dashboard 可作为 showcase / health view 保留；v0.1 主链路不得依赖 dashboard，所有关键动作必须能通过 CLI/Claude/Codex 完成。

这与用户目标一致：脚手架首先帮助研发高效、安全地开发和对齐，不应把 dashboard 做成必需入口。

### 11.6 建议补充后的结论

第 11 节整体判断正确，应该保留，并且建议作为第一批实现前的“清债门”：

1. 校准调用链事实：尤其 `/scan` 与 `scan:domains`。
2. 校准行数和维护成本：尤其 frontend 与孤岛测试。
3. 先标注/隔离孤岛，再决定删除，避免误删可复用逻辑。
4. 明确 `tools/adapter` 是第一批 Codex 闭环保留资产。
5. 同步 README，把“已运行能力”和“规划/实验能力”分开。

做完这些，第 11 节就能很好地回答最初的问题：**代码是必要的，但不是所有已有代码都同等必要。必要的是确定性 CLI、文件协议、Codex/Claude 适配和质量事实收集；dashboard 和孤岛执行引擎不能挡住主链路。**

---

## 12. 存量代码盘点第二轮复评

| 项 | 内容 |
| --- | --- |
| 评审对象 | `docs/AI-first-技术实现方案.md` 第 11 节完善版 |
| 评审日期 | 2026-07-05 |
| 评审重点 | 上一轮专项评审问题是否闭环、存量代码去留决策是否足够可执行 |
| 参考材料 | `package.json`、`.claude/commands/task.md`、`.claude/commands/complete.md`、`.claude/commands/scan.md`、`src/core/`、`src/frontend/`、`scripts/` |

### 12.1 总体结论

第 11 节完善版已经基本闭环，建议作为第一批实现前的清债依据。

上一轮指出的核心问题大多已修正：

- 文档导航已补第 11 节。
- `/scan` 与 `scan:domains` 的关系已经改准确：`/scan` 尚未直接复用 TS scanner。
- frontend 行数已从“约 600 行”修正为“约 3600 行”，并明确 dashboard 不进 v0.1 主链路。
- “真孤岛约 1300 行”已说明是不含测试的生产源文件估算。
- 删除孤岛代码的顺序已从“直接删除”调整为“标注隔离 → 复用审查 → 再删”。
- `tools/adapter` 已明确排除出孤岛清理候选，作为第一批 Codex 闭环必须复用的资产。
- `harness/subagent-dispatcher` 的弱通车证据已经补足：`/task` 生成 manifest，`/complete` 消费 manifest。
- 已增加“保留/接通/标注实验性/归档删除”的统一判断标准。

因此，这一节已经能清楚回答“代码/脚本到底有什么用、是否必要”：**必要的是可复用的确定性控制层和 Codex/Claude 接入能力；不必要的是未接入口、未进入主链路、还被 README 当成已运行能力的孤岛代码。**

### 12.2 闭环情况

| 上轮问题 | 当前状态 | 说明 |
| --- | --- | --- |
| `/scan` 调用链不准确 | 已闭环 | 已改为 `/scan` 尚未直接复用，并提出接通任务。 |
| frontend 行数低估 | 基本闭环 | 已改为约 3600 行；但“含数据生成”口径仍可再精确。 |
| 1300 行孤岛统计口径 | 已闭环 | 已说明不含测试。 |
| executor/routing-resolver 直接删风险 | 已闭环 | 已改为先标注、再复用审查、最后删。 |
| `tools/adapter` 不应普通孤岛化 | 已闭环 | 已列为第一批必须复用。 |
| 第 11 节缺导航 | 已闭环 | 导航已补。 |
| 缺统一去留标准 | 已闭环 | 已补判断标准表。 |
| weak path 缺证据 | 已闭环 | 已补 `/task` 和 `/complete` 消费链证据。 |
| dashboard 可选性 | 已闭环 | 已明确不进入 v0.1 主链路。 |

### 12.3 仍建议微调的问题

#### P2-1. frontend 行数“含数据生成”口径还可再精确

第 11 节写：

> `frontend/` dashboard | ~3600（含组件/i18n/测试/数据生成；核心 Dashboard ~600 行，含此前漏统的 `.tsx`）

当前 `src/frontend/` 约 3600 行，这个数字是准确的；但 `scripts/generate-frontend-data.ts` 在 `scripts/` 下，不在 `src/frontend/` 里。如果“含数据生成”指的是生成出的 `src/frontend/data/project-data.ts`，可以保留；如果指生成脚本本身，就会有口径歧义。

建议改成：

> `frontend/` dashboard | ~3600 行（含组件/i18n/测试/生成后的 data 文件；另有 `scripts/generate-frontend-data.ts` 数据同步脚本） | ...

这只是统计口径问题，不影响“dashboard 可选”的结论。

#### P2-2. `tools/` adapter 行数有轻微误差

第 11 节写 `tools/` adapter 三件套 648 行。当前三个生产文件大约是：

- `codex-adapter.ts`: 250 行
- `claude-code-adapter.ts`: 230 行
- `tool-adapter-protocol.ts`: 158 行

合计约 638 行。差异很小，不影响判断，但如果文档要作为清债依据，建议改成“约 640 行”或“约 638 行”。

#### P2-3. `scripts/pre-commit.sh` 没有纳入盘点

第 11 节主要盘点 `src/core` 和 dashboard，这是对的。但用户问的是“代码、脚本”的必要性，当前 `scripts/pre-commit.sh` 没有被分类。

建议补一行：

| 模块 | 调用方 | 判定 |
| --- | --- | --- |
| `scripts/pre-commit.sh` | 手动安装/本地 git hook | 🟡 质量辅助，非主链路；保留但不作为 v0.1 必需入口 |

这样“脚本”这一类会更完整。

#### P2-4. `adoption/` 仍被称为 core，但实际有写文件副作用

第 11 节没有展开这个问题，但前文已经承认 `project-adopter.ts` 写文件副作用暂留。建议在第 11 节 `adoption/` 行或去留决策中补一句：

> `adoption/` 保留，但它是历史可用实现，不作为新模块三层分离样板；后续单独重构写副作用上移。

避免后续实现者把现有 `project-adopter.ts` 当成“core 可写文件”的正例。

### 12.4 复评建议

第 11 节现在可以作为“实现前清债门”使用。建议只做四个轻量补充：

1. frontend 行数口径改成“生成后的 data 文件”和“外部 data sync 脚本”分开说。
2. `tools/adapter` 行数改成约 640 行。
3. 补 `scripts/pre-commit.sh` 的去留判断。
4. 在 `adoption/` 旁标明“历史可用实现，不作为新 core 分层样板”。

完成这些微调后，这一节已经不需要继续评审。下一步应进入清债和第一批实现，而不是继续扩展方案。
