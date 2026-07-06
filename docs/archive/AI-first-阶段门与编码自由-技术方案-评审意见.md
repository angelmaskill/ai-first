# AI-first 阶段门与编码自由技术方案评审意见

> 评审日期：2026-07-06
> 评审对象：`docs/AI-first-阶段门与编码自由-技术方案.md`
> 对照目标：`docs/AI-first-v0.1落地评审-代码盘点与工具影响.md` §6
> 评审结论：**有条件通过。主方向正确，可以作为实施基础；但实施前需要修正 break-glass 审计位置、`Task.mode` 可达性表述、ExecutionReport 适用范围、requiredArtifacts 来源和状态推进职责边界。**

---

## 1. 总体判断

这份方案总体合理，方向正确，基本能够满足业务目标：

> 项目中的代码不要影响 Codex 编程能力的发挥；但要把控好研发阶段，不允许开发没做完就推进到提测。

方案最重要的价值是把两个目标拆成了两条互不冲突的轴：

- **阶段内编码自由**：`task:exec`、编辑、测试、修 bug 不经过阶段门，Codex/Claude 不应因为“我是协调者”而拒绝编码。
- **阶段间推进受控**：`/advance`、auto-advance、state-updater 必须过 `canAdvance()` 客观门，不接受 agent 自报、不接受 `skip`、不接受普通 `force advance`。

这条主线和上游评审 §6 的要求一致。尤其是以下设计是正确的：

- `canAdvance()` 作为纯函数，只消费文件态证据，不 spawn、不写文件。
- `/advance` 强制调用 `npm run stage:gate -- <from> <to>`。
- 普通研发路径移除 `skip`。
- break-glass 变成显式、带审计的异常通道。
- `CLAUDE.md` / `AGENTS.md` 去掉 “do NOT write code” 人设，改为阶段内执行者。

因此，本方案可以作为实施基础，但还不应按原文直接开工。

---

## 2. 必须修正的问题

### P0-1. break-glass 审计位置与上游评审不一致

上游评审建议：

> break-glass 审计写入 `.ai-first/logs/break-glass/<ts>.yml` 或 `.ai-first/reports/break-glass/<ts>.yml`，timeline 只留指针；若放入 `.ai-first/locks/`，必须声明不可自动清理。

但当前方案多处直接使用 `.ai-first/locks/break-glass-<ts>.yml`：

- §1.3 成功判据
- §3 `BreakGlassRecord` 注释
- §6.2 审计文件 schema
- §6.3 写入时序
- ADR-007
- §13 覆盖矩阵

这会把“审计记录”和“运行时锁”混在一起。`locks/` 语义更像临时约束文件，未来存在被清理或重建的风险；break-glass 则是永久审计证据。

建议统一改为：

```text
.ai-first/logs/break-glass/<ts>.yml
```

或：

```text
.ai-first/reports/break-glass/<ts>.yml
```

timeline 只追加指针。如果仍坚持放在 `.ai-first/locks/`，必须在方案里明确：

- break-glass 文件是审计记录，不是临时 lock。
- 不得被 unlock、cleanup、state repair 自动删除。
- `/health` 或 review 流程必须能检索这些记录。

### P0-2. `Task.mode = "skip"` 的可达性表述仍需修正

方案 §0.1 写：

> `Task.mode = "skip"` 是 Codex 可达的（创建任务即写）

这个风险判断方向正确，但“创建任务即写”不准确。当前 `createTask()` 默认写的是 `mode: "execute"`，正常 `task:create` 路径不会自动写 `skip`。

更准确的表述应是：

> `Task.mode` 类型允许 `"skip"`，且 `/advance` 从最近 task YAML 读取 `mode:` 并信任它；task YAML 可被 Codex/Claude 或人工直接编辑，因此只要出现 `mode: skip`，就会形成阶段门旁路。

建议全篇同步调整，尤其是：

