# AI-first vibe coding `.ai-first/` 目录与元数据结构设计

## 1. 文档信息

- 文档名称：AI-first vibe coding `.ai-first/` 目录与元数据结构设计
- 文档目标：定义项目级 AI 控制层的目录结构、文件职责和元数据组织方式
- 适用阶段：存储设计、工程骨架设计、老项目接入设计、MVP 实现
- 当前版本：v0.1
- 状态：可进入工程初始化实现

---

## 2. 设计目标

`.ai-first/` 是平台注入到项目中的 AI 控制层。  
它不替代业务代码目录，而是负责承载：

1. 项目状态
2. 阶段判断
3. 任务推进
4. 变更边界
5. review 结果
6. 知识沉淀
7. wiki 和标准
8. skill 与工具适配配置

设计原则：

1. 新项目和老项目统一使用同一套控制层目录
2. 老项目全栈模式下只注入一个 `.ai-first/`
3. 目录命名以“可理解、可追踪、可手动维护”为优先
4. 第一版优先文件化存储，避免过早引入复杂数据库

---

## 3. 顶层目录结构

建议第一版采用如下结构：

```txt
.ai-first/
  project.yml
  snapshots/
  tasks/
  change-scopes/
  locks/
  reviews/
  knowledge/
  standards/
    frontend/
    backend/
    fullstack/
    security/
    workflow/
  wiki/
  sync/
  reports/
  skills/
  tool-adapters/
  domains/
  logs/
```

---

## 4. 顶层目录职责说明

### 4.1 `project.yml`

作用：

- 项目稳定身份定义
- 项目模式声明
- 当前阶段记录
- 协作模式声明

建议承载：

- `Project`
- 部分稳定配置

### 4.2 `snapshots/`

作用：

- 存项目阶段判断结果
- 存结构化项目快照
- 为 `/guide`、`/scan` 提供状态依据

建议承载：

- `ProjectSnapshot`
- `StageAssessment`

### 4.3 `tasks/`

作用：

- 存任务定义、owner、reviewer、状态
- 支撑多人协作和 agent 推进

建议承载：

- `Task`

### 4.4 `change-scopes/`

作用：

- 定义一次任务的影响范围
- 支撑多人防冲突
- 支撑知识影响分析

建议承载：

- `ChangeScope`

### 4.5 `locks/`

作用：

- 记录模块占用情况
- 支持软锁和硬锁

建议承载：

- 轻量锁文件或锁索引

### 4.6 `reviews/`

作用：

- 存检查结果
- 存发布 gate、逻辑 bug、安全扫描和知识同步检查

建议承载：

- `ReviewReport`

### 4.7 `knowledge/`

作用：

- 存项目知识
- 存决策记录
- 存稳定业务事实和工作流说明

建议承载：

- `KnowledgeItem`

### 4.8 `standards/`

作用：

- 存团队可复用标准
- 从项目知识提升而来

子目录说明：

- `frontend/`：前端标准
- `backend/`：后端标准
- `fullstack/`：跨前后端交付标准
- `security/`：安全标准
- `workflow/`：流程和协作标准

### 4.9 `wiki/`

作用：

- 存对内项目 wiki
- 由项目知识、代码扫描和手动整理共同维护

### 4.10 `sync/`

作用：

- 存知识同步事件
- 存待确认同步建议

建议承载：

- `SyncEvent`

### 4.11 `reports/`

作用：

- 存对用户友好的聚合报告
- 例如安全扫描报告、接管诊断报告、阶段分析报告

### 4.12 `skills/`

作用：

- 存项目启用的本地 skill、映射信息和覆写配置

### 4.13 `tool-adapters/`

作用：

- 存当前项目支持或启用的工具能力画像与适配配置

### 4.14 `domains/`

作用：

- 存业务域和代码域映射
- 对老项目全栈模式尤为关键

### 4.15 `logs/`

作用：

- 存命令执行、同步流水和操作记录
- 第一版可作为调试与审计辅助

---

## 5. 建议的文件命名策略

### 5.1 通用原则

