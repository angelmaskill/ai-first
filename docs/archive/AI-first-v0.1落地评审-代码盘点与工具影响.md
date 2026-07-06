# AI-first v0.1 落地评审意见 — 代码盘点与工具影响

> 评审日期：2026-07-06
> 评审对象：技术方案 `docs/archive/AI-first-技术实现方案.md` 落地后的全量代码
> 评审视角：现有代码的作用是什么？是否必要保留？会不会妨碍 Codex / Claude Code 编程？
> 评审方法：grep 实证调用链 + 行数盘点 + hook/settings 核查 + 对照方案 §10.1 / §11
> 评审结论：**TS 控制面完全无害；真正妨碍编程的是 Claude 原生编排层（CLAUDE.md / AGENTS.md 人设）和两个 hook；另一个必须修复的问题是 `/advance` 的 `skip` / bypass 旁路会破坏阶段门。**

---

## 0. 评审背景

技术方案 §1–§11 已全量落地（commit `50755c8`，384 tests green）。但"落地完成"不等于"代码都有保留价值、都不妨碍工具"。本次评审跳出"实现是否对齐方案"的视角，转而回答三个工程问题：

1. 仓库里现在每段代码的作用是什么？
2. 它们是必要保留的吗？
3. 它们会影响 Codex / Claude Code 这类编程工具发挥作用吗？

---

## 1. 代码作用盘点（按必要性分级）

### Tier 1 — 确定性控制面（核心，必须保留）

纯函数 + CLI，不主动运行，只在 `npm run` 时触发。对照方案 §1–§11 全部交付。

| 模块 | 行数 | 作用 | 方案对照 |
|---|---|---|---|
| `io/yaml.ts` | 485 | 零依赖 YAML 子集（round-trip） | §6.1 / P1-2 |
| `io/project-reader.ts` | 317 | 统一读 tasks/reports/standards/knowledge/contracts | §6.1 |
| `io/allowed-commands.ts` | 136 | 安全命令登记表 | §4.3.1 P0-2 |
| `io/frontmatter.ts` | 49 | MD frontmatter 解析 | §3.4 C1 |
| `stage/stage-rules.ts` + `stage-core.ts` | 529 | 规则化阶段判定（无 LLM） | §5.1 D0/D2 |
| `task/scope-core.ts` + `task-core.ts` + `context-bundle-core.ts` | 526 | scope 推断 + 任务创建 + 上下文包 | §5.3 E1/E2 |
| `task/task-cli.ts` + `task-exec-cli.ts` | 467 | task:create / task:exec 入口 | §5.3 / §4.5 |
| `exec/git-collector.ts` | 137 | baseline + changeSet（含 tainted 归因） | §4.3.2 |
| `exec/acceptance-runner.ts` | 146 | 唯一命令执行副作用层（allowlist） | §4.3.1 |
| `exec/report-collector-core.ts` | 295 | 客观产出收集 + 三态决策 | §4.3 F0 |
| `guide/guide-core.ts` + `guide-cli.ts` | 267 | 导航输出 | §5.2 D3/K |
| `standards/standards-core.ts` | 169 | 规范命中 | §5.4 C8 |
| `contracts/contracts-core.ts` | 41 | 跨域契约影响 | §5.6 B3 |
| `sync/sync-core.ts` + `sync-cli.ts` | 202 | doc-rot 同步建议 | §5.7 I |
| `scanners/repo-domain-detector.ts` + `domain-enricher.ts` | 480 | domain 识别 + techStack 探测 | §5.6 B1/B2 |
| `tools/codex-adapter.ts` | 316 | `executePrompt()` → PromptRunResult | §4.6 |
| `cli/index.ts` | 106 | 统一 `ai-first` 入口 | §7 M1 |
| `models.ts` | 593 | 类型定义 | §3 |

**小计 ≈ 5100 行生产代码，全部有测试覆盖。**

### Tier 2 — Claude 原生编排层（产品本身，保留但要看清代价）

`.claude/CLAUDE.md` + `AGENTS.md` + 15 agents + 14 commands + 7 skills。
**这是用户买的产品形态**，但它在运行时会主动改造工具行为（详见 §3）。

### Tier 3 — 可选 / 展示（不进 v0.1 主链路）

| 模块 | 体量 | 评估 |
|---|---|---|
| `src/frontend/` dashboard | **3621 行 / 30 文件** | K3 展示示例。核心 TS 不依赖它（grep 实证：`src/core/` 无任何 `frontend-data` 引用） |
| `scripts/generate-frontend-data.ts` | — | 只为喂 dashboard |
| PostToolUse hook 调用 `npm run data:sync` | — | 只为喂 dashboard |