- §0.1 “旁路可达性”
- ADR-006
- §13 “强化 B”

### P0-3. `done task 必须有 ExecutionReport` 对非编码阶段可能过严

方案 §5.3 规定：

> `from=build` 有 task，全部 done，但某 task 无 ExecutionReport → 阻塞。

这个规则对 `build → qa` 是合理的，因为开发完成必须有 acceptance / report 的客观证据。但如果同一规则无差别应用到 idea、discovery、spec、architecture 等文档阶段，会误伤。

建议把 check #3 调整为有适用范围：

- 对 `build`、`scaffold`、涉及 `mode=execute` 的任务，强制要求最新 `ExecutionReport.status === "done"`。
- 对带 `acceptanceCriteria` 且不是纯 manual 的任务，强制要求 report。
- 对 idea/spec/architecture 等主要产出文档的阶段，优先检查 required artifacts，不强制每个 done task 都有 ExecutionReport。

这样仍能卡住“开发没做完就提测”，同时不会把前置规划阶段变成过重流程。

### P0-4. requiredArtifacts 来源不应依赖现有 `StageRule.requiredArtifacts`

方案 §5.2 写：

> 来源：`StageRule(from).requiredArtifacts ∪ advance.md §2.4 表`

但当前 `stage-rules.ts` 中很多阶段的 `requiredArtifacts` 是空数组。`StageRule` 更像“阶段识别/评估规则”，不是“阶段退出门禁规则”。如果直接复用，会出现门禁过松或语义混乱。

建议新增独立常量，例如：

```ts
export const STAGE_EXIT_REQUIREMENTS: Record<ProjectStage, string[]> = {
  idea: ["goals.md"],
  discovery: ["requirements.md"],
  spec: ["requirements.md"],
  architecture: ["architecture.md"],
  scaffold: ["scaffold-plan.md"],
  build: ["implementation-summary.md"],
  qa: [],
  release: ["release-notes.md"],
  operate: [],
  evolve: [],
};
```

具体文件名可以再按项目现状校准，但原则是：**阶段进入/识别规则和阶段退出门禁规则要分开**。

### P1-1. break-glass 是否负责 transition 需要明确职责边界

方案 §6.3 写：

> `stage-gate-cli --break-glass` 写审计后才执行 transition（state-updater 逻辑）。

这个设计可以接受，但必须避免 `/advance`、`stage-gate-cli`、`state-updater-agent` 三处各自改 symlink 和 `project.yml`，否则会出现三套状态推进逻辑。

建议抽一个共享副作用函数：

```ts
advanceState(projectRoot, from, to, options)
```

职责包括：

- 创建下一阶段 state 目录。
- 更新 `.ai-first/state/current`。
- 更新 `.ai-first/project.yml` 的 `currentStage`。
- 写 timeline。
- 处理 rules.lock。

普通 `/advance` 和 break-glass 都调用它。`canAdvance()` 仍保持纯函数，不承担写入。

---

## 3. 建议优化的问题

### P2-1. `task-cli.ts` 拒绝 `--mode skip` 的设计需要配合 CLI 参数事实

当前 `task-cli.ts` 并没有 `--mode` 参数，`createTask()` 也固定生成 `mode: execute`。因此方案 §7.3 写 “parseCreateArgs 拒绝 `--mode skip`” 是预防性设计，不是当前真实入口。

建议改成：

- 如果新增 `--mode` 参数，则必须拒绝 `skip`。
- 如果不新增 `--mode` 参数，则无需改 `task-cli.ts`，重点放在 `models.ts`、`project-reader.ts` 和 `/advance` 不信任 task YAML。

### P2-2. `normalizeTaskMode(skip) → execute` 不应写 timeline

方案 §7.2 写：

> 仅记录到 timeline（一次性提示），不重写文件。

但 `project-reader.ts` 是 repository reader，当前架构要求 reader 只读、不写、不产生副作用。让 normalize 时写 timeline 会破坏 core/io 边界。

