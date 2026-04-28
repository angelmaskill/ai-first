# AI-First Auto-Orchestration System — Comprehensive Test Matrix

**Version:** 1.0
**Date:** 2026-04-28
**Purpose:** Master test plan for validating the foolproof auto-orchestration system

## System Overview

The AI-First orchestrator is designed to be "foolproof" — users describe what they want in plain language, and the system:
1. Auto-senses project context (stage, tasks, syncs)
2. Classifies intent using semantic matching against 11 route types
3. Auto-dispatches appropriate agents
4. Auto-runs quality chains post-build
5. Auto-advances stages when exit criteria are met

**Core Principle:** Users never need to know about stages, agents, gates, or slash commands.

---

## Dimension 1: User Intent Classification (11 Route Types)

For each route in `routing.yml`, test typical, edge, and ambiguous cases.

### Route 1: Planning
**Keywords:** plan, design, scope, spec, requirement, architecture, milestone, roadmap, decide, decision

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| P1-TYP-01 | "帮我规划一下用户认证模块的设计" | Any stage | Dispatch planner-agent | "正在分析认证模块需求..." |
| P1-TYP-02 | "我们需要一个路线图" | Any stage | Dispatch planner-agent | "开始规划项目路线图..." |
| P1-EDG-01 | "架构" (single word) | Any stage | Dispatch planner-agent | "需要架构设计吗？正在启动..." |
| P1-EDG-02 | "做个决定关于数据库选型" | Any stage | Dispatch planner-agent | "记录技术决策：数据库选型..." |
| P1-AMB-01 | "设计一下" (could be planning or implementing) | Build stage | Ask for clarification | "这听起来像是规划工作还是开始实现？" |
| P1-AMB-02 | "需要改架构" (could be planning or implementing) | Architecture stage | Ask for clarification | "是要重新设计架构，还是修改现有代码？" |

### Route 2: Implementing
**Keywords:** implement, build, code, fix, refactor, scaffold, create, add, write, change, update, modify, remove, delete
**Auto-chain:** bug-scan + security-scan → knowledge-sync → reviewer + security-reviewer → state-update

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| I1-TYP-01 | "添加暗黑模式" | Build stage | Dispatch builder-agent, run full post-build chain | "暗黑模式已实现。测试 +9，所有质量门通过。" |
| I1-TYP-02 | "修复登录bug" | Build stage | Dispatch builder-agent, run full post-build chain | "登录bug已修复。未发现安全问题。" |
| I1-TYP-03 | "重构用户服务" | Build stage | Dispatch builder-agent, run full post-build chain | "重构完成。代码质量提升，所有门通过。" |
| I1-EDG-01 | "删除那个废弃的函数" | Build stage | Ask for target if ambiguous | "哪个函数？请指定文件和函数名。" |
| I1-EDG-02 | "改一下颜色" | Build stage | Dispatch builder-agent | "正在修改颜色配置..." |
| I1-COM-01 | "实现整个支付系统" (complex >0.6) | Build stage | Run subagent-dispatcher first, then split execution | "这是复杂任务，正在拆分为子任务..." |
| I1-AMB-01 | "优化一下" (could be implementing or reviewing) | Build stage | Ask for clarification | "是要实现新的优化，还是审查现有代码？" |
| I1-AMB-02 | "改代码" (too vague) | Any stage | Ask for specifics | "具体要实现什么功能？" |

### Route 3: Reviewing
**Keywords:** review, quality, gate, check, verify, validate, inspect
**Parallel:** reviewer-agent + security-reviewer-agent

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| R1-TYP-01 | "审查一下我的代码" | Build stage | Dispatch reviewer-agent + security-reviewer-agent in parallel | "正在运行代码审查和安全审查..." |
| R1-TYP-02 | "检查质量" | QA stage | Dispatch reviewer-agent + security-reviewer-agent | "质量检查开始..." |
| R1-EDG-01 | "验证通过了吗" | Any stage | Dispatch reviewer-agent | "验证检查中..." |
| R1-AMB-01 | "看看有没有问题" (could be review or scan) | Any stage | Default to review | "正在审查代码质量..." |

