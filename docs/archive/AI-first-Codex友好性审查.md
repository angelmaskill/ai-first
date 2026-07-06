# AI-first Codex 友好性审查

## 1. 审查目的

本文档回答一个核心问题：

> 按当前 AI-first 方案实施后，是否会给 Codex 工具添麻烦，影响 Codex 的编程发挥？

结论先行：

> 当前方案的大方向满足“不给 Codex 添麻烦”的业务目标。它给 Codex 提供项目地图、任务边界、规范和验收，整体会增强 Codex 的发挥。但方案中仍有几处需要控制重量，否则可能让 Codex 变成服务流程的工具，而不是高效编程工具。

## 2. 总体判断

当前方案对 Codex 是偏友好的，原因是：

1. 明确 Codex 是重点执行 runtime，而不是边缘适配对象。
2. `.ai-first/` 提供项目结构、domain、standards、tasks、reports 等共享上下文。
3. `task:exec` 让 Codex 接收结构化任务，而不是临时聊天式需求。
4. prompt v0 和真实 Codex 输出样本能提前验证协议是否可行。
5. parse failed、partial、blocked 等状态让失败可恢复，不会污染项目状态。
6. `guide` 会推荐什么时候用 Codex，什么时候用 Claude Code 或人工判断。

所以，AI-first 如果按“导航、上下文、边界、验收、回写”的定位实现，不会削弱 Codex，反而会减少 Codex 的无效探索和误改风险。

## 3. 哪些设计会增强 Codex

### 3.1 共享项目上下文

Codex 最怕每次进入项目都缺上下文。AI-first 提供：

- project.yml
- domains
- standards
- tasks
- change scopes
- runtime profiles
- reports

这能让 Codex 更快知道：

- 代码在哪
- 当前任务是什么
- 哪些文件相关
- 要遵守哪些规范
- 完成后要跑什么检查

### 3.2 任务边界清晰

`task` 和 `ChangeScope` 能让 Codex 知道当前任务边界，减少无关改动。

好的任务边界示例：

```text
目标：实现登录接口错误处理
允许修改：src/backend/auth/**, src/backend/errors/**
相关标准：backend API design, error handling
验收：补单元测试，错误响应格式一致
```

这比一句“帮我改一下登录”更利于 Codex 发挥。

### 3.3 输出 report 可恢复

Codex 执行后写 report，有助于研发人员继续推进：

- 做了什么
- 改了哪些文件
- 跑了哪些命令
- 哪些测试通过
- 哪些风险还在
- 是否需要同步文档或规范

这让 Codex 的结果不只停留在聊天记录里。

### 3.4 失败状态不强行成功

当前方案要求处理：

- timeout
- non-zero exit
- no output
- output parse failed
- partial completion

这是 Codex 友好的，因为它允许真实世界里的不完整执行被正确记录，而不是强行判定 done。

### 3.5 Codex 和 Claude Code 分工明确

方案中 Codex 更适合：

- 局部实现
- 补测试
- 修 bug
- 小范围重构
- 标准整理

Claude Code 更适合：

- 探索和规划
- 复杂架构判断
- 自然语言编排
- 复杂 review 总结

这个分工能避免让 Codex承担不适合它的重型编排工作。

## 4. 可能给 Codex 添麻烦的风险点

### R1. prompt 太重

如果把当前阶段、全部标准、所有任务、完整报告、复杂角色说明都塞进 Codex prompt，会稀释真正任务目标。

风险表现：

- Codex 花太多上下文理解流程。
- 代码实现空间被压缩。
- 输出变成流程总结，而不是解决问题。

控制原则：

> 给 Codex 当前任务需要的最小上下文，不给完整项目管理包。

### R2. 输出协议字段太多

当前 F3 字段包括 status、summary、filesChanged、commandsRun、testsRun、risks、blockers、followUps、knowledgeSyncNeeded。这个规模可以接受，但不能继续膨胀。

建议保持最小字段：

```text
status
summary
filesChanged
commandsRun
testsRun
risks
blockers
followUps
knowledgeSyncNeeded
```

不建议增加：

- 人员状态
- 复杂阶段解释
- 多级审批信息
- 管理报表字段
- 与本任务无关的项目指标

### R3. ChangeScope 过窄

scope 是护栏，不是手铐。如果 scope 推断错误，Codex 可能被迫在错误边界内修问题。

必须允许 Codex 输出：

```text
status: blocked
blockers:
  - 当前 scope 不包含 src/backend/errors.ts，但该文件必须修改才能完成任务。
followUps:
  - 扩大 scope 后重新执行。
```

### R4. standards 注入过多

规范有价值，但只应注入与当前任务相关的 standards。

错误做法：

```text
把 frontend、backend、algorithm、data、security、workflow 的所有标准都塞给 Codex。
```

正确做法：

