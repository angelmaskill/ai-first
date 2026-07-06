# AI-first 研发阶段表达与操作手册

> 🗺️ **阅读路径**：[README](../README.md) → 📗 [团队试点落地指南](AI-first-团队试点落地指南.md) → 📘 [使用指南](AI-first-使用指南.md) → 📙 **研发阶段表达与操作手册**（你在这）
>
> 本文角色：**阶段字典**——按 10 个阶段查「目标 / 表达 / 命令 / 产出 / 下一步判断」。命令清单见 §16，已知限制见 §16.4。

## 1. 文档目的

本文档汇总研发人员在 AI-first 项目开发全过程中可以使用的自然语言表达、slash command、本地命令和典型操作。

目标是让研发人员在任何阶段都能快速判断：

1. 当前可以问什么。
2. 当前可以让 AI 做什么。
3. 当前可以执行什么命令。
4. 这类操作会产生什么结果。
5. 什么时候应该进入下一步。

本文档面向研发使用，不是项目管理制度，也不是重型流程规范。

## 2. 使用总原则

### 2.1 优先自然语言

日常使用时，研发人员可以直接描述目标，例如：

```text
项目现在什么情况？我下一步该做什么？
```

```text
实现登录功能，范围包括前端登录表单、后端登录接口和必要测试。
```

AI-first 应根据 `.ai-first/` 上下文判断当前阶段、任务范围、相关规范和下一步动作。

### 2.2 需要确定性时用命令

当你想明确触发某个流程时，使用命令：

```text
/guide
/scan
/task "实现用户登录"
/review
/sync
```

或使用本地命令：

```bash
npm run adopt -- .
npm run scan:domains -- .
npm run check
```

也可用统一 CLI 入口（`npm run ai-first -- help` 列全部子命令，详见 16.3 节）。

### 2.3 有风险的动作要说清边界

涉及删除、覆盖、发布、阶段强制推进、改安全策略、改数据 schema、改算法推理契约时，要明确范围和验收：

```text
这是一次小范围 hotfix，只允许修改 backend/auth 相关路径，修完后补回归测试，不要改接口契约。
```

```text
准备发布检查，但不要自动推进 release，先列出阻塞项和风险。
```

## 3. 全局速查

| 目的 | 自然语言表达 | 命令 | 预期结果 |
| --- | --- | --- | --- |
| 看当前位置 | `项目现在什么情况？我下一步该做什么？` | `/guide` | 输出阶段、目标、阻塞、下一步 |
| 看健康度 | `看一下项目健康度和主要风险` | `/health` | 输出测试、review、sync、风险摘要 |
| 重新扫描 | `重新扫描项目结构、风险和规范缺口` | `/scan` | 生成扫描报告和阶段评估 |
| 创建任务 | `创建一个登录功能任务，包含前后端和测试` | `/task "登录功能"` | 生成 task 和 change scope |
| 执行任务 | `用 Codex 执行这个任务，完成后写 report` | `npm run task:exec -- --task <task.yml> --runtime codex` | 执行、写 report、更新状态 |
| 质量检查 | `review 最近改动，按门禁列问题` | `/review` | 生成 review 报告 |
| 完成后置链 | `对当前任务跑完整质量链` | `/complete task-id` | 执行 scan、sync、review |
| 文档同步 | `检查这次改动是否让文档或规范过期` | `/sync` | 生成同步建议 |
| 查看规范 | `当前有哪些项目标准？哪些需要补？` | `/standards` | 列出 standards 和缺口 |
| 记录决策 | `记录为什么选择这个架构方案` | `/decide "标题"` | 写入知识库决策记录 |
| 构建 wiki | `根据知识库和标准重建 wiki` | `/wiki` | 刷新 `.ai-first/wiki/` |
| 阶段推进 | `检查是否可以进入下一阶段` | `/advance` | 验证退出条件并推进 |

## 4. 阶段 1：idea

### 4.1 阶段目标

明确为什么做这个项目、解决什么问题、初始边界是什么。

### 4.2 适合使用的表达

```text
这是一个新项目，帮我初始化 AI-first 控制层，并先问清楚项目目标、用户和边界。
```

```text
我只有一个想法，先不要写代码，帮我判断这个项目要解决什么问题。
```

