# AI-first 使用指南

> 🗺️ **阅读路径**：[README](../README.md) → 📗 [团队试点落地指南](AI-first-团队试点落地指南.md) → 📘 **使用指南**（你在这）→ 📙 [研发阶段表达与操作手册](AI-first-研发阶段表达与操作手册.md)
>
> 本文角色：**场景速查**——按场景查「该说什么、用什么命令」。命令级 step-by-step 见 §典型工作流。

本文档说明 AI-first 在真实项目中的使用方式，重点回答两个问题：

- 遇到什么场景，应该怎样用自然语言推进项目。
- 什么时候应该使用 Claude Code slash command 或本地 npm 命令。

## 当前入口

AI-first 当前是 Claude Code-native 的项目控制层，不是独立 npm CLI。日常使用时，在 Claude Code 中打开目标项目，然后直接描述你要做什么；需要精确触发某个流程时，再使用 slash command。

常用入口分四类：

| 入口类型 | 适用场景 | 示例 |
| --- | --- | --- |
| 自然语言 | 日常规划、实现、修复、审查、同步 | `帮我实现暗黑模式，并自动补测试和文档同步` |
| Claude Code slash command | 想直接触发确定流程（Claude 入口） | `/guide`, `/scan`, `/review`, `/sync` |
| 确定性 TS 核心命令（v0.1） | 想要客观、可复现、不依赖 LLM 的判定；Claude 与 Codex 共用 | `npm run guide`, `npm run task:create`, `npm run task:exec`, `npm run sync`, `npm run scan:domains:write`, `npm run adopt` |
| 本地 npm 命令 | 开发本仓库、运行仪表盘、验证代码 | `npm run dev`, `npm test`, `npm run check` |

> **v0.1 新增**：本仓库现在提供完整的三层确定性控制面（`src/core/`）。所有 v0.1 主链路命令都能通过 `npm run <command>` 或统一 CLI `npm run ai-first -- <command>` 触发，命令清单见 `.claude/CLAUDE.md` 的 "Deterministic TS Core" 一节。slash command 与 TS 核心共用同一份 core——`/guide` 内部会调用 `npm run guide`，`/task` 会调用 `npm run task:create`。

### 统一 CLI（M1）

> **口径**：散装命令和统一 CLI 完全等价（同一份 core）。**日常推荐散装命令**（直观）；**统一 CLI 适合脚本化、CI 或只想记一个入口**。详见研发手册 16.3。

```bash
npm run ai-first -- help              # 查看所有子命令
npm run ai-first -- guide "$(pwd)"    # 等价于 npm run guide
npm run ai-first -- scan --write .    # 等价于 npm run scan:domains:write
npm run ai-first -- pilot .           # dry-run 跑通主链路（adopt→guide→task→exec→sync）
npm run ai-first -- check             # typecheck + test + lint + format
```

### Codex 闭环（task:exec）

`task:exec` 是 v0.1 的核心闭环——它组装上下文包、调 Codex、收集客观产出、写 ExecutionReport：

```bash
# 真实执行（需要本地 codex CLI）
npm run task:exec -- --task task-xxx --runtime codex

# dry-run（不启动 Codex，CI 安全）
npm run task:exec -- --task task-xxx --dry-run --allow-dirty

# 工作区干净时的默认模式（不加 --allow-dirty 会触发 preflight 拦截）
npm run task:exec -- --task task-xxx --runtime codex
```

报告写入 `.ai-first/reports/report-<task>-<ts>.yml`，三态 `status`（done / review_pending / blocked）由 git changeSet + 验收 + scope 违规分级决定，**不依赖 Codex 自报**。

## 使用原则

优先用自然语言。AI-first 的核心价值是自动感知当前阶段、任务、同步状态和质量门禁，然后调度合适的 agent。你不需要先判断自己该找 planner、builder 还是 reviewer。

当你需要确定性、可重复、短路径触发某个动作时，用 slash command。例如：只想看状态就用 `/guide`，只想重新扫描就用 `/scan`。

有风险的动作要说清楚边界。例如删除、阶段回退、强制推进、改发布配置、改安全策略时，应明确目标、范围和验收标准。

## 场景速查表