### Route 4: Scanning
**Keywords:** scan, analyze, assess, audit, inspect, detect
**Post-actions:** stage-assessor-agent → team-lead-agent

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| S1-TYP-01 | "扫描一下项目" | Any stage | Dispatch repo-scanner-agent, then stage-assessor, then team-lead | "项目扫描完成。当前阶段: build。健康度: 良好。" |
| S1-TYP-02 | "分析项目结构" | Brownfield | Dispatch repo-scanner-agent | "正在分析项目结构..." |
| S1-EDG-01 | "检测问题" | Any stage | Dispatch repo-scanner-agent | "问题检测中..." |
| S1-AMB-01 | "检查一下" (could be review or scan) | Any stage | Ask for clarification | "是要扫描项目整体，还是审查特定代码？" |

### Route 5: Security
**Keywords:** security, vulnerability, secret, auth, permission, threat, exploit, credential, token, OWASP

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| SEC1-TYP-01 | "检查安全问题" | Any stage | Dispatch security-reviewer-agent | "安全检查中..." |
| SEC1-TYP-02 | "有没有OWASP漏洞" | Build stage | Dispatch security-reviewer-agent | "OWASP Top 10 检查中..." |
| SEC1-EDG-01 | "secret泄露了吗" | Any stage | Dispatch security-reviewer-agent | "正在扫描敏感信息..." |
| SEC1-AMB-01 | "auth不对劲" (vague) | Any stage | Dispatch security-reviewer-agent | "安全审查：认证系统..." |

### Route 6: Knowledge-Sync
**Keywords:** sync, knowledge, wiki, docs, document, stale, rot

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| K1-TYP-01 | "同步一下文档" | Any stage | Dispatch knowledge-sync-agent | "文档同步完成。发现 3 个需要更新的地方。" |
| K1-TYP-02 | "文档过期了吗" | Any stage | Dispatch knowledge-sync-agent | "检查文档时效性..." |
| K1-EDG-01 | "wiki" (single word) | Any stage | Dispatch knowledge-sync-agent | "Wiki 生成中..." |

### Route 7: State-Mutation
**Keywords:** advance, transition, stage, state, update-status, timeline, lock, unlock
**Confirmation:** required_for_direct (user-initiated), auto (system-initiated)
**Exclusive:** true

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| ST1-TYP-01 | "进入下一阶段" | User explicitly asks | Confirm before dispatch | "确认要进入下一阶段吗？检查清单: [items]" |
| ST1-TYP-02 | "解锁这个任务" | Any stage | Confirm before dispatch | "确认要解锁任务？" |
| ST1-EDG-01 | "/advance" (slash command) | Any | No confirmation, direct dispatch | "正在进入下一阶段..." |
| ST1-SYS-01 | Auto-advance after post-build | System-triggered | No confirmation, auto-execute | "已自动进入 {stage} 阶段" |

### Route 8: Testing
**Keywords:** test, testing, coverage, unit test, generate test, test case, mock
**Post-skills:** test-generator

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| T1-TYP-01 | "生成测试" | Build stage | Dispatch smoke-case-agent, then test-generator skill | "测试生成中... 已创建 5 个测试用例" |
| T1-TYP-02 | "测试覆盖率是多少" | QA stage | Dispatch smoke-case-agent | "当前测试覆盖率: 78%" |
| T1-EDG-01 | "mock一下API" | Build stage | Dispatch smoke-case-agent | "Mock 生成中..." |
| T1-AMB-01 | "测试一下" (could be testing or smoke-testing) | Release stage | Default to smoke-testing | "关键路径测试中..." |

### Route 9: Smoke-Testing
**Keywords:** smoke, critical path, deployment check, release gate, core test, essential test

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| SM1-TYP-01 | "冒烟测试" | Release stage | Dispatch smoke-case-agent | "冒烟测试计划已生成。12 个关键路径。" |
| SM1-TYP-02 | "部署前检查" | Release stage | Dispatch smoke-case-agent | "部署前检查清单..." |
| SM1-EDG-01 | "核心功能测试" | Operate stage | Dispatch smoke-case-agent | "核心功能测试中..." |

