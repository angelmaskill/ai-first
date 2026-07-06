# AI-first研发流程模拟验证报告

## 1. 验证目标

基于 `docs/AI-first-使用指南.md` 和
`docs/AI-first-研发阶段表达与操作手册.md`，构建一个可复用的模拟 AI 项目，验证研发人员在不同阶段、不同场景下使用 AI-first 控制层是否符合预期。

本模拟项目选择放在 `examples/ai-project-lifecycle-sim/`。原因：

- `examples/legacy-fullstack/` 过于简单，只包含 frontend/backend placeholder，适合 brownfield smoke test，但不足以覆盖算法、数据、规范同步和阶段门。
- 新建独立样例不会污染已有示例，也便于后续作为回归 fixture 持续演进。
- 样例无外部依赖，`npm test`、`npm run typecheck`、`npm run lint` 均使用 Node.js 内置能力，适合本地和 CI 复跑。

## 2. 模拟项目结构

```text
examples/ai-project-lifecycle-sim/
  frontend/src/dashboard.mjs
  backend/src/recommendations.mjs
  algorithm/src/ranker.mjs
  data/catalog.json
  shared/contracts.mjs
  docs/product-notes.md
  tests/recommendations.test.mjs
  scripts/typecheck.mjs
  scripts/lint.mjs
  .ai-first/
```

覆盖的研发域：

- frontend
- backend
- algorithm
- data
- shared
- docs
- standards
- sync
- stage gate

## 3. 已验证场景

| 场景 | 对应手册入口 | 验证命令/操作 | 结果 |
| --- | --- | --- | --- |
| 已有项目接入 | `这是一个已有项目，帮我接入 AI-first` / `/adopt` | `npm run adopt -- examples/ai-project-lifecycle-sim` | 通过，创建 `.ai-first/`，初始阶段为 `build` |
| 多 domain 扫描 | `/scan` / `npm run scan:domains:write` | `npm run scan:domains:write -- examples/ai-project-lifecycle-sim --max-depth=4` | 通过，识别 6 个 domain |
| 查看当前位置 | `项目现在什么情况？下一步该做什么？` / `/guide` | `npm run guide -- examples/ai-project-lifecycle-sim` | 通过，能输出阶段、目标、下一步和推荐 runtime |
| 创建跨域任务 | `/task "任务标题"` | `task-cli.ts create "增强推荐解释链路" --domain frontend/backend/algorithm ...` | 通过，生成 task + change scope，风险为 high |
| Codex 执行闭环 | `用 Codex 执行这个任务，完成后写 report` | `task-exec-cli.ts --runtime codex --dry-run --allow-dirty` | 通过，写入 `ExecutionReport.status=done` |
| Claude Code 执行闭环 | `用 Claude Code 执行这个任务` | `task-exec-cli.ts --runtime claude-code --dry-run --allow-dirty` | 通过，写入 `runtime: claude-code` |
| report 字段命名 | M-4 命名债 | 检查 report YAML | 通过，使用 `runtimeStdout` / `runtimeExitCode`，无 `codexStdout` |
| build 未完成不能提测 | 阶段推进 `/advance` | 缺 `implementation-summary.md` 时跑 `stage-gate build qa` | 通过，阻塞 |
| build 完成后可提测 | 阶段推进 `/advance` | 补 `implementation-summary.md` 后跑 `stage-gate build qa` | 通过，放行 |
| active task 阻塞推进 | 研发未完成不能推进 | 临时加入 `in_progress` build task 后跑 `stage-gate build qa` | 通过，阻塞 |
| QA 无 review 阻塞发布 | `/review` / `/advance` | `.ai-first/reviews/` 为空时跑 `stage-gate qa release` | 通过，阻塞 |
| QA failed review 阻塞发布 | `/review` / `/advance` | 写 `Verdict: FAILED` 后跑 `stage-gate qa release` | 通过，阻塞 |
| QA passed review 放行 | `/review` / `/advance` | 写 `Verdict: PASSED` + release artifacts | 通过，放行 |
| 规范放置与同步 | `/standards` / `/sync` | 写入 frontend/backend/algorithm standards，跑 `sync --files ...` | 通过，生成 3 个 SyncEvent |
| pending sync 阻塞发布 | `/sync` / `/advance` | SyncEvent 为 `suggested` 时跑 `stage-gate qa release` | 通过，阻塞 |
| sync 确认后放行 | `/sync` / `/advance` | 将 SyncEvent 标记 `confirmed` 后重跑 gate | 通过，放行 |
| release→operate | 发布准备 | `stage-advance release operate` | 通过 |
| operate→evolve | 运维到迭代复盘 | `stage-gate operate evolve` + `stage-advance operate evolve` | 通过 |
| evolve→discovery | 生命周期闭环 | `stage-gate evolve discovery` | 通过 |
| idea→build 前半流程 | idea/discovery/spec/architecture/scaffold | 补 goals/requirements/architecture 后逐段跑 gate | 通过 |

