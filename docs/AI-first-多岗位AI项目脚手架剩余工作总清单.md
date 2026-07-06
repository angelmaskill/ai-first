# AI-first 研发脚手架剩余工作总清单

## 1. 文档目的

本文档根据最新产品边界重新整理剩余工作。

目标不是做重型项目管理平台，也不是做组织监管系统，而是做一个面向研发人员的 AI 项目脚手架：

> 帮助研发人员在 AI 辅助开发中更高效、更安全地初始化项目、管理前端/后端/算法端结构、初始化和遵守代码规范、推进阶段目标、执行质量检查、对齐项目信息，并同时兼容 Claude Code 与 Codex。

## 2. 收敛后的产品原则

### 2.1 要做什么

1. 帮研发人员快速接入或初始化项目。
2. 识别并管理前端、后端、算法、数据、文档、基础设施等代码域。
3. 初始化并维护前端、后端、算法端的研发规范。
4. 帮研发人员知道当前阶段、当前最该做什么、哪些风险需要处理。
5. 让 Codex 和 Claude Code 能使用同一套 `.ai-first/` 项目上下文。
6. 让任务执行有清晰范围、质量检查和结果回写。
7. 让项目知识、接口约定、算法评估、文档变更保持同步。
8. 尽量依赖 Git 管理版本、分支、提交、合并和冲突。

### 2.2 不做什么

1. 不做复杂组织架构管理。
2. 不做过多岗位模型，只保留研发相关角色。
3. 不做重型看板监管。
4. 不替代 Jira、Linear、GitHub Issues。
5. 不替代 Git 管理版本、分支、PR、merge。
6. 不做复杂权限系统，优先用本地执行边界和 Git/CI 约束。
7. 不把 `.ai-first/` 做成数据库式状态中心。
8. 不为前端、后端、算法端分别创建独立项目，统一在一个项目控制层中按 domain 管理。

### 2.3 核心体验目标

研发人员使用 AI-first 时，必须随时获得三种感觉：

1. **位置感**：我现在处在项目生命周期的哪一步？当前是在初始化、规划、实现、联调、质量检查、发布前，还是下一轮演进？
2. **下一步感**：我现在最应该做什么？为什么是这一步？不做会有什么风险？
3. **推进感**：我做完这一步后，系统会自动告诉我结果、缺口和下一步，而不是让我重新猜流程。

因此，AI-first 的第一体验不应该是复杂表单或重看板，而应该是一个非常清晰的研发导航器：

```text
你当前在：build 阶段
当前目标：完成登录功能的前后端闭环
你负责：backend 登录接口
当前阻塞：缺少接口错误码规范
下一步建议：先补 backend/api-design 标准中的错误码约定，然后执行 task:exec
推荐命令：npm run task:exec -- ... --runtime codex
```

验收标准：

1. 任何时候运行 `guide`，研发人员都能在 10 秒内知道“我在哪、我该干什么、下一步怎么推进”。
2. 输出必须短、直接、可执行，不输出大段抽象流程说明。
3. 每条下一步建议都必须带原因、风险和推荐命令或自然语言操作。
4. 如果当前信息不足，系统要明确告诉研发人员“缺什么信息”以及“如何补齐”。
5. 使用体验要像导航，而不是审计。

### 2.4 双形态体验定位

AI-first 同时支持两种入口，它们不是互相替代，而是分工不同：

1. **确定性 CLI / npm scripts 是骨架**：负责 init、adopt、scan、guide、task、exec、report 等可重复动作，尽量无 LLM 依赖，便于 Codex、CI 和外部项目复用。
2. **Claude Code 自然语言是增强层**：负责把研发人员的自然语言意图翻译成共享核心动作，继续保留“少记命令、直接描述目标”的体验。
3. **Codex runtime 是重点执行入口**：面向局部实现、补测试、修 bug、整理规范、生成报告等可验证研发任务。
4. **`.ai-first/` 是共同上下文**：Claude Code、Codex、CLI 都读取同一套 project、domains、standards、tasks、reports，不维护两套项目逻辑。

因此，后续 README 和 Claude 指令文档需要同步表达这个定位：

- 对研发人员：可以继续自然语言使用 Claude Code，也可以用命令获得确定性输出。
- 对 Codex：优先通过 CLI 和结构化 prompt 执行任务。
- 对 CI/团队迁移：优先依赖 CLI、Git diff 和 `.ai-first/` 文件协议。

### 2.5 自然语言入口的行为裁决

Claude Code 的自然语言体验仍然成立，但它不应该继续维护一套独立编排逻辑。双形态定位下，自然语言入口按以下规则分发：

1. **查询类请求**：例如“现在项目什么情况”“下一步做什么”，Claude 调用共享 `guide` 核心，输出导航结果。
2. **任务创建类请求**：例如“帮我规划登录功能任务”，Claude 调用共享 `task:create` 核心，生成 task 和 change scope。
3. **局部实现类请求**：例如“加暗黑模式”“补这个模块测试”，Claude 优先创建任务并推荐/触发 `task:exec --runtime codex`，再读取 report 汇总给用户。
4. **探索和架构类请求**：例如“先判断有没有必要”“设计一下边界”，Claude 可以直接进行自然语言规划，但产物仍应写回 `.ai-first/artifacts/`、`.ai-first/tasks/` 或 `.ai-first/reports/`。
5. **阶段推进类请求**：auto-advance 不取消，但必须基于共享 stage assessor、任务状态、质量报告和必要产物判断，不能只由 Claude 自行推断。
6. **破坏性或外部副作用请求**：继续要求明确确认，例如删除、强制覆盖、发布、推送到远端生产环境。