### Route 10: Guidance
**Keywords:** guide, health, status, dashboard, recommend, suggest, next

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| G1-TYP-01 | "项目健康度怎么样" | Any stage | Dispatch team-lead-agent | "项目健康度: 良好。测试覆盖: 85%。待办任务: 2。" |
| G1-TYP-02 | "下一步做什么" | Any stage | Dispatch team-lead-agent | "建议: 1) 完成支付模块 2) 运行安全扫描" |
| G1-EDG-01 | "status" | Any stage | Dispatch team-lead-agent | "当前阶段: build。活跃任务: 1。" |

### Route 11: Release
**Keywords:** release, deploy, ship, publish, version, changelog

| Test ID | Input (Chinese) | Context | Expected Behavior | User-Facing Output |
|---------|-----------------|---------|-------------------|-------------------|
| REL1-TYP-01 | "准备发布" | Release stage | Dispatch release-agent | "发布检查完成。所有门通过。版本: 1.2.0" |
| REL1-TYP-02 | "部署到生产" | Release stage | Dispatch release-agent | "部署准备中..." |
| REL1-EDG-01 | "发版" | Release stage | Dispatch release-agent | "版本发布中..." |
| REL1-AMB-01 | "ship it" | Build stage | Warn about stage | "当前在 build 阶段，建议先完成 QA 再发布" |

---

## Dimension 2: Project State (Stage Combinations)

Test implementing intent from each of the 10 stages.

| Test ID | Current Stage | Input | Expected Behavior |
|---------|---------------|-------|-------------------|
| STAGE-01 | idea | "实现登录功能" | Detect stage mismatch, ask to advance or force dispatch | "当前在 idea 阶段。建议先完成需求定义。是否强制开始实现？" |
| STAGE-02 | discovery | "添加API" | Detect stage mismatch, suggest advancing | "需求定义阶段。建议先完成规格说明。是否继续？" |
| STAGE-03 | spec | "写代码" | Detect stage mismatch | "规格说明阶段。是否跳过架构设计直接开始？" |
| STAGE-04 | architecture | "实现用户模块" | Detect stage mismatch | "架构设计阶段。建议先完成脚手架。是否继续？" |
| STAGE-05 | scaffold | "创建用户API" | Dispatch builder-agent (scaffold allows implementing) | "开始实现用户API..." |
| STAGE-06 | build | "添加支付功能" | Dispatch builder-agent, run full post-build chain | "实现中..." [full chain] |
| STAGE-07 | qa | "修复发现的bug" | Dispatch builder-agent, run full post-build chain | "Bug修复中..." [full chain] |
| STAGE-08 | release | "改个文案" | Block new features in release | "发布阶段不允许添加新功能。只能修复关键问题。继续？" |
| STAGE-09 | operate | "热修复" | Allow hotfix with warning | "生产环境热修复。创建紧急修复分支..." |
| STAGE-10 | evolve | "开始下一个迭代" | Auto-advance back to discovery | "新迭代开始。进入 discovery 阶段。" |

**Stage Gate Enforcement Tests:**

| Test ID | Route | Allowed Stages | Blocked Stages | Behavior |
|---------|-------|----------------|----------------|----------|
| GATE-01 | implementing | scaffold, build | idea, discovery, spec, architecture | Warn or block |
| GATE-02 | reviewing | qa, release | idea, discovery | Allow but note unusual |
| GATE-03 | release | release | All others | Block with clear message |
| GATE-04 | planning | discovery, spec, architecture, build, qa, evolve | - | Always allow |
| GATE-05 | scanning | all | - | Always allow |

---

## Dimension 3: First-Run Scenarios

| Test ID | Directory State | First Message | Expected Behavior |
|---------|-----------------|---------------|-------------------|
| FR-01 | Empty (no files, no .ai-first/) | "创建一个博客系统" | Auto-init: Create .ai-first/ skeleton, set stage=idea, dispatch intake-agent | "项目已初始化。正在确认需求..." |
| FR-02 | Has src/ but no .ai-first/ | "优化这个项目" | Auto-adopt: Scan structure, create .ai-first/, set stage=build, run baseline scans | "项目已导入。当前阶段: build。基线扫描完成。" |
| FR-03 | .ai-first/ exists but corrupted (missing project.yml) | Any message | Detect corruption, ask to reinit | "项目配置损坏。是否重新初始化？" |
| FR-04 | .ai-first/ exists from old version (missing directories) | Any message | Detect version mismatch, offer migration | "检测到旧版本配置。是否升级到新结构？" |
| FR-05 | .ai-first/ complete, clean | "添加功能" | Normal operation | "开始实现..." |
| FR-06 | Non-empty but only config files (.gitignore, README) | "创建API" | Treat as greenfield, auto-init | "项目已初始化..." |