1. 文件名可读优先
2. 同时保留稳定唯一 ID
3. 尽量支持人工浏览和手工修复

### 5.2 推荐命名示例

- `tasks/TASK-001-order-filter.yml`
- `change-scopes/SCOPE-001-order-filter.yml`
- `reviews/REVIEW-001-order-filter.md`
- `sync/SYNC-001-order-filter.yml`
- `knowledge/KNOW-001-api-contract.md`
- `standards/fullstack/STANDARD-001-api-consistency.md`
- `domains/order-management.yml`
- `snapshots/2026-04-26T12-30-00Z.json`

---

## 6. 关键文件结构建议

### 6.1 `project.yml`

建议结构：

```yaml
id: proj_ai_first_demo
name: AI First Demo
slug: ai-first-demo
description: AI-first vibe coding scaffold demo project
mode: brownfield
teamMode: fullstack
ownershipModel: domain_based
rootPath: /path/to/project
currentStage: build
status: active
codeDomains:
  - id: frontend
    name: frontend
    kind: frontend
    paths:
      - frontend
  - id: backend
    name: backend
    kind: backend
    paths:
      - backend
createdAt: 2026-04-26T12:00:00Z
updatedAt: 2026-04-26T12:00:00Z
```

### 6.2 `tasks/*.yml`

建议结构：

```yaml
id: TASK-001
projectId: proj_ai_first_demo
title: optimize-order-filter
description: unify frontend and backend order filtering behavior
stage: build
mode: execute
domainIds:
  - order-management
owner:
  type: user
  id: engineer-a
  name: Engineer A
reviewer:
  type: agent
  id: reviewer
  name: Reviewer Agent
status: in_progress
priority: p1
changeScopeId: SCOPE-001
createdAt: 2026-04-26T12:10:00Z
updatedAt: 2026-04-26T12:10:00Z
```

### 6.3 `change-scopes/*.yml`

建议结构：

```yaml
id: SCOPE-001
projectId: proj_ai_first_demo
taskId: TASK-001
summary: order filter fullstack update
frontendPaths:
  - frontend/src/pages/orders
backendPaths:
  - backend/src/modules/orders
sharedPaths:
  - packages/shared/contracts
docsPaths:
  - docs/order-flow.md
excludedPaths:
  - backend/src/modules/payment
riskLevel: medium
parallelSafe: false
lockMode: soft
createdAt: 2026-04-26T12:10:00Z
updatedAt: 2026-04-26T12:10:00Z
```

### 6.4 `domains/*.yml`

建议结构：

```yaml
id: order-management
name: order-management
description: order domain end-to-end ownership map
frontendPaths:
  - frontend/src/pages/orders
backendPaths:
  - backend/src/modules/orders
sharedPaths:
  - packages/shared/order-types
relatedDocs:
  - docs/order-flow.md
owners:
  - engineer-a
```

### 6.5 `sync/*.yml`

建议结构：

```yaml
id: SYNC-001
projectId: proj_ai_first_demo
triggerType: code_change
relatedTaskId: TASK-001
relatedPaths:
  - frontend/src/pages/orders/list.tsx
  - backend/src/modules/orders/query.ts
impactedKnowledgeIds:
  - KNOW-001
impactedStandardIds:
  - STANDARD-001
status: suggested
summary: order filter contract changed, docs and fullstack standards may be outdated
createdAt: 2026-04-26T12:40:00Z
updatedAt: 2026-04-26T12:40:00Z
```

---

## 7. 老项目全栈模式下的组织方式

这是 `.ai-first/` 的关键使用场景之一。

### 7.1 基本原则

1. 只注入一个 `.ai-first/`
2. 前端和后端作为同一个 `Project` 的多个 `CodeDomain`
3. 通过 `domains/` 表达业务功能闭环，而不是把前后端拆成两个独立项目
4. 所有全栈任务都必须有统一 `ChangeScope`

### 7.2 为什么这样组织

如果前后端拆成两个独立 AI 控制层，会导致：

1. 阶段判断割裂
2. 需求理解割裂
3. 接口契约检查割裂
4. 知识沉淀割裂