```text
帮我把这个 AI 项目的目标、非目标、成功标准先整理出来。
```

```text
这个项目可能包含前端、后端和算法部分，先帮我拆出大概边界。
```

### 4.3 可用操作

```text
/init /path/to/project
```

本地命令：暂无。greenfield 初始化目前只能用 `/init`（Claude Code 内），没有 npm 入口（详见 16.4 已知限制）。

### 4.4 产出

- `.ai-first/` 控制层
- `project.yml`
- 初始目标和边界
- 初始问题清单
- 下一阶段 discovery 建议

### 4.5 下一步判断

可以进入 discovery 的信号：

- 项目意图已经能用一两句话说清。
- 知道大概目标用户或使用场景。
- 知道当前最需要澄清的问题。

## 5. 阶段 2：discovery

### 5.1 阶段目标

澄清用户、场景、约束、风险和成功标准。

### 5.2 适合使用的表达

```text
先帮我梳理目标用户、核心场景、约束条件和成功标准。
```

```text
基于现有 README 和需求资料，判断这个项目真正要解决的核心问题。
```

```text
列出这个 AI 项目最可能失败的 5 个风险，并说明如何验证。
```

```text
这个需求还不清楚，先不要实现，帮我提出必须澄清的问题。
```

### 5.3 可用操作

```text
/guide
/scan
/task "需求澄清"
```

### 5.4 产出

- 用户和场景说明
- 约束与风险清单
- 成功标准
- 需求澄清任务
- 是否进入 spec 的建议

### 5.5 下一步判断

可以进入 spec 的信号：

- 核心场景已经明确。
- 约束和成功标准已经基本可判断。
- 可以拆出功能范围和优先级。

## 6. 阶段 3：spec

### 6.1 阶段目标

形成明确需求、功能范围、优先级和可交付目标。

### 6.2 适合使用的表达

```text
把当前需求整理成可开发的任务清单，按 P0/P1/P2 排优先级。
```

```text
把登录功能拆成前端、后端、测试和文档同步几个任务。
```

```text
这个需求不要先写代码，先生成验收标准和不做范围。
```

```text
帮我判断这个功能会影响哪些 domain：frontend、backend、algorithm、data。
```

### 6.3 可用操作

```text
/task "实现用户登录"
/guide
/standards
```

或用本地命令：

```bash
npm run task:create -- "实现用户登录" --domain domain-backend
```

### 6.4 产出

- 任务文件
- 验收标准
- 初始 ChangeScope
- 优先级和风险
- 相关标准列表

### 6.5 下一步判断

可以进入 architecture 或 scaffold 的信号：

- 需求边界明确。
- 验收标准可执行。
- 能判断涉及哪些代码域。

## 7. 阶段 4：architecture

### 7.1 阶段目标

确定模块边界、接口契约、技术选型和关键决策。

### 7.2 适合使用的表达

```text
为这个功能设计前端、后端、算法和数据之间的边界，不要先实现。
```

```text
判断登录功能需要哪些 API 契约、错误码和权限规则。
```

```text
如果后端要调用算法推理服务，帮我定义输入输出契约。
```

```text
记录为什么选择这种目录结构和模块边界。
```

```text
这个方案有哪些架构风险？哪些地方未来最容易返工？
```

### 7.3 可用操作

```text
/decide "登录接口错误码规范"
/standards
/guide
```

### 7.4 产出

- 架构说明
- API 契约
- 算法推理契约
- 数据 schema 影响
- 技术决策记录

### 7.5 下一步判断

可以进入 scaffold 的信号：

- 模块边界清楚。
- 关键技术决策已记录。
- 跨域契约已明确或已标记风险。

## 8. 阶段 5：scaffold

### 8.1 阶段目标

准备工程骨架、目录结构、标准目录、任务目录和基础命令。

### 8.2 适合使用的表达

```text
根据当前项目目标，生成前端、后端、算法、数据的基础目录结构。
```

```text
检查当前项目结构是否适合被 AI-first 管理，缺哪些目录？
```

```text
为这个项目补齐 standards、tasks、reports、runtime、domains 这些控制层目录。
```

```text
把团队已有的前端规范导入 .ai-first/standards/frontend。
```

### 8.3 可用操作

```text
/init /path/to/project
/adopt /path/to/project
/scan
/standards
```