```text
当前任务只涉及 backend/auth 和 frontend/login，因此只注入 backend API design、error handling、frontend API consumption、fullstack API contract。
```

### R5. 质量门禁过早阻塞实现

质量检查应该帮助 Codex 产出可验收结果，但不应该在实现前制造过多流程负担。

推荐顺序：

1. 任务目标和 scope
2. Codex 实现
3. Codex 自检和必要测试
4. report
5. review / sync / quality gates

不推荐：

1. 先要求 Codex 阅读所有质量门禁
2. 再要求输出完整管理计划
3. 最后才允许写代码

### R6. 阶段概念压过开发任务

阶段导航服务研发人员，不应该成为 Codex 编程时的主信息。

Codex prompt 可以包含：

```text
currentStage: build
```

但不应该附带冗长的 10 阶段生命周期解释。

## 5. 当前方案是否满足“不添麻烦”

| 维度 | 当前方案表现 | 判断 |
| --- | --- | --- |
| 上下文提供 | project/domains/standards/tasks/reports 共享 | 满足 |
| 任务边界 | task + ChangeScope | 满足，但需允许 scope 扩大请求 |
| prompt 控制 | 已有 prompt v0 和 fixture 思路 | 基本满足，需明确最小任务包 |
| 输出协议 | 字段可控，有 parse failed 降级 | 满足，需禁止继续膨胀 |
| 质量检查 | 有后置 review/sync/gate | 满足，需避免前置过重 |
| 规范引用 | 有 standards check | 满足，需按需注入 |
| 阶段导航 | guide 面向研发，不是面向 Codex 主任务 | 满足 |
| 失败恢复 | blocked/partial/parse_failed | 满足 |

结论：

> 当前方案基本满足“不让脚手架影响 Codex 发挥”的业务目标，但需要把 Codex 输入明确设计成“最小任务包”，并把复杂流程放在执行前后的辅助层，而不是塞进 Codex 的主编程上下文。

## 6. 必须补充到实施中的 Codex 友好要求

### 6.1 Codex Task Packet

`task:exec` 不应直接把 `.ai-first/` 里的所有信息拼成 prompt，而应该生成一个精简任务包。

建议结构：

```yaml
goal: 实现用户登录错误处理
currentStage: build
scope:
  allowedPaths:
    - src/backend/auth/**
    - src/backend/errors/**
  askBeforeChanging:
    - src/frontend/**
standards:
  - STANDARD-012 Backend API Design
  - STANDARD-0xx Error Handling
acceptanceCriteria:
  - 错误响应格式一致
  - 覆盖 validation error 和 auth error
commandsToRun:
  - npm test -- auth
outputProtocol:
  - status
  - summary
  - filesChanged
  - commandsRun
  - testsRun
  - blockers
```

### 6.2 Prompt 长度预算

建议增加一条实施约束：

1. Codex prompt 默认只放当前任务必要信息。
2. standards 只放标题、规则摘要和相关 checklist。
3. 大文档只给路径，不全文粘贴。
4. prompt 中不解释完整生命周期。
5. prompt 应能在 2 分钟内被研发人员读懂。

### 6.3 Scope 扩大机制

Codex 必须能明确表达：

```text
当前 scope 不足，无法安全完成。
```

并输出建议扩大路径，而不是绕过边界。

### 6.4 后置检查优先

实现阶段不要让 Codex 先承担所有 review 逻辑。Codex 的主任务是实现，然后通过测试、review、sync 去验收。

### 6.5 Report 不写成长文

Codex report 应该短、结构化、可恢复，不要求写冗长过程复盘。

## 7. 建议加入原方案的约束

建议在 `docs/AI-first-多岗位AI项目脚手架剩余工作总清单.md` 中保留以下原则：

```text
AI-first 不能把 Codex 变成服务流程的工具。脚手架对 Codex 的作用应该是提供地图、边界和验收，不应该压制 Codex 的代码理解、探索和实现能力。
```

并要求：

1. Codex prompt 使用最小任务包。
2. 输出协议不继续膨胀。
3. standards 按需注入。
4. ChangeScope 允许 Codex 请求扩大。
5. 质量检查以后置验证为主。
6. 阶段信息只作为上下文，不喧宾夺主。

## 8. 最终判断

当前设计方案整体满足这个业务目标：

> 用脚手架管理项目，同时不影响 Codex 工具的发挥。

它不会天然给 Codex 添麻烦。相反，如果按当前方向并补充 Codex 友好约束，AI-first 会让 Codex 更容易发挥：

- 更快理解项目
- 更少误改范围
- 更清楚验收标准
- 更容易失败恢复
- 更容易与 Claude Code 和研发人员协作

真正需要警惕的是实现阶段的过度设计。只要始终坚持“给地图，不给手铐；给任务包，不给流程包”，这个脚手架会增强 Codex，而不是限制 Codex。