## 4. 关键验证证据

### 4.1 adopt 识别到的 domain

`adopt` 输出包含：

- `domain-frontend` → `frontend`
- `domain-backend` → `backend`
- `domain-algorithm` → `algorithm`
- `domain-data` → `data`
- `domain-docs` → `README.md`, `docs`
- `domain-shared` → `shared`

### 4.2 Codex / Claude Code dry-run reports

已生成报告：

- `.ai-first/reports/report-task-20260706-k6zxdi-20260706T075130Z.yml`
- `.ai-first/reports/report-task-20260706-yhspt6-20260706T081302Z.yml`

关键字段：

```yaml
runtime: codex
status: done
outcomeReason: acceptance_passed
runtimeStdout: <dry-run>
runtimeExitCode: 0
```

```yaml
runtime: claude-code
status: done
outcomeReason: acceptance_passed
runtimeStdout: <dry-run>
runtimeExitCode: 0
```

### 4.3 阶段门验证

缺少 build artifact 时：

```text
build → qa: BLOCKED
blocker: build 阶段缺失 artifact: implementation-summary.md
```

补齐 artifact 后：

```text
build → qa: allowed
```

pending sync 时：

```text
qa → release: BLOCKED
blocker: 3 个 pending SyncEvent 未处理（doc-rot）
```

确认 sync 后：

```text
qa → release: allowed
```

## 5. 与预期一致的点

1. `examples/` 适合作为模拟项目位置，建议保留该样例作为后续回归 fixture。
2. `.ai-first/standards/{frontend,backend,algorithm}` 能承载团队已有规范，并能被 sync 机制识别。
3. `task:exec` 不被阶段门阻塞，符合“阶段内编码自由”目标。
4. `stage:gate` 能在阶段切换时卡住未完成任务、缺失产物、failed review 和 pending sync，符合“阶段间硬门”目标。
5. Codex 和 Claude Code dry-run 路径都能产出统一 `ExecutionReport`。
6. `evolve → discovery` 生命周期闭环可用。

## 6. 发现的偏差和建议

### P1. QA 阶段 guide 下一步建议偏实现任务

在模拟项目进入 `qa` 后，`guide` 仍推荐：

```text
创建并执行一个实现任务
```

这对 QA 阶段不够理想。更符合研发手册的建议应是：

- 运行 review / security review。
- 检查 release notes / delivery handoff。
- 处理 pending sync。
- 满足后尝试 `stage:gate qa release`。

建议后续优化 `guide-core` 的阶段特化 next-step 策略。

### P2. `stage-advance` 对 rules.lock 的输出文案不够精确

`operate → evolve` 时，底层会移除或返回 rules.lock 路径，但 CLI 统一打印：

```text
rules: ...（已锁）
```

对 evolve/discovery 这类解锁阶段，文案应改成“已解锁”或“rules.lock 已移除”。

### P3. 示例项目处于主仓库 git 下时，task:exec 归因会包含主仓库脏文件

在 `examples/ai-project-lifecycle-sim` 内运行 `task:exec` 时，git baseline 使用父级仓库，因此 report risks 包含：

```text
归因不确定：examples/ai-project-lifecycle-sim/
归因不确定：upload-page.png
```

这不是功能错误，反而说明 tainted path 机制有效。但如果希望模拟项目报告更干净，可以把 examples 样例放进独立 git fixture，或在验证脚本里明确接受该风险。

## 7. 尚未覆盖的场景

以下场景本轮没有完全自动化覆盖：

- 真实 Codex CLI 执行（本轮使用 dry-run，避免外部工具依赖）。
- 真实 Claude Code CLI 执行（本轮使用 dry-run）。
- slash command 在 Claude Code UI 内部的端到端调度。
- 安全扫描、bug-scan、reviewer-agent 的真实 agent 输出。
- break-glass 实际绕过推进（已有单元测试覆盖，本轮未在样例项目中触发，以避免污染审计）。

## 8. 结论

模拟验证显示：当前 AI-first 脚手架已经能够管理一个包含前端、后端、算法、数据和规范目录的 AI 项目，并能通过确定性命令覆盖研发手册中的核心研发场景。

最重要的业务目标成立：

- 研发人员可以在阶段内自由编码和执行任务。
- 阶段推进必须通过客观证据。
- 规范和知识同步能形成轻量但有效的安全约束。
- Codex 与 Claude Code 可以走统一 PromptExecutor / ExecutionReport 闭环。

当前最值得继续优化的是 guide 的阶段特化建议，使研发人员在 QA / release / evolve 阶段更清楚“当前该做什么、下一步该做什么”。