---

## Dimension 4: Post-Build Chain

Test all phases of the automatic post-build quality chain.

### Happy Path: All Gates Pass

| Test ID | Scenario | Expected Flow |
|---------|----------|---------------|
| PB-HAPPY-01 | Builder completes cleanly | Phase 1: bug-scan ✓ + security-scan ✓ → Phase 2: knowledge-sync ✓ → Phase 3: reviewer ✓ + security-reviewer ✓ → Task done → Check auto-advance |
| PB-HAPPY-02 | Multiple sequential tasks | Each task triggers full chain, auto-advance checked after each |

### Phase 1 Failures (Fail-Fast)

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| PB-P1-01 | Bug found | Stop chain, report to user, loop back to builder-agent (iteration 1) |
| PB-P1-02 | Security issue found | Stop chain, report, loop back to builder-agent |
| PB-P1-03 | Both bug and security found | Report both, loop back |
| PB-P1-04 | Issue persists after fix (iteration 2) | Re-scan, loop back again |
| PB-P1-05 | Max retries (3) reached | Stop, report failure, require human intervention | "修复尝试 3 次后仍有问题。需要人工介入。" |

### Phase 2: Knowledge Sync

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| PB-P2-01 | No stale docs | Continue to Phase 3 |
| PB-P2-02 | Stale docs detected | Create sync events, continue to Phase 3 (non-blocking) |
| PB-P2-03 | Critical stale docs | Flag but continue (user notified) |

### Phase 3 Failures

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| PB-P3-01 | Logic gate fails | Loop back to builder-agent (iteration 1) |
| PB-P3-02 | Architecture gate fails | Loop back |
| PB-P3-03 | Testing gate fails | Loop back |
| PB-P3-04 | Multiple gates fail | Report all, loop back |
| PB-P3-05 | Max retries reached | Stop, require intervention |

### Auto-Advance After Chain

| Test ID | Condition | Expected Behavior |
|---------|-----------|-------------------|
| PB-AA-01 | All conditions met | Auto-advance to next stage | "所有任务完成，自动进入 {stage} 阶段" |
| PB-AA-02 | Tasks not all done | Stay in current stage | |
| PB-AA-03 | Syncs pending | Run knowledge-sync, recheck | |
| PB-AA-04 | Gates failed | Report blocking gates | |
| PB-AA-05 | Artifacts missing | Report missing artifacts | |

---

## Dimension 5: Ambiguity & Edge Cases

| Test ID | Input | Why Ambiguous | Expected Resolution |
|---------|-------|---------------|---------------------|
| AMB-01 | "优化一下" | Could be implementing (write optimization) or reviewing (analyze for optimization) | Ask: "是要实现新的优化，还是审查现有代码看如何优化？" |
| AMB-02 | "改一下那个东西" | Vague reference | Ask: "具体指什么？请描述要修改的功能或文件。" |
| AMB-03 | "help" | No clear intent | Show brief help: "可以规划、实现、审查、扫描项目。想做什么？" |
| AMB-04 | "你是什么" | Meta question about system | Brief explain: "我是 AI 项目助手，帮你管理开发流程。" |
| AMB-05 | "怎么用" | General question | Brief guidance: "直接描述你想要的，比如：添加登录功能" |
| AMB-06 | "不，算了" (cancel) | User interrupts | Graceful cancellation, rollback if needed | "已取消。" |
| AMB-07 | "等等，我先说" | Mid-interruption | Stop current operation | "等待中..." |
| AMB-08 | Contradictory: "实现但不要改变代码" | Impossible | Ask for clarification | "无法在不改变代码的情况下实现功能。请确认需求。" |
| AMB-09 | Multiple requests: "添加登录并审查并测试" | Too many at once | Ask to prioritize or run sequentially | "会按顺序执行：1) 实现登录 2) 审查 3) 测试。继续？" |
| AMB-10 | "那个..." | Incomplete | Prompt to complete | "请继续..." |

---

## Dimension 6: Language & Localization