建议改为：

- `normalizeTaskMode()` 纯粹返回 `{ mode, warning? }`，或返回 `execute` 并在 CLI 层统一输出 warning。
- 不在 `project-reader.ts` 中写 timeline。
- 如确实要留审计，由迁移 CLI 或 health/doctor 命令生成报告。

### P2-3. grep 自检条件需要允许“废弃说明”命中

方案 §8.3 要求：

```bash
grep -rn "mode is .skip.\|case.*skip\|Task.mode.*skip" ...
# 期望：空（或仅出现在"已废弃"说明里）
```

这里“空”和“允许废弃说明命中”是两个不同验收标准。建议拆成两个检查：

- 生产路径检查：`advance.md` 不得包含 `skip)`、`If mode is skip`、`Stage skipped`。
- 文档/错误提示检查：允许出现 `mode 'skip' 已废弃`。

这样验收不会因为合理的错误提示而误报失败。

### P2-4. `from=build` 无 task 但 artifact 存在即通过，需要限定 artifact

方案 §5.3 允许：

> `from=build` 但没有任何 task → 过（只要 artifact 存在）

这个规则可以保留，但 artifact 必须是能证明实现完成的客观产物，例如 `implementation-summary.md`、执行报告、构建产物或测试报告，而不是任意 artifacts 目录存在。

建议写清楚：

- build 阶段无 task 时，至少需要 `implementation-summary.md` 或等价的执行报告。
- 如果没有 task、没有 report、只有空 artifact，应阻塞。

---

## 4. 与业务目标的一致性

### 4.1 “不影响 Codex 编程能力”是否满足？

基本满足。

方案明确规定：

- `task:exec` 不调用 `canAdvance()`。
- 编辑、测试、修 bug 不经过阶段门。
- `CLAUDE.md` / `AGENTS.md` 移除 “do NOT write code”。
- 当前阶段内 agent 是执行者，而不是只会转派的协调者。

这能避免脚手架把 Codex 卡成“不能写代码”的状态，符合业务目标。

### 4.2 “开发没做完不能提测”是否满足？

主路径满足，但依赖上文 P0 修正。

满足点：

- `/advance` 强制调用 `stage:gate`。
- active task 未完成时阻塞。
- done task 在编码阶段需要客观 `ExecutionReport.status === "done"`。
- `skip` 从普通研发路径移除。
- break-glass 被显式化、审计化。

需要修正点：

- break-glass 审计位置要稳定可检索。
- `requiredArtifacts` 要独立定义，不能依赖空的 `StageRule.requiredArtifacts`。
- ExecutionReport 规则要按阶段/任务类型限定，避免规划阶段误伤。

---

## 5. 最终评审结论

本方案**有条件通过**。

它已经正确回答了最关键的问题：

> 不要用“禁止 Codex 写代码”来控制阶段；要用“阶段推进客观门禁”来控制项目节奏。

这正是当前项目需要的方向。只要补齐以下修正，就可以进入实现：

1. break-glass 审计路径统一到 `.ai-first/logs/break-glass/` 或 `.ai-first/reports/break-glass/`。
2. 修正 `Task.mode=skip` 可达性表述，不再写“创建任务即写”。
3. `ExecutionReport` 强制规则限定到 build/scaffold/execute 类任务。
4. 新增独立 `STAGE_EXIT_REQUIREMENTS`，不要复用 `StageRule.requiredArtifacts` 作为退出门禁。
5. 抽出共享 `advanceState()`，避免多处写阶段状态。
6. 保持 `project-reader.ts` 纯读，不在 normalize 时写 timeline。

完成后，这份方案能够同时满足两个目标：

- **Codex 编码不被脚手架绑住。**
- **阶段推进不能被 `skip` / 自报完成 / 普通 bypass 随意绕过。**

---

## 6. 第二轮复评意见（优化版）