### Tier 4 — 真孤岛（无生产消费者，建议删除）

grep 实证：以下 4 个模块**零生产引用**（已在文件头标注 `EXPERIMENTAL/UNWIRED`）：

```
$ grep -rn "from.*harness/executor|from.*harness/routing-resolver|from.*agents/smoke-case-generator|from.*agents/registry-loader" src/ --include="*.ts" | grep -v "\.test\." | grep -v "自身"
(空 = 无生产引用)
```

| 模块 | 行数 |
|---|---|
| `harness/executor.ts` | 256 |
| `harness/routing-resolver.ts` | 338 |
| `agents/smoke-case-generator.ts` | 428 |
| `agents/registry-loader.ts` | 290 |
| **小计** | **~1312 行 + 对应测试** |

### Tier 5 — 弱通车（保留）

`harness/subagent-dispatcher.ts` (499) + `dispatch-cli.ts` (199)：被 `.claude/commands/task.md` + `complete.md` 间接消费。方案 §11.2 判定为"弱通车"。

---

## 2. 对照技术方案的覆盖

方案 §10.1 的 A–M + Z0–Z4 **全部有落点**。唯一与方案理想态的偏差：

- **§11.3 要求孤岛"先标注 → 复用审查 → 再删"**，目前只做了第一步（标注）。仓库仍带着 1312 行死代码 + 测试，占用维护成本与认知负担。
- §11.4 要求 README 能力分级 — 已做（`README.md` 的 "Implementation status" 表）。
- Z0 dispatch 收编 — 已做（`CLAUDE.md` 加了 "Deterministic TS Core" 节），但**编排器主 persona 未改**（见 §3）。

---

## 3. 对 Codex / Claude Code 的影响（核心评审项）

> **评审修正（2026-07-06）**：本节初版把"编码能力"与"阶段门"混为一谈，给出了"加逃生口禁用编排器"的错误建议。经澄清，需求是两条**独立**的轴：
>
> | 轴 | 要求 | 说明 |
> |---|---|---|
> | **编码能力**（阶段内） | Codex / Claude 自由写代码，**不要拦** | 编排器不该把"拒绝编码"当成控制手段 |
> | **阶段门**（阶段之间） | **不许跳阶段**（开发没做完不能提测） | 控制应落在阶段切换的客观证据上 |
>
> 因此问题不是"禁用编排器"，而是：**编排器人设错把"拒绝编码"当成了控制手段**；真正的控制要落在阶段切换的客观门上。

**总判定（修正后）**：Tier 1（TS 控制面）完全无害，且正好能成为客观阶段门的实现载体。需要改的是两处：(1) `CLAUDE.md`/`AGENTS.md` 人设去掉"拒绝编码"的措辞；(2) 用 TS core 补一道客观的"阶段切换门"。

### 🔴 显著影响（会改变工具行为）

#### 3.1 `CLAUDE.md` + `AGENTS.md` 人设错把"拒绝编码"当成控制

两份文件都明确写：

> "You do NOT write code, review code, design architecture, or make technical decisions. You COORDINATE the agents."

- **错在哪**：这条把"控制项目进度"误实现成了"不让工具写代码"。后果：Codex 读 `AGENTS.md`、Claude 读 `CLAUDE.md`，两者都会在 build 阶段拒绝直接编码，转去 dispatch sub-agents —— 这恰好妨碍了 Codex 编程能力的发挥。
- **要保留的部分**：10 阶段生命周期、exit checklist、"不许跳阶段"。
- **正确措辞**应类似：在当前阶段内你**就是执行者**（build 阶段就写代码、跑测试、修 bug）；但**阶段切换必须过客观门**（acceptance 真过、任务真 done），不许自报"我做完了"就提测。
- **重要边界**（已核查）：TS core **不 gate stage**——`task-exec-cli.ts` 只在 project/task/scope 缺失时 `exit(2)`，不因 `currentStage` 拒绝执行。这是对的：编码动作不该被阶段卡住。

#### 3.2 阶段切换门是"散文"，没有客观卡住

`CLAUDE.md` 的 "Stage Exit Checklist" 是 markdown 散文（"all active tasks done / all gates passed / required artifacts exist"），但：

