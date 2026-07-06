# AI-first 阶段门与编码自由 — 技术方案

> 需求来源：`docs/AI-first-v0.1落地评审-代码盘点与工具影响.md` §6（P0 约束 + 强化 A/B/C）
> 上游方案：`docs/AI-first-技术实现方案.md`（v0.1 主链路，已落地）
> 本方案：在 v0.1 基础上**补一道客观阶段门 + 解除编码人设限制**，闭环"开发没做完不能提测"。
> 业务目标：**代码不能影响 Codex 编程能力的发挥；但要把控好研发阶段，不允许开发没做完就推进到提测。**

## 文档导航

- [0. 设计哲学](#0-设计哲学)
- [1. 目标与范围](#1-目标与范围)
- [2. 业务目标映射](#2-业务目标映射)
- [3. 数据模型](#3-数据模型)
- [4. 模块布局与接线](#4-模块布局与接线)
- [5. canAdvance 算法详述](#5-canadvance-算法详述)
- [6. break-glass 机制](#6-break-glass-机制)
- [7. Task.mode 迁移](#7-taskmode-迁移)
- [8. .claude/CLAUDE.md / AGENTS.md / advance.md 文案重写](#8-claudemd-agentsmd-advancemd-文案重写)
- [9. 实现顺序与依赖](#9-实现顺序与依赖)
- [10. 测试与验证策略](#10-测试与验证策略)
- [11. 风险与回滚](#11-风险与回滚)
- [12. ADR](#12-adr)
- [13. P0 约束覆盖矩阵（闭环证明）](#13-p0-约束覆盖矩阵闭环证明)

---

## 0. 设计哲学

业务目标包含两条**独立**的轴，本方案把它们的优先关系提升为最高准则：

> **编码自由 in，阶段门硬 out（Code Freely In, Gate Hard Out）**
>
> - **In（阶段内）**：Codex / Claude 在当前阶段内**自由编码**——`task:exec` / 编辑文件 / 跑测试 / 修 bug **全程不经过阶段门**。阶段门不读 `currentStage` 来拒绝编码动作。
> - **Out（阶段间）**：任何阶段推进入口（`/advance` / auto-advance / state-updater）**必须过 `canAdvance()` 客观门**——消费文件态证据（task yml + ExecutionReport + artifacts + sync events），不接受 agent 自报、不接受 `skip`、不接受 `force`。

### 0.1 这条原则如何落地为工程约束

| 维度 | 反模式（当前 v0.1） | 本方案 |
|---|---|---|
| 控制手段 | 把"项目控制"误实现成"不让工具写代码"（`.claude/CLAUDE.md` "do NOT write code"） | 阶段内是执行者；控制只落在阶段切换的客观门上 |
| 阶段门 | `advance.md` 散文 checklist + `mode: skip` 旁路 + "force advance" 文案 | `canAdvance()` 纯函数硬门；旁路仅限显式 break-glass + 审计 |
| 旁路可达性 | `Task.mode` 类型允许 `"skip"`，且 `/advance` 从最近 task YAML 读取并信任 `mode:` 字段；task YAML 可被 Codex/Claude 或人工直接编辑 → 出现 `mode: skip` 即形成旁路 | `Task.mode` 移除 `skip`；`/advance` 不再读 task mode 决定是否跳检查；break-glass 只能 CLI 显式触发 |

### 0.2 与现有代码的关系

本方案是 `技术实现方案.md` 的**增量**，不是重写。复用其三层架构（§2.1：core 纯函数 / cli 副作用 / claude-command 转发）与已落地的客观证据管线（`ExecutionReport` / `acceptance-runner` / `git-collector`）。`canAdvance()` 只消费这些已存在的产物，不引入新的真相来源。

---

## 1. 目标与范围

### 1.1 In Scope（本方案交付）

1. `stage-gate-core.ts`：`canAdvance(projectRoot, from, to)` 纯函数 + 客观证据消费。
2. `stage-gate-cli.ts` + `npm run stage:gate`：CLI 入口，未过则非零退出。
3. break-glass 机制：显式 CLI flag + 审计文件 + timeline 指针。
4. `Task.mode` 移除 `"skip"`：类型 + 读时容错 + CLI 拒绝。
5. `.claude/commands/advance.md` 重写：物理移除 skip case、强制调 `stage:gate`。
6. `.claude/CLAUDE.md` + `AGENTS.md` 人设文案收敛：去掉"do NOT write code"、改"bypasses exit checklist"。
7. 测试：单元 + 边界 + 迁移用例。

### 1.2 Out of Scope（明确不做）

- 不改 10 阶段生命周期模型本身。
- 不改 `task:exec` 的执行逻辑（§4.5 时序不变）。
- 不动 frontend dashboard / Tier 4 孤岛 / 两个 hook（评审 §4 #3/#4/#5，单独处理）。
- 不引入新的运行时依赖。

### 1.3 成功判据（闭环定义）

| 判据 | 验证方式 |
|---|---|
| Codex 在 build 阶段写代码不被任何人设/门拒绝 | grep `.claude/CLAUDE.md`/`AGENTS.md` 不再含 "do NOT write code"；`task:exec` 不调 `canAdvance` |
| "开发没做完就提测"被客观卡住 | `canAdvance(build, qa)` 在存在 in_progress task 时返回 `allowed=false`，CLI 非零退出 |
| 旁路仅限 break-glass + 审计 | `Task.mode` 无 `skip`；唯一推进旁路是 `--break-glass` flag，且强制写审计文件 |
| 全部基于文件态证据，可审计可复现 | `canAdvance` 输出 `evidence[]` + `blockers[]`；break-glass 写 `.ai-first/logs/break-glass/`（永久审计） |

---

## 2. 业务目标映射

| 业务目标条款 | 技术落点 |
|---|---|
| 不影响 Codex 编程能力发挥 | §8 人设收敛 + §4 阶段门不被 task:exec 调用 |
| 把控好研发阶段 | §4 + §5 阶段门 + 算法 |
| 不允许"开发没做完就提测" | §5 check #2（active task 必须全 done）+ #3（done task 的 report 必须是 done） |
| 不允许跳过阶段推进 | §5 check #1（阶段顺序校验）+ §7 移除 skip + §8 重写 advance.md |
| 客观、可审计 | §3 `AdvanceDecision.evidence/blockers` + §6 break-glass 审计 |

---

## 3. 数据模型

新增类型，加到 `src/core/models.ts`。所有字段文件态、可序列化（经 `io/yaml.ts` round-trip）。

```ts
// 单个检查项的结果
export type GateCheck = {
  name: string;                         // 如 "active-tasks-done"
  passed: boolean;
  detail: string;                       // 通过/未过的原因（含具体 task id / artifact 路径）
  evidence: string[];                   // 客观证据指针（文件路径 / task id / report id）
};

// canAdvance() 的返回值
export type AdvanceDecision = {
  from: ProjectStage;
  to: ProjectStage;
  allowed: boolean;                     // 全部 check 过才 true
  checks: GateCheck[];                  // 5 项检查的明细
  blockers: string[];                   // = checks.filter(!passed).map(detail)，便于 CLI 直读
  evidence: string[];                   // = checks.filter(passed).flatMap(evidence)，便于审计
  checkedAt: string;                    // ISO 时间戳
};

// break-glass 审计记录（.ai-first/logs/break-glass/<ts>.yml）— 永久审计，不得自动清理
export type BreakGlassRecord = {
  id: string;                           // breakglass-<compactTs>
  operator: string;                     // 必填，触发者（人工姓名 / 维护者 id）
  from: ProjectStage;
  to: ProjectStage;
  reason: string;                       // 必填，为什么绕过门
  risk: string;                         // 必填，承担的风险说明
  timestamp: string;                    // ISO 时间戳
  priorBlockers: string[];              // 绕过前 canAdvance 报告的 blockers（留痕）
};

// Task.mode 收紧：移除 "skip"
export type Task = {
  // ... 既有字段不变 ...
  mode: "generate" | "reuse" | "execute";  // ← 移除 "skip"
  // ...
};
```

> **设计要点**：
> - `GateCheck.evidence` 是文件指针（`task-xxx.yml` / `report-yyy.yml` / `artifacts/architecture.md`），不是 agent 自述。
> - `BreakGlassRecord.priorBlockers` 强制留痕——break-glass 不是"清空门"，而是"明知有 blocker 仍推进"，必须把 blocker 抄进审计。

---

## 4. 模块布局与接线

### 4.1 新增 / 改动文件

```
src/core/stage/
  stage-gate-core.ts        # 新：canAdvance() 纯函数 + 5 项检查
  stage-gate-cli.ts         # 新：npm run stage:gate 入口
  stage-gate.test.ts        # 新：单元 + 边界用例
src/core/state/
  state-updater.ts          # 新：advanceState() 共享副作用（创建下一阶段目录、改 symlink、改 project.yml、写 timeline、rules.lock）—— 所有推进入口的唯一状态写入点
  state-updater.test.ts     # 新
  break-glass.ts            # 新：writeBreakGlass() / readAllBreakGlass()，写入 .ai-first/logs/break-glass/（永久审计）
  break-glass.test.ts       # 新
src/core/models.ts          # 改：新增 GateCheck/AdvanceDecision/BreakGlassRecord；Task.mode 移除 "skip"
src/core/io/project-reader.ts  # 改：normalizeTask() 读时容错 mode:"skip"
src/core/task/task-cli.ts   # 改：parseCreateArgs 拒绝 --mode skip
package.json                # 改：新增 "stage:gate" 脚本
.claude/commands/advance.md # 改：物理移除 skip case + 强制调 stage:gate
.claude/CLAUDE.md           # 改：人设文案
AGENTS.md                   # 改：人设文案 + /advance 描述
```

### 4.2 接线图（推进路径）

```
用户/Codex 说"提测吧"
   │
   ├─ Claude 读 .claude/CLAUDE.md / AGENTS.md（已收敛人设）
   │     → "在 build 阶段我是执行者；阶段切换必须过客观门"
   │
   ├─ /advance（.claude/commands/advance.md，已重写）
   │     → step 0：读 mode（无 skip 分支，mode 不再决定是否跳检查）
   │     → step 2：强制 `npm run stage:gate -- <from> <to>`
   │           ├─ allowed=true → 调 advanceState() 推进
   │           └─ allowed=false → ABORT，输出 blockers
   │
   └─ 异常恢复（人工）→ `npm run stage:gate -- <from> <to> --break-glass --operator X --reason Y --risk Z`
         → writeBreakGlass() 先写审计 → 调 advanceState() 推进

   注：/advance 与 break-glass 都调 advanceState()（唯一的状态推进副作用函数），
   避免多处各自改 symlink + project.yml 造成状态分裂（评审 P1-1）。
```

### 4.3 编码路径（不经过门，对照确认）

```
Codex 写代码 / 编辑 / task:exec / 修 bug
   │
   └─ 完全不调用 canAdvance()
         （task-exec-cli.ts 不变；只读 project/task/scope，不读 stage gate）
```

> **关键不变量**：`canAdvance()` 只被 `stage-gate-cli.ts` 调用，`stage-gate-cli.ts` 只被 `/advance` 和 break-glass 流程调用。`task:exec` / 编辑 / 测试**永远不**经过此门。

---

## 5. canAdvance 算法详述

### 5.1 签名

```ts
// src/core/stage/stage-gate-core.ts
export function canAdvance(
  projectRoot: string,
  from: ProjectStage,
  to: ProjectStage,
): AdvanceDecision
```

纯函数（core compute，§2.1）。读 `.ai-first/` 文件，不 spawn、不写。

### 5.2 五项检查（全部执行并汇总 blockers，非短路——一次看到全部问题）

```ts
function canAdvance(projectRoot, from, to): AdvanceDecision {
  const checks: GateCheck[] = [];

  // Check 1: 阶段顺序合法（相邻、不跨级、不任意回跳）
  checks.push(checkStageOrder(from, to));

  // Check 2: 当前阶段（from）无 active task（第二轮复评 P1-1：只看本阶段任务，避免历史 backlog 误阻塞）
  //   currentStageTasks = tasks.filter(t => t.stage === from)
  //   active = status ∈ {todo, in_progress, blocked, review_pending}
  //   注：canceled 视为"放弃"，不阻塞
  //   注：legacy task（无 stage 字段）按 reader normalize 后的 stage 归属，detail 提示 "legacy task normalized to <stage>"
  checks.push(checkNoActiveTasks(projectRoot, from));

  // Check 3: done task 的客观验证（阶段优先，第三轮复评 P1-1：文字与 §5.4 taskNeedsReport 伪代码对齐）
  //   - build/scaffold 阶段：done task 必须有最新 ExecutionReport.status === "done"
  //   - 其他阶段（idea/spec/architecture/...）：仅当 task 声明实现性 domain 且带客观 acceptance 时强制 report
  //   - canceled task：不强制 report
  //   （判定逻辑见 §5.4 taskNeedsReport()；不再以 mode=execute 为单独硬条件）
  checks.push(checkDoneTasksVerified(projectRoot, from));

  // Check 4: 当前阶段退出门禁的 artifact 全部存在 + QA 阶段复核证据（第二轮复评 P2-3）
  //   来源：STAGE_EXIT_REQUIREMENTS[from]（独立常量，不复用 StageRule.requiredArtifacts
  //         ——后者是阶段识别规则，多为空数组，语义不是门禁）
  //   QA 特例（from=qa）— 第三轮复评 P1-3：定死读取规则，避免实现者自行解释：
  //     - `.ai-first/reviews/*.md` 至少存在一份（弱证据：当前 review 文档无统一 frontmatter）；
  //     - 全文不含 `Verdict.*FAILED` 或 `status: failed`（failed 判定优先结构化字段，回退文本）；
  //     - 二者都满足才过；否则 qa→release 阻塞（detail 写明"QA 阶段需通过的非 failed review"）。
  //     未来若 review 文件统一 frontmatter（stage/verdict），再升级为结构化精确匹配。
  checks.push(checkExitArtifacts(projectRoot, from));

  // Check 5: 无 pending SyncEvent（doc-rot 必须处理或显式 dismissed）
  checks.push(checkNoPendingSync(projectRoot));

  const blockers = checks.filter(c => !c.passed).map(c => c.detail);
  const evidence = checks.filter(c => c.passed).flatMap(c => c.evidence);

  return {
    from, to,
    allowed: blockers.length === 0,
    checks,
    blockers,
    evidence,
    checkedAt: new Date().toISOString(),
  };
}
```

### 5.3 边界情况决策表

| 情况 | 决策 | 理由 |
|---|---|---|
| `from=build` 但没有任何 task | **过**（仅当存在 `implementation-summary.md` 或等价执行报告；空 artifact 阻塞） | 小改动可能不开 task；但必须有客观实现产物兜底，不能空着进 qa |
| `from=build` 有 task，全部 `done`，但某 task **无 ExecutionReport** | **阻塞**（build/scaffold 强制；其他阶段仅当 task 声明实现性 domain + 客观 acceptance 时强制） | 实现阶段"done"必须有客观证据，不能只看 task.status 自报 |
| `from=idea` 有文档任务 done，无 ExecutionReport | **过** | 文档阶段不强制 report，由 `goals.md` 等 artifact 兜底（避免误伤规划阶段） |
| `from=build` 有 task，其中 1 个 `in_progress` | **阻塞** | 开发没做完 |
| `from=build` 有 task，其中 1 个 `review_pending` | **阻塞** | 还在复核，未闭环 |
| `from=build` 有 task，其中 1 个 `canceled` | **过**（不要求 report） | canceled = 显式放弃，不阻塞 |
| done task 的最新 report `status=review_pending` | **阻塞** | acceptance 未全过 / 有 review 越界 |
| 跨级（`build → release`） | **阻塞** | 必须相邻 |
| 回跳（`qa → build`，非 evolve→discovery 闭环） | **阻塞** | 仅允许 `evolve → discovery` 闭环 |
| pending SyncEvent 存在 | **阻塞** | doc-rot 未处理 |
| required artifact 缺失 | **阻塞** | 阶段产物未生成 |

### 5.4 辅助函数（纯）

```ts
// 找某 task 的最新 report
function latestReportForTask(reports: ExecutionReport[], taskId: string): ExecutionReport | undefined {
  return reports
    .filter(r => r.taskId === taskId)
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
}

// 阶段顺序合法？（第二轮复评 P0-2：evolve→discovery 闭环必须真正放行，不能只在 return 后的注释里）
function isLegalTransition(from: ProjectStage, to: ProjectStage): boolean {
  // 10 阶段闭环：evolve → discovery 是允许的回跳（生命周期循环）
  if (from === "evolve" && to === "discovery") return true;
  const ORDER: ProjectStage[] = ["idea","discovery","spec","architecture","scaffold","build","qa","release","operate","evolve"];
  const fromIdx = ORDER.indexOf(from);
  const toIdx = ORDER.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1;        // 必须相邻
}

// §5 check #4 用：阶段退出门禁的 artifact（独立于 StageRule.requiredArtifacts）
// —— StageRule 是阶段识别规则（多为空数组），STAGE_EXIT_REQUIREMENTS 是退出门禁（评审 P0-4）
// 已按当前仓库 .ai-first/artifacts/ 实际清单校准（第二轮复评 P1-2 + 第三轮 P1-2 定死）：
//   现存：goals.md / requirements.md / architecture.md / implementation-summary.md /
//         delivery-handoff.md / release-notes.md
//   scaffold 决策：v0.1 第一版复用 architecture.md（scaffold 紧随 architecture 之后，是其落地实现），
//                 不引入新产物 scaffold-plan.md；若后续需要专属产物，作为独立规范补充。
const STAGE_EXIT_REQUIREMENTS: Record<ProjectStage, string[]> = {
  idea: ["goals.md"],
  discovery: ["requirements.md"],
  spec: ["requirements.md"],
  architecture: ["architecture.md"],
  scaffold: ["architecture.md"],          // v0.1 复用上游 architecture.md 作为 scaffold 退出证据（第三轮 P1-2 定死）
  build: ["implementation-summary.md"],
  qa: [],                                  // 由 check #3 report + check #4 QA 子项兜底
  release: ["release-notes.md", "delivery-handoff.md"],
  operate: [],
  evolve: [],
};

// §5 check #3 用：哪些 task 必须有 ExecutionReport
// 阶段优先（第二轮复评 P0-1）：避免 createTask() 默认 mode="execute" + 默认 npm-test acceptance
// 把 idea/spec/architecture 等文档阶段的任务也误判为"需要 report"
function taskNeedsReport(task: Task, stage: ProjectStage): boolean {
  if (task.status === "canceled") return false;
  // 阶段优先：只有实现类阶段强制 report
  const implementationStages: ProjectStage[] = ["scaffold", "build"];
  if (implementationStages.includes(stage)) return true;
  // 其他阶段（idea/spec/architecture 等）：仅当 task 明确声明实现性 domain
  // 且带客观 acceptance 时才需 report——避免默认 npm-test acceptance 把文档任务也卡住
  const hasObjectiveAcceptance = task.acceptanceCriteria.some((c) => c.check.kind !== "manual");
  const taskDeclaresImplementation = task.domainIds.some((id) =>
    /frontend|backend|algorithm|data|infra|service|app/.test(id),
  );
  return hasObjectiveAcceptance && taskDeclaresImplementation;
}
```

---

## 6. break-glass 机制

### 6.1 调用方式（仅此入口）

```bash
npm run stage:gate -- <from> <to> \
  --break-glass \
  --operator <name> \
  --reason "<必填，为什么绕过门>" \
  --risk "<必填，承担的风险>"
```

- **没有 `--break-glass` 时**：`stage:gate` 只输出 `AdvanceDecision`，不推进。
- **有 `--break-glass` 但缺 `--operator/--reason/--risk`**：CLI 拒绝，退出码 2。
- **`/advance` 命令默认不暴露 break-glass**：人工维护者必须直接跑 CLI。

**命令语义边界（第二轮复评 P1-3：避免把 `stage:gate` 误做成推进命令）**：

| 命令 | 行为 | 推进？ |
|---|---|---|
| `npm run stage:gate -- <from> <to>` | 只检查，输出 `AdvanceDecision` | ❌ 否 |
| `/advance`（markdown 命令） | 内部调 `stage:gate` 检查；通过后才调 `advanceState()` 推进 | ✅ 是（门通过后） |
| `npm run stage:gate -- <from> <to> --break-glass --operator X --reason Y --risk Z` | 写审计 + 调 `advanceState()` 推进 | ✅ 是（带审计） |

> 命名保留 `stage:gate`（语义"门"），但**只有带 `--break-glass` 或经 `/advance` 才推进**；`stage:gate` 本身默认是只读判定。

### 6.2 审计文件 schema

`.ai-first/logs/break-glass/<compactTs>.yml`（**永久审计记录，不得被 cleanup / state-repair / unlock 自动删除**）：

```yaml
id: breakglass-20260706T084500Z
operator: alice
from: build
to: qa
reason: "prod incident; dev verified manually outside task system"
risk: "acceptance 未自动验证；依赖人工复核"
timestamp: "2026-07-06T08:45:00.000Z"
priorBlockers:
  - "[active-tasks-done] 仍有 1 个 in_progress: task-xxx"
  - "[done-tasks-have-passing-report] task-yyy 无 ExecutionReport"
```

### 6.3 写入时序（强制：审计先于推进）

```
stage-gate-cli --break-glass
   │
   ├─ 0. 输出强提示（第三轮 P2-1）+ 打印 priorBlockers：
   │      "BREAK-GLASS: 将在写审计后绕过 blockers 并推进阶段。"
   │      （让维护者明确知道正在绕过什么，降低误触发）
   ├─ 1. 先调 canAdvance() 收集 priorBlockers
   ├─ 2. 校验 --operator/--reason/--risk 非空
   ├─ 3. writeBreakGlass() → .ai-first/logs/break-glass/<ts>.yml（必须成功；永久审计）
   ├─ 4. timeline 追加指针：[ts] [BREAK_GLASS] <from>→<to> — see logs/break-glass/<ts>.yml
   └─ 5. 才执行 advanceState() 推进（创建下一阶段目录、改 symlink、改 project.yml、写 timeline、rules.lock）
```

> 若 step 3 写失败 → 整个流程 ABORT，不推进。审计是推进的**前置条件**，不是事后补录。
> step 0 的强提示 + priorBlockers 打印是为了降低维护者误触发风险（第三轮复评 P2-1）。

### 6.4 审计读回

```ts
// src/core/state/break-glass.ts
export function readAllBreakGlass(projectRoot: string): BreakGlassRecord[]
```

供 `/health` 或 reviewer-agent 调用，让"历史上每一次绕过"都可被检索。

---

## 7. Task.mode 迁移

### 7.1 类型收紧

`models.ts`：

```diff
- mode: "generate" | "reuse" | "skip" | "execute";
+ mode: "generate" | "reuse" | "execute";
```

### 7.2 读时容错（不强制迁移现有 yml）

`io/project-reader.ts:normalizeTask()`（**纯读，不写 timeline**——保持 §2.1 core/io 边界，评审 P2-2）：

```ts
type NormalizedMode = { mode: Task["mode"]; warning?: string };

function normalizeTaskMode(raw: unknown): NormalizedMode {
  if (raw === "generate" || raw === "reuse" || raw === "execute") return { mode: raw };
  // 兼容旧 yml：skip 已废弃，降级为 execute（不 honored skip 语义）
  if (raw === "skip") {
    return { mode: "execute", warning: `task mode "skip" 已废弃，降级为 execute；阶段推进须过 stage:gate` };
  }
  return { mode: "execute" };
}
```

> **reader 纯读，不在 normalize 时写 timeline**（保持 §2.1 core/io 边界）。
> - `warning` 由调用方（CLI 层 / health 命令）统一输出，reader 不产生副作用。
> - 如需批量审计历史 yml 里的 `mode: skip`，提供独立 `npm run doctor` 命令扫描并报告。
> - **不自动重写现有 `.ai-first/tasks/*.yml`**：避免改动用户文件；旧 yml 自然消亡。

### 7.3 写入端拒绝

`task-cli.ts`（**当前无 `--mode` 参数**，`createTask()` 固定 `mode: execute`；本项是预防性设计，评审 P2-1）：

- 若未来新增 `--mode` 参数 → 必须拒绝 `skip`：

```ts
if (modeArg === "skip") {
  process.stderr.write("错误：mode 'skip' 已废弃。阶段推进必须通过 stage:gate。\n");
  process.exit(2);
}
```

- 若不新增 `--mode` → 无需改 task-cli.ts。重点是 `models.ts` 类型收紧 + reader 不信任 task yml 的 mode 字段（§7.2）+ `/advance` 不读 mode（§8.2）。

### 7.4 advance.md 不再读 mode 决定是否跳检查

见 §8.3。

---

## 8. .claude/CLAUDE.md / AGENTS.md / advance.md 文案重写

### 8.1 `.claude/CLAUDE.md` / `AGENTS.md` 人设段

**删除**（两份文件同步）：

```diff
- You are the AI-first orchestrator — a meta-agent that guides software projects
- through a structured 10-stage lifecycle. You do NOT write code, review code,
- design architecture, or make technical decisions. You COORDINATE the agents
- that do those things.
```

**替换为**：

```markdown
You are the AI-first orchestrator. You guide software projects through a
structured 10-stage lifecycle, AND you are an active executor within the
current stage.

**Two independent duties:**

1. **Within the current stage, you execute directly.**
   - In `build`, you write code, run tests, fix bugs.
   - In `qa`, you run reviews and gates.
   - In `architecture`, you design.
   - Codex / Claude is expected to code freely here — do NOT refuse on the
     grounds of "I'm just a coordinator".

2. **Between stages, you enforce objective gates.**
   - Stage advancement (`/advance`, auto-advance) MUST call
     `npm run stage:gate -- <from> <to>` first.
   - If `allowed=false`, ABORT and report blockers. Do NOT let the user or
     yourself declare "I'm done, let's move on" without the gate passing.
   - There is no `skip` mode. The only bypass is human-typed
     `--break-glass` with mandatory audit.
```

`AGENTS.md` 同步：移除 `/advance | Force stage advance (bypasses exit checklist)`（行 269），改为：

```markdown
| `/advance` | Advance to the next stage — REQUIRES `npm run stage:gate` to pass first |
```

### 8.2 `.claude/commands/advance.md` 重写要点

- **Step 0**：保留 `mode: generate | reuse | execute`，**物理删除 `case "$MODE"` 里的 `skip)` 分支**（行 38-50 + §2.4 的 `if mode is skip`，强化 A）。
- **Step 2 开头**新增强制门调用：

  ```bash
  echo "=== Stage Gate (objective) ==="
  if ! npm run stage:gate -- "$CURRENT_STAGE" "$NEXT_STAGE"; then
    echo "Stage gate BLOCKED — 修复 blockers 后重试。"
    echo "如需异常恢复（维护者），手动跑：npm run stage:gate -- $CURRENT_STAGE $NEXT_STAGE --break-glass ..."
    exit 1
  fi
  ```

- 原有 §2.1–2.5 散文 checklist **保留作为人类可读补充**，但客观判定以 `stage:gate` 退出码为准。

### 8.3 文案一致性自检

落地后分两类自检（生产路径必须空；废弃说明允许命中，评审 P2-3）：

**A. 生产路径检查（必须为空）**：

```bash
grep -rn "do NOT write code\|COORDINATE the agents\|bypasses exit checklist" .claude AGENTS.md
grep -rnE "case .*skip\)|If mode is skip|Stage skipped" .claude/commands/advance.md
grep -rn '"skip"' src/core/models.ts   # Task.mode 类型不再含 "skip"
```

**B. 文档/错误提示检查（允许命中，作为废弃说明）**：

```bash
grep -rn "mode 'skip' 已废弃\|skip.*deprecated\|已废弃" src/core/ .claude/
# 允许非空：reader 的 warning + CLI 错误提示应保留"已废弃"措辞
```

---

## 9. 实现顺序与依赖

每步都有独立验证，可分提交。

| # | 工程任务 | 产出文件 | 验收 | 依赖 |
|---|---|---|---|---|
| 1 | 数据模型 + Task.mode 收紧 | `models.ts`、`io/project-reader.ts`、`task-cli.ts` | typecheck；旧 yml `mode:skip` 读时返回 `{mode:"execute", warning}` | — |
| 2 | `canAdvance()` 纯函数 + 5 检查（阶段感知） | `stage/stage-gate-core.ts`（含 `STAGE_EXIT_REQUIREMENTS` + `taskNeedsReport`） | 单元测试全过（含边界表 §5.3） | 1 |
| 3 | break-glass 读写 | `state/break-glass.ts` | 写 → 读回 round-trip；缺字段拒绝；写入 `.ai-first/logs/break-glass/` | 1 |
| 4 | `advanceState()` 共享推进函数 | `state/state-updater.ts` | 创建下一阶段目录、改 symlink、改 project.yml、写 timeline、rules.lock 一体化 | 1 |
| 5 | `stage:gate` CLI + npm script | `stage/stage-gate-cli.ts`、`package.json` | `npm run stage:gate -- build qa` 在干净 fixture 返回 allowed=true；脏 fixture 非零退出；`--break-glass` 调 advanceState | 2,3,4 |
| 6 | `/advance` 重写 + skip 物理移除 | `.claude/commands/advance.md` | §8.3A grep 为空；step 2 强制调 stage:gate；allowed 时调 advanceState | 5 |
| 7 | 人设文案收敛 | `.claude/CLAUDE.md`、`AGENTS.md` | §8.3A grep 自检通过 | 6 |
| 8 | 端到端 dry-run 验证 | `scripts/pilot-walkthrough.sh` 增补 | fixture 上 `build→qa` 在 in_progress task 时被卡；break-glass 写审计后可推进 | 5,6 |

> 每步验证独立可跑；步骤 5-8 是"接线"，前 4 步是"门本身 + 推进函数"。即使不接线，门本身也已是可用的 npm 命令。

> **产物名校准（第二轮 P1-2 → 第三轮 P1-2 定死）**：v0.1 第一版 `STAGE_EXIT_REQUIREMENTS.scaffold = ["architecture.md"]`，复用上游 architecture 产物（scaffold 紧随 architecture 之后，是其落地实现）。**不引入** `scaffold-plan.md`——若后续 scaffold 阶段需要专属产物规范，作为独立 ADR 补充。当前仓库 `architecture.md` 已存在，首次 `stage:gate architecture scaffold` 可直接跑通。

---

## 10. 测试与验证策略

### 10.1 `stage-gate.test.ts` 用例（fixture 驱动）

| 用例 | 期望 `allowed` | 期望 blockers 关键词 |
|---|---|---|
| build→qa，所有 task done + report done + artifact 齐 + 无 pending sync | true | (无) |
| build→qa，1 个 task `in_progress` | false | "in_progress" |
| build→qa，1 个 task `review_pending` | false | "review_pending" |
| build→qa，done task 无 ExecutionReport | false | "无 ExecutionReport" |
| build→qa，done task 最新 report 是 `review_pending` | false | "acceptance 未过" |
| build→release（跨级） | false | "必须相邻" |
| qa→build（非法回跳） | false | "非法回跳" |
| evolve→discovery（闭环） | true | (无) |
| build→qa，1 个 task `canceled`，其余 done + report done | true | (无) |
| build→qa，存在 pending SyncEvent | false | "pending SyncEvent" |
| **idea→discovery**，task 是 `mode=execute` + 默认 `npm-test` acceptance（无 report），已有 `goals.md` | **true** | (无) — 第二轮复评 P0-1 关键用例：文档阶段不能被默认 execute+npm-test 误阻塞 |
| idea→discovery，task 声明 `domainIds=[domain-frontend]` + 非手动 acceptance，但无 report | false | 仅当 task 真声明实现性 domain 且带客观 acceptance 才需 report |
| **qa→release**，`.ai-first/reviews/` 为空或含 failed review | false | "QA 阶段需 review 证据"（第二轮复评 P2-3） |
| qa→release，存在非 failed 的 review + release-notes.md + delivery-handoff.md | true | (无) |
| evolve→discovery，无 task / 无 report | true | (无) — 第二轮复评 P0-2：闭环必须真正放行 |

### 10.2 `break-glass.test.ts` 用例

| 用例 | 期望 |
|---|---|
| `--break-glass --operator X --reason Y --risk Z` | 写入 `.ai-first/logs/break-glass/*.yml`，含 priorBlockers |
| 缺 `--reason` | CLI 退出 2，不写文件 |
| 写审计成功 → transition 调用 | 时序：先写审计文件，后调 advanceState |
| 审计文件永久性 | 模拟 cleanup/state-repair 运行，break-glass 文件不被删除 |
| `readAllBreakGlass()` | 返回所有历史记录，按 timestamp 倒序 |

### 10.3 迁移用例

| 用例 | 期望 |
|---|---|
| 读 `mode: skip` 的旧 task yml | `normalizeTask` 返回 `{ mode: "execute", warning: "..." }`；reader 不写 timeline，warning 由 CLI/health 输出 |
| `task-cli create --mode skip` | CLI 退出 2，错误提示 |

### 10.4 端到端（pilot）

在 `fixtures/projects/sample-greenfield` 上：
- 加一个 `in_progress` task → `npm run stage:gate -- build qa` 必须非零退出。
- 把该 task 改 `done` + 造一份 `status=done` 的 ExecutionReport → 必须 allowed=true。

---

## 11. 风险与回滚

| 风险 | 对策 | 回滚 |
|---|---|---|
| `Task.mode` 移除 `skip` 是 breaking change | 读时容错（§7.2，返回 warning 不写 timeline）+ 类型收紧；不重写现有文件 | revert `models.ts` 一行 + reader warning 段 |
| .claude/CLAUDE.md / AGENTS.md 文案变更影响用户既有项目 | 不改 10 阶段生命周期；只重写"do NOT write code"段 + /advance 描述 | revert 两份 markdown |
| break-glass 被滥用为日常通道 | CLI 强制 operator/reason/risk；`/advance` 不暴露此 flag；审计写 `.ai-first/logs/break-glass/`（永久，不被 cleanup 删）；`/health` 检索 | 改为人工审批闸（后续迭代） |
| `canAdvance` 误判（如对规划阶段强制 report） | check #3 阶段优先（§5.2 `taskNeedsReport`）：build/scaffold 强制；其他阶段需实现性 domain + 客观 acceptance 才强制 | 调整 `taskNeedsReport()` 单点 |
| 多处写状态（advance.md / cli / state-updater）分裂为三套逻辑 | 抽 `advanceState()` 共享副作用（§4.1 + ADR-009），所有推进入口唯一调用 | 已在 §4.2 强制 |
| break-glass 审计被误清理（与 locks/ 混淆） | 路径独立到 `.ai-first/logs/break-glass/`，方案显式声明永久、不得自动删除（ADR-007） | — |
| `/advance` 接线后，老用户 markdown checklist 失效 | 保留 §2.1–2.5 散文作为人类可读补充，客观判定以 CLI 为准 | — |

---

## 12. ADR

**ADR-005：阶段门只卡推进，不卡编码（两轴原则）**
- 决议：`canAdvance()` 只被 `stage-gate-cli.ts` 调用；`task:exec` / 编辑 / 测试永远不读阶段门。
- 理由：业务目标要求"Codex 编程不被影响"，门只能落在阶段切换上。

**ADR-006：`Task.mode` 移除 `skip`，读时容错（不强制迁移）**
- 决议：枚举收紧为 `generate | reuse | execute`；旧 yml 读时降级为 `execute` 并返回 `warning`，不重写文件。
- 理由：`Task.mode` 类型允许 `"skip"` 且 `/advance` 从最近 task YAML 读取并信任 `mode:` 字段；task YAML 可被 Codex/Claude 或人工直接编辑，因此 `mode: skip` 是可达旁路（评审强化 B / P0-2）。必须堵，但不重写用户文件避免破坏。

**ADR-007：break-glass 必须前置审计（不为普通流程提供）**
- 决议：break-glass 是 CLI-only flag，强制 operator/reason/risk + priorBlockers 写入 `.ai-first/logs/break-glass/<ts>.yml`（**永久审计，不得自动清理**），且**先于** advanceState。
- 理由：保留维护者异常恢复能力，但每次绕过都可审计、可检索（评审强化 C / P0-1）。审计放 `logs/break-glass/` 而非 `locks/`——`locks/` 是运行时临时约束（rules.lock 等），break-glass 是永久证据，混在一起会被 cleanup 误删。

**ADR-008：客观证据优先于 agent 自述（阶段优先）**
- 决议：build/scaffold 阶段的 done task 必须有最新 `ExecutionReport.status === "done"`；其他阶段（idea/spec/architecture 等）仅在 task 声明实现性 domain 且带客观 acceptance 时强制 report，否则由退出门禁 artifact 兜底（不再以 `mode=execute` 为单独硬条件，第三轮复评 P1-1）。
- 理由：Codex 可写 task yml；只有 acceptance runner 产出的 report 是工具侧客观的。但文档阶段确实不存在编码 acceptance，强制 report 会误伤（评审 P0-3）；且 `createTask()` 默认 `mode=execute` + 默认 `npm-test` acceptance，若按 mode 判定会让文档阶段任务也被误判（第二轮复评 P0-1）。

**ADR-009：状态推进副作用唯一入口（`advanceState()`）**
- 决议：所有阶段推进入口（`/advance`、break-glass、未来的 state-updater-agent）都调 `advanceState(projectRoot, from, to, options)`；该函数是创建下一阶段目录、改 `state/current` symlink、改 `project.yml.currentStage`、写 timeline、处理 `rules.lock` 的唯一副作用点。`canAdvance()` 仍是纯函数。
- 理由：避免 advance.md / stage-gate-cli / state-updater 三处各写一套状态逻辑造成分裂（评审 P1-1）。

**ADR-010：`project-reader` 保持纯读，normalize 不产生副作用**
- 决议：`normalizeTaskMode()` 返回 `{ mode, warning? }`，不写 timeline、不输出 CLI 消息；warning 由调用方处理。
- 理由：保持 §2.1 core/io 边界——reader 只读本地文件、转为结构化对象、不产生副作用（评审 P2-2）。

**ADR-011：退出门禁与阶段识别规则分离（`STAGE_EXIT_REQUIREMENTS`）**
- 决议：不复用 `StageRule.requiredArtifacts`（多为空、语义是阶段识别）；新增独立 `STAGE_EXIT_REQUIREMENTS: Record<ProjectStage, string[]>` 作为退出门禁。
- 理由：阶段识别规则（用于 assessStage）与退出门禁规则（用于 canAdvance）职责不同，混用会过松或语义混乱（评审 P0-4）。

---

## 13. P0 约束覆盖矩阵（闭环证明）

逐条映射评审文档 §6.2 的 P0 项到本方案落点，证明闭环。

| 评审 §6.2 P0 项 | 强化点 | 本方案落点 | 验收 |
|---|---|---|---|
| 1. `/advance` 必须强制调 `stage:gate` | — | §4.2 接线图 + §8.2 advance.md step 2 | grep advance.md 含 `npm run stage:gate` |
| 2. 普通研发流程禁 skip | 强化 A（case 物理移除） | §8.2 + §7 | §8.3A grep：advance.md 无 `case .*skip)` / `If mode is skip` |
| 2. 普通研发流程禁 skip | 强化 B（Task.mode 可达性：YAML 可编辑 + /advance 信任） | §7.1 类型收紧 + §7.2 读时容错（返回 warning，不写 timeline） + §8.2 /advance 不读 mode | `models.ts` 无 `"skip"`；reader 返回 warning；advance.md 不含 mode 分支 |
| 3. break-glass 机制 | 强化 C（审计落点单独可索引，永久） | §6 全节（CLI flag + schema + 时序 + 读回） | `.ai-first/logs/break-glass/*.yml` 存在且含 priorBlockers；不被 cleanup 删 |
| 4. AGENTS/CLAUDE 文案收敛 | — | §8.1 + §8.3A grep 自检 | §8.3A 三条 grep 为空 |
| 5. 阶段门只卡推进，不卡编码 | — | §0 设计哲学 + §4.3 编码路径不调门 + ADR-005 | `task-exec-cli.ts` 不 import stage-gate |
| —（评审 P0-3） | done-task report 强制规则按阶段限定 | §5.2 check #3 阶段优先（`taskNeedsReport`） + §5.3 边界表 + ADR-008 | 文档阶段不强制；build/scaffold 强制；其他阶段需实现性 domain + 客观 acceptance |
| —（评审 P0-4） | requiredArtifacts 来源独立 | §5.4 `STAGE_EXIT_REQUIREMENTS` + §5.2 check #4 + ADR-011 | 不复用 `StageRule.requiredArtifacts` |
| —（评审 P1-1） | 状态推进副作用唯一入口 | §4.1 `advanceState()` + §4.2 接线 + ADR-009 | 所有推进入口都调 advanceState()；无第二处写 symlink/project.yml |
| —（评审 P2-2） | reader 纯读，normalize 不写副作用 | §7.2 返回 `{mode, warning}` + ADR-010 | reader 不写 timeline；warning 由 CLI 输出 |

**闭环判定**：本方案 §1.3 的 4 条成功判据，每条都有上表的覆盖映射 + §10 的测试用例 + §11 的回滚预案。无开放设计决策遗留。

---

## 14. 评审采纳记录（v1.1）

本节记录对 `docs/AI-first-阶段门与编码自由-技术方案-评审意见.md` 的采纳决策，每条标注落点，便于审计回溯。

### 14.1 全部采纳（9/9）

| 评审项 | 价值 | 采纳 | 落点 |
|---|---|---|---|
| **P0-1** break-glass 审计放 `locks/` 与运行时锁混淆 | 高 | ✅ | 改到 `.ai-first/logs/break-glass/<ts>.yml`，声明永久审计；§1.3 / §3 / §6.2 / §6.3 / §10.2 / ADR-007 / §13 同步更新 |
| **P0-2** "创建任务即写" 表述不准 | 高 | ✅ | §0.1 表 + ADR-006 改为"task YAML 可编辑 + /advance 信任 mode 字段"；§13 强化 B 行同步 |
| **P0-3** check #3 对规划阶段误伤 | 高 | ✅ | §5.2 check #3 阶段感知 + §5.4 `taskNeedsReport()` + §5.3 边界表加 idea 行 + ADR-008 |
| **P0-4** requiredArtifacts 来源是识别规则不是门禁 | 高 | ✅ | §5.2 check #4 + §5.4 `STAGE_EXIT_REQUIREMENTS` 常量 + ADR-011 |
| **P1-1** 三处写状态会分裂 | 高 | ✅ | §4.1 `state-updater.ts` + §4.2 接线 + §9 step 4 + ADR-009 |
| **P2-1** task-cli 当前无 `--mode` 参数 | 中 | ✅ | §7.3 改为预防性表述："若新增 --mode 则拒绝 skip" |
| **P2-2** normalizeTask 写 timeline 破坏 reader 边界 | 高 | ✅ | §7.2 改为返回 `{mode, warning}` + §10.3 + ADR-010 |
| **P2-3** grep 自检应区分生产路径与废弃说明 | 中 | ✅ | §8.3 拆成 A（生产路径，必须空）/ B（废弃说明，允许命中） |
| **P2-4** build 无 task 时 artifact 须具体 | 中 | ✅ | §5.3 边界表限定为 `implementation-summary.md` 或等价执行报告 |

### 14.2 未采纳

无。评审 9 条建议全部采纳。

### 14.3 新增 ADR

- **ADR-009** 状态推进副作用唯一入口（`advanceState()`）—— 对应 P1-1
- **ADR-010** `project-reader` 保持纯读 —— 对应 P2-2
- **ADR-011** 退出门禁与阶段识别规则分离 —— 对应 P0-4

### 14.4 修订后闭环再判定

- §1.3 成功判据：4 条，全部有覆盖映射（§13）。
- §13 覆盖矩阵：从 6 行扩到 10 行（原 5 条 P0 + 评审 P0-3/P0-4/P1-1/P2-2 共 4 条新增）。
- ADR：从 4 条（005–008）扩到 7 条（005–011）。
- §10 测试：新增"审计文件永久性"用例、"文档阶段不强制 report"用例。
- §11 风险：新增"多处写状态分裂"、"break-glass 审计被误清理"两条，附对策。

**结论**：采纳全部评审意见后，方案在保持原方向（两轴原则 + 客观门 + break-glass）的前提下，补齐了 5 处实现细节（审计位置 / 可达性表述 / 阶段感知 / 门禁来源 / 状态推进职责）+ 4 处工程优化（task-cli / reader 纯读 / grep 拆分 / artifact 限定）。可进入实现。

### 14.5 第二轮复评采纳记录（v1.2）

对应 `*-评审意见.md` §6 第二轮复评。8 条建议全部采纳。

| 复评项 | 价值 | 采纳 | 落点 |
|---|---|---|---|
| **R2-P0-1** `taskNeedsReport()` 伪代码矛盾（默认 execute+npm-test 误伤文档阶段） | 高 | ✅ | §5.4 改为**阶段优先**逻辑：仅 scaffold/build 或"声明实现性 domain + 客观 acceptance"才需 report；§10.1 加 idea→discovery 关键正向用例 |
| **R2-P0-2** `evolve→discovery` 闭环是 `return` 后死注释 | 高 | ✅ | §5.4 `isLegalTransition()` 把特判提到首行 `if (from==="evolve" && to==="discovery") return true`，不再依赖注释 |
| **R2-P1-1** active task 检查需限定本阶段 | 高 | ✅ | §5.2 check #2 明确 `currentStageTasks = tasks.filter(t => t.stage===from)`；legacy task normalize 提示 |
| **R2-P1-2** `STAGE_EXIT_REQUIREMENTS` 产物名与现状不符（scaffold-plan.md 缺失） | 高 | ✅ | §5.4 常量按 `.ai-first/artifacts/` 实际清单校准 + 标注 scaffold-plan.md 缺失；§9 加产物校准告警；release 增 `delivery-handoff.md` |
| **R2-P1-3** `stage:gate` vs break-glass CLI 语义不清 | 中 | ✅ | §6.1 新增命令语义边界表（只检查 / 推进 / 带审计推进 三态） |
| **R2-P2-1** `.claude/CLAUDE.md` 路径全文统一 | 低 | ✅ | 全文 `` `CLAUDE.md` `` → `` `.claude/CLAUDE.md` `` |
| **R2-P2-2** "按短路顺序" 与伪代码行为不一致 | 低 | ✅ | §5.2 标题改"全部执行并汇总 blockers，非短路"，明示用户一次看到全部问题 |
| **R2-P2-3** QA 阶段退出门禁仅靠 ExecutionReport 太弱 | 中 | ✅ | §5.2 check #4 加 QA 子项：`.ai-first/reviews/` 非空 + 无 failed review；§10.1 加 qa→release 用例 |

### 14.6 第二轮闭环再判定

- **R2-P0-1 / R2-P0-2 是逻辑 bug，已修**：修完后 §10.1 的 `idea→discovery` 与 `evolve→discovery` 两个正向用例才会真正 pass（修前必失败）。
- §5.2 五项检查：check #2 加阶段筛选、check #4 加 QA 子项；标题去掉"短路"误述。
- §5.4 三个核心函数（`isLegalTransition` / `STAGE_EXIT_REQUIREMENTS` / `taskNeedsReport`）全部修正并加注释说明原因。
- §9 加产物校准告警，避免 scaffold 首次推进被误阻塞。
- §10.1 新增 4 条用例（idea→discovery 正向 / idea 实现性 task 反向 / qa→release 双向 / evolve→discovery 正向）。

**v1.2 结论**：第二轮 5 项必修（P0×2 + P1×3）+ 3 项优化（P2×3）全部落地。方案现已无已知逻辑矛盾，可进入实现。

### 14.7 第三轮复评采纳记录（v1.3）

对应 `*-评审意见.md` §7 第三轮复评。5 条建议全部采纳，无新增 P0。

| 复评项 | 价值 | 采纳 | 落点 |
|---|---|---|---|
| **R3-P1-1** `taskNeedsReport()` 文字描述与伪代码不一致（仍写"execute-mode 强制"） | 中 | ✅ | §5.2 check #3 注释 + §5.3 边界表 + §11 风险表 + ADR-008 + §13 矩阵 全部统一为"build/scaffold 强制；其他阶段需实现性 domain + 客观 acceptance" |
| **R3-P1-2** `scaffold-plan.md` 仍是开放决策 | 中 | ✅ | §5.4 定死：v0.1 复用 `architecture.md` 作为 scaffold 退出证据，不引入新产物；§9 告警改为定死说明 |
| **R3-P1-3** QA review 证据读取规则未定 | 中 | ✅ | §5.2 check #4 定死：`.ai-first/reviews/*.md` 至少一份 + 全文不含 `Verdict.*FAILED` / `status: failed`；未来 frontmatter 统一再升级 |
| **R3-P2-1** `--break-glass` 缺误操作防护 | 低 | ✅ | §6.3 时序加 step 0：启动即输出"BREAK-GLASS"强提示 + 打印 priorBlockers |
| **R3-P2-2** "可进入实现"结论应放正文结尾 | 低 | ✅ | 新增 §15 实施准入结论 |

**v1.3 结论**：第三轮无新增 P0，3 项 P1（文字一致性 / 产物决策 / QA 规则）+ 2 项 P2 全部落地。方案不再有开放决策分支，可进入实现。

---

## 15. 实施准入结论（v1.3）

> **本方案已可进入代码实现。**

- **P0 全部闭环**（三轮评审共 4 条 P0：break-glass 审计位置 / Task.mode 可达性 / ExecutionReport 阶段感知 / requiredArtifacts 来源；外加第二轮 2 条逻辑 bug：taskNeedsReport 阶段优先 + evolve→discovery 真正放行）。
- **P1 全部闭环**（共 7 条：状态推进唯一入口 / reader 纯读 / 当前阶段任务筛选 / scaffold 产物决策 / QA review 规则 / 命令语义边界 / 文字一致性）。
- **剩余 P2 全部采纳**（共 6 条优化，无架构影响）。
- **无开放决策分支**：scaffold 产物已定死复用 `architecture.md`；QA review 规则已定死宽松读取；CLI 三态语义已表化。
- **业务目标达成路径成立**（§7.4 已论证）：`build→qa` 必须走 `/advance` → 必须过 `stage:gate` → active task / report / artifact / sync / QA review 全部客观检查 → `mode: skip` 已堵 → "开发没做完就提测"被客观阻断；同时 `task:exec` / 编辑 / 测试不经过门，Codex 编码自由不受影响。

**实施顺序**：按 §9 的 8 步（数据模型 → canAdvance → break-glass → advanceState → CLI → /advance → 人设 → pilot）分提交推进，每步独立验证。

**后续无需继续方案层评审**（第三轮结论）：处理完上述三点后即可进入代码实现与测试验证。

---

## 附录 — 与上游方案的衔接

- **`docs/AI-first-技术实现方案.md`**：本方案是其增量。复用 §2.1 三层架构、§3.2 `ExecutionReport`、§4.3 `collectExecutionReport` 产出的客观证据、§4.3.3 scope 违规分级。不重复定义。
- **`docs/AI-first-v0.1落地评审-代码盘点与工具影响.md`**：本方案是其 §6.2 P0 约束的实现设计。每条 P0 在本方案 §13 有覆盖映射。
- **后续**：本方案落地后，评审文档 §4 的 #3（删 Tier 4 孤岛）/ #4（收紧 hook）/ #5（dashboard）作为独立体验优化处理，不依赖本方案。