验收标准：

1. README、CLAUDE.md、使用指南必须说明这套行为裁决。
2. Claude slash command 和自然语言编排都应优先调用共享核心，而不是复制逻辑。
3. 用户仍可“只说目标”，但系统内部走确定性核心和 `.ai-first/` 状态。

### 2.6 Codex 友好原则

AI-first 不能把 Codex 变成服务流程的工具。脚手架对 Codex 的作用应该是提供地图、边界和验收，不应该压制 Codex 的代码理解、探索和实现能力。

原则：

1. **给任务包，不给流程包**：Codex prompt 只包含当前任务必需的目标、scope、相关标准、验收条件和输出要求。
2. **少字段、强语义**：Codex 输出协议保持最小可解析字段，避免要求大量管理字段。
3. **规范按需引用**：只注入与当前 domain/change scope 相关的 standards，不把全部规范塞进 prompt。
4. **检查后置为主**：typecheck、test、review、sync 主要作为执行后的验证链，不在实现前制造过重门槛。
5. **scope 是护栏不是手铐**：ChangeScope 用来提示边界和风险，必要时允许 Codex 报告“需要扩大 scope”，而不是强迫它在错误边界内硬做。
6. **失败可恢复**：timeout、partial、parse_failed 都写 report 并给下一步，不让 Codex 失败污染项目状态。
7. **低置信度让人确认**：推断不确定时提示研发确认，不把不确定结论硬塞给 Codex。

验收标准：

1. 一个 Codex 任务 prompt 应该能在 2 分钟内被研发人员读懂。
2. prompt 中必须明确“要做什么”和“不要做什么”，但不附带无关阶段说明和管理信息。
3. Codex 输出 report 用于恢复上下文，不要求 Codex 写冗长总结。

## 3. 研发角色边界

只保留和研发交付直接相关的轻量角色：

| 角色 | 用途 | 是否需要复杂权限 |
| --- | --- | --- |
| Tech Lead | 判断技术方向、阶段目标和风险 | 否 |
| Frontend Engineer | 前端实现、测试、规范遵守 | 否 |
| Backend Engineer | 后端实现、接口、数据访问、测试 | 否 |
| Algorithm Engineer | 算法、模型、评估、推理接口 | 否 |
| Data Engineer | 数据处理、数据质量、数据管道 | 否 |
| QA / Reviewer | 检查质量、风险、验收标准 | 否 |
| AI Runtime | Codex 或 Claude Code 执行任务 | 否 |

说明：

1. PM、业务方、管理者可以作为外部上下文来源，但不作为脚手架核心角色建模。
2. owner/reviewer 只用于研发任务责任标注，不做组织层级管理。
3. 冲突解决和最终版本控制依赖 Git。

## 4. 当前已具备的基础

1. `.ai-first/` 控制层目录模型。
2. 10 阶段生命周期设计。
3. `Project`、`CodeDomain`、`Task`、`ChangeScope`、`ReviewReport`、`SyncEvent` 等核心模型。
4. `CodeDomainKind` 已支持 `frontend`、`backend`、`algorithm`、`ml`、`data`、`service`、`app`、`infra`、`docs`。
5. `scan:domains` 可识别 frontend/backend/algorithm/data/infra/docs/shared。
6. `adopt` 可为已有项目创建 `.ai-first/`、写入或合并 `project.yml`、生成 Claude Code 与 Codex runtime 配置。
7. `runtime-profiles` 已定义 Claude Code native runtime 与 Codex exec runtime。
8. Codex adapter 已具备 `dry-run` 与 `exec` 模式。
9. 调度器已支持 `algorithmPaths`、`dataPaths`、`infraPaths` 和通用 `domainPaths`。
10. Claude Code 的 `/adopt` 与 repo scanner 指令已开始使用共享扫描/adopt 核心。
11. `.ai-first/standards/` 已包含 frontend、backend、algorithm、data、fullstack、security、workflow 目录和一批 draft/stable 标准。

## 5. 剩余工作总览

| 编号 | 能力域 | 当前缺口 | 目标结果 | 优先级 |
| --- | --- | --- | --- | --- |
| A | 初始化与接入 | 已有 adopt，缺轻量 init 和更完整接入报告 | 新老项目都能一条命令建立可用控制层 | P0 |
| B | 项目结构识别 | 已识别目录，缺技术栈、命令、契约识别 | 能生成可执行 domain 配置 | P0 |
| C | 研发规范补全与维护 | 已有基础标准，缺导入规则、补全清单和检查入口 | 每个 domain 有可维护规范、索引和 review 引用 | P0 |
| D | 阶段目标与研发导航 | 阶段有文档，缺可执行目标模板、位置感输出和下一步建议 | 研发随时知道当前在哪、该做什么、怎么继续 | P0 |
| E | 任务与范围 | 调度器有 scope，缺任务创建与范围落盘 | 每次 AI 执行都有清晰任务边界 | P0 |
| F | Codex 执行闭环 | Adapter 能 exec，缺输出契约 fixture 和 task -> Codex -> report 回写 | Codex 能真实推进研发任务 | P0 |
| G | Claude Code 对齐 | Claude 指令仍有部分自有逻辑 | Claude 与 Codex 共用核心状态和规则 | P0 |
| H | 质量检查 | 有扫描概念，缺按 domain 的质量门禁 | 前端/后端/算法改动都有检查 | P0 |
| I | 信息对齐 | 有 knowledge/sync 概念，缺影响分析 | 代码、接口、算法、文档变化能同步提示 | P1 |
| J | Git/CI 轻集成 | 目前主要本地命令 | 利用 Git diff/CI 做检查，不复制 Git 功能 | P1 |
| K | 轻量研发视图 | dashboard 偏当前仓库，guide 体验还不够强 | 只展示研发必要信息，形成爽快的导航体验 | P0 |
| L | 示例与文档 | 缺标准 fixture 和命令文档 | 团队可复制、验证、迁移 | P1 |
| M | 产品化 CLI | 仍是 npm scripts + 内部 tsx | 形成轻量统一 CLI | P2 |