当前 npm 命令：

```bash
npm run adopt -- /path/to/project
npm run scan:domains -- /path/to/project
```

### 8.4 产出

- `.ai-first/` 控制层
- domain 识别结果
- standards 目录
- runtime profiles
- 接入报告

### 8.5 下一步判断

可以进入 build 的信号：

- 项目结构已识别。
- 必要标准已存在或已有缺口清单。
- 可以创建具体开发任务。

## 9. 阶段 6：build

### 9.1 阶段目标

实现功能、修复问题、补测试、更新规范和同步文档。

### 9.2 通用实现表达

```text
实现暗黑模式。要求保留现有浅色主题，增加主题切换，补组件测试，完成后跑 typecheck、test、lint。
```

```text
实现用户登录。范围包括前端登录表单、后端登录接口、错误处理和回归测试。
```

```text
这个任务用 Codex 执行，严格限制在 change scope 内，完成后写 execution report。
```

```text
先创建任务和 ChangeScope，不要直接改代码。
```

### 9.3 前端研发表达

```text
实现登录页表单组件，遵守 frontend component conventions，补交互测试和空状态测试。
```

```text
检查这个前端改动是否影响 API consumption 标准。
```

```text
重构 Dashboard 组件，不改变 UI 行为，先锁定现有测试。
```

### 9.4 后端研发表达

```text
实现登录接口，遵守 backend API design 和 error handling 规范。
```

```text
为这个 API 补 validation、错误码、权限检查和测试。
```

```text
检查这次后端改动是否影响前端 API 契约。
```

### 9.5 算法研发表达

```text
新增模型评估任务，必须说明数据版本、指标、复现命令和模型产物路径。
```

```text
检查这个算法输出是否影响 backend inference contract。
```

```text
把 notebook 中已经稳定的逻辑迁移到可测试的源码文件。
```

### 9.6 数据研发表达

```text
修改特征数据 schema，检查是否影响算法训练和后端数据模型。
```

```text
为这个 data pipeline 增加数据质量检查：行数、必填字段、重复 key、PII。
```

```text
记录这个数据源的版本、刷新周期和下游消费者。
```

### 9.7 可用操作

```text
/task "实现用户登录"
/complete task-id
/review task-id
/sync
```

或用本地命令：

```bash
npm run task:create -- "实现用户登录" --domain domain-frontend --domain domain-backend
npm run task:exec -- --task .ai-first/tasks/task-login.yml --runtime codex
```

### 9.8 产出

- 代码变更
- 测试变更
- execution report
- review report
- sync event
- task 状态更新

### 9.9 下一步判断

可以进入 qa 的信号：

- 任务完成或进入 review_pending。
- 基础检查已通过。
- 关键文档和规范同步风险已处理或记录。

## 10. 阶段 7：qa

### 10.1 阶段目标

验证逻辑、安全、架构、文档、测试、规范和协作风险。

### 10.2 适合使用的表达

```text
review 最近改动，按 logic、security、architecture、docs、testing、consistency 列问题。
```

```text
对登录功能跑完整质量门禁，重点检查错误处理、权限和测试覆盖。
```

```text
检查这次改动是否引入 secrets、权限绕过或依赖风险。
```

```text
生成发布前关键路径 smoke test 计划。
```

### 10.3 可用操作

```text
/review
/review task-id
/complete task-id
/scan
/sync
/smoke
```

本仓库验证命令：

```bash
npm run typecheck
npm test
npm run lint
npm run check
```

### 10.4 产出

- review report
- security findings
- bug scan report
- smoke cases
- task done / blocked / review_pending 状态

### 10.5 下一步判断

可以进入 release 的信号：

- 阻塞问题已解决。
- 安全和测试检查没有 critical/high 问题。
- 文档同步建议已确认或处理。

## 11. 阶段 8：release

### 11.1 阶段目标

准备上线、发布说明、最终检查和交付确认。

### 11.2 适合使用的表达

```text
准备发布检查，确认 release notes、质量门禁、同步状态和剩余风险。
```

```text
不要直接发布，先列出 release blocker 和必须补的检查。
```

```text
生成本次发布说明，包含功能、修复、风险和未完成事项。
```

```text
检查当前是否可以从 qa 推进到 release。
```

