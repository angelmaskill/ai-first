# AI-first 团队试点落地指南

> 🗺️ **阅读路径**：[README](../README.md) → 📗 **团队试点落地指南**（你在这）→ 📘 [使用指南](AI-first-使用指南.md) → 📙 [研发阶段表达与操作手册](AI-first-研发阶段表达与操作手册.md)
>
> 本文角色：**团队试点的命令级入口**——已有项目接入从这里开始，含 step-by-step 启动清单和验收标准。

本文用于把已验证的 AI-first 脚手架推进到研发团队试点使用。目标不是增加管理负担，而是让研发人员在 Codex / Claude Code 编程时始终清楚：

- 我现在处于什么位置。
- 当前最应该做什么。
- 下一步怎么推进。
- 哪些阶段不能跳过。
- 哪些证据会阻止错误提测或错误发布。

相关材料：

- 使用手册：`docs/AI-first-使用指南.md`
- 研发表达与操作手册：`docs/AI-first-研发阶段表达与操作手册.md`
- 模拟验证报告：`examples/ai-project-lifecycle-sim/VALIDATION.md`
- 模拟项目：`examples/ai-project-lifecycle-sim/`

## 适用范围

本指南面向**已有项目接入**（brownfield）：研发拿一个真实存在的代码库，用 `npm run adopt` 接入 AI-first。这是团队试点推荐路径，全部命令都是 npm 命令，不依赖特定 IDE。

**新项目（greenfield）**目前只能通过 Claude Code 的 `/init` 启动，**没有 npm 命令入口**（`npm run init` 不存在，见研发手册 16.4）。用 Codex 的团队暂不支持纯命令行初始化新项目——如需试点 greenfield，先用 Claude Code `/init` 建好 `.ai-first/` 控制层，再切到任意 runtime 推进。

## 1. 当前结论

模拟验证已经证明：AI-first 可以管理一个包含前端、后端、算法、数据、共享契约和规范目录的 AI 项目，并且能够做到：

- 阶段内不限制 Codex / Claude Code 编程发挥。
- 阶段推进必须依赖客观证据。
- 开发未完成时不能进入 QA。
- QA 未通过或存在 pending sync 时不能进入 release。
- 前端、后端、算法规范可以放入 `.ai-first/standards/` 并被同步机制识别。

下一步应进入“小范围真实项目试点”，而不是继续只在方案文档里推演。

## 2. 六个优先级任务

### P0. 收敛模拟项目为稳定 fixture

目的：让团队有一个可以反复跑的参考项目，验证脚手架没有回退。

已落地：

```bash
npm run validate:example-lifecycle
```

该命令会验证：

- demo 项目测试通过。
- demo 项目 typecheck 通过。
- demo 项目 lint 通过。
- `guide` 能输出当前位置、下一步和推荐执行方式。

维护原则：

- demo 源码、标准、domains、artifacts 可以保留。
- `.ai-first/logs/`、`.ai-first/reports/`、`.ai-first/sync/` 等可再生运行态默认不提交。
- `VALIDATION.md` 记录验证结论，不把每次运行产生的报告都当源码保存。

### P1. 修正影响研发爽感的导航问题

目的：研发运行 `guide` 后，看到的是当前阶段真正该做的事。

典型使用：

```bash
npm run guide -- /path/to/project
```

自然语言表达：

```text
项目现在什么情况？我下一步该做什么？
现在能不能提测？
现在能不能发布？
当前阶段还有什么阻塞？
```

预期体验：

- build 阶段：提示创建或继续实现任务。
- QA 阶段：提示 review、sync、release readiness，而不是继续泛泛地创建实现任务。
- release 阶段：提示发布交接和进入 operate。
- operate 阶段：提示运行反馈沉淀。
- evolve 阶段：提示规划下一轮 discovery/spec。

### P2. 固化团队落地手册

目的：让研发不需要理解内部实现，也能按自然语言或命令推进项目。

团队日常最小命令集：

> 说明：`task:create`、`task:exec`、`stage:gate`、`stage:advance` 这类会读写 `.ai-first` 的命令，默认在目标业务项目根目录执行。从脚手架仓库内验证 demo 时，按 `examples/ai-project-lifecycle-sim/README.md` 的安全命令执行，避免误改脚手架自身状态。

```bash
npm run adopt -- /path/to/project
npm run scan:domains:write -- /path/to/project
npm run guide -- /path/to/project
npm run task:create -- "任务标题" --domain <domain-id>
npm run task:exec -- --task .ai-first/tasks/<task>.yml --runtime codex
npm run sync -- --files <changed-file>
npm run stage:gate -- build qa
npm run stage:advance -- build qa
```

> 以上命令也可用统一 CLI 触发（`npm run ai-first -- <subcommand>`），完全等价；团队日常推荐散装命令，详见研发手册 16.3。

研发可直接使用的自然语言：

```text
这是一个已有项目，帮我接入 AI-first。
扫描一下当前项目的前端、后端、算法目录。
根据当前阶段告诉我下一步最该做什么。
为这个需求创建一个研发任务，并限定影响范围。
用 Codex 执行这个任务，完成后写执行报告。
我改了后端接口和算法逻辑，检查是否影响规范或文档。
开发完成了，判断现在能不能进入 QA。
QA 完成了，判断现在能不能发布。
```

