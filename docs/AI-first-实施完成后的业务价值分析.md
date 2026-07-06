# AI-first 实施完成后的业务价值分析

## 1. 文档目的

本文档分析：如果严格按照 `docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md` 实施并完成，AI-first 最终能达到什么业务效果，对研发人员和项目经理分别有什么价值，适合在哪些场景使用，是否符合预期目标，以及核心亮点是什么。

本文档不是实施计划，也不是任务拆解，而是面向产品判断、团队 adoption 和对外说明的价值分析。

## 2. 最终能达到的业务效果

严格实施完成后，AI-first 会从“Claude Code-native 的项目控制层原型”升级为一套轻量、可复制、可被 Codex 和 Claude Code 共用的 AI 项目研发脚手架。

最终业务效果可以概括为：

> 研发团队可以把一个包含前端、后端、算法、数据、文档和基础设施的 AI 项目接入 `.ai-first/` 控制层，让 AI 工具随时知道项目结构、当前阶段、研发规范、任务范围、质量要求和下一步动作，从而更快、更安全地推进开发。

具体效果：

1. **项目初始化和接入标准化**
   - 新项目可以通过 init 建立 `.ai-first/` 控制层。
   - 已有项目可以通过 adopt 接入，并识别 frontend、backend、algorithm、data、infra、docs 等 domain。
   - 项目不再依赖口头说明或临时 prompt 让 AI 理解上下文。

2. **研发人员获得持续“导航感”**
   - `guide` 能告诉研发人员当前在哪个阶段、当前目标是什么、最大阻塞是什么、下一步应该做什么。
   - 输出是行动建议，不是复杂管理报表。
   - 中断一天后，研发人员可以快速恢复上下文。

3. **AI 执行任务有边界、有验收、有回写**
   - 每次 AI 执行前都有 task、owner、reviewer、ChangeScope 和 acceptance criteria。
   - Codex 可以根据 `.ai-first/` 上下文执行任务，并把结果写回 report。
   - Claude Code 可以继续通过自然语言入口调用同一套共享核心。

4. **前端、后端、算法和数据规范可维护**
   - 团队已有规范可以导入 `.ai-first/standards/{domain}/`。
   - 每个任务能引用相关规范。
   - 标准变更用 Git diff 和 review 管理，不引入复杂标准系统。

5. **质量检查和信息同步更稳定**
   - 前端、后端、算法、数据和跨域任务都有对应质量检查入口。
   - 接口、推理契约、数据 schema、文档和规范变化能产生同步建议。
   - AI 生成代码后，不只停留在“代码改了”，还会进入 report、review、sync 的闭环。

6. **多 AI runtime 共享同一项目事实**
   - Codex、Claude Code、CLI、CI 读取同一套 `.ai-first/` 文件。
   - 不需要为不同 AI 工具维护多套项目说明。
   - 后续接入更多 runtime 时，扩展成本更低。

## 3. 对研发人员的价值

### 3.1 更快进入状态

研发人员接手一个项目时，不需要先翻 README、问同事、读一堆历史文档才能知道该做什么。运行 `guide` 或直接问：

```text
项目现在什么情况？我下一步该做什么？
```

系统应返回当前阶段、目标、阻塞、推荐动作和推荐命令。

### 3.2 更安全地使用 Codex / Claude Code

AI 不再只是根据一次性 prompt 猜项目规则，而是读取：

- project.yml
- domains
- standards
- tasks
- change scopes
- reports
- runtime profiles

这会降低 AI 改错范围、忽略规范、漏补测试、忘记文档同步的概率。

### 3.3 减少重复解释项目上下文

以前每次让 AI 做事，都要重复解释：

- 前端在哪
- 后端在哪
- 算法代码在哪
- 测试怎么跑
- 代码规范是什么
- 当前任务边界是什么

实施完成后，这些信息沉淀到 `.ai-first/`，Codex 和 Claude Code 都能读取。

### 3.4 更适合多人协作

每个任务都有明确范围和状态，系统能提示路径或契约重叠。它不替代 Git，也不做复杂审批，但能让研发人员更早知道：

- 我会改哪些目录？
- 是否会影响前后端契约？
- 是否会影响算法推理接口？
- 是否会影响数据 schema？
- 是否可能和别人正在做的任务冲突？

### 3.5 让 AI 输出更可验收

Codex 执行后不只是给一段聊天回复，而是要输出结构化 report，包括：

- status
- summary
- filesChanged
- commandsRun
- testsRun
- risks
- blockers
- followUps
- knowledgeSyncNeeded

研发人员可以据此决定任务 done、review_pending、blocked 或 partial，而不是靠感觉判断。

## 4. 对项目经理的价值