| 场景 | 推荐自然语言 | 可用命令 | 系统会做什么 |
| --- | --- | --- | --- |
| 全新项目初始化 | `这是一个新项目，帮我初始化 AI-first 控制层` | `/init /path/to/project` | 创建 `.ai-first/` 结构，进入 idea/discovery 流程 |
| 接入已有项目 | `这是一个已有项目，帮我接入 AI-first 并评估当前状态` | `/adopt /path/to/project` | 扫描仓库、生成项目状态、建立控制层 |
| 查看当前状态 | `项目现在什么情况？下一步最该做什么？` | `/guide` 或 `/health` | 输出当前阶段、任务、风险、建议动作 |
| 重新扫描项目 | `重新扫描一下项目结构、风险和健康度` | `/scan` | 运行 repo scan、阶段评估和健康建议 |
| 规划新功能 | `我想加消息推送，先帮我梳理方案和边界` | `/task "消息推送方案"` | 进入 planning/spec 路径，形成任务或方案 |
| 实现功能 | `实现暗黑模式，补测试，完成后跑质量检查` | 无需命令，必要时 `/complete` | 调度 builder，完成后触发 bug/security/review/sync 链 |
| 修 bug / 热修复 | `生产登录报 500，优先排查并修复` | 无需命令 | 可绕过阶段限制进入 hotfix 模式，修复后跑门禁 |
| 重构/清理技术债 | `清理 dashboard 组件里的重复逻辑，不改变行为` | 可配合 `/review` | 先确认范围，再改代码、跑测试和审查 |
| 代码审查 | `review 一下最近改动，按质量门禁列问题` | `/review` | 运行 reviewer 和 security reviewer |
| 安全检查 | `重点查 secrets、auth、权限和依赖风险` | `/scan` 或 `/review` | 触发安全相关检查并输出风险 |
| 生成/补测试 | `为这个模块补单元测试，覆盖边界条件` | `/test-gen src/path/file.ts` | 由 smoke-case/test agent 生成测试建议或测试骨架 |
| 冒烟测试 | `为发布前关键路径生成 smoke test 计划` | `/smoke` | 识别关键路径，生成 smoke case 报告 |
| 文档同步 | `检查这次代码变更是否让文档过期` | `/sync` | 检查 knowledge/standards/wiki 是否需要更新 |
| 记录技术决策 | `记录为什么选择 Claude Code-native 作为第一入口` | `/decide "Claude Code-native entrypoint"` | 写入知识库/决策记录 |
| 构建 wiki | `根据知识库和标准重建项目 wiki` | `/wiki` | 生成或刷新 `.ai-first/wiki/` |
| 查看标准/技能 | `当前有哪些项目标准和可用技能？` | `/standards`, `/skills` | 列出标准、技能和适用场景 |
| 发布准备 | `准备发布检查，确认 release notes 和门禁状态` | `/review`, `/complete`, `/advance` | 运行 release 前检查，必要时推进阶段 |
| 迭代复盘 | `基于当前 evolve 状态，列下一轮最值得做的任务` | `/guide` | 输出 evolve 阶段候选任务和风险 |

## 规范放在哪里

团队已有的研发规范统一放在 `.ai-first/standards/{domain}/` 下，而不是散落到普通 `docs/` 里。`docs/` 可以写产品说明和长文档，但会约束 Codex、Claude Code、任务执行和 review 的项目规范，应进入 standards。

推荐目录：

```text
.ai-first/standards/
  frontend/     # 前端组件、状态、样式、可访问性、测试、API 调用
  backend/      # API、错误处理、权限、数据访问、日志、迁移、测试
  algorithm/    # 复现、特征、指标评估、推理契约、模型产物
  data/         # 数据源、schema、数据质量、PII、泄漏检查
  fullstack/    # 前后端契约、后端算法契约、跨域兼容性
  security/     # 安全规则
  workflow/     # review、测试、同步、交付流程
```

维护方式保持轻量：标准文件用 Markdown 管理，标准变更用 Git diff 和 PR review 管理，不单独做复杂版本系统。未验证的规范标记为 `draft`，被真实任务使用并 review 后再改成 `stable`，废弃时标记为 `deprecated` 并说明替代规范。

常用自然语言：

```text
把前端团队已有的组件规范导入 .ai-first/standards/frontend，并标记为 draft。
```

```text
根据当前后端代码，检查 backend 标准里缺哪些错误处理和权限约定。
```

```text
新增算法评估规范，要求说明数据版本、指标、复现命令和模型产物路径。
```

```text
检查这个任务会受哪些 frontend、backend、algorithm 或 fullstack 标准约束。
```

## 典型工作流

### 1. 从零开始一个项目

在 Claude Code 中打开目标目录，然后说：

```text
这是一个新项目，帮我初始化 AI-first 控制层，并先问清楚项目目标、用户和边界。
```

或者直接使用：

```text
/init /path/to/new-project
```

推荐后续自然语言：

```text
先不要写代码，帮我确认目标用户、核心用例、成功标准和不做什么。
```

适合阶段：idea、discovery。

命令级 step-by-step（对标 brownfield 的「团队试点落地指南 §4」）：