> 评审日期：2026-07-06
> 评审对象：`docs/AI-first-阶段门与编码自由-技术方案.md` 优化版
> 复评重点：上一轮 P0/P1/P2 是否闭环，是否仍能满足“编码自由 + 阶段门硬控”的业务目标
> 复评结论：**基本通过，但实施前仍需修正两处 P0 逻辑矛盾。上一轮大部分问题已被吸收，方案已经接近可实施状态。**

### 6.1 已闭环的问题

上一轮评审的主要意见大多已经被采纳，且落点清楚：

| 上轮问题 | 当前状态 | 说明 |
|---|---|---|
| break-glass 放在 `locks/` 容易与临时锁混淆 | 已闭环 | 已改为 `.ai-first/logs/break-glass/<ts>.yml`，并声明永久审计、不得自动清理。 |
| `Task.mode=skip` “创建任务即写”表述不准 | 已闭环 | 已改为“task YAML 可被编辑 + `/advance` 信任 mode 字段”。 |
| ExecutionReport 规则可能误伤规划阶段 | 部分闭环 | 文档意图已改成阶段感知，但伪代码仍有矛盾，见 P0-1。 |
| requiredArtifacts 不应复用 `StageRule.requiredArtifacts` | 已闭环 | 已新增 `STAGE_EXIT_REQUIREMENTS`，并明确阶段识别和退出门禁分离。 |
| 多处写状态可能分裂 | 已闭环 | 已新增 `advanceState()` 作为唯一状态推进副作用入口。 |
| `task-cli --mode skip` 是预防性设计 | 已闭环 | 已说明当前无 `--mode`，未来若新增才拒绝 `skip`。 |
| `project-reader` 不应写 timeline | 已闭环 | 已改为返回 `{ mode, warning? }`，reader 保持纯读。 |
| grep 自检应区分生产路径和废弃说明 | 已闭环 | 已拆成 8.3A 生产路径检查和 8.3B 废弃说明检查。 |
| build 无 task 时 artifact 需具体 | 已闭环 | 已限定为 `implementation-summary.md` 或等价执行报告。 |

整体看，优化版已经真正围绕“阶段内不束缚、阶段间硬门禁”展开，和业务目标一致。

### 6.2 仍需修正的问题

#### P0-1. `taskNeedsReport()` 伪代码仍会让文档阶段强制要求 ExecutionReport

方案意图是：

> 文档阶段（idea/spec/architecture）不强制 report，由 artifact 兜底。

但 §5.4 的伪代码写的是：

```ts
function taskNeedsReport(task: Task, stage: ProjectStage): boolean {
  if (task.mode === "execute") return true;
  if (stage === "build" || stage === "scaffold") return true;
  return task.acceptanceCriteria.some((c) => c.check.kind !== "manual");
}
```

这个实现与方案意图冲突，原因有两个：

1. 当前 `createTask()` 默认生成 `mode: "execute"`，所以文档阶段创建出来的 task 也可能是 execute。
2. 当前 task 默认 acceptance 是 `npm-test`，属于非 manual，因此 `acceptanceCriteria.some(...)` 也会让大部分任务需要 report。

结果是：即使方案 §5.3 写了“`from=idea` 有文档任务 done，无 ExecutionReport → 过”，实际按 `taskNeedsReport()` 会返回 `true`，最终仍会阻塞。

建议改成阶段优先，而不是 task.mode 优先：

```ts
function taskNeedsReport(task: Task, stage: ProjectStage): boolean {
  if (task.status === "canceled") return false;

  const implementationStages: ProjectStage[] = ["scaffold", "build"];
  if (implementationStages.includes(stage)) return true;

  const hasObjectiveAcceptance = task.acceptanceCriteria.some((c) => c.check.kind !== "manual");
  const taskDeclaresImplementation = task.domainIds.some((id) =>
    /frontend|backend|algorithm|data|infra|service|app/.test(id),
  );

  return hasObjectiveAcceptance && taskDeclaresImplementation;
}
```