这里的“项目经理”不作为 AI-first 核心角色建模，也不进入复杂权限或监管体系。但项目经理可以从 `.ai-first/` 的研发事实中获得更清晰的项目状态。

### 4.1 更容易理解研发真实进展

项目经理可以看到：

- 当前项目处于什么阶段
- 哪些任务在推进
- 哪些任务 blocked
- 哪些 domain 缺规范或测试
- 哪些质量风险还没处理
- 哪些文档或接口需要同步

这些信息来自研发过程，而不是额外填报。

### 4.2 降低跨岗位沟通成本

AI 项目常见协作断点包括：

- 前端不知道后端接口是否稳定
- 后端不知道算法推理输出是否变了
- 算法不知道数据 schema 是否更新
- 文档跟不上代码变化
- 项目经理不知道阻塞到底在哪个环节

AI-first 通过 domain、contract、task、report、sync event 把这些断点显性化。

### 4.3 更容易做风险管理

项目经理不需要进入代码细节，也能看到风险类型：

- 缺少规范
- 缺少测试
- 任务 scope 太大
- 跨域契约未同步
- Codex 执行失败或 partial
- 文档/知识过期

这使项目管理更接近真实工程状态，而不是只看“完成百分比”。

### 4.4 不引入重型管理负担

AI-first 的价值不是新增一套看板或审批系统。它依赖 Git 管理版本，依赖 `.ai-first/` 记录研发上下文，dashboard 只是只读健康视图。

因此项目经理得到的是“研发事实透明化”，不是“研发人员被监管”。

## 5. 使用场景和使用方式

### 5.1 新 AI 项目启动

适合场景：

- 新建一个包含前端、后端、算法或数据处理的 AI 项目。
- 团队希望从第一天就有统一目录、规范、任务和阶段导航。

使用方式：

```bash
npm run init -- /path/to/project
```

或在 Claude Code 中说：

```text
这是一个新 AI 项目，帮我初始化 AI-first 控制层，并先确认目标、用户、边界和下一步。
```

预期结果：

- 创建 `.ai-first/`
- 生成 project.yml
- 初始化 runtime profiles
- 初始化 standards/tasks/reports/logs 等目录
- `guide` 能告诉团队下一步该做什么

### 5.2 已有项目接入 AI-first

适合场景：

- 团队已有项目，但项目结构、规范和 AI 使用方式不统一。
- 希望让 Codex / Claude Code 理解现有代码结构。

使用方式：

```bash
npm run adopt -- /path/to/project
```

或自然语言：

```text
这是一个已有项目，帮我接入 AI-first，扫描前端、后端、算法、数据目录，并告诉我当前最急需补什么。
```

预期结果：

- 识别 domain
- 写入或合并 project.yml
- 生成接入报告
- 输出缺失规范、测试、文档和下一步建议

### 5.3 日常研发导航

适合场景：

- 研发人员不知道下一步该做什么。
- 中断后恢复上下文。
- 新成员加入项目。

使用方式：

```bash
npm run guide -- /path/to/project
```

或自然语言：

```text
项目现在什么情况？我最应该先做什么？
```

预期输出：

```text
你当前在：build 阶段
当前目标：完成登录功能的前后端闭环
当前阻塞：缺少 backend API 错误码规范
下一步建议：先补 backend/api-design 标准中的错误码约定
推荐 runtime：Codex
推荐命令：npm run task:exec -- ... --runtime codex
完成后检查：backend tests、API contract、sync suggestions
```

### 5.4 使用 Codex 执行研发任务

适合场景：

- 局部实现
- 补测试
- 修 bug
- 整理标准
- 小范围重构

使用方式：

```bash
npm run task:create -- "实现用户登录"
npm run task:exec -- /path/to/project --task .ai-first/tasks/task-login.yml --runtime codex
```

或自然语言：

```text
实现用户登录，范围包括前端登录表单、后端登录接口和必要测试。请先创建任务和 change scope，再推荐用 Codex 执行。
```

预期结果：

- 生成任务
- 推断 ChangeScope
- 读取相关 standards
- 生成 Codex prompt
- 执行后写 report
- 更新任务状态
- guide 给出下一步

### 5.5 团队导入已有规范

适合场景：

- 前端、后端、算法或数据团队已有规范文档。
- 希望 AI 执行任务时遵守这些规范。

使用方式：

把规范放到：

```text
.ai-first/standards/frontend/
.ai-first/standards/backend/
.ai-first/standards/algorithm/
.ai-first/standards/data/
```

自然语言：

```text
把团队已有的算法评估规范导入 .ai-first/standards/algorithm，并让后续算法任务必须引用它。
```

预期结果：