因此推荐使用：

- 一个 `.ai-first/`
- 多个 `CodeDomain`
- 多个 `Domain Mapping`
- 多个全栈闭环 `Task`

---

## 8. 锁与冲突治理文件

### 8.1 `locks/` 结构建议

第一版可采用简单文件结构：

```txt
locks/
  frontend__src__pages__orders.lock.yml
  backend__src__modules__orders.lock.yml
```

建议字段：

```yaml
path: frontend/src/pages/orders
scopeId: SCOPE-001
taskId: TASK-001
mode: soft
owner:
  type: user
  id: engineer-a
  name: Engineer A
createdAt: 2026-04-26T12:11:00Z
expiresAt: 2026-04-26T18:11:00Z
```

### 8.2 使用原则

1. `soft` 锁提示高冲突风险
2. `hard` 锁用于关键模块高风险操作
3. 锁本身不是权限系统，而是协作协调机制

---

## 9. wiki 与知识组织建议

### 9.1 `knowledge/`

建议偏结构化、事实化、决策化。

示例：

- `knowledge/KNOW-001-project-goals.md`
- `knowledge/KNOW-002-order-api-contract.md`
- `knowledge/KNOW-003-auth-decision.md`

### 9.2 `wiki/`

建议偏可阅读、可导航、面对团队成员。

示例：

- `wiki/overview.md`
- `wiki/domains/order-management.md`
- `wiki/runbooks/release-checklist.md`

说明：

1. `knowledge/` 更像底层事实层
2. `wiki/` 更像展示和阅读层

---

## 10. standards 与 skill 的关系

### 10.1 `standards/`

承载团队确认可复用的规则、模板和检查清单。

### 10.2 `skills/`

承载可执行能力定义和项目启用配置。

两者关系：

1. `knowledge/` 是项目级事实
2. `standards/` 是团队级约定
3. `skills/` 是可执行能力封装

经验升级路径为：

`knowledge -> standard -> skill`

---

## 11. tool adapter 配置建议

`tool-adapters/` 可先采用静态配置文件。

示例：

```yaml
id: codex
toolName: codex
fileRead: true
fileWrite: true
commandExec: true
subAgents: true
memoryMode: project
slashCommands: true
reviewMode: true
skillIntegration: true
contextMode: mixed
notes:
  - supports project-level control flow
```

目标兼容对象包括：

- `codex`
- `claude-code`
- `trae`
- `qoder`

---

## 12. 报告组织建议

`reports/` 面向人类阅读和归档。

建议类型：

1. 接管诊断报告
2. 阶段分析报告
3. 安全扫描报告
4. 逻辑 bug 扫描报告
5. wiki 构建报告
6. 优化建议报告

---

## 13. MVP 落地建议

### 13.1 MVP 必须创建的目录

1. `project.yml`
2. `tasks/`
3. `change-scopes/`
4. `reviews/`
5. `knowledge/`
6. `sync/`
7. `domains/`
8. `standards/`
9. `wiki/`

### 13.2 MVP 可延后细化的目录

1. `locks/`
2. `reports/`
3. `skills/`
4. `tool-adapters/`
5. `logs/`

说明：

即便部分目录第一版功能较轻，也建议先保留目录约定，避免后续迁移成本。

---

## 14. 初始化策略

### 14.1 新项目

`/init` 时创建完整 `.ai-first/` 骨架。

### 14.2 老项目

`/adopt` 时：

1. 注入 `.ai-first/`
2. 生成 `project.yml`
3. 扫描并建立首份 `snapshot`
4. 基于扫描结果初始化 `domains/`
5. 生成首批 `knowledge/` 和 `reports/`

---

## 15. 当前结论

`.ai-first/` 的设计关键不在于“存很多文件”，而在于给平台一个稳定、可演化、可人工检查的 AI 控制层。

只要这个控制层稳定存在：

- 新项目可以从一开始就是 AI-first
- 老项目可以被渐进接管
- 全栈交付可以在同一个项目上下文里推进
- 多人协作和知识同步就有了可落盘的治理抓手