1. 在 Claude Code 中打开目标空目录（greenfield 必须用 Claude Code，**无 npm init 入口**）。
2. `/init /path/to/new-project` → 创建 `.ai-first/` 控制层，进入 idea 阶段。
3. `/guide` → 确认当前位置、置信度和下一步。
4. 用自然语言和 intake/planner 确认目标、用户、边界、成功标准（推进 idea → discovery → spec）。
5. 进入 build 后：`npm run task:create -- "首个需求" --domain <id>` 创建任务。
6. `npm run task:exec -- --task .ai-first/tasks/<task>.yml --runtime codex` 执行。
7. `npm run stage:gate -- build qa` 判断能否提测。

> greenfield 的 idea/discovery/spec 阶段以对话为主（intake-agent、planner-agent），npm 命令在 build 阶段才成为主入口。

### 2. 接入一个已有项目

在 Claude Code 中打开已有项目，然后说：

```text
这是一个已有项目，帮我接入 AI-first，扫描结构、识别技术栈、评估当前阶段和风险。
```

或者直接使用：

```text
/adopt /path/to/existing-project
```

接入后建议立刻问：

```text
项目现在处于什么阶段？最急需补齐的质量、文档或架构缺口是什么？
```

对应命令：

```text
/guide
```

### 3. 日常看板和下一步决策

当你不知道下一步该做什么时，直接说：

```text
基于当前项目状态，列出最值得马上做的 3 个任务，并说明原因和风险。
```

或：

```text
/guide
```

AI-first 应返回：

- 当前阶段和置信度
- 活跃任务
- 待同步文档
- 健康信号
- 风险和下一步建议

### 4. 从想法到方案

当想法还不明确时，用探索式语言：

```text
我觉得可以加一个消息推送功能，先帮我判断有没有必要、范围多大、会影响哪些模块。
```

```text
考虑一下是否要支持团队协作模式，先不要实现，先给方案和风险。
```

这类话会优先进入 planning/spec，而不是直接写代码。

如果已经明确要记录任务：

```text
/task "消息推送功能"
```

### 5. 实现一个明确功能

当需求已经清楚时，直接说：

```text
实现暗黑模式。要求：保留现有浅色主题；增加主题切换；补组件测试；完成后运行 typecheck、test、lint。
```

AI-first 会优先调度 builder-agent。实现完成后，应自动进入质量链：

1. bug-scan + security-scan
2. knowledge-sync
3. reviewer + security-reviewer
4. state-updater

如果你只想强制完成某个已有任务的后置质量链：

```text
/complete task-xxxx
```

### 6. 修复线上故障或严重 bug

使用明确的故障语言：

```text
生产登录接口报 500。请优先定位根因、修复最小范围，并补回归测试。
```

```text
这是 hotfix：支付回调偶发失败，只改必要路径，修完后跑相关测试和安全检查。
```

这类请求可进入 hotfix 快路径，即使当前项目不在 build 阶段，也允许临时进入修复流程。

### 7. 做重构和清理

重构时必须明确“不改变行为”：

```text
清理 Dashboard 组件的重复逻辑，不改变 UI 行为。先锁定现有测试，再做小步重构。
```

```text
把路由解析器里的 YAML 解析逻辑整理一下，保持现有测试全部通过。
```

推荐配合：

```text
/review
```

重构完成后重点看：

- 行为是否被测试锁住
- 是否引入新抽象
- 是否影响公共协议
- 文档/知识是否需要同步

### 8. 代码审查和质量门禁

自然语言：

```text
review 最近改动，按 logic、security、architecture、docs、testing、consistency 分门别类列问题。
```

命令：

```text
/review
```

审查输出应优先列问题，而不是泛泛总结。问题应包含：

- 严重程度
- 文件和行号
- 影响
- 修复建议

### 9. 安全检查

自然语言：

```text
做一次安全审查，重点看 secrets、认证授权、输入校验、依赖风险和 CI 配置。
```

可用命令：

```text
/scan
/review
```

如果是某个具体区域：

```text
重点审查 src/core/tools 里的 adapter 是否会执行不可信命令或泄漏凭据。
```

### 10. 文档、知识库和 wiki 同步

自然语言：

```text
检查这次改动是否让 README、知识库或标准过期，并补齐必要文档。
```

命令：

```text
/sync
/wiki
```

适合在这些情况使用：

- 改了架构边界
- 改了公共命令或入口
- 改了质量门禁
- 改了 agent/skill 行为
- 完成一个阶段或迭代

### 11. 记录技术决策

自然语言：

```text
记录一个技术决策：为什么当前入口采用 Claude Code slash commands，而不是 npm CLI。
```

命令：

```text
/decide "Claude Code slash commands as primary entrypoint"
```

决策记录应说明：

- 背景
- 选择
- 约束
- 被拒绝方案
- 后续警告

### 12. 发布准备

自然语言：

```text
准备发布前检查：确认测试、类型、lint、构建、release notes、已知风险和回滚建议。
```

常用命令：