或者更简单地规定：

- `build/scaffold` 阶段强制 report；
- 其他阶段默认不强制 report，除非 task 明确标记 `requiresExecutionReport: true`。

同时建议补一个测试：

| 用例 | 期望 |
|---|---|
| `idea → discovery`，有 `mode=execute` 且默认 `npm-test` acceptance 的 done task，但已有 `goals.md` | allowed=true |

这条必须修，否则方案会重新把轻量文档阶段变成重流程，影响研发体验。

#### P0-2. `evolve → discovery` 闭环在示例代码里没有真正放行

方案 §5.3 边界表写：

> `evolve → discovery`（闭环）→ true

但 §5.4 的 `isLegalTransition()` 伪代码是：

```ts
if (toIdx !== fromIdx + 1) return false;
return true;
// 注：evolve → discovery 的闭环由 from===evolve && to===discovery 特判放行
```

注释在 `return true` 后面，且没有真正实现特判。按这段代码，`evolve → discovery` 会被判为 false。

建议改成：

```ts
function isLegalTransition(from: ProjectStage, to: ProjectStage): boolean {
  if (from === "evolve" && to === "discovery") return true;

  const ORDER: ProjectStage[] = [
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

  const fromIdx = ORDER.indexOf(from);
  const toIdx = ORDER.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1;
}
```

并保留测试：

| 用例 | 期望 |
|---|---|
| `evolve → discovery` | allowed=true |
| `qa → build` | allowed=false |
| `build → release` | allowed=false |

这条虽然不直接影响“开发没做完不能提测”，但影响 10 阶段生命周期闭环的正确性，应在实施前修。

#### P1-1. active task 检查需要明确只检查当前阶段相关任务

方案 §5.2 写：

> 当前阶段无 active task

但需要在算法里明确筛选范围，否则 `.ai-first/tasks/` 里存在其他阶段的历史 todo/backlog task 时，可能误阻塞当前阶段推进。

建议定义：

```ts
const currentStageTasks = tasks.filter((task) => task.stage === from);
```

然后只对 `currentStageTasks` 检查：

- `todo`
- `in_progress`
- `blocked`
- `review_pending`

对无 stage 的旧 task，可按 reader normalize 后的 stage 处理，但要在 blocker detail 里提示“legacy task normalized to build”，避免隐形误判。

#### P1-2. `STAGE_EXIT_REQUIREMENTS` 的阶段产物需要和当前仓库产物名校准

优化版新增 `STAGE_EXIT_REQUIREMENTS` 是正确方向，但其中一些文件名仍是草案：

```ts
discovery: ["requirements.md"],   // 或 users.md，按项目校准
scaffold: ["scaffold-plan.md"],
build: ["implementation-summary.md"],
```

当前 `.ai-first/artifacts/` 已有：

- `goals.md`
- `requirements.md`
- `architecture.md`
- `implementation-summary.md`
- `delivery-handoff.md`
- `release-notes.md`

没有看到 `scaffold-plan.md`。如果第一版实现直接要求该文件，可能导致 scaffold 阶段无法推进。

建议把该常量从“示例”升级为“项目当前协议”，或者明确 `scaffold-plan.md` 需要由本次实现补齐。否则阶段门会因为产物命名不一致误阻塞。

#### P1-3. `stage:gate --break-glass` 同时“判定”和“推进”，CLI 语义要更明确

优化版设计为：

- 无 `--break-glass`：只输出 `AdvanceDecision`，不推进；
- 有 `--break-glass`：写审计后调用 `advanceState()` 推进。

这个设计可接受，但 CLI 名称 `stage:gate` 容易让人以为它只做检查。建议在方案里补充命令语义：

