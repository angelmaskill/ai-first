# AI-first vibe coding MVP 工程架构与实施路线图

## 1. 文档信息

- 文档名称：AI-first vibe coding MVP 工程架构与实施路线图
- 文档目标：定义第一版工程模块拆分、目录结构、实现顺序和阶段性里程碑
- 适用阶段：工程启动、仓库初始化、MVP 开发推进
- 当前版本：v0.1
- 状态：可进入仓库搭建与任务拆解

---

## 2. 目标

在前面产品能力地图、生命周期状态机、核心数据模型、`.ai-first/` 结构和协议设计的基础上，本文件收敛以下问题：

1. MVP 工程上应该拆成哪些模块
2. 仓库目录应该如何组织
3. 第一阶段先做哪些能力
4. 开发顺序应该如何安排
5. 如何避免 0 到 1 时做成过重平台

---

## 3. MVP 工程目标

第一版不是做“大而全控制台”，而是做一个最小可跑通的 AI 控制层引擎。

必须打通的最小闭环：

`/init or /adopt -> scan -> stage assessment -> guidance -> task -> review -> sync`

第一版完成后，应能支持：

1. 初始化新项目
2. 接管老项目
3. 识别项目当前阶段
4. 输出下一步建议
5. 创建和推进任务
6. 触发基础 review
7. 触发知识同步
8. 生成 `.ai-first/` 控制层结构

---

## 4. 技术方向建议

建议第一版优先采用：

- 核心语言：`TypeScript`
- 运行形态：`Node.js CLI + 文件系统控制层`
- 数据存储：`.ai-first/` 下的 `YAML/JSON/Markdown`
- 输出界面：CLI / terminal first
- 扩展方式：adapter + protocol + registry

原因：

1. 文件式控制层最适合新老项目共存
2. CLI 最适合先打通流程而不是先做界面
3. TypeScript 适合协议建模、adapter 设计和工具生态扩展
4. 后续若要接 Web UI，也可在同一协议层上扩展

---

## 5. 仓库模块结构建议

建议主仓库结构如下：

```txt
ai-first/
  docs/
  src/
    core/
      models/
      protocols/
      state-machine/
      orchestrator/
      analyzer/
      guidance/
      review/
      sync/
      collaboration/
    commands/
    adapters/
      tools/
      skills/
    templates/
      ai-first/
    services/
    utils/
    index.ts
  tests/
  examples/
```

---

## 6. 模块职责拆分

### 6.1 `core/models/`

职责：

- 放核心类型定义
- 放数据结构校验

包含：

- `Project`
- `ProjectSnapshot`
- `Task`
- `ChangeScope`
- `ReviewReport`
- `KnowledgeItem`
- `SkillSpec`

### 6.2 `core/protocols/`

职责：

- 放协议接口定义
- 放统一输入输出约束

包含：

- guidance protocol
- task protocol
- review protocol
- sync protocol
- skill integration protocol
- tool adapter protocol

### 6.3 `core/state-machine/`

职责：

- 放生命周期状态机定义
- 放阶段判断辅助逻辑
- 放阶段流转规则

### 6.4 `core/analyzer/`

职责：

- 分析项目结构
- 识别项目模式和阶段
- 形成 `ProjectSnapshot`

第一版建议子模块：

- `repo-scanner`
- `stage-assessor`
- `domain-detector`
- `artifact-detector`

### 6.5 `core/guidance/`

职责：

- 根据 `ProjectSnapshot` 生成 `GuidanceCard`
- 统一 `/guide` 输出

### 6.6 `core/orchestrator/`

职责：

- 串联 scan、guide、task、review、sync
- 调度 agent 角色逻辑
- 调用 skill 和 tool adapter

### 6.7 `core/review/`

职责：

- 统一 review 流程
- 汇总逻辑检查、安全检查、文档检查、知识同步检查

### 6.8 `core/sync/`

职责：

- 生成 `SyncEvent`
- 分析知识影响
- 回写知识与 wiki 更新建议

### 6.9 `core/collaboration/`

职责：

- 管理 `Task`
- 管理 `ChangeScope`
- 管理锁和冲突提示

### 6.10 `commands/`

职责：

- 提供斜杠命令或等价 CLI 命令实现

第一版建议包含：

- `init`
- `adopt`
- `guide`
- `scan`
- `sync`
- `review`

### 6.11 `adapters/tools/`

职责：

- 适配不同 AI coding tools

第一版建议：

- `codex-adapter`
- `generic-adapter`

### 6.12 `adapters/skills/`

职责：

- skill 注册
- marketplace skill 映射
- 本地 skill 加载

### 6.13 `templates/ai-first/`

职责：

- 存 `.ai-first/` 初始模板
- 支撑 `/init` 和 `/adopt`

---