### 11.3 可用操作

```text
/guide
/health
/review
/sync
/advance
```

### 11.4 产出

- release notes
- release checklist
- final review summary
- known risks
- stage transition 记录

### 11.5 下一步判断

可以进入 operate 的信号：

- 发布阻塞已清零或有明确接受记录。
- 文档、知识、规范同步完成。
- 交付说明可读。

## 12. 阶段 9：operate

### 12.1 阶段目标

处理线上反馈、故障、维护、监控和小范围修复。

### 12.2 适合使用的表达

```text
生产登录接口报 500，优先定位根因、修复最小范围，并补回归测试。
```

```text
这是 hotfix，只允许改 backend/auth 路径，修完后跑相关测试和安全检查。
```

```text
根据最近的线上反馈，整理需要进入下一轮 evolve 的任务。
```

```text
检查当前 operate 阶段有哪些风险和待同步文档。
```

### 12.3 可用操作

```text
/guide
/task "hotfix 登录 500"
/review
/sync
/health
```

### 12.4 产出

- hotfix task
- root cause summary
- regression test
- operation report
- evolve 候选任务

### 12.5 下一步判断

可以进入 evolve 的信号：

- 当前线上问题已处理或可控。
- 反馈和技术债已经形成下一轮任务候选。
- 项目需要进入下一轮规划。

## 13. 阶段 10：evolve

### 13.1 阶段目标

基于反馈、风险、技术债和新目标，规划下一轮迭代。

### 13.2 适合使用的表达

```text
基于当前 evolve 状态，列出下一轮最值得做的 3 个任务，并说明原因和风险。
```

```text
复盘本轮开发，哪些规范、测试、文档或架构需要改进？
```

```text
把最近的线上反馈整理成下一轮任务候选。
```

```text
检查哪些 draft 标准已经可以升级为 stable。
```

```text
判断下一轮应该优先做功能、质量、架构还是算法评估。
```

### 13.3 可用操作

```text
/guide
/health
/standards
/sync
/task "下一轮优化任务"
/advance
```

### 13.4 产出

- 下一轮任务候选
- 标准升级建议
- 技术债清单
- evolve assessment
- 下一轮 build/discovery 入口

### 13.5 下一步判断

可以回到 discovery、spec 或 build 的信号：

- 下一轮目标明确。
- 任务候选已排序。
- 风险和验收标准已明确。

## 14. 跨阶段常用表达

### 14.1 查看当前位置和下一步

```text
项目现在处于什么阶段？置信度如何？
```

```text
我下一步最应该做什么？为什么？
```

```text
如果我只做一件事，最应该先处理哪个阻塞？
```

```text
这个任务做完后，系统会检查什么？
```

### 14.2 控制范围

```text
先创建任务和 scope，不要直接改代码。
```

```text
只允许修改 src/frontend/login 相关文件。
```

```text
这个任务可能跨 frontend 和 backend，请生成多域 change scope。
```

```text
检查这个任务是否和现有 active task 有路径或契约冲突。
```

### 14.3 使用 Codex

```text
推荐是否用 Codex 执行这个任务，并说明原因。
```

```text
用 Codex 执行这个局部实现任务，必须遵守相关 standards。
```

```text
Codex 执行失败了，帮我解析 report，判断是 blocked、partial 还是 parse_failed。
```

```text
根据 Codex report 给出下一步修复建议。
```

### 14.4 使用 Claude Code

```text
先不要执行，帮我规划这个功能的边界和风险。
```

```text
把这个自然语言需求转成 task、acceptance criteria 和 change scope。
```

```text
基于 guide 结果，告诉我现在应该用 Claude 规划还是用 Codex 实现。
```

### 14.5 规范和知识

```text
当前任务涉及哪些 standards？
```

```text
这个 domain 缺哪些规范？
```

```text
把团队已有规范导入对应 standards 目录。
```

```text
这次代码变更是否让 wiki、README 或 knowledge 过期？
```

### 14.6 质量和风险

```text
列出当前最重要的质量风险。
```

```text
按严重程度列出 review findings。
```

```text
检查是否有 secrets、权限、依赖、配置风险。
```

```text
这个任务可以进入 done 吗？还缺什么检查？
```

### 14.7 阶段推进和恢复