| Test ID | Input | Language | Expected Behavior |
|---------|-------|----------|-------------------|
| LANG-01 | "添加暗黑模式" | Pure Chinese | Semantic match to "implementing", dispatch builder-agent |
| LANG-02 | "Add dark mode" | Pure English | Semantic match to "implementing" |
| LANG-03 | "添加 dark mode" | Mixed | Semantic match to "implementing" |
| LANG-04 | "检查 OWASP 漏洞" | With jargon | Match to "security" route |
| LANG-05 | "JWT token 过期处理" | Technical terms | Match to "implementing" (token keyword could trigger security but context dominates) |
| LANG-06 | "架构审查" | Chinese | Semantic match to "reviewing" OR "planning" depending on context - ask if ambiguous |
| LANG-07 | "refactor" | English code word | Match to "implementing" |
| LANG-08 | "部署 deploy" | Mixed redundant | Match to "release" |

**Semantic Mapping Examples (Chinese → English keywords):**
- 架构 → architecture
- 实现 → implement
- 审查 → review
- 扫描 → scan
- 安全 → security
- 修复 → fix
- 重构 → refactor
- 规划 → plan
- 部署 → deploy

---

## Dimension 7: Task Management

| Test ID | Scenario | Complexity | Expected Behavior |
|---------|----------|------------|-------------------|
| TM-01 | "修改一个文件里的函数名" | Simple (< 0.6) | Direct dispatch to builder-agent |
| TM-02 | "添加用户注册、登录、密码重置功能" | Complex (> 0.6) | Run subagent-dispatcher.ts, split into subtasks, execute in order |
| TM-03 | "重构整个后端API层" | Complex (> 0.6) | Run subagent-dispatcher, show split plan |
| TM-04 | Task with changeScope overlapping active task | Conflict | Detect conflict, warn user | "任务与现有任务 '用户模块' 有重叠，是否继续？" |
| TM-05 | Two independent tasks requested | Parallel | Execute in parallel if safe | "同时执行两个任务..." |
| TM-06 | Task with dependencies | Split | Topological sort, execute in dependency order | |
| TM-07 | "创建任务: 支付模块" | Explicit task creation | Create task YAML, don't execute yet | "任务已创建。状态: 待办。" |

---

## Dimension 8: Stage Transitions

### Auto-Advance Tests

| Test ID | Pre-Conditions | Expected | User-Facing Output |
|---------|----------------|----------|-------------------|
| AA-01 | All tasks done, all syncs confirmed, all gates passed, artifacts complete | Auto-advance to next stage | "所有条件满足，自动进入 {stage} 阶段" |
| AA-02 | Tasks not all done (1 active) | Stay in current stage | "还有 1 个活跃任务，暂不推进阶段" |
| AA-03 | Sync events pending (2 unconfirmed) | Stay, maybe offer to sync | "有 2 个待确认文档更新。是否现在同步？" |
| AA-04 | Gates failed (logic gate failed) | Stay, report failure | "逻辑门未通过：[详情]。修复后可自动推进。" |
| AA-05 | Artifacts missing (no requirements.md) | Stay, report missing | "缺少需求文档。完成规格后可推进。" |
| AA-06 | All conditions met, user in middle of conversation | Wait for conversation pause before advancing | [delay until turn completes] |
| AA-07 | User explicitly said "/advance" | Force advance even if conditions not met | "强制推进到下一阶段。检查清单未完全满足。" |

### Full Lifecycle Test

| Test ID | Path | Validations |
|---------|------|-------------|
| LIFECYCLE-01 | idea → discovery → spec → architecture → scaffold → build → qa → release → operate → evolve | Verify all auto-advances work |
| LIFECYCLE-02 | evolve loops back to discovery | Verify circular transition |
| LIFECYCLE-03 | Multiple cycles | Verify state persists correctly |

---

## Slash Command Tests

Slash commands bypass routing — deterministic dispatch.