- 没有代码函数客观判定"build 是否真的可以 advance 到 qa"。
- Codex 完全可以自报"我做完了"，然后 `/advance` 就过了 —— 这正是用户担心的"开发没做完就说要提测"。
- **缺口**：需要一个 `canAdvance(from, to)` 纯函数，消费已有的客观证据（`ExecutionReport.status`、task 状态、artifacts）给出 `allowed + blockers`。

#### 3.3 PostToolUse hook（`.claude/settings.json`）

```
matcher: Write|Edit
命中 .ai-first/ | .claude/{agents,skills,commands}/ | src/{frontend,core}/  → 跑 npm run data:sync
```

- 每次保存加几秒延迟；`data:sync` 失败会干扰编辑流。
- **只为喂 dashboard**，对纯编程无价值。

#### 3.4 Pre-commit hook（`scripts/pre-commit.sh`）

secret 扫描 + typecheck + 全套 test（384）+ frontend build。行业标准、合理，但提交慢。可考虑拆分 `pre-commit`（仅 secret + lint）与 `pre-push`（test + build）。

### 🟢 不影响

- Tier 1 所有模块：不 `npm run` 就不跑。
- `data:sync` 生成的 `src/frontend/data/*`：核心 TS 不读它（grep 实证）。
- `.ai-first/state/current` symlink：TS core 只读不写、编码动作不被它卡。

---

## 4. 建议（修正后，按"对编码能力 + 阶段门"两轴排序）

| # | 建议 | 编码能力轴 | 阶段门轴 | 代价 |
|---|---|---|---|---|
| 1 | **改 `CLAUDE.md`/`AGENTS.md` 人设措辞**：去掉"do NOT write code"，改成"阶段内是执行者，阶段间必须过客观门" | ✅ 解除编码阻挠 | ✅ 保留并明确阶段纪律 | 改两份 markdown |
| 2 | **补 `stage-gate-core.ts` 客观门**：`canAdvance(projectRoot, from, to)` 消费 task 状态 + ExecutionReport + artifacts，返回 `{allowed, blockers}`；`/advance` 调用它，未过则拒绝 | — | ✅ 把散文门变成硬门 | 新增 ~100 行纯函数 + 测试 + 1 个 npm script |
| 3 | **删 Tier 4 孤岛**（1312 行 + 测试） | 减少噪音 | — | 先做复用审查 |
| 4 | **收紧 PostToolUse hook**：`data:sync` 改为 dev-only | ✅ 消除编辑延迟 | — | 需手动同步 dashboard |
| 5 | frontend dashboard 维持现状 | — | — | 已标展示示例，无害 |

---

## 5. 评审结论（修正后）

- **技术方案落地完整**（§1–§11 全部交付，384 tests green）。
- **TS 控制面是"安静的好公民"**——不主动干扰任何工具，且正好能成为客观阶段门的实现载体。
- **真正的设计缺陷在人设措辞 + 阶段门缺位**：
  - `CLAUDE.md`/`AGENTS.md` 把"项目控制"误实现成"拒绝编码"——错伤 Codex 编程能力。
  - 阶段切换是散文门，Codex 自报"做完了"就能过——这恰恰是用户要堵的漏洞。
- **正确路径**：编码能力轴放开（改人设）、阶段门轴收紧（补 `stage-gate-core.ts` 客观门）。两条轴独立处理，互不冲突。
- **Tier 4 孤岛仍是纯负担**，进入 §11.3 的"复用审查 → 删除"流程。

---

## 6. 业务目标符合性复核（2026-07-06）

### 6.1 对业务目标的满足度

对照业务目标：

> 项目中的代码不要影响 Codex 编程能力的发挥；但要把控好研发阶段，不允许开发没做完就推进到提测。

本评审**方向上满足目标，但还不算完全闭环**。

已经满足的部分：

- 正确拆开了两条轴：**阶段内编码自由** 与 **阶段间推进受控**。
- 明确指出 `CLAUDE.md` / `AGENTS.md` 中 "do NOT write code" 会伤害 Codex 编程能力，应改成"阶段内是执行者"。
- 明确指出 TS 控制面不主动运行、不 gate 编码动作，因此不应成为 Codex 发挥的负担。
- 明确提出 `stage-gate-core.ts` / `canAdvance()`，把"开发完成才能提测"从散文要求变成客观门禁。

尚未完全闭环的部分：

- 当前 `.claude/commands/advance.md` 仍存在 `skip` 模式，文档明确写着 "advance without running lead agent or checking artifacts"。这与"不允许跳过开发阶段推进"直接冲突。
- `AGENTS.md` 仍把 `/advance` 描述为 "Force stage advance (bypasses exit checklist)"。如果保留这个语义，`stage-gate-core.ts` 即使实现，也可能被绕开。
- 本评审把"补阶段门"列为建议，但没有把"禁用/收紧 skip 和 force advance"提升为 P0 必改项。