- 标准带上必要 frontmatter
- 出现在 standards index
- 被 task、guide、review 引用
- 通过 Git diff 管理变更

### 5.6 项目经理查看状态和风险

适合场景：

- 想了解项目真实进展。
- 想知道当前阻塞和风险。
- 想知道是否可以进入下一阶段。

使用方式：

```text
基于当前 .ai-first 状态，给我看项目当前阶段、主要风险、阻塞任务和下一步建议。
```

或查看只读 dashboard / report。

预期结果：

- 不需要研发额外填报
- 看到来自 task、report、review、sync 的真实状态
- 可以判断风险和资源协调点

## 6. 跟预期目标是否一致

结论：严格完成后，结果与当前预期目标一致，并且比最初“多岗位项目管理”方向更收敛、更可落地。

一致点：

1. **支持 Codex 和 Claude Code**
   - Codex 通过 CLI、prompt v0、输出协议和 report 闭环执行任务。
   - Claude Code 通过自然语言增强层调用共享核心。

2. **支持前端、后端、算法、数据项目结构**
   - domain 模型覆盖 frontend、backend、algorithm、data、infra、docs。
   - 标准、任务、质量检查都按 domain 组织。

3. **帮助研发人员高效、安全开发**
   - guide 提供位置感和下一步感。
   - task / scope / standards 降低 AI 乱改风险。
   - report / review / sync 让结果可验收。

4. **帮助团队对齐信息**
   - `.ai-first/` 成为项目上下文源。
   - 任务、规范、报告、知识同步建议都可以 Git diff 和 review。

5. **不变成重型管理平台**
   - 不替代 Git、Jira、Linear、GitHub Issues。
   - 不做复杂角色、权限、审批和绩效。
   - dashboard 只是只读辅助健康视图。

需要注意的边界：

1. 它不是完整项目管理软件。
2. 它不是 CI/CD 平台。
3. 它不是模型训练平台。
4. 它不是自动保证代码质量的魔法层，仍需要测试、review 和研发判断。
5. 它的核心价值在于让 AI 和研发团队共享上下文、边界、规范和下一步。

## 7. 核心亮点

### 7.1 研发导航器，而不是管理看板

AI-first 最核心的体验不是“展示很多指标”，而是让研发人员随时知道：

- 我在哪
- 我该干什么
- 为什么是这一步
- 用 Codex 还是 Claude
- 做完后检查什么

这是它区别于普通脚手架和普通项目管理工具的关键。

### 7.2 `.ai-first/` 成为 AI 项目的共享上下文层

不同 AI runtime、CLI、CI、Claude 指令都读取同一套 `.ai-first/` 文件。项目知识不再散落在聊天记录、README、口头约定和临时 prompt 中。

### 7.3 Codex 执行闭环

方案不是只说“支持 Codex”，而是设计了：

- prompt v0
- 真实输出样本
- 输出 schema
- parse failed 降级
- execution report
- task 状态回写
- guide 后续导航

这让 Codex 从“临时写代码工具”变成“可纳入研发流程的执行 runtime”。

### 7.4 面向 AI 项目的多 domain 管理

AI 项目往往不是单纯前端或后端项目，而是同时包含：

- 前端交互
- 后端 API
- 算法推理
- 数据 pipeline
- 模型产物
- 文档和基础设施

AI-first 用 domain、standards、contracts、scope 把这些协作边界显性化。

### 7.5 规范可导入、可演进、不重管理

团队已有规范可以直接进入 `.ai-first/standards/{domain}/`，不需要迁移到复杂系统里。规范变更仍然用 Git 管理，符合研发习惯。

### 7.6 低置信度不装懂

stage assessor、scope 推断、Codex 输出解析、standards check 都要求样本验证和低置信度降级。系统在不确定时应该提示研发确认，而不是伪装成确定判断。

### 7.7 从 v0.1 最小可用线到完整能力有清晰路径

方案明确 v0.1 不要求完成 dashboard、npm 包发布、完整 CI 集成和所有质量门禁。先跑通：

```text
init/adopt -> guide -> task -> Codex exec -> report -> guide
```

这让项目可以尽快进入真实试用，再根据反馈扩展。

## 8. 总体判断

如果严格完成该方案，AI-first 能达到的不是“又一个项目管理系统”，而是一套面向 AI 研发的项目上下文和执行导航层。

它对研发人员的核心价值是：少猜上下文、少重复解释、少无边界地让 AI 改代码、更快知道下一步。

它对项目经理的核心价值是：不增加填报负担，也能看到真实研发状态、风险和阻塞。

它与当前预期目标一致：让 Codex 和 Claude Code 都能管理并推进包含前端、后端、算法和数据的 AI 项目，同时保持轻量、可 Git 管理、以研发效率和安全为中心。