### 5.1 第一批之前必须完成的校准项

评审结论指出：主方向合理，但不能直接从 `guide` 或 `task:exec` 开干。第一批实现前必须先完成以下校准项，避免后面做出自相矛盾或无法验证的闭环。

| 编号 | 校准项 | 目标 | 验收标准 |
| --- | --- | --- | --- |
| Z0 | 编排协议行为裁决 | 明确自然语言入口在双形态下如何调用共享核心 | 写清“查询/任务创建/实现/探索/阶段推进/破坏性动作”的分发规则 |
| Z1 | 双形态体验定位 | 化解 Claude-native 自然语言入口与统一 CLI 的定位张力 | README、CLAUDE.md、使用指南都明确：CLI 是确定性骨架，Claude 是自然语言增强层 |
| Z2 | 手动/脚本试点主链路 | 用真实小型 AI 项目或本项目 dogfooding 模拟主链路 | 以手动或脚本方式模拟尚未实现的 guide/task/task:exec，验证协议层无硬阻塞并记录摩擦点 |
| Z3 | Codex prompt v0 与真实输出样本 | 在写 `task:exec` 前先验证 Codex 输出是否可稳定解析 | 先定 prompt v0，至少采集 2 个真实 Codex 输出 + 1 个失败/半真实样本，并形成 fixture / schema 校验输入 |
| Z4 | 共享核心三层约束 | 避免后续 G1 对齐时大返工 | 第一批所有 guide/task/exec 都按 `core` / `cli` / `claude-command` 分层设计 |

这些校准项不引入重流程，只是把最关键的体验和执行风险提前暴露。

### 5.2 推断项先采样原则

凡是输出会被下游消费的推断能力，都必须先有样本验证，再实现为核心流程。

适用对象：

1. stage assessor 的阶段判断和阻塞排序。
2. ChangeScope 自动推断。
3. Codex 输出解析。
4. standards check 的影响标准识别。

验收标准：

1. 每个推断能力至少有代表性 fixture。
2. 每个推断能力都有低置信度或解析失败的降级路径。
3. 低置信度时输出“需要研发人员确认”，而不是假装确定。

### 5.3 共享核心三层工程约束

第一批开始就必须按三层实现，避免 Claude Code 和 Codex 走出两套逻辑：

1. `core`：纯函数或低副作用模块，读取 `.ai-first/` 输入，返回结构化结果。
2. `cli`：命令入口，只负责参数解析、调用 core、写文件、格式化输出。
3. `claude-command`：Claude slash command 或自然语言编排，只负责调用 core/cli 并解释结果。

验收标准：

1. `guide`、`task:create`、`task:exec` 的业务判断不写死在命令文档里。
2. Codex、Claude Code、CI 可以复用同一份 core 输出。
3. 后续 G1 不需要重写第一批核心逻辑。

## 6. A. 初始化与接入

### A1. 完成轻量 greenfield init

- 任务：实现新项目初始化。
- 命令目标：

```bash
npm run init -- /path/to/project
```

- 需要生成：
  - `.ai-first/project.yml`
  - `.ai-first/state/current`
  - `.ai-first/runtime/claude-code.yml`
  - `.ai-first/runtime/codex.yml`
  - `.ai-first/standards/frontend/`
  - `.ai-first/standards/backend/`
  - `.ai-first/standards/algorithm/`
  - `.ai-first/standards/data/`
  - `.ai-first/tasks/`
  - `.ai-first/reports/`
  - `.ai-first/logs/timeline.md`
- 验收标准：
  - 空目录执行 init 后，可以马上问“当前阶段是什么，下一步做什么”。

### A2. 完善 brownfield adopt

- 当前已有：

```bash
npm run adopt -- /path/to/project
```

- 剩余任务：
  - 增加 `--dry-run`
  - 增加 `--runtime codex|claude-code|both`
  - 增加 `--domains frontend,backend,algorithm,data`
  - 生成 `.ai-first/reports/adopt-*.md`
  - 记录 timeline
  - 输出接入后的下一步建议
- 验收标准：
  - 重复执行 adopt 不覆盖人工配置。
  - adopt 后能生成清晰报告：识别了哪些 domain、缺哪些规范、建议下一步是什么。

### A3. 控制层目录轻量化