```text
当前阶段是否满足退出条件？
```

```text
为什么不能进入下一阶段？缺哪些产物或检查？
```

```text
我昨天中断了，帮我恢复上下文并给出下一步。
```

```text
这个任务 blocked 了，帮我判断恢复路径。
```

## 15. 按角色的常用表达

### 15.1 Frontend Engineer

```text
实现这个页面组件，遵守 frontend standards，并补渲染和交互测试。
```

```text
检查这个前端改动是否影响后端 API 契约。
```

```text
这个 UI 重构不改变行为，先锁定现有测试。
```

### 15.2 Backend Engineer

```text
实现这个 API，补 validation、错误码、权限和测试。
```

```text
检查这个接口变更是否需要同步 frontend 和 fullstack standards。
```

```text
这个数据库 schema 变更会影响哪些后端模型和数据规范？
```

### 15.3 Algorithm Engineer

```text
这个算法任务必须记录数据版本、评估指标、复现命令和模型产物。
```

```text
检查模型输出变化是否影响 backend inference contract。
```

```text
把 notebook 中稳定逻辑迁移成可测试源码。
```

### 15.4 Data Engineer

```text
为这个数据管道补数据质量检查。
```

```text
这个 schema 变化会影响哪些算法特征和后端消费者？
```

```text
检查是否存在 PII 或数据泄漏风险。
```

### 15.5 QA / Reviewer

```text
review 这个任务，重点检查 logic、security、architecture、docs、testing。
```

```text
这个任务能标记 done 吗？列出阻塞项。
```

```text
为发布前关键路径生成 smoke test 计划。
```

### 15.6 Tech Lead

```text
基于当前状态，判断下一轮最值得做的 3 件事。
```

```text
这个技术决策有哪些替代方案和取舍？
```

```text
检查当前架构边界是否适合后续前端、后端、算法协作。
```

## 16. 命令清单

### 16.1 Claude Code slash command

| 命令 | 用途 |
| --- | --- |
| `/init <path>` | 初始化新项目控制层 |
| `/adopt <path>` | 接入已有项目 |
| `/guide` | 查看当前位置、阻塞和下一步 |
| `/health` | 查看项目健康度 |
| `/scan` | 重新扫描结构、安全和质量风险 |
| `/task "<title>"` | 创建结构化任务 |
| `/complete [task-id]` | 执行任务完成后的质量链 |
| `/review [task-id]` | 运行 review 和安全检查 |
| `/sync` | 检查知识、文档、标准同步 |
| `/standards` | 查看项目标准 |
| `/skills` | 查看可用技能 |
| `/decide "<title>"` | 记录技术或架构决策 |
| `/wiki` | 生成或刷新项目 wiki |
| `/advance` | 检查并推进阶段 |

### 16.2 当前可用 npm 命令（v0.1）

研发日常命令（在目标业务项目根目录执行，不是在本仓库根目录）：

| 命令 | 用途 |
| --- | --- |
| `npm run adopt -- <path>` | 接入已有项目，建立 `.ai-first/` 控制层 |
| `npm run scan:domains -- <path>` | 扫描并输出 domain（只读） |
| `npm run scan:domains:write -- <path> [--max-depth=4]` | 扫描并写入 domain 配置 |
| `npm run guide -- <path>` | 输出当前位置、下一步、推荐 runtime |
| `npm run task:create -- "标题" --domain <id> [--runtime codex]` | 创建任务 + 推断 change scope |
| `npm run task:exec -- --task <task.yml> [--runtime codex\|claude-code] [--dry-run] [--allow-dirty]` | 执行任务，写 ExecutionReport |
| `npm run sync -- --files <changed-file>` | 检查文档/规范是否过期，生成 SyncEvent |
| `npm run stage:gate -- <from> <to>` | 客观判断能否推进阶段（不接受自报完成） |
| `npm run stage:advance -- <from> <to>` | 通过 gate 后实际推进阶段 |

本仓库开发命令：

| 命令 | 用途 |
| --- | --- |
| `npm run check` | typecheck + test + lint + format check |
| `npm run typecheck` / `npm test` / `npm run lint` / `npm run format:check` | 单项检查 |
| `npm run dev` | 启动本仓库前端 dashboard |
| `npm run validate:example-lifecycle` | 跑示例 fixture 全套校验 |