| 命令 | 行为 |
|---|---|
| `npm run stage:gate -- from to` | 只检查，不推进 |
| `/advance` | 调 `stage:gate` 检查，通过后调 `advanceState()` 推进 |
| `npm run stage:gate -- from to --break-glass ...` | 写审计并推进 |

或者把 break-glass 推进拆成更清晰的命令：

```bash
npm run stage:advance -- from to --break-glass ...
```

不强制拆，但必须在方案里明确，避免后续实现者把普通 `stage:gate` 误做成推进命令。

### 6.3 建议优化的问题

#### P2-1. `CLAUDE.md` 路径建议统一写成 `.claude/CLAUDE.md`

方案多处写 `CLAUDE.md`，但实际文件路径是 `.claude/CLAUDE.md`。建议正文统一写 `.claude/CLAUDE.md`，避免实施时找错文件。

#### P2-2. “按短路顺序”与伪代码行为不一致

方案 §5.2 标题写“五项检查（按短路顺序）”，但伪代码会 push 所有 checks 并汇总 blockers，不是短路。

建议改成：

> 五项检查（全部执行并汇总 blockers）

这反而更好，因为用户能一次看到所有 blockers，不用一项一项修。

#### P2-3. `qa: []` 只靠 ExecutionReport 兜底可能不够表达 QA 出口

`STAGE_EXIT_REQUIREMENTS.qa = []` 可以接受，因为 QA 可能以 review reports/gates 为主。但建议在 check #4 或新增 check 中明确 QA 阶段的退出证据，例如：

- `.ai-first/reviews/` 至少有当前阶段相关 review；
- 无 failed review；
- 或 release gate report 存在。

否则 `qa → release` 可能主要依赖 task/report/sync，而没有专门 QA 产物。

这不影响“开发没做完不能提测”，但影响“提测后能不能发布”的后续阶段质量。

### 6.4 与业务目标的一致性复评

复评后判断：

- **不影响 Codex 编程能力**：基本满足。方案坚持 `task:exec` 不调门、移除“do NOT write code”、阶段内执行者，这条主线没问题。
- **开发没做完不能提测**：主路径满足。`/advance` 强制过 `stage:gate`、active task 阻塞、build/scaffold 阶段 report 阻塞、移除 skip，这些设计足够覆盖核心目标。
- **仍需修的关键点**：`taskNeedsReport()` 必须修掉“execute/default acceptance 导致文档阶段误阻塞”的矛盾；`evolve → discovery` 必须真正放行。

### 6.5 第二轮最终结论

优化版已经吸收上一轮绝大多数评审意见，整体从“有条件通过”提升为：

> **基本通过，修正 P0-1 / P0-2 后即可进入实现。**

实施前必须完成：

1. 修正 `taskNeedsReport()` 的阶段优先逻辑，避免文档阶段被默认 `execute` / `npm-test` acceptance 误阻塞。
2. 修正 `isLegalTransition()`，真正放行 `evolve → discovery`。
3. 明确 active task 只检查当前阶段相关任务。
4. 校准 `STAGE_EXIT_REQUIREMENTS` 与当前 `.ai-first/artifacts/` 文件协议。
5. 明确 `stage:gate` 与 break-glass 推进的 CLI 语义。

完成这些后，本方案就能稳定满足业务目标：**Codex 编码自由；阶段推进受控；普通研发路径没有 skip/bypass 旁路。**

---

## 7. 第三轮复评意见（v1.2 再优化版）

> 评审日期：2026-07-06
> 评审对象：`docs/AI-first-阶段门与编码自由-技术方案.md` v1.2 再优化版
> 复评重点：第二轮 P0/P1/P2 是否真正闭环，是否存在新的实施歧义
> 复评结论：**可以进入实现，但实施前建议清理 3 处文档一致性/决策残留。没有发现会阻断业务目标的新增 P0 问题。**

### 7.1 已闭环的问题

第二轮提出的关键问题已经基本吸收：