- 任务：确认 `.ai-first/` 只保留研发必要目录。
- 推荐保留：
  - `project.yml`
  - `domains/`
  - `standards/`
  - `tasks/`
  - `change-scopes/`
  - `reviews/`
  - `reports/`
  - `runtime/`
  - `knowledge/`
  - `sync/`
  - `logs/`
  - `state/`
- 不做：
  - 复杂权限目录
  - 组织层级目录
  - 重型看板数据目录
- 验收标准：
  - 控制层可手动理解、可 Git diff、可 code review。

## 7. B. 项目结构识别

### B1. 强化 domain 技术栈识别

- 任务：让 scanner 不只识别路径，还识别每个 domain 的技术栈。
- 前端识别：
  - React、Vue、Angular、Next.js、Vite、Tailwind
  - package manager
  - test runner
- 后端识别：
  - Node、Python、Go、Java
  - Express、Fastify、NestJS、FastAPI、Django、Spring
  - API schema
- 算法识别：
  - Python、Jupyter、PyTorch、TensorFlow、scikit-learn
  - train/eval scripts
  - model artifacts
- 数据识别：
  - SQL、dbt、Airflow、Spark、Pandas
  - pipeline scripts
- 验收标准：
  - `scan:domains` 输出每个 domain 的 `techStack`、`testCommands`、`buildCommands` 候选。

### B2. 生成 `.ai-first/domains/*.yml`

- 任务：为每个 domain 生成独立配置。
- 示例：

```text
.ai-first/domains/frontend.yml
.ai-first/domains/backend.yml
.ai-first/domains/algorithm.yml
.ai-first/domains/data.yml
```

- 每个文件包含：
  - id/name/kind
  - paths
  - techStack
  - testCommands
  - buildCommands
  - standards
  - commonRisks
- 验收标准：
  - 创建任务时可以根据路径找到所属 domain。

### B3. 识别跨域契约

- 任务：识别研发中最容易失配的契约。
- 重点：
  - 前端 <-> 后端 API
  - 后端 <-> 算法推理接口
  - 算法 <-> 数据 schema
  - 后端 <-> 数据库 schema
- 交付物：
  - `.ai-first/contracts/*.yml`
- 验收标准：
  - 修改接口或模型输入输出时，能提示需要同步哪些 domain。

### B4. 支持 monorepo

- 任务：识别 `apps/*`、`packages/*`、`services/*`、`libs/*`。
- 验收标准：
  - `apps/web`、`apps/api`、`packages/model`、`services/inference` 能正确映射到 domain。

## 8. C. 研发规范补全与维护

当前不是从零开始。`.ai-first/standards/` 已有 frontend、backend、algorithm、data、fullstack、security、workflow 目录，并已有一批标准文件。剩余工作应从“创建模板”调整为“补全缺口、支持团队导入、提供检查入口、让任务和 review 真正引用”。

### C1. 规范目录和索引固化

- 标准目录：
  - `.ai-first/standards/frontend/`
  - `.ai-first/standards/backend/`
  - `.ai-first/standards/algorithm/`
  - `.ai-first/standards/data/`
  - `.ai-first/standards/fullstack/`
  - `.ai-first/standards/security/`
  - `.ai-first/standards/workflow/`
- 每个标准文件必须包含：
  - id
  - domain
  - title
  - stability
  - severity
  - relatedPaths
- 验收标准：
  - `.ai-first/standards/INDEX.md` 能列出所有标准。
  - `/standards` 或 CLI 能扫描嵌套标准文件，而不是只扫顶层文件。
  - 现有 `STANDARD-*` 文件全部补齐必要 frontmatter；历史标准不应在 C8 上线后被判为无效。

### C2. 团队已有规范导入规则

- 任务：支持团队把已有前端、后端、算法、数据规范迁入对应目录。
- 导入原则：
  - 原文优先保留，不强制重写成统一话术。
  - 加最小 frontmatter，保证能被 scanner、guide、review 引用。
  - 未经过真实任务验证的规范标记为 `draft`。
  - 已被真实任务使用并通过 review 的规范可提升为 `stable`。
  - 废弃规范标记为 `deprecated`，说明替代规范，不直接静默删除。
- 验收标准：
  - 团队可以把已有 Markdown 规范放入对应 domain 后，被 `/standards` 和任务 prompt 识别。

### C3. 前端规范补全

- 已有基础：组件约定、API 消费约定。
- 剩余补全：
  - accessibility
  - frontend testing
  - styling / design token
  - state management
  - performance
- 验收标准：
  - 前端任务 prompt 和 review 会引用 frontend 标准。
  - 前端改动至少检查组件结构、API 调用、测试和可访问性相关规则。

### C4. 后端规范补全

- 已有基础：API 设计、数据访问。
- 剩余补全：
  - error handling
  - auth / permission
  - logging / observability
  - migration safety
  - backend testing
- 验收标准：
  - 后端任务必须检查 API、权限、错误处理、数据访问和测试。

### C5. 算法与数据规范补全

- 已有基础：
  - algorithm reproducibility
  - algorithm inference contract
  - data schema versioning
  - data quality
- 算法剩余补全：
  - feature definition
  - metric evaluation
  - model artifact
  - notebook-to-production
- 数据剩余补全：
  - data source
  - etl style
  - pii handling
  - leakage check
- 验收标准：
  - 算法任务必须说明数据版本、评估指标、复现入口和推理接口。
  - 数据 pipeline 改动必须有数据质量检查清单。