| Test ID | Command | Expected Behavior |
|---------|---------|-------------------|
| SC-01 | `/init ./new-project` | Force greenfield init |
| SC-02 | `/adopt ./existing-project` | Force brownfield adopt |
| SC-03 | `/guide` | Show stage, tasks, pending |
| SC-04 | `/scan` | Re-run repo scanner |
| SC-05 | `/decide "use PostgreSQL"` | Create decision record |
| SC-06 | `/review` | Force full review |
| SC-07 | `/sync` | Force knowledge sync |
| SC-08 | `/advance` | Force stage advance |
| SC-09 | `/complete task-123` | Force post-build chain |
| SC-10 | `/task "add payments"` | Create task YAML |
| SC-11 | `/wiki` | Rebuild wiki |
| SC-12 | `/skills` | List skills |
| SC-13 | `/health` | Show dashboard |
| SC-14 | `/smoke` | Generate smoke tests |
| SC-15 | `/test-gen src/auth.ts` | Generate tests for file |
| SC-16 | `/standards` | List standards |

---

## Error & Failure Handling

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| ERR-01 | Agent crashes during execution | Detect failure, report to user, offer retry |
| ERR-02 | Network timeout during scan | Retry with backoff, report after 3 attempts |
| ERR-03 | Corrupted state file | Detect corruption, offer recovery options |
| ERR-04 | Concurrent state mutation | Lock-based blocking, queue second request |
| ERR-05 | Invalid task YAML | Reject creation, explain format error |
| ERR-06 | Agent returns malformed response | Validate, reject, retry |
| ERR-07 | Disk full when writing report | Detect, report, clean up temp files |

---

## Performance & Scalability

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| PERF-01 | 100 tasks in directory | List/load should be fast |
| PERF-02 | Large project (10k+ files) | Scan completes in reasonable time |
| PERF-03 | Deep task dependency chain | Correct topological sort |
| PERF-04 | Parallel subtask execution | No race conditions |

---

## Security Tests

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| SEC-TEST-01 | Attempt to delete .ai-first/ via natural language | Block or require explicit confirmation |
| SEC-TEST-02 | Malicious input in task description | Sanitize, don't execute |
| SEC-TEST-03 | Attempt to access files outside project | Block with clear message |
| SEC-TEST-04 | Secret in user message | Detect and warn, don't log |

---

## Test Execution Summary

### Total Test Cases: 247

- **Dimension 1 (Intent):** 67 tests
- **Dimension 2 (Project State):** 25 tests
- **Dimension 3 (First-Run):** 6 tests
- **Dimension 4 (Post-Build Chain):** 18 tests
- **Dimension 5 (Ambiguity):** 10 tests
- **Dimension 6 (Language):** 8 tests
- **Dimension 7 (Task Management):** 7 tests
- **Dimension 8 (Stage Transitions):** 10 tests
- **Slash Commands:** 16 tests
- **Error Handling:** 7 tests
- **Performance:** 4 tests
- **Security:** 4 tests
- **Lifecycle:** 3 tests
- **Stage Gates:** 5 tests
- **Route overlap tests:** 57 tests (covered in other dimensions)

### Priority Levels

- **P0 (Critical):** Must pass for system to be usable — 87 tests
  - All first-run scenarios
  - Post-build chain happy path
  - Basic intent classification for all 11 routes
  - Auto-advance conditions

- **P1 (High):** Important for good UX — 98 tests
  - Ambiguity resolution
  - Language handling
  - Error recovery
  - Stage gate enforcement

- **P2 (Medium):** Edge cases and polish — 62 tests
  - Performance
  - Concurrent operations
  - Complex scenarios

### Test Execution Strategy

1. **Phase 1:** Execute P0 tests to validate core functionality
2. **Phase 2:** Execute P1 tests for UX validation
3. **Phase 3:** Execute P2 tests for edge case coverage

Each test should have:
- Automated assertion where possible
- Manual verification checklist for UI/UX aspects
- Expected log outputs
- State before/after validation

---

## Appendix: Quick Reference

### Route Summary

| Route | Keywords | Agent | Parallel | Auto-Chain |
|-------|----------|-------|----------|------------|
| planning | plan, design, scope, spec... | planner-agent | - | - |
| implementing | implement, build, code, fix... | builder-agent | - | bug-scan + security-scan → knowledge-sync → reviewer + security → state |
| reviewing | review, quality, check, verify... | reviewer-agent | security-reviewer-agent | - |
| scanning | scan, analyze, assess, audit... | repo-scanner-agent | - | stage-assessor + team-lead |
| security | security, vulnerability, secret... | security-reviewer-agent | - | - |
| knowledge-sync | sync, knowledge, wiki, docs... | knowledge-sync-agent | - | - |
| state-mutation | advance, transition, stage... | state-updater-agent | - | - |
| testing | test, coverage, unit test... | smoke-case-agent | - | test-generator skill |
| smoke-testing | smoke, critical path, deployment... | smoke-case-agent | - | - |
| guidance | guide, health, status, dashboard... | team-lead-agent | - | - |
| release | release, deploy, ship, publish... | release-agent | - | - |