| 第二轮问题 | 当前状态 | 说明 |
|---|---|---|
| `taskNeedsReport()` 默认 `execute + npm-test` 误伤文档阶段 | 已基本闭环 | §5.4 已改成阶段优先：`scaffold/build` 强制 report；其他阶段只在实现性 domain + 客观验收时要求 report。 |
| `evolve → discovery` 闭环没有真正放行 | 已闭环 | `isLegalTransition()` 已把 `if (from === "evolve" && to === "discovery") return true` 放到函数开头。 |
| active task 检查未限定当前阶段 | 已闭环 | §5.2 已明确 `currentStageTasks = tasks.filter(t => t.stage === from)`。 |
| `stage:gate` 与 break-glass CLI 语义不清 | 已闭环 | §6.1 已补命令语义边界表：普通 `stage:gate` 只检查，`/advance` 推进，`--break-glass` 带审计推进。 |
| `.claude/CLAUDE.md` 路径不统一 | 已闭环 | 文档导航、目标、接线图、风险表均已改为 `.claude/CLAUDE.md`。 |
| “短路顺序”与汇总 blockers 矛盾 | 已闭环 | §5.2 已改为“全部执行并汇总 blockers，非短路”。 |
| QA 阶段退出证据不足 | 已闭环 | §5.2 check #4 已补 QA review 证据要求，§10.1 已补 `qa→release` 用例。 |

因此，方案的主路径已经能覆盖业务目标：

- **编码自由**：`task:exec` / 编辑 / 测试不经过阶段门，人设也改成阶段内执行者。
- **阶段受控**：`/advance` 过 `stage:gate`，active task / report / artifact / sync / QA review 都有客观检查。
- **旁路收紧**：普通 `skip` 被移除；break-glass 是显式、带审计的维护者通道。

### 7.2 仍建议修正的问题

#### P1-1. `taskNeedsReport()` 的文字描述与伪代码仍不完全一致

当前方案 §5.2 check #3 仍写：

> build/scaffold 阶段 或 mode=execute 的 task：必须有最新 ExecutionReport.status === "done"

§13 覆盖矩阵和 ADR-008 也仍有类似表述：

> build/scaffold/execute-mode 强制

但 §5.4 的实际伪代码已经不是“mode=execute 即强制”，而是：

```ts
if (implementationStages.includes(stage)) return true;
const hasObjectiveAcceptance = ...
const taskDeclaresImplementation = ...
return hasObjectiveAcceptance && taskDeclaresImplementation;
```

这意味着：**非 build/scaffold 阶段的 `mode=execute` task 不一定强制 report**，除非它同时声明实现性 domain 且有客观 acceptance。

建议全篇统一为：

> build/scaffold 阶段强制 report；其他阶段仅当任务声明实现性 domain 且包含客观 acceptance 时强制 report。

需要同步修改位置：

- §5.2 check #3 注释
- §13 覆盖矩阵 “done-task report 强制规则按阶段限定”
- ADR-008
- §11 风险表中 “build/scaffold/execute-mode”

否则实现者可能按旧文字把 `mode=execute` 又做成硬条件，重新引入文档阶段误阻塞。

#### P1-2. `STAGE_EXIT_REQUIREMENTS.scaffold = ["scaffold-plan.md"]` 仍是悬而未决的实施选择

优化版已经识别了当前仓库没有 `scaffold-plan.md`，并在 §9 写了两种选择：

- 补一份 `scaffold-plan.md` 占位；
- 或改用已有等价文件名，如 `architecture.md`。

这比上一版清楚，但仍是“二选一待实施”。如果直接进入代码阶段，容易出现实现者选择不一致。

建议在方案里直接定一个默认决策：

> v0.1 阶段门第一版使用现有产物协议，`scaffold` 的退出证据暂用 `architecture.md` 或 `implementation-summary.md`；如果后续确实需要 `scaffold-plan.md`，作为单独产物规范补充。

或者明确：