### 16.3 统一 CLI 入口（与上面等价）

> **口径**：散装命令（16.2）和统一 CLI（本节）完全等价，跑的是同一份 core。**团队日常推荐散装命令**（直观、易记）；**统一 CLI 适合脚本化、CI 或只想记一个入口**。选其一即可，不必混用。

以上命令均可通过统一 CLI 触发（`src/cli/index.ts`）：

```bash
npm run ai-first -- help                 # 列出所有子命令
npm run ai-first -- guide <path>         # 等价 npm run guide
npm run ai-first -- scan --write <path>  # 等价 scan:domains:write
npm run ai-first -- pilot <path>         # dry-run 跑通主链路（adopt→guide→task→exec→sync）
npm run ai-first -- check                # typecheck + test + lint + format
```

### 16.4 已知限制

| 限制 | 说明 |
| --- | --- |
| 无 `npm run init` | greenfield（新项目）初始化目前只能通过 Claude Code 的 `/init` 完成，没有 npm 命令入口。用 Codex 的团队暂不支持纯命令行初始化新项目，需先在 Claude Code 里 `/init`。 |
| 真实 runtime 执行 | `task:exec --runtime codex/claude-code` 已接入，dry-run 验证通过；真实（非 dry-run）执行尚未在真实项目验证，建议试点首次用低风险任务跑通。 |

## 17. 典型连续工作流

### 17.1 新项目从 0 到开发

> 命令级 step-by-step 见使用指南 §1「从零开始一个项目」。greenfield 必须用 Claude Code `/init`，无 npm 入口（见 §16.4）。

```text
这是一个新 AI 项目，帮我初始化 AI-first 控制层。
```

```text
先不要写代码，帮我确认目标用户、核心场景、成功标准和不做范围。
```

```text
把需求拆成 frontend、backend、algorithm、data 相关任务。
```

```text
为 P0 登录功能创建任务和 change scope。
```

```text
推荐用 Codex 还是 Claude 执行下一步，并说明原因。
```

### 17.2 已有项目接入后开始修复

```text
这是一个已有项目，帮我接入 AI-first 并扫描结构。
```

```text
项目现在最急需补齐什么？
```

```text
为当前最高优先级问题创建任务。
```

```text
用 Codex 执行这个局部修复，完成后跑 review 和 sync。
```

### 17.3 功能开发闭环

```text
实现用户登录，先创建任务和 scope。
```

```text
检查这个任务涉及哪些 standards 和跨域契约。
```

```text
用 Codex 执行任务。
```

```text
解析 Codex report，判断任务是否完成。
```

```text
对这个任务跑完整质量门禁。
```

```text
检查文档和知识是否需要同步。
```

```text
现在下一步该做什么？
```

### 17.4 线上故障 hotfix

```text
生产登录接口报 500，进入 hotfix。只改必要路径，先定位根因。
```

```text
创建 hotfix 任务，scope 限制在 backend/auth。
```

```text
修复后补回归测试，并跑相关安全检查。
```

```text
生成 hotfix report，说明根因、修复、风险和后续建议。
```

## 18. 研发使用时的安全提示

1. 不确定范围时，先说“创建任务和 scope，不要直接改代码”。
2. 涉及跨域契约时，明确要求检查 frontend-backend、backend-algorithm、algorithm-data 影响。
3. 涉及算法时，必须要求数据版本、指标、复现入口和产物路径。
4. 涉及数据时，必须要求 schema 版本、数据质量、PII 和泄漏检查。
5. 涉及发布时，先要 release blocker，不要直接推进。
6. Codex 输出解析失败时，不要把任务标记为 done，应进入 blocked 或 partial。
7. 低置信度判断必须让研发确认，不要假装确定。

## 19. 最短记忆版

如果只记 6 句话：

```text
项目现在什么情况？我下一步该做什么？
```

```text
先创建任务和 change scope，不要直接改代码。
```

```text
这个任务涉及哪些 domain、standards 和契约？
```

```text
推荐用 Codex 还是 Claude Code，并说明原因。
```

```text
执行完成后跑 review、sync 和必要测试。
```

```text
根据 report 告诉我任务是 done、review_pending、blocked 还是 partial。
```