### C6. 全栈与跨域规范补全

- 已有基础：API contract consistency。
- 剩余补全：
  - frontend-backend integration
  - backend-algorithm contract
  - algorithm-data schema contract
  - release compatibility
- 验收标准：
  - 跨域任务 review 时必须检查契约一致性。

### C7. 规范管理保持轻量

- 规则：
  - 标准文件用 Markdown 管理。
  - 通过 Git 管理标准变更历史。
  - 不做复杂标准版本系统。
  - 只在必要时记录 `status: draft|accepted|deprecated`。
- 验收标准：
  - 标准变更可以通过 Git diff 和 PR review 管理。

### C8. 规范检查入口

- 任务：提供一个轻量 standards check。
- 输入：
  - `.ai-first/standards/`
  - `.ai-first/domains/`
  - task/changeScope
- 输出：
  - 当前任务涉及哪些标准
  - 哪些 domain 缺标准
  - 哪些标准是 draft，需要谨慎引用
  - 哪些变更可能需要同步标准
- 验收标准：
  - `guide`、`task:create`、`task:exec`、review 都能引用同一套 standards check 结果。

## 9. D. 阶段目标与研发导航

### D0. 阶段评估样本验证

- 任务：在实现 stage assessor 前，先用真实或接近真实项目样本验证规则判断是否可靠。
- 样本至少覆盖：
  - 空项目 / idea
  - 已有代码但无 `.ai-first` / adopt 前
  - 有 frontend + backend + algorithm 的 build 阶段项目
  - 有任务失败或质量报告的 qa / evolve 阶段项目
- 输出：
  - 样本输入
  - 期望阶段
  - 规则判断阶段
  - 置信度
  - 误判原因
- 验收标准：
  - 阶段判定低于约定准确率时，必须降级为“规则候选 + 研发确认”或“规则候选 + LLM 可选增强”。

### D1. 阶段目标模板

- 任务：为 10 个阶段提供轻量模板。
- 每个阶段只定义：
  - 当前目标
  - 必要产物
  - 退出条件
  - 推荐下一步
  - 质量检查
- 交付物：
  - `.ai-first/stages/*.yml`
- 验收标准：
  - `/guide` 或 CLI 能说明当前阶段目标和缺口。

### D2. 阶段评估核心

- 任务：实现工具无关 stage assessor。
- 架构决策：
  - 阶段判定由无 LLM 的规则/启发式函数负责，输出候选阶段和置信度。
  - 阻塞优先级排序分两层：规则先给候选和依据，LLM 可选增强排序和解释。
  - 当规则置信度不足时，不强行给唯一结论，而是输出“需要确认”的导航结果。
  - LLM 不能成为判断当前阶段和阻塞项的唯一来源。
  - Codex、Claude Code、CLI、CI 都应能读取同一份评估结果。
- 输入：
  - project.yml
  - RepoFacts
  - tasks
  - reports
  - standards
  - artifacts
- 输出：
  - 当前阶段
  - 置信度
  - 缺口
  - 阻塞候选及排序依据
  - 下一步建议
- 验收标准：
  - 不依赖 Claude，也能给 Codex 提供阶段上下文。
  - 没有 LLM 环境时仍可输出当前阶段候选、置信度、缺口和下一步建议。
  - 低置信度时输出“需要补充/确认的信息”，不伪装成高确定性判断。

### D3. `guide` 输出契约

- 任务：实现一个强位置感、强下一步感的 `guide` 输出。
- 触发方式：

```bash
npm run guide -- /path/to/project
```

- 输出必须包含：
  - 我当前在哪个阶段
  - 当前阶段目标是什么
  - 当前最重要的阻塞是什么
  - 我下一步应该做什么
  - 为什么应该做这一步
  - 推荐使用 Codex、Claude Code 还是人工处理
  - 推荐命令或推荐自然语言
  - 做完后系统会检查什么
- 输出不应该包含：
  - 大段流程科普
  - 复杂组织管理语言
  - 与当前研发动作无关的指标
  - 没有行动价值的状态列表
- 验收标准：
  - 新人打开项目后，运行一次 `guide` 就知道自己该从哪开始。
  - 老研发中断一天后，运行一次 `guide` 就能恢复上下文。
  - 任务失败后，运行一次 `guide` 能知道如何恢复。
  - 输出最多给 3 个下一步建议，第一条必须是推荐动作。

### D4. 阶段推进保持简单

- 原则：
  - 阶段状态只记录当前阶段和必要日志。
  - 不复制 Git 状态。
  - 不做复杂 rollback 系统。
  - 阶段推进前只检查必要产物和质量报告。
- 验收标准：
  - `project.yml.currentStage` 与 `state/current` 一致。
  - timeline 记录阶段变更原因。

## 10. E. 任务与范围

### E1. 任务创建核心

- 命令目标：

```bash
npm run task:create -- "实现用户登录"
```

- 生成：
  - `.ai-first/tasks/task-*.yml`
  - `.ai-first/change-scopes/scope-*.yml`
- 字段：
  - title
  - description
  - domainIds
  - owner
  - reviewer
  - status
  - priority
  - acceptanceCriteria
  - changeScopeId
- 验收标准：
  - 每个 AI 执行任务都有明确边界和验收条件。

### E2. ChangeScope 自动推断