### P3. 选择一个真实项目小范围试点

试点项目建议满足：

- 有前端。
- 有后端。
- 有算法、模型调用、推荐、检索、数据处理等至少一种算法侧目录。
- 2 到 4 名研发参与。
- 当前有一部分规范，但规范分散在文档、README 或团队约定里。
- 近期有一个可在 1 到 2 周内完成的小需求。

不建议第一批选择：

- 生产事故高发项目。
- 强合规、强发布审批项目。
- 目录结构极度混乱且近期还在大迁移的项目。
- 团队尚未统一使用 Git 的项目。

### P4. 沉淀最小团队工作流

团队试点时只采用轻流程：

```text
adopt / scan  →  guide  →  task  →  Codex/Claude Code exec  →  sync/review  →  stage gate
```

原则：

- Git 管代码版本。
- AI-first 管研发上下文、规范、任务范围和阶段证据。
- Codex / Claude Code 继续正常编程，不把阶段门插到每一次编辑前。
- 只在阶段推进时检查证据，防止“开发没做完就提测”。

推荐节奏：

1. 需求开始前运行 `guide`。
2. 开发前创建 task 和 change scope。
3. 开发中让 Codex / Claude Code 读取 task、standards、domains。
4. 开发完成后运行测试、typecheck、lint。
5. 进入 QA 前运行 `stage:gate build qa`。
6. QA 完成后运行 `stage:gate qa release`。

### P5. 定义试点验收标准

试点结束时，用以下标准验收：

- 新成员 30 分钟内能通过 `guide` 看懂项目当前状态。
- 研发能明确知道当前阶段和下一步。
- Codex 编程没有因为脚手架额外约束而变慢或变笨。
- 开发任务没完成时，`build → qa` 会被阻止。
- QA review 未通过时，`qa → release` 会被阻止。
- pending sync 未处理时，发布推进会被阻止。
- 前端、后端、算法规范能集中维护在 `.ai-first/standards/`。
- 一次真实需求能完成 `task → exec → report → sync/review → stage gate` 闭环。

## 3. 团队规范如何放置和维护

团队已有规范建议放到：

```text
.ai-first/standards/frontend/
.ai-first/standards/backend/
.ai-first/standards/algorithm/
.ai-first/standards/security/
.ai-first/standards/workflow/
```

规范文件建议使用 Markdown，并带最小 frontmatter：

```markdown
---
id: STANDARD-BACKEND-001
domain: backend
title: API error response convention
stability: stable
severity: must
relatedPaths:
  - backend
---

# API error response convention

所有后端接口必须返回统一错误结构，不能直接透出内部异常。
```

维护方式：

- 规范变更走 Git review。
- build / QA / release 阶段不随意改稳定规范。
- 如果代码变更触及 `relatedPaths`，运行 sync 检查是否需要更新规范。
- 规范不是为了限制 Codex，而是给 Codex 更清楚的上下文和边界。

## 4. 试点启动清单

启动前：

```bash
npm run validate:example-lifecycle
```

接入真实项目：

```bash
npm run adopt -- /path/to/project
npm run scan:domains:write -- /path/to/project --max-depth=4
npm run guide -- /path/to/project
```

整理规范：

```text
把已有前端规范放入 .ai-first/standards/frontend/
把已有后端规范放入 .ai-first/standards/backend/
把已有算法规范放入 .ai-first/standards/algorithm/
```

第一条真实需求：

在目标业务项目根目录执行：

```bash
npm run task:create -- "实现推荐解释链路" --domain domain-frontend --domain domain-backend --domain domain-algorithm
npm run task:exec -- --task .ai-first/tasks/<task>.yml --runtime codex
```

推进阶段：

在目标业务项目根目录执行：

```bash
npm run stage:gate -- build qa
npm run stage:advance -- build qa
npm run stage:gate -- qa release
```

## 5. 风险和控制

| 风险 | 控制方式 |
| --- | --- |
| 误把脚手架根目录当业务项目推进 | 状态类命令必须确认 cwd；demo README 已特别说明 |
| 运行态文件污染仓库 | fixture `.gitignore` 忽略 logs/reports/sync/locks/current |
| guide 给出不贴合阶段的建议 | 已改为阶段化 next-step；后续继续用模拟项目回归 |
| 团队把 AI-first 当重看板 | 明确只服务研发上下文、规范和阶段证据，版本状态仍依赖 Git |
| Codex 被流程限制 | 阶段内编码自由；阶段门只在提测、发布等推进点生效 |

## 6. 下一步执行建议

第一周只做三件事：

1. 选一个真实 AI 项目试点。
2. 接入 `.ai-first` 并整理前端、后端、算法规范。
3. 用一个真实小需求跑通 `guide → task → Codex exec → sync/review → stage gate`。

试点期间不要扩展复杂角色、看板或状态系统。若团队成员问“我现在该干什么”，优先让他运行：

```bash
npm run guide -- /path/to/project
```