## 7. 第一版命令与能力映射

### 7.1 `/init`

目标：

- 初始化新项目 `.ai-first/`
- 建立 `project.yml`
- 生成基础目录

依赖模块：

- templates
- models
- state-machine

### 7.2 `/adopt`

目标：

- 接管老项目
- 注入 `.ai-first/`
- 生成首份 snapshot 和报告

依赖模块：

- analyzer
- templates
- guidance

### 7.3 `/scan`

目标：

- 重新分析项目结构和状态
- 更新 snapshot

依赖模块：

- analyzer
- sync

### 7.4 `/guide`

目标：

- 生成当前阶段和下一步引导

依赖模块：

- analyzer
- guidance

### 7.5 `/review`

目标：

- 对当前任务或当前阶段进行 review

依赖模块：

- review
- collaboration
- sync

### 7.6 `/sync`

目标：

- 手动触发知识同步

依赖模块：

- sync
- knowledge

---

## 8. MVP 开发顺序建议

### Phase 1：基础骨架

目标：

- 初始化工程
- 落地核心模型
- 落地 `.ai-first/` 模板

完成标准：

1. 有基础 TypeScript 项目结构
2. 有核心类型定义
3. 有 `.ai-first/` 模板生成能力

### Phase 2：项目接入与扫描

目标：

- 实现 `/init`
- 实现 `/adopt`
- 实现基础仓库扫描

完成标准：

1. 新项目可初始化
2. 老项目可接管
3. 能生成首份 `ProjectSnapshot`

### Phase 3：阶段判断与引导

目标：

- 实现阶段判断
- 实现 `/guide`

完成标准：

1. 能判断主阶段和置信度
2. 能输出统一 `GuidanceCard`

### Phase 4：任务与 review

目标：

- 实现任务模型
- 实现 `ChangeScope`
- 实现 `/review`

完成标准：

1. 能创建任务
2. 能声明影响范围
3. 能生成 `ReviewReport`

### Phase 5：知识同步

目标：

- 实现 `SyncEvent`
- 实现 `/sync`
- 实现 wiki / knowledge 更新建议

完成标准：

1. 代码变更可触发同步建议
2. 手动同步可生效
3. review 可联动 sync

### Phase 6：skill 与工具适配基础版

目标：

- 接入本地 skill
- 预留 marketplace skill
- 预留 tool adapter

完成标准：

1. 至少有一个本地 skill 注册流程
2. 至少有一个 tool adapter 原型

---

## 9. MVP 第一批实现优先级

### P0

1. 核心数据模型
2. `.ai-first/` 初始化模板
3. `/init`
4. `/adopt`
5. 基础 analyzer
6. `/guide`

### P1

1. 任务系统
2. `ChangeScope`
3. `/review`
4. `/sync`
5. 基础知识库与 wiki

### P2

1. 锁机制
2. skill registry
3. tool adapter 抽象
4. reports 聚合输出

---

## 10. 第一版建议不做的事情

为保证可落地，第一版建议明确不做：

1. 完整 Web 管理后台
2. 复杂多租户权限系统
3. 大规模并行子智能体调度
4. 全量外部平台集成
5. 全自动修复和无人值守发布

原则：

第一版先证明“项目接住并带着走”这件事成立，再扩展高级能力。

---

## 11. 测试与验证建议

### 11.1 单元测试重点

1. 状态机判断
2. Guidance 生成
3. Task 与 ChangeScope 校验
4. SyncEvent 生成逻辑

### 11.2 集成测试重点

1. `/init` 是否生成完整 `.ai-first/`
2. `/adopt` 是否可接管老项目
3. `/guide` 是否能输出稳定结果
4. `/review` 与 `/sync` 是否能闭环联动

### 11.3 样例工程建议

建议准备三个示例：

1. 新项目空白示例
2. 老项目前后端分目录示例
3. 老项目全栈功能闭环示例

---

## 12. 推荐里程碑

### Milestone 1

交付：

- 项目骨架
- 核心模型
- `.ai-first/` 模板

### Milestone 2

交付：

- `/init`
- `/adopt`
- `/scan`

### Milestone 3

交付：

- 阶段判断
- `/guide`

### Milestone 4

交付：

- `Task`
- `ChangeScope`
- `/review`

### Milestone 5

交付：

- `/sync`
- knowledge / wiki 更新建议

### Milestone 6

交付：

- 本地 skill 接入
- tool adapter 基础抽象

---

## 13. 当前结论

第一版工程上最重要的不是铺很多功能，而是把核心链路做扎实：

1. 能接项目
2. 能看懂项目
3. 能告诉用户下一步
4. 能推进任务
5. 能做检查
6. 能同步知识

只要这六件事跑通，这个项目就已经具备了 AI-first vibe coding 平台的雏形。