```text
/review
/complete
/advance
```

注意：`/advance` 会改变阶段状态。只有当当前阶段退出条件满足时才应使用；如果是系统自动推进，通常不需要手动调用。

### 13. evolve 阶段规划下一轮

当前项目处于 evolve 阶段。适合问：

```text
基于当前 evolve 状态，下一轮最值得做的 3 个任务是什么？按价值、风险和依赖排序。
```

```text
把下一轮目标拆成任务：Codex exec 真实执行、lint warning 清理、CI 远端验证。
```

对应命令：

```text
/guide
/task "Extend Codex adapter to guarded codex exec"
```

## Slash command 参考

这些命令定义在 `.ai-first/routing.yml` 和 `.claude/commands/` 中。

| 命令 | 何时使用 | 输出/效果 |
| --- | --- | --- |
| `/init <path>` | 初始化全新项目 | 创建控制层，进入 idea/discovery |
| `/adopt <path>` | 接入已有项目 | 扫描仓库，建立 brownfield 状态 |
| `/guide` | 不确定下一步 | 当前阶段、风险、建议动作 |
| `/health` | 查看健康概览 | 健康信号和状态摘要 |
| `/scan` | 重新扫描项目 | Repo scan + stage assessment |
| `/review [task-id]` | 质量审查 | reviewer + security reviewer |
| `/complete [task-id]` | 强制运行后置质量链 | sync/review/security/state 链 |
| `/sync` | 文档/知识同步 | stale docs 和知识更新建议 |
| `/wiki` | 生成/刷新 wiki | `.ai-first/wiki/` 文档 |
| `/decide "<title>"` | 记录技术决策 | knowledge/decision 记录 |
| `/task "<title>"` | 创建结构化任务 | task YAML 和 change scope |
| `/smoke` | 发布前关键路径测试 | smoke case 报告 |
| `/test-gen [file]` | 补测试 | 测试建议或骨架 |
| `/standards` | 查看标准 | standards 列表 |
| `/skills` | 查看技能 | skills 列表 |
| `/advance` | 强制阶段推进 | 状态变更，谨慎使用 |

## 自然语言触发建议

下面这些表达会影响路由。

| 你想要的行为 | 推荐表达 | 避免表达 |
| --- | --- | --- |
| 只规划，不实现 | `先不要写代码，先给方案` | `做一下这个功能` |
| 进入实现 | `实现 X，并补测试` | `考虑一下 X` |
| 热修复 | `生产故障/报错/紧急修复` | `优化一下` |
| 审查 | `review/检查/验证/按门禁列问题` | `看看怎么样` |
| 安全 | `安全审查/权限/auth/secrets/OWASP` | `检查一下代码` |
| 文档同步 | `检查文档是否过期/同步知识库` | `整理一下` |
| 阶段状态 | `项目现在什么阶段/下一步是什么` | `继续` |

## 本地开发命令

这些命令用于开发 AI-first 本仓库，不是用于初始化其他项目。

```bash
npm install
npm run dev
npm run data:sync
npm test
npm run typecheck
npm run lint
npm run format:check
npm run frontend:build
npm run check
```

常见用途：

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 生成前端数据并启动 Vite dashboard |
| `npm run data:sync` | 从 `.ai-first/` 重新生成 `src/frontend/data/project-data.ts` |
| `npm test` | 运行 Vitest |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier 格式检查 |
| `npm run frontend:build` | 生成数据并构建 dashboard |
| `npm run check` | typecheck + test + lint + format check |

## 推荐日常节奏

1. 每次开始工作先问：

   ```text
   /guide
   ```

2. 如果是想法，先说：

   ```text
   先不要实现，帮我判断价值、范围、风险和验收标准。
   ```

3. 如果是明确任务，说清楚：

   ```text
   实现 X，范围是 A/B 文件，必须补测试，完成后跑 typecheck/test/lint/build。
   ```

4. 完成后要求：

   ```text
   汇总改动、验证证据、剩余风险，并检查是否需要知识同步。
   ```

5. 需要固化时：

   ```text
   按 Lore Commit Protocol 提交本轮变更。
   ```

## 当前已知边界

- 主要运行面是 Claude Code-native agents 和 slash commands。
- Codex / Claude Code runtime 已通过 `task:exec --runtime` 接入（M-4），dry-run 验证通过（见 `examples/ai-project-lifecycle-sim/VALIDATION.md` §4.2）；真实（非 dry-run）执行尚未在真实项目验证，试点首次建议用低风险任务跑通（详见研发手册 16.4）。
- README 中的项目初始化应使用 `/init`、`/adopt`，不是 `npm start init/adopt`。
- `src/frontend/data/project-data.ts` 是生成文件，应通过 `npm run data:sync` 或 `npm run frontend:build` 更新，不要手改。