- 任务：从自然语言、domain paths、git diff 中推断 scope。
- 支持：
  - frontendPaths
  - backendPaths
  - algorithmPaths
  - dataPaths
  - infraPaths
  - docsPaths
  - domainPaths
- 验收标准：
  - 跨前端/后端/算法任务能生成多域 scope。

### E3. 轻量冲突检测

- 任务：检测 active tasks 的路径重叠和契约重叠。
- 原则：
  - 只预警，不做复杂锁。
  - 代码冲突交给 Git。
  - 任务协调交给研发人员。
- 验收标准：
  - 创建任务时能提示“可能和某任务改同一目录/契约”。

### E4. 任务状态保持轻量

- 状态只保留：
  - todo
  - in_progress
  - blocked
  - review_pending
  - done
  - canceled
- 不做：
  - 复杂工作流引擎
  - 多级审批
  - 人员考核状态
- 验收标准：
  - 状态变化写入 task 文件和 timeline。

## 11. F. Codex 执行闭环

F 是关键路径风险项。只有 Codex 输出能稳定落入结构化协议，`task -> Codex -> report -> guide` 主链路才真正成立。因此必须先做契约 fixture，再做执行 CLI。

### F0. Codex prompt v0 与输出协议契约测试

- 任务：在实现 `task:exec` 前，先定义最小 prompt v0，并用它采集 Codex 输出，验证输出是否能被稳定解析。
- prompt v0 最小要求：
  - 任务目标
  - change scope
  - 相关 standards
  - 验收条件
  - 必须输出的结构化字段
  - 失败或部分完成时如何声明
- 样本来源：
  - 至少 1 个真实小型代码修改任务
  - 至少 1 个真实补测试或修 bug 任务
  - 至少 1 个失败、部分完成或半真实样本
- 交付物：
  - `fixtures/codex-output/*.txt` 或等价测试 fixture
  - 输出 schema 或解析器测试
  - parse failed / partial completion 的降级样本
- 验收标准：
  - 至少 2 个真实 Codex 输出样本能被解析。
  - 至少 1 个失败、部分完成或 parse failed 样本能走降级路径。
  - 解析器能区分 `done`、`review_pending`、`blocked`、`partial`、`parse_failed`。
  - 解析失败时生成 blocked report，不更新成成功状态。

### F1. `task:exec` CLI

- 命令目标：

```bash
npm run task:exec -- /path/to/project --task .ai-first/tasks/task-xxx.yml --runtime codex
```

- 功能：
  - 读取 project.yml
  - 读取 domains
  - 读取 standards
  - 读取 runtime/codex.yml
  - 读取 task 和 scope
  - 生成 Codex prompt
  - 调用 CodexAdapter
  - 写 execution report
  - 更新 task 状态
  - 写 timeline
- 验收标准：
  - Codex 能执行一个真实小任务，并写回 `.ai-first/reports/`。

### F2. Codex prompt 模板

- 路径：
  - `.ai-first/runtime/prompts/codex/implement.md`
  - `.ai-first/runtime/prompts/codex/review.md`
  - `.ai-first/runtime/prompts/codex/test.md`
  - `.ai-first/runtime/prompts/codex/fix.md`
  - `.ai-first/runtime/prompts/codex/algorithm-eval.md`
- prompt 必须包含：
  - 当前阶段
  - 任务描述
  - change scope
  - domain 标准
  - 验收条件
  - 输出格式
- 实施要求：
  - 先提供 F0 使用的 prompt v0 最小版。
  - F0 样本稳定后，再扩展 implement/review/test/fix/algorithm-eval 等完整模板。
  - prompt 变更后，必须重新跑 Codex 输出 fixture，避免旧样本失效。
- 验收标准：
  - 不同类型任务能生成不同 prompt。

### F3. Codex 输出协议

- 输出字段：
  - status
  - summary
  - filesChanged
  - commandsRun
  - testsRun
  - risks
  - blockers
  - followUps
  - knowledgeSyncNeeded
- 验收标准：
  - 可以解析输出并决定 task 是 done、review_pending 还是 blocked。

### F4. Codex 失败处理

- 覆盖：
  - timeout
  - non-zero exit
  - no output
  - output parse failed
  - partial completion
- 验收标准：
  - 失败生成 blocked report，不破坏项目状态。

## 12. G. Claude Code 对齐

### G1. Claude 指令调用共享核心

- 任务：把以下命令尽量改成共享核心入口：
  - `/init`
  - `/adopt`
  - `/scan`
  - `/guide`
  - `/task`
  - `/complete`
- 验收标准：
  - Claude Code 和 Codex 不维护两套不同项目逻辑。

### G2. Claude 输出归一化

- 任务：Claude agent 的执行结果也写成统一 `ExecutionReport`。
- 验收标准：
  - 后续 report/dashboard 不关心结果来自 Claude 还是 Codex。

### G3. runtime 选择建议

- 任务：根据任务类型推荐 Codex 或 Claude Code。
- 示例：
  - Codex：局部实现、补测试、修 bug
  - Claude Code：规划、复杂 review、文档整理
  - Both：高风险质量审查
- 验收标准：
  - `/guide` 能提示“建议用 Codex 执行”或“建议用 Claude 规划”。

## 13. H. 质量检查

### H1. 前端检查