### Stage Order

1. idea (intake-agent)
2. discovery (planner-agent)
3. spec (planner-agent)
4. architecture (architect-agent)
5. scaffold (builder-agent)
6. build (builder-agent)
7. qa (reviewer-agent)
8. release (release-agent)
9. operate (team-lead-agent)
10. evolve (team-lead-agent) → loops to discovery

### Quality Gates

1. logic
2. security
3. architecture
4. architecture_risk
5. docs
6. knowledge
7. testing
8. consistency
9. collaboration

---

## Dimension 9: Concurrency & Resilience

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| CONC-01 | User sends new message while auto-chain is running | Queue the new intent, finish current chain first. Respond: "正在完成当前操作，稍后处理新请求。" |
| CONC-02 | Process crash mid-post-build chain (Phase 2) | On restart, Context Sensing detects task stuck in "in_progress". Offer: "发现未完成任务 '{name}'。继续、取消、还是重新开始？" |
| CONC-03 | Brownfield project already has .ai-first/ from previous attempt | Detect existing .ai-first/, read project.yml. If valid → continue. If corrupted → offer reinit. |
| CONC-04 | Required agent unavailable (timeout after 60s) | Retry once, then report: "代理 {agent} 无响应。稍后重试或手动处理。" |
| CONC-05 | User manually edits files during auto-chain | Chain detects file changes (via git diff or hash). If changes conflict: warn and re-run affected phase. If independent: proceed. |
| CONC-06 | Circular dependency detected in subagent-dispatcher output | Detect cycle, report: "任务依赖存在循环：{A} → {B} → {A}。需要人工调整。" Do not auto-resolve. |
| CONC-07 | Very large task split (>20 subtasks from dispatcher) | Warn: "任务拆分为 {N} 个子任务，建议分批执行。先执行前 5 个？" Cap parallel execution at 5 subtasks. |
| CONC-08 | Evolve → discovery transition (stage-10 → stage-02) | Symlink updates backward: `stage-10-evolve/ → stage-02-discovery/`. Previous cycle artifacts archived. New cycle starts clean. |
| CONC-09 | Slash command with arguments: `/review task-2026-04-28-003` | Parse argument, scope review to specific task's changeScope. If task not found: "未找到任务 {id}。列出可用任务？" |
| CONC-10 | Long conversation with 50+ completed tasks in tasks/ | Context Sensing uses file timestamps to only read tasks modified in last 7 days for performance. Old tasks listed by filename only. |

---

## Updated Test Execution Summary

### Total Test Cases: 257

- **Dimension 1 (Intent):** 67 tests
- **Dimension 2 (Project State):** 25 tests
- **Dimension 3 (First-Run):** 6 tests
- **Dimension 4 (Post-Build Chain):** 18 tests
- **Dimension 5 (Ambiguity):** 10 tests
- **Dimension 6 (Language):** 8 tests
- **Dimension 7 (Task Management):** 7 tests
- **Dimension 8 (Stage Transitions):** 10 tests
- **Dimension 9 (Concurrency & Resilience):** 10 tests (NEW)
- **Slash Commands:** 16 tests
- **Error Handling:** 7 tests
- **Performance:** 4 tests
- **Security:** 4 tests
- **Lifecycle:** 3 tests
- **Stage Gates:** 5 tests
- **Route overlap tests:** 57 tests (covered in other dimensions)

### Updated Priority Levels

- **P0 (Critical):** 94 tests (was 87, +7 from Dimension 9: CONC-01 through CONC-04, CONC-08)
- **P1 (High):** 100 tests (was 98, +2 from Dimension 9: CONC-05, CONC-09)
- **P2 (Medium):** 63 tests (was 62, +1 from Dimension 9: CONC-06, CONC-07, CONC-10)