因此结论应调整为：

> 本评审已经识别了正确方向，但要真正满足业务目标，必须把所有阶段推进入口都收敛到客观阶段门，不能保留普通研发路径下的 skip / bypass 语义。

### 6.2 必须补强的 P0 约束

建议把以下约束加入后续落地任务：

1. **`/advance` 必须强制调用 `stage:gate`**  
   未通过 `canAdvance()` 时直接拒绝推进，并输出 blockers。不得依赖 agent 自述、人工口头确认或 markdown checklist。

2. **普通研发流程禁止 `skip` 推进**  
   `skip` 不能用于 `build → qa`、`qa → release` 等执行阶段推进。开发未完成、验收未通过、任务仍在 `in_progress/review_pending/blocked` 时，必须停在当前阶段。

   **⚠ 强化 A（落地必须触达根，不能只改文案）**：`advance.md` 自相矛盾——
   - 行 51 / 107 / 210 **定义并执行** `skip` 模式（"Skip this check entirely"）
   - 行 227 / 233 "Safety Rules" 又写 "Run every checklist item — do not skip any" / YOU MUST NOT skip

   两条互相打架。落地时必须从 step 0 的 `case "$MODE"` 语句（行 36–50）和 §2.4 的 `if mode is skip` 分支里**物理移除 skip**，不能只改安全规则文案——否则 case 仍会命中。

   **⚠ 强化 B（风险定级 P0，不是 P1）**：`mode` 是 **Codex/Claude 可达**的，不是只有人能触发。`advance.md` step 0 从"最近一个 task 的 `mode:` 字段"读 mode，而 `models.ts` 里 `Task.mode` 类型是 `"generate" | "reuse" | "skip" | "execute"`。当前 `task:create` 的 TS CLI 默认写 `mode: execute`，但 task YAML 本身可被 Codex/Claude 或人工直接编辑；只要出现 `mode: skip`，`/advance` 就会信任它并跳过 artifact 检查。→ 除改 `advance.md` 外，`models.ts` 的 `Task.mode` 枚举也要一并处理（删 `skip`，或限定只允许 `idea/discovery` 这类语义阶段使用）。

3. **如保留 bypass，必须改成 break-glass 机制**  
   仅允许维护者在异常恢复场景使用，并且必须显式记录原因、操作者、时间、from/to、风险说明。它不能作为普通 `/advance` 的默认能力。

   **⚠ 强化 C（审计落点必须单独可索引）**：break-glass 记录**不要只追加到 `logs/timeline.md`**——timeline 是追加流，事后无法快速检索"谁在什么时候跳过了一次 build→qa"。建议强制写入 `.ai-first/logs/break-glass/<ts>.yml` 或 `.ai-first/reports/break-glass/<ts>.yml`（字段：`operator / from / to / reason / risk / timestamp`），timeline 里只追加一条指针。若项目坚持放在 `.ai-first/locks/break-glass-<ts>.yml`，也必须明确这类文件是审计记录，不能被自动清理。

4. **AGENTS/CLAUDE 文案要同步收敛**  
   移除"bypasses exit checklist"这类表述，改为"阶段推进必须通过客观门禁；失败时只报告 blockers 和下一步"。

5. **阶段门只卡推进，不卡编码**  
   `task:exec`、编辑、测试、修 bug 不应因为当前阶段而被拒绝；只有 `/advance`、auto-advance、state-updater 这类阶段切换动作需要过门禁。

### 6.3 修正后的最终判断

这份评审可以作为下一步实施依据，但应把优先级改成：

1. 先改 `CLAUDE.md` / `AGENTS.md`，解除"不写代码"的人设限制。
2. 同时实现 `stage-gate-core.ts`，并让 `/advance` / auto-advance / state-updater 全部调用它。
3. 移除普通研发路径里的 `skip` / `force advance`，或降级为带审计的 break-glass。
4. 再处理 Tier 4 孤岛清理、PostToolUse、pre-commit 拆分等体验优化。

只有完成第 1–3 项，才算真正同时满足两个目标：**Codex 写代码不被绑住；项目阶段推进不被随便跳过。**