- 包含：
  - typecheck
  - unit tests
  - component tests
  - accessibility smoke
  - responsive smoke
  - i18n check
- 验收标准：
  - 前端任务完成时有 frontend gate report。

### H2. 后端检查

- 包含：
  - unit tests
  - integration tests
  - API contract check
  - auth/permission check
  - error handling check
  - migration safety check
- 验收标准：
  - 后端任务完成时有 backend gate report。

### H3. 算法检查

- 包含：
  - dataset version
  - train/eval reproducibility
  - metric threshold
  - baseline comparison
  - inference contract
  - data leakage check
- 验收标准：
  - 算法任务不能只以“代码跑通”为完成标准。

### H4. 数据检查

- 包含：
  - schema check
  - null/outlier check
  - freshness check
  - PII check
  - lineage note
- 验收标准：
  - 数据改动有 data quality report。

### H5. 跨域检查

- 包含：
  - frontend/backend API 契约
  - backend/algorithm 推理契约
  - algorithm/data schema
  - release compatibility
- 验收标准：
  - 跨域任务必须有 fullstack gate report。

## 14. I. 信息对齐与知识同步

### I1. 影响分析

- 任务：根据 change scope 和 git diff 判断哪些信息可能过期。
- 覆盖：
  - API 文档
  - domain 说明
  - standards
  - contracts
  - README
  - wiki
- 验收标准：
  - 代码变更后能提示“哪些文档或规范可能需要同步”。

### I2. SyncEvent 生成器

- 任务：生成 `.ai-first/sync/sync-*.yml`。
- 字段：
  - trigger
  - relatedTask
  - relatedPaths
  - suggestedUpdates
  - status
- 验收标准：
  - 任务完成后能生成同步建议。

### I3. Wiki/README 更新建议

- 任务：不强制自动覆盖文档，先生成建议。
- 验收标准：
  - 研发人员可以 review 后再接受文档更新。

## 15. J. Git/CI 轻集成

### J1. Git diff 作为事实来源

- 任务：使用 Git 获取 changed files。
- 用途：
  - 推断 ChangeScope
  - 生成 SyncEvent
  - 生成 ReviewReport
- 验收标准：
  - 不复制 Git 状态，只读取 Git 信息。

### J2. PR/CI 只做轻集成

- 任务：
  - CI 运行 `scan`、`test`、`quality gates`
  - PR 展示 gate 结果
- 不做：
  - 自建 issue 系统
  - 自建 PR 系统
  - 自建分支状态管理
- 验收标准：
  - GitHub/GitLab 仍是版本和合并主入口。

### J3. Timeline 只记录关键研发事件

- 记录：
  - adopt/init
  - task created
  - task executed
  - review completed
  - stage changed
  - sync suggested
- 不记录：
  - 每个细碎状态
  - 人员活跃度
  - 管理考核信息
- 验收标准：
  - timeline 可读、可追溯、不膨胀。

## 16. K. 轻量研发视图

### K1. 通用项目状态输出

- 任务：实现轻量、即时、可执行的研发状态输出。
- 包含：
  - 当前阶段
  - 当前阶段目标
  - 活跃任务
  - 阻塞项
  - 质量风险
  - 下一步建议
  - 推荐命令
  - 推荐 runtime
- 验收标准：
  - 研发人员不用看复杂看板，也知道当前在哪、下一步该做什么。
  - 输出像导航提示，不像管理报表。
  - 建议动作必须能直接复制命令或转成一句自然语言交给 AI。

### K2. Domain 视图

- 任务：按 domain 输出状态。
- 包含：
  - frontend
  - backend
  - algorithm
  - data
  - infra
  - docs
- 验收标准：
  - 能看出哪个 domain 缺规范、缺测试、缺文档。

### K3. Dashboard 降级为辅助

- 原则：
  - 已有 React dashboard 保留，但定位为只读健康视图。
  - dashboard 只展示研发必要信息。
  - 不做人员监管。
  - 不做绩效视图。
  - 不做复杂组织报表。
  - 不把 dashboard 作为主入口；主导航体验由 `guide` / CLI / 文本报告承担。
- 展示内容限制：
  - 当前阶段
  - 活跃任务和阻塞
  - domain 健康度
  - 标准和文档同步缺口
  - 最近质量检查结果
- 验收标准：
  - dashboard 可以不用，CLI/文本报告也能完成核心工作。
  - dashboard 不能引入独有状态，所有展示来自 `.ai-first/` 文件和扫描结果。

## 17. L. 示例与文档

### L1. 官方 fixture 项目

- 任务：维护一个示例 AI 项目。
- 结构：

```text
examples/ai-project/
  apps/web/
  apps/api/
  algorithms/
  data-pipeline/
  infra/
  docs/
```

- 验收标准：
  - CI 用该 fixture 跑 init/adopt/scan/task。

### L2. 使用指南更新

- 任务：更新使用文档。
- 必须说明：
  - 如何 init
  - 如何 adopt
  - 如何 scan
  - 如何创建任务
  - 如何用 Codex 执行
  - 如何用 Claude Code 执行
  - 如何同步文档
  - 如何依赖 Git 管理版本
- 验收标准：
  - 文档里的命令都是真实可运行命令。

### L3. 标准模板说明

- 任务：解释前端、后端、算法、数据标准如何使用。
- 验收标准：
  - 新团队可以按模板落地自己的规范。