> 本次实现必须新增 `.ai-first/artifacts/scaffold-plan.md`，并在 init/adopt 或 fixture 中生成。

两种都可以，但不要保留“补占位或改文件名”的开放分支。

#### P1-3. QA review 证据需要定义“当前阶段相关 review”的判定方式

§5.2 新增了 QA 特例：

> `.ai-first/reviews/` 至少有一份当前阶段相关 review；无 status=failed 的 review。

方向正确，但“当前阶段相关 review”需要一个可实现规则，否则实现时又会退回 grep/猜测。

建议补一个最小判定：

- 优先读取 review frontmatter 中的 `stage: qa` / `fromStage: qa` / `taskId`。
- 没有 frontmatter 时，允许 fallback 到文件名或内容中的 `qa`，但只能作为弱证据。
- failed 判断优先读结构化字段 `status: failed` / `verdict: failed`，再 fallback 到文本 `FAILED`。

如果当前 review 文档没有统一 frontmatter，则第一版可以先规定：

> QA review 证据采用宽松读取：`.ai-first/reviews/*.md` 至少存在一份，且全文不包含 `Verdict.*FAILED` 或 `status: failed`。

关键是把规则写死，避免每个实现者自己解释。

### 7.3 建议优化的问题

#### P2-1. `stage:gate --break-glass` 仍可接受，但 CLI 输出应强提示“正在推进”

第三轮不要求拆命令。当前三态语义已经足够清楚：

- 普通 `stage:gate` 只检查；
- `/advance` 检查后推进；
- `stage:gate --break-glass` 写审计后推进。

但为了避免误操作，建议 `--break-glass` 模式启动时输出明显提示：

```text
BREAK-GLASS: this command will bypass blockers and advance stage after audit is written.
```

并在真正推进前把 `priorBlockers` 打印出来。这样不会影响架构，但能降低维护者误触发风险。

#### P2-2. “可进入实现”的结论建议放到技术方案正文结尾

当前方案 §14.6 写了：

> 方案现已无已知逻辑矛盾，可进入实现。

这很好，但它在“评审采纳记录”里。建议在主文 §13 或 §14 后增加一个短的“实施准入结论”，说明：

- P0 已闭环；
- 剩余 P1 是文档一致性和产物协议决策；
- 可开始实现，但实现前先处理 P1-1/P1-2/P1-3。

这能让后续执行者更快抓住状态。

### 7.4 与业务目标的一致性复评

第三轮复评判断：

- **业务目标满足度：高。**
- **Codex 编程能力影响：低。** 阶段门没有进入 `task:exec`，人设也从协调者改为阶段内执行者。
- **阶段把控能力：高。** `skip` 被堵，`/advance` 有客观门，break-glass 有审计。
- **剩余风险：中低。** 主要是文字不一致或产物协议未最终定名，不是架构方向错误。

尤其对用户关心的场景：

> “开发还没做完就说要提测”

当前方案已经有明确阻断路径：

1. `build → qa` 必须走 `/advance`。
2. `/advance` 必须调 `stage:gate`。
3. `stage:gate` 检查当前 build 阶段 active task。
4. `in_progress/review_pending/blocked` 会阻塞。
5. 已 done 的 build/scaffold 任务还要有 `ExecutionReport.status === "done"`。
6. `mode: skip` 不再作为普通旁路。

这条链路成立。

### 7.5 第三轮最终结论

本轮结论：

> **可以进入实现。实施前请先清理 P1-1 / P1-2 / P1-3 三处细节，避免实现时歧义。**

必须优先处理：

1. 全文统一 `taskNeedsReport()` 规则描述，不再写 “mode=execute 必然强制 report”。
2. 明确 `scaffold` 阶段退出产物到底是新增 `scaffold-plan.md`，还是复用现有产物。
3. 明确 QA review 证据的读取规则。

处理完这三点后，本方案不需要继续方案层评审，可以进入代码实现与测试验证。