> 第 3 项的落地必须触达根（强化 A/B/C）：
> - 从 `advance.md` 的 `case "$MODE"` 语句和 §2.4 移除 `skip` 分支（不只是改安全规则文案）
> - 从 `models.ts` 的 `Task.mode` 枚举移除 `"skip"`（或限定只允许语义阶段）
> - break-glass 审计写入 `.ai-first/logs/break-glass/<ts>.yml` 或 `.ai-first/reports/break-glass/<ts>.yml`，timeline 只留指针；若放入 `.ai-first/locks/`，必须声明不可自动清理
>
> 否则 `stage-gate-core.ts` 是硬门、但旁边仍开着 Codex 可达的旁路，等于形同虚设。

---

## 7. 待决策项（修正后）

- [ ] 是否改写 `CLAUDE.md` / `AGENTS.md` 人设：去掉"do NOT write code"，改为"阶段内是执行者 + 阶段间过客观门"？
- [ ] 是否补 `stage-gate-core.ts`（`canAdvance()` 客观门）+ `npm run stage:gate`，并让 `/advance` 调用它？
- [ ] 是否移除普通研发路径中的 `skip` / `force advance`，或改成带审计的 break-glass？
- [ ] 是否授权删除 Tier 4 四个孤岛模块（含测试）？
- [ ] 是否把 PostToolUse 的 `data:sync` 改为 dev-only？
- [ ] pre-commit hook 是否拆分为 pre-commit（lint+secret）+ pre-push（test+build）？

---

## 附录 B — 建议的 `stage-gate-core.ts` 设计草图

把散文门变成硬门。纯函数，消费已有客观证据，无新依赖：

```ts
// src/core/stage/stage-gate-core.ts
export type AdvanceDecision = {
  from: ProjectStage;
  to: ProjectStage;
  allowed: boolean;
  blockers: string[];      // 未过的客观门
  evidence: string[];      // 已过的客观证据（便于审计）
};

export function canAdvance(projectRoot: string, from: ProjectStage, to: ProjectStage): AdvanceDecision {
  // 1. 阶段顺序校验（不允许跨级 / 回跳到任意阶段）
  // 2. 当前阶段所有 active task 必须 status === "done"
  //    —— 不接受 "in_progress" / "review_pending" / "blocked" 的任务蒙混过关
  // 3. 每个 done task 对应的最新 ExecutionReport.status === "done"
  //    —— 客观证据：acceptance 真过、无 scope block 违规（不是 Codex 自报）
  // 4. 当前阶段 StageRule.requiredArtifacts 全部存在
  // 5. 无 pending 的 SyncEvent（doc-rot 未处理）
  // 任一未过 → allowed=false + blockers 写明原因
}
```

CLI 入口：`npm run stage:gate -- build qa` → 输出 `allowed + blockers`，非零退出码表示拒绝。

`/advance` 命令改为：先调 `npm run stage:gate`，未过则**拒绝推进**并把 blockers 报给用户。

**关键性质**：
- 编码动作（task:exec / 编辑 / 测试）**不经过此门** —— Codex 在 build 阶段写代码完全自由。
- 只有"切换阶段"才过此门 —— 客观卡住"开发没做完就提测"。
- 所有判定基于文件（task yml + report yml + artifacts），可审计、可复现。

---

## 附录 A — 评审证据（grep / 文件引用）

**孤岛零引用实证：**
```
$ grep -rn "from.*harness/executor|from.*harness/routing-resolver|from.*agents/smoke-case-generator|from.*agents/registry-loader" src/ --include="*.ts" | grep -v "\.test\."
(空)
```

**核心 TS 不依赖 frontend 数据：**
```
$ grep -rn "frontend-data|generate-frontend" src/core/
(空)
```

**TS core 不 gate stage（task-exec-cli.ts 的 exit 仅在文件缺失时）：**
```
line 65: process.exit(2)   # no project.yml
line 72: process.exit(2)   # no task
line 78: process.exit(2)   # no scope
line 84: process.exit(2)   # taskRef 未提供
line 107: process.exit(0)  # preflight blocked 正常返回
line 117: project.currentStage   # 仅作为 context bundle 参数, 不 gate
```

**编排器人设限制（CLAUDE.md / AGENTS.md 一致）：**
```
line 16-17: "You do NOT write code, review code, design architecture, or make technical decisions. You COORDINATE the agents"
line 421/446: "- Coordinate agents — never do their work yourself"
line 430/455: "## What You MUST NOT Do"
```

**PostToolUse hook：** `.claude/settings.json` → `hooks.PostToolUse[0]` matcher `Write|Edit` → `npm run data:sync`。