## 18. M. 产品化 CLI

### M1. 统一轻量 CLI

- 目标命令：

```bash
ai-first init
ai-first adopt
ai-first scan
ai-first guide
ai-first task create
ai-first task exec
ai-first sync
```

- 验收标准：
  - 不再要求用户知道内部 `tsx` 文件路径。

### M2. npm 包发布

- 目标：

```bash
npx ai-first adopt .
```

- 验收标准：
  - 外部项目可直接接入。

### M3. schema 兼容保持轻量

- 原则：
  - 只记录 `.ai-first` schema version。
  - 只提供必要 migration。
  - 不做复杂版本数据库。
- 验收标准：
  - 老项目能知道自己是否需要升级。

## 19. 推荐实施顺序

### 零号批次：定位与可行性校准

1. Z0 编排协议行为裁决
2. Z1 双形态体验定位补丁
3. Z2 手动/脚本试点主链路
4. Z3 Codex prompt v0 与真实输出样本
5. Z4 共享核心三层约束

目标：先确认产品入口不打架、Codex 输出可解析、真实项目主链路没有隐藏硬阻塞。

### 第一批：研发导航与执行闭环

横切约束：本批所有能力都必须按 `core` / `cli` / `claude-command` 三层实现。

1. D0 阶段评估样本验证
2. D2 阶段评估核心
3. D3 `guide` 输出契约
4. K1 通用项目状态输出
5. E1 任务创建核心
6. E2 ChangeScope 自动推断
7. F0 Codex prompt v0 与输出协议契约测试
8. F1 `task:exec` CLI
9. F2 Codex prompt 模板
10. F3 Codex 输出协议

目标：完成“adopt -> guide 明确当前位置和下一步 -> 创建任务 -> Codex 执行 -> 写报告 -> 更新任务 -> guide 给出下一步”。

### 第二批：规范和质量

1. C1 规范目录和索引固化
2. C2 团队已有规范导入规则
3. C3-C6 domain 规范补全
4. C8 规范检查入口
5. H1-H5 domain 质量检查

目标：前端、后端、算法端都能被规范约束和质量检查。

### 第三批：结构识别和信息同步

1. B1 技术栈识别
2. B2 domain 文件生成
3. B3 跨域契约识别
4. I1 影响分析
5. I2 SyncEvent 生成
6. I3 文档更新建议

目标：项目结构和信息同步更准确。

### 第四批：Claude/Codex 对齐

1. G1 Claude 指令调用共享核心
2. G2 Claude 输出归一化
3. G3 runtime 选择建议
4. J1 Git diff 接入
5. J2 CI 轻集成

目标：两个工具使用同一套项目上下文和结果协议。

### 第五批：产品化

1. M1 统一 CLI
2. L1 官方 fixture
3. L2 使用指南更新
4. L3 标准模板说明
5. M2 npm 包发布
6. M3 轻量 schema 兼容

目标：从本仓库可用，走向其他项目可安装、可复制。

## 20. 最终完成定义

### 20.1 v0.1 最小可用线

满足以下条件即可发布 v0.1，对真实研发团队试用：

1. 空项目可以通过 init 初始化，已有项目可以通过 adopt 接入。
2. 每个 domain 可以导入团队已有规范，也可以补全默认规范。
3. 任务有明确 owner、reviewer、scope 和验收条件。
4. Codex 输出协议有 fixture / schema 校验，解析失败有安全降级。
5. Codex 可以执行任务并写回 report。
6. Claude Code 可以使用同一套 `.ai-first` 控制层。
7. 阶段目标、缺口和下一步建议可通过 guide 输出。
8. 至少一个真实或接近真实的 AI 项目以手动/脚本方式验证过主链路。

v0.1 不要求完成 dashboard、npm 包发布、完整 CI 集成和所有 domain 质量门禁。

### 20.2 完整业务目标完成定义

当以下条件满足时，可以认为业务目标达成：

1. 空项目可以通过 init 初始化。
2. 已有项目可以通过 adopt 接入。
3. 前端、后端、算法、数据、infra、docs 能被识别为 domain。
4. 每个 domain 可以导入团队已有规范，也可以补全默认规范。
5. 前端、后端、算法端任务可以引用对应规范。
6. 任务有明确 owner、reviewer、scope 和验收条件。
7. Codex 输出协议有 fixture / schema 校验，解析失败有安全降级。
8. Codex 可以执行任务并写回 report。
9. Claude Code 可以使用同一套 `.ai-first` 控制层。
10. CLI 是确定性骨架、Claude Code 是自然语言增强层的定位在 README、CLAUDE.md、使用指南中一致。
11. 阶段目标、缺口和下一步建议可通过 guide 输出。
12. 至少一个真实或接近真实的 AI 项目跑通过 `adopt -> guide -> task -> Codex exec -> report -> guide` 主链路；在能力未完全实现前，可以用手动/脚本方式模拟尚未实现的环节。
13. 前端、后端、算法、数据和跨域任务都有质量检查。
14. 文档、知识和规范变化能生成同步建议。
15. Git 仍负责版本、分支、PR、合并和冲突。
16. `.ai-first` 只记录研发上下文、任务、规范、报告和必要日志。
17. dashboard 只是只读辅助健康视图，不是监管中心，不持有独有状态。
18. 研发人员能用这套脚手架更快、更安全地开发，并保持信息对齐。
