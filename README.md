
<p align="center">
  <a href="#english"><img src="https://img.shields.io/badge/English-EN-blue?style=for-the-badge"></a>
  <a href="#中文"><img src="https://img.shields.io/badge/中文-CN-red?style=for-the-badge"></a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/AI--First-000000?style=for-the-badge&logo=robot&logoColor=white">
    <img alt="AI-First" src="https://img.shields.io/badge/AI--First-FFFFFF?style=for-the-badge&logo=robot&logoColor=black">
  </picture>
</p>

<p align="center">
  <b>The Operating System for AI-Assisted Software Development</b><br>
  <sub>AI 辅助软件开发的操作系统</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/quick_start-5_min-blue?style=flat-square">
  <img src="https://img.shields.io/badge/stage-evolve-success?style=flat-square">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square"></a>
  <img src="https://img.shields.io/badge/tests-265+-brightgreen?style=flat-square">
  <img src="https://img.shields.io/badge/agents-15-blueviolet?style=flat-square">
  <img src="https://img.shields.io/badge/platform-Claude%20Code-native-orange?style=flat-square">
  <img src="https://img.shields.io/badge/security-0_vulns-brightgreen?style=flat-square">
  <img src="https://img.shields.io/badge/ci-5_stage_pipeline-blue?style=flat-square">
</p>

---

<span id="english"></span>

Our philosophy:

```text
→ intelligent not manual      — auto-sense, auto-dispatch, auto-verify
→ foolproof not complex       — describe what you want, it figures out the rest
→ fluid not rigid             — bug fixes from any stage, ideas route to planning
→ built for real R&D           — hotfixes, iterations, brainstorming all work naturally
→ multi-lingual by design     — Chinese, English, or mixed — semantic matching handles it
```

## 🔥 Problem

**Vibe coding is broken.** When you build software with AI, you face a cascade of failure modes:

- You ask the AI to "add a login page" — it builds one, but doesn't check if it matches your auth architecture
- 3 PRs later, your docs are stale, your standards drifted, and nobody noticed
- Security scans? Test coverage? Knowledge transfer? — "We'll do it later" (never)
- 50 commits deep, you can't trace *why* a design decision was made
- Every new developer starts from zero because tribal knowledge evaporated

**AI accelerates code production but amplifies coordination debt.** Without a control plane, you're just generating entropy faster.

## 🎯 Solution

**AI-first wraps your project in a disciplined control layer that never sleeps.**

```
┌──────────────────────────────────────────────────────┐
│                  .ai-first/ Control Plane             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Routing  │ │  Tasks   │ │ Reviews  │ │Knowledge│ │
│  │ Protocol │ │  + Scope │ │ 9 Gates  │ │   Sync  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │Standards │ │  Skills  │ │Timeline  │ │ Health  │ │
│  │  + Lock  │ │ Registry │ │(append-  │ │Dashboard│ │
│  │          │ │          │ │  only)   │ │         │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
├──────────────────────────────────────────────────────┤
│        15 Specialized AI Agents (Claude Code)        │
│  intake  planner  architect  builder  reviewer  ...  │
├──────────────────────────────────────────────────────┤
│               Your Project Codebase                   │
└──────────────────────────────────────────────────────┘
```

When you say "implement X", the orchestrator:

1. **Senses** project context automatically — current stage, active tasks, pending syncs
2. **Classifies** your intent with semantic matching (Chinese/English, multilingual)
3. **Dispatches** the right agent(s) — planner before builder, reviewer after builder
4. **Splits** complex tasks into dependency-ordered subtasks for parallel execution
5. **Verifies** every task through 9 quality gates automatically (no manual `/complete`)
6. **Syncs knowledge** — checks if docs are stale, triggers updates
7. **Advances** stages automatically when exit criteria are met (no manual `/advance`)
8. **Records** everything in an append-only timeline

You still write code with AI. But now there's a conductor, not just a crowd.
And you never need to learn slash commands — just describe what you want.

## 👤 Who Is This For?

<table>
<tr><td><b>Solo developers</b></td><td>Shipping fast with AI but losing track of decisions, docs, and quality. AI-first gives you a second brain that never forgets.</td></tr>
<tr><td><b>Small teams</b></td><td>Multiple people prompting AI in parallel — who reviews what? Who owns which file? The control plane prevents collisions.</td></tr>
<tr><td><b>Engineering orgs</b></td><td>Scaling AI-assisted development requires standards, audit trails, and quality gates. AI-first provides governance without bureaucracy.</td></tr>
<tr><td><b>AI researchers</b></td><td>Experimenting with multi-agent systems? The routing protocol and agent registry are a production-ready reference implementation.</td></tr>
</table>

## 🆚 Why Not Just...?

| Approach | The Problem |
|----------|------------|
| "Just use Claude Code directly" | No lifecycle, no review gates, no knowledge persistence. Every session starts fresh. |
| "We have a PR review process" | Human reviewers miss things AI catches (and vice versa). 9 automated gates ≠ 2 human approvals. |
| "We write docs in Notion" | Docs drift from code within days. AI-first ties doc freshness to code changes automatically. |
| "We use GitHub Actions for quality" | CI gates run on push. AI-first gates run *as you build*, catching issues before they reach a branch. |
| "Cursor/Windsurf rules files" | Static rules with no lifecycle, no stage-awareness, no knowledge graph. AI-first is a dynamic control plane, not a config file. |
| "OpenSpec for spec management" | OpenSpec manages specs/artifacts well, but requires slash commands for every action. AI-first auto-orchestrates the entire lifecycle — sensing, dispatching, verifying, advancing — with zero manual triggers. |

## 🏗 Architecture

```
                         User Request (natural language)
                              │
                              ▼
              ┌───────────────────────────┐
              │    Context Sensing         │  ◄── Auto-read project state
              │    stage + tasks + syncs   │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │   Semantic Intent Match    │  ◄── Multilingual classification
              │   (routing.yml + LLM)     │
              └───────────┬───────────────┘
                          │ auto-dispatch (no confirmation)
                          ▼
              ┌───────────────────────────┐
              │   Orchestrator (CLAUDE.md) │
              │   Smart Dispatch + Chain   │
              └───────────┬───────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Lifecycle│   │ Pipeline │   │  Support │
    │  Agents  │   │  Agents  │   │  Agents  │
    ├──────────┤   ├──────────┤   ├──────────┤
    │ intake   │   │repo-scan │   │state-    │
    │ planner  │   │stage-    │   │ updater  │
    │ architect│   │ assessor │   │skill-    │
    │ builder  │   │knowledge-│   │ recommend │
    │ reviewer │   │ sync     │   │marketpl- │
    │ sec-     │   │smoke-case│   │ ace-skill│
    │ reviewer │   └──────────┘   └──────────┘
    │ release  │
    │ team-lead│
    └──────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Skills  │   │ 9 Quality│   │Frontend  │
    │ security │   │   Gates  │   │Dashboard │
    │ bug-scan │   │ per task │   │(React 19)│
    │ optimize │   └──────────┘   └──────────┘
    │ wiki-gen │
    │ test-gen │
    │prd-gen   │
    │scaffold  │
    └──────────┘
```

### Agent Model Tiering

| Tier | Model | Agents |
|------|-------|--------|
| **Strategic** | Opus 4 | intake, planner, architect, team-lead |
| **Tactical** | Sonnet 4 | builder, reviewer, security-reviewer, release, repo-scanner, stage-assessor, knowledge-sync, smoke-case |
| **Utility** | Haiku 4 | state-updater, skill-recommend, marketplace-skill |

## 📦 Project Structure

```
ai-first/
├── .ai-first/                     # ◄ The product — a self-hosting control plane
│   ├── routing.yml                #    Deterministic agent dispatch table
│   ├── project.yml                #    Project identity, stage, domains
│   ├── state/                     #    10 stage directories + "current" symlink
│   ├── standards/                 #    Full-stack coding standards (7 domains)
│   ├── knowledge/                 #    Curated project knowledge base
│   ├── tasks/                     #    Structured task YAML files
│   ├── reviews/                   #    9-gate review reports
│   ├── snapshots/                 #    ProjectSnapshot + GuidanceCard
│   ├── locks/                     #    Rules lock during build/qa/release
│   ├── logs/timeline.md           #    Immutable append-only event log
│   └── ...
├── .claude/                       #    Claude Code native configuration
│   ├── CLAUDE.md                  #    Master orchestrator prompt
│   ├── agents/*.md                #    15 agent definition files
│   ├── commands/*.md              #    14 slash command definitions
│   └── skills/*/SKILL.md          #    7 registered skills
├── src/
│   ├── core/
│   │   ├── models.ts              #    12 core data types
│   │   ├── agents/                #    Agent registry + smoke case generator
│   │   ├── harness/               #    Subagent dispatcher (topological sort)
│   │   └── tools/                 #    Tool adapter protocol (multi-platform)
│   ├── frontend/                  #    React 19 health dashboard
│   │   ├── components/            #    11 dashboard components
│   │   ├── i18n/                  #    EN/ZH translations
│   │   └── styles/                #    OKLCH design system, dark/light themes
│   └── utils/
├── scripts/
│   ├── generate-frontend-data.ts  #    Live filesystem → TS data pipeline
│   └── pre-commit.sh              #    6-check pre-commit hook
├── docs/                          #    Team-facing docs (3) + docs/archive/ dev history
└── examples/                      #    ai-project-lifecycle-sim (validation fixture)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 25
- **Claude Code** CLI (the orchestrator runs as Claude Code agents)

### Install

```bash
git clone <your-fork-or-mirror-url>   # 替换为内部 mirror 或 fork 地址
cd ai-first
npm install
```

### Bootstrap a project in Claude Code

AI-first currently runs through Claude Code-native agents and slash commands.
Open the target project in Claude Code, then use:

```text
# Start a greenfield project
/init /path/to/new-project

# Or adopt an existing project
/adopt /path/to/existing-project
```

### Just Talk — No Commands Needed

AI-first understands natural language. Describe what you want — it figures out the rest.

For a scenario-by-scenario operator guide, see
[AI-first 使用指南](docs/AI-first-使用指南.md).

**团队试点先读** [AI-first 团队试点落地指南](docs/AI-first-团队试点落地指南.md) —— 已有项目接入的命令级 step-by-step 与验收标准。

> **greenfield 限制**：`/init` 只在 Claude Code 内可用，`npm run init` 不存在。用 Codex 的团队暂不支持纯命令行初始化新项目（详见研发手册 16.4）。

```text
You: 添加暗黑模式
AI:  暗黑模式已实现。
     Phase 1: bug-scan ✓ security-scan ✓
     Phase 2: knowledge-sync ✓
     Phase 3: review ✓ security-review ✓
     Tests +9. All gates passed.
     → Auto-advanced to QA stage.

You: 生产挂了，登录报500错误
AI:  紧急修复模式。当前在 operate 阶段，允许执行修复。
     → builder-agent dispatched
     Bug fixed: missing null check in auth middleware.
     Security scan clean. All gates passed.

You: 我觉得可以加个消息推送功能
AI:  需求分析中... 这是一个新的功能想法。
     → planner-agent dispatched
     消息推送方案已梳理，包含 3 个用例和技术选型建议。
     要开始实现吗？

You: review一下最近的改动
AI:  正在运行代码审查和安全审查...
     logic           PASS
     security        PASS
     architecture    PASS
     testing         WARN — 2 paths uncovered
     consistency     PASS
     5/6 passed. Testing gate: add coverage for utils/push.ts

You: 项目现在什么情况
AI:  当前阶段: build
     活跃任务: 1 (支付模块)
     待同步文档: 0
     健康度: 测试 85 | 文档 90 | 安全 100
     建议: 完成支付模块后可自动进入 QA 阶段。
```

**Key principle:** Users never need to know about stages, agents, gates, or slash commands.
They describe what they want; the system auto-senses context, classifies intent,
dispatches agents, runs quality chains, and advances stages.

<details>
<summary><b>Advanced: Slash Commands</b></summary>

For power users who want direct access. Most users never need these.

| Command | What it does |
|---------|-------------|
| `/init <path>` | Force greenfield project initialization |
| `/adopt <path>` | Force brownfield project adoption |
| `/guide` | Show current stage and next actions |
| `/scan` | Run security + bug + optimization scans |
| `/review [task-id]` | Full 9-gate review |
| `/advance` | Force stage advance (bypasses exit checklist) |
| `/complete [task-id]` | Force post-build quality chain |
| `/decide "<title>"` | Record a technical decision |
| `/task "<title>"` | Create a structured task |
| `/wiki` | Rebuild project wiki |
| `/health` | Project health dashboard |
| `/standards` | List project standards |
| `/skills` | List registered skills |
| `/sync` | Trigger knowledge sync check |

</details>

### Launch the Dashboard

```bash
npm run dev
# → http://localhost:5173
# Dark/light mode, EN/ZH, live filesystem metrics
```

## 🔄 The 10-Stage Lifecycle

```
idea ──→ discovery ──→ spec ──→ architecture ──→ scaffold
                                                      │
                                                      ▼
        evolve ←── operate ←── release ←── qa ←── build
           │                     │         │
           └─── feedback loop ───┘         └── fix loop (max 3)
```

| Stage | Lead Agent | Exit Criteria |
|-------|-----------|---------------|
| **idea** | intake | Goals clarified, boundaries set |
| **discovery** | planner | Users, use cases, constraints defined |
| **spec** | planner | Requirements, scope, deliverables locked |
| **architecture** | architect | Module contracts, ADRs, tech decisions |
| **scaffold** | builder | Skeleton, conventions, control layer |
| **build** | builder | Features implemented, tests passing |
| **qa** | reviewer + security-reviewer | 9 gates passed, 0 critical findings |
| **release** | release | Release notes, gate verification |
| **operate** | team-lead | Incidents handled, metrics healthy |
| **evolve** | team-lead | Next iteration planned, standards updated |

Each stage has a confidence score (0-1) and three handling modes: **Generate** (from scratch), **Reuse** (existing artifacts), **Skip** (not needed).

## 🛡 Quality Gates

Every task passes through 9 gates before `done`:

| Gate | Checks |
|------|--------|
| **logic** | Control flow, edge cases, error handling, async safety |
| **security** | OWASP Top 10, secrets, dependencies, config |
| **architecture** | Module boundaries, contracts, layer violations |
| **architecture_risk** | Cyclic deps, god objects, SPOF, deep relative imports |
| **docs** | API docs, non-obvious logic, change scope accuracy |
| **knowledge** | Changed files → stale docs detected, sync events |
| **testing** | Test coverage for changed paths |
| **consistency** | Naming, conventions, file structure |
| **collaboration** | Active task changeScope overlap checks |

## 💡 Design Philosophy

### 1. Intelligent Routing > Manual Commands
Users describe what they want in plain language. The system auto-senses project context, classifies intent with semantic matching (multilingual), and dispatches agents without requiring slash commands or confirmation. Only truly ambiguous or destructive operations ask for human input. The LLM provides understanding; the routing table provides determinism.

### 2. Rules Lock During Execution
Borrowed from novel-writing AI frameworks: during build/qa/release, `standards/` are **read-only**. Code conforms to rules — rules don't change to fit code. The "bible lock" only opens during evolve.

### 3. Append-Only Truth
All events — stage transitions, task completions, decisions — are recorded in `logs/timeline.md`. Nothing is modified. Nothing is deleted. The audit trail is immutable.

### 4. Single State Mutator
Only `state-updater-agent` touches project state. Modeled after database transaction patterns. No concurrent mutations, no race conditions, always consistent.

### 5. Knowledge Sync as a First-Class Concern
Every code change triggers a staleness check. Docs don't fall behind because the system treats stale docs as a bug — not an afterthought.

## 📊 Dashboard

The React 19 health dashboard reads live filesystem data and computes:

- **Health Signals**: Test coverage, agent coverage, docs completeness, security verdict
- **Risk Heatmap**: Severity-ranked risks with expandable detail
- **Action Cards**: Suggested next actions with priority indicators
- **Trend Chart**: 7-day activity visualization
- **Timeline**: Full immutable event log

```bash
npm run dev     # Start dashboard at localhost:5173
```

## 📈 By the Numbers

```
                    Project Scale
┌─────────────────────────────────────────────────────┐
│                                                     │
│   15 agents      ████████████████░░░░  80% ops      │
│   14 commands    ███████████████░░░░░  78% ops      │
│    7 skills      ████████░░░░░░░░░░░░  35% ops      │
│   10 stages      ████████████████████  100% done     │
│    9 gates       ████████████████████  100% active   │
│   12 data types  ████████████████░░░░  80% stable    │
│  265+ tests      ████████████████████  100% passing  │
│   20 test files  ████████████████████  100% passing  │
│    0 vulns       ████████████████████  100% clean    │
│    8 docs        ████████████████████  100% complete │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🧪 Development

```bash
npm run typecheck       # TypeScript strict mode
npm test                # 265+ tests (vitest)
npm run lint            # ESLint
npm run format:check    # Prettier
npm run check           # All checks
npm run data:sync       # Regenerate frontend data from filesystem
```

### Pre-commit Hook

Automatically runs: ESLint → Prettier → typecheck → tests → frontend build → data sync. All 6 must pass.

## 🧭 Implementation status (honest, per technical plan §11.4)

This project ships both a Claude-native orchestration layer (`.claude/` Markdown) and a deterministic TypeScript control plane (`src/core/*.ts`). To avoid overstating what's wired, here is the capability breakdown:

| Capability | Status | Where |
|---|---|---|
| 10-stage lifecycle, auto-orchestration, 9 quality gates | **已可用 (Claude native)** | `.claude/` Markdown |
| `npm run adopt` / `scan:domains` / `guide` / `task:create` / `task:exec` / `sync` | **已可用 (TS core, v0.1 main line)** | `src/core/{adoption,scanners,guide,task,exec,sync}/` |
| Codex closed loop (`task:exec` → report → status) — dry-run verified | **已可用** (real Codex = manual go/no-go) | `src/core/tools/codex-adapter.ts`, `exec/` |
| Stage assessor (rule-based, no LLM) + scope inference + report collector | **已可用** (fixture-tested) | `stage/`, `task/scope-core.ts`, `exec/report-collector-core.ts` |
| Pilot walkthrough (dry-run main line) | **已可用** | `scripts/pilot-walkthrough.sh` |
| Frontend dashboard | **展示示例** (not required for v0.1; K3 degraded) | `src/frontend/` |
| `harness/executor.ts` + `routing-resolver.ts` | **实验性 / 未启用** (reuse candidates for `task:exec`) | `src/core/harness/` |
| `agents/smoke-case-generator.ts` | **实验性 / 未启用** (no `/smoke` consumer yet) | `src/core/agents/` |
| `agents/registry-loader.ts` | **实验性 / 未启用** (`dispatch-cli` uses hardcoded map) | `src/core/agents/` |
| Multi-platform adapters (Codex/Gemini/Qoder), GitHub App, team mode | **规划中** | see Roadmap |

> "实验性 / 未启用" means the code exists with tests but no live entry point consumes it yet. It does **not** count toward running capabilities.

## 🗺 Roadmap

- [x] 5-stage CI pipeline (typecheck → lint → build → test → security + bug scan)
- [x] 9-gate review system per task
- [x] Knowledge sync with stale doc detection
- [ ] Multi-platform adapters (Codex, Gemini, Qoder) — protocol defined, implementations pending
- [ ] GitHub App for PR-integrated review reports
- [ ] Team collaboration mode (multi-developer task conflict detection)
- [ ] Plugin marketplace for community skills and standards
- [ ] VS Code / JetBrains extension for dashboard overlay

## 🤝 Contributing

Contributions welcome. Check `.ai-first/standards/` for coding conventions before submitting.

1. Fork the repo
2. Create a feature branch
3. Follow the pre-commit checklist (`npm run check`)
4. Open a PR — the reviewer agent will run 9-gate review

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<span id="中文"></span>

<p align="right"><a href="#english">↑ Back to English</a></p>

# AI-first — AI 辅助软件开发的操作系统

我们的理念：

```text
→ 智能而非手动        — 自动感知、自动调度、自动验证
→ 傻瓜式而非复杂      — 描述你想要的，剩下的自动搞定
→ 灵活而非僵化        — 任何阶段都能修 Bug，想法自动路由到规划
→ 为真实研发而生      — 热修复、小迭代、头脑风暴，全部自然支持
→ 天生多语言          — 中文、英文、中英混用，语义匹配都能理解
```

**AI-first 不是代码生成器。** 它是一个元代理编排控制平面——将任意软件项目包裹在 `.ai-first/` 控制层中，由 15+ 个专业 AI 代理协同引导，穿越 10 个生命周期阶段，确保项目永不迷失方向、质量受控、知识可传承。

> **把松散的 "vibe coding" 变成可管理、可追溯、可传承的工程实践。**

## 🔥 痛点：Vibe Coding 为什么是 broken 的

用 AI 写代码会面临一连串的失败模式：

- 你让 AI "加个登录页"——它加了，但没检查是否符合你的认证架构
- 3 个 PR 之后，文档已经过时了，编码规范已经漂移了，没人注意到
- 安全扫描？测试覆盖率？知识传承？——"后面再说"（永远没有后面）
- 50 个 commit 之后，你完全想不起来当初为什么做了那个设计决策
- 每个新加入的开发者都是从零开始，因为隐性知识已经蒸发了

**AI 加速了代码生产，但也放大了协调债务。** 没有控制平面，你只是在更快地制造混乱。

## 🎯 解决方案：永不休眠的控制层

**AI-first 给你的项目包裹了一层纪律严明的控制层。**

```
┌──────────────────────────────────────────────────────┐
│                   .ai-first/ 控制平面                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │  路由协议 │ │ 任务+范围│ │ 9门禁审查│ │ 知识同步 │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 规范+锁定│ │  技能库  │ │ 时间线   │ │ 健康    │ │
│  │          │ │          │ │ (只追加) │ │  仪表板  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
├──────────────────────────────────────────────────────┤
│          15 个专业 AI 代理 (Claude Code)              │
│   intake  planner  architect  builder  reviewer ...  │
├──────────────────────────────────────────────────────┤
│                  你的项目代码库                        │
└──────────────────────────────────────────────────────┘
```

当你说"实现 X"时，编排器会：

1. **感知**项目上下文——自动读取当前阶段、活跃任务、待同步项
2. **分类**你的意图——语义匹配（中英文、多语言），不需要关键词精确匹配
3. **调度**正确的代理——planner 在 builder 之前，reviewer 在 builder 之后
4. **拆分**复杂任务——按拓扑排序生成并行执行的子任务
5. **验证**每个任务——9 道质量门禁自动运行（不需要手动 `/complete`）
6. **同步知识**——自动检查哪些文档因代码变更而过时
7. **推进阶段**——退出条件满足时自动进入下一阶段（不需要手动 `/advance`）
8. **记录一切**——写入只追加的不可变时间线

你仍然在用 AI 写代码。但现在有了指挥，不再是一群无组织的噪声。
而且你永远不需要学习 slash command——直接描述你想要什么就行。

## 👤 适合谁用

| 用户 | 场景 |
|------|------|
| **独立开发者** | 用 AI 快速交付但丢失了决策记录、文档和质量。AI-first 是你不会遗忘的第二大脑。 |
| **小团队** | 多人并行使用 AI 写代码——谁 review 什么？谁拥有哪个文件？控制平面防止范围冲突。 |
| **工程组织** | 规模化 AI 辅助开发需要规范、审计追踪和质量门禁。AI-first 提供治理但不带来官僚流程。 |
| **AI 研究者** | 在实验多智能体系统？路由协议和代理注册表是生产级的参考实现。 |

## 🆚 为什么不用现有的方案？

| 做法 | 问题 |
|------|------|
| "直接用 Claude Code 就行" | 没有生命周期，没有审查门禁，没有知识持久化。每次 session 从零开始。 |
| "我们有 PR review 流程" | 人肉 review 会漏掉 AI 能发现的问题（反之亦然）。9 道自动门禁 ≠ 2 个人点 approve。 |
| "我们在 Notion 里写文档" | 文档几天内就和代码脱节。AI-first 将文档新鲜度与代码变更自动绑定。 |
| "用 GitHub Actions 做质量检查" | CI 门禁在 push 之后才跑。AI-first 的门禁在*构建过程中*就运行，问题在到达分支之前被发现。 |
| "Cursor/Windsurf 的 rules 文件" | 静态规则，无生命周期概念，无阶段感知，无知识图谱。AI-first 是动态控制平面，不是一个配置文件。 |
| "OpenSpec 管理规格文档" | OpenSpec 管理规格/产物很好，但每一步都需要斜杠命令触发。AI-first 自动编排整个生命周期——感知、调度、验证、推进——零手动触发。 |

## 🏗 架构：智能路由 + 自动编排 + 多代理协同

```
                         用户请求（自然语言）
                            │
                            ▼
              ┌───────────────────────────┐
              │     环境感知               │  ◄── 自动读取项目状态
              │   阶段 + 任务 + 同步状态    │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │    语义意图分类             │  ◄── 多语言智能匹配
              │  (routing.yml + LLM)      │
              └───────────┬───────────────┘
                          │ 自动调度（无需确认）
                          ▼
              ┌───────────────────────────┐
              │   编排器 (CLAUDE.md)       │
              │   智能调度 + 自动质量链    │
              └───────────┬───────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ 生命周期 │     │  流水线  │     │  支撑类  │
  │  Agent   │     │  Agent   │     │  Agent   │
  ├──────────┤     ├──────────┤     ├──────────┤
  │ intake   │     │repo-scan │     │state-    │
  │ planner  │     │stage-    │     │ updater  │
  │ architect│     │ assessor │     │skill-    │
  │ builder  │     │knowledge-│     │ recommend │
  │ reviewer │     │ sync     │     │marketpl- │
  │ 安全审查 │     │smoke-case│     │ ace-skill│
  │ release  │     └──────────┘     └──────────┘
  │ team-lead│
  └──────────┘
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  技能库  │     │ 9 道质量 │     │ 前端仪表 │
  │ 安全扫描 │     │   门禁   │     │   板      │
  │ Bug扫描 │     │ (每任务) │     │(React 19)│
  │ 优化扫描 │     └──────────┘     └──────────┘
  │ Wiki生成 │
  │ 测试生成 │
  │ PRD生成  │
  │ 脚手架   │
  └──────────┘
```

### Agent 模型分层

| 层级 | 模型 | 代理 |
|------|------|------|
| **战略层** | Opus 4 | intake, planner, architect, team-lead |
| **战术层** | Sonnet 4 | builder, reviewer, security-reviewer, release, repo-scanner, stage-assessor, knowledge-sync, smoke-case |
| **工具层** | Haiku 4 | state-updater, skill-recommend, marketplace-skill |

## 📦 项目结构

```
ai-first/
├── .ai-first/                     # ◄ 核心产品——自举的控制平面
│   ├── routing.yml                #    确定性 Agent 路由表
│   ├── project.yml                #    项目身份、阶段、领域
│   ├── state/                     #    10 个阶段目录 + "current" 符号链接
│   ├── standards/                 #    全栈编码规范（7 个领域）
│   ├── knowledge/                 #    精选项目知识库
│   ├── tasks/                     #    结构化任务 YAML 文件
│   ├── reviews/                   #    9 门禁审查报告
│   ├── snapshots/                 #    ProjectSnapshot + GuidanceCard
│   ├── locks/                     #    规则锁（build/qa/release 期间冻结规范）
│   ├── logs/timeline.md           #    只追加不可变事件日志
│   └── ...
├── .claude/                       #    Claude Code 原生配置
│   ├── CLAUDE.md                  #    主编排器提示词
│   ├── agents/*.md                #    15 个 Agent 定义文件
│   ├── commands/*.md              #    14 个斜杠命令定义
│   └── skills/*/SKILL.md          #    7 个注册技能
├── src/
│   ├── core/
│   │   ├── models.ts              #    12 个核心数据类型
│   │   ├── agents/                #    Agent 注册表 + 冒烟用例生成器
│   │   ├── harness/               #    子代理分发器（拓扑排序）
│   │   └── tools/                 #    工具适配器协议（多平台抽象）
│   ├── frontend/                  #    React 19 健康仪表板
│   │   ├── components/            #    11 个仪表板组件
│   │   ├── i18n/                  #    中英文国际化
│   │   └── styles/                #    OKLCH 设计系统，深色/浅色主题
│   └── utils/
├── scripts/
│   ├── generate-frontend-data.ts  #    实时文件系统 → TypeScript 数据管道
│   └── pre-commit.sh              #    6 项检查的 pre-commit 钩子
├── docs/                          #    8 份设计文档（中英双语）
└── examples/                      #    示例项目（贪吃蛇游戏）
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 25
- **Claude Code** CLI（编排器以 Claude Code Agent 方式运行）

### 安装

```bash
git clone <your-fork-or-mirror-url>   # 替换为内部 mirror 或 fork 地址
cd ai-first
npm install
```

### 在 Claude Code 中启动一个项目

AI-first 当前通过 Claude Code 原生 agents 和 slash commands 运行。
在 Claude Code 中打开目标项目后使用：

```text
# 初始化全新项目
/init /path/to/new-project

# 接入已有项目
/adopt /path/to/existing-project
```

### 直接对话 — 无需命令

AI-first 理解自然语言。描述你想要什么——剩下的它自己搞定。

按场景选择自然语言或命令的详细说明，见
[AI-first 使用指南](docs/AI-first-使用指南.md)。

```text
你: 添加暗黑模式
AI: 暗黑模式已实现。
    阶段 1: bug-scan ✓ security-scan ✓
    阶段 2: knowledge-sync ✓
    阶段 3: review ✓ security-review ✓
    测试 +9。所有门禁通过。
    → 自动进入 QA 阶段。

你: 生产挂了，登录报500错误
AI: 紧急修复模式。当前在 operate 阶段，允许执行修复。
    → builder-agent 已调度
    Bug 已修复：auth middleware 缺少空值检查。
    安全扫描通过。所有门禁通过。

你: 我觉得可以加个消息推送功能
AI: 需求分析中... 这是一个新的功能想法。
    → planner-agent 已调度
    消息推送方案已梳理，包含 3 个用例和技术选型建议。
    要开始实现吗？

你: review一下最近的改动
AI: 正在运行代码审查和安全审查...
    logic           通过
    security        通过
    architecture    通过
    testing         警告 — 2 条路径未覆盖
    consistency     通过
    5/6 通过。Testing 门禁：需为 utils/push.ts 补充测试

你: 项目现在什么情况
AI: 当前阶段: build
    活跃任务: 1（支付模块）
    待同步文档: 0
    健康度: 测试 85 | 文档 90 | 安全 100
    建议: 完成支付模块后可自动进入 QA 阶段。
```

**核心理念：** 用户永远不需要了解 stages、agents、gates 或 slash commands。
描述你想要的，系统自动感知上下文、分类意图、调度代理、运行质量链、推进阶段。

<details>
<summary><b>高级：斜杠命令</b></summary>

高级用户可直接使用。大多数用户永远不需要这些。

| 命令 | 作用 |
|------|------|
| `/init <path>` | 强制初始化全新项目 |
| `/adopt <path>` | 强制接入已有项目 |
| `/guide` | 查看当前阶段和下一步行动 |
| `/scan` | 运行安全 + Bug + 优化三大扫描 |
| `/review [task-id]` | 对指定任务运行 9 门禁审查 |
| `/advance` | 强制推进阶段（绕过退出检查） |
| `/complete [task-id]` | 强制运行构建后质量链 |
| `/decide "<标题>"` | 记录一条技术决策 |
| `/task "<标题>"` | 创建结构化任务 |
| `/wiki` | 重建项目 Wiki |
| `/health` | 项目健康仪表板 |
| `/standards` | 列出项目规范 |
| `/skills` | 列出已注册技能 |
| `/sync` | 手动触发知识同步检查 |

</details>

### 启动仪表板

```bash
npm run dev
# → http://localhost:5173
# 深色/浅色模式, 中/英文切换, 实时文件系统数据
```

## 🔄 十阶段生命周期

```
idea ──→ discovery ──→ spec ──→ architecture ──→ scaffold
                                                      │
                                                      ▼
        evolve ←── operate ←── release ←── qa ←── build
           │                     │         │
           └─── 反馈循环 ────────┘         └── 修复循环（最多 3 次）
```

| 阶段 | 主导 Agent | 退出标准 |
|------|-----------|----------|
| **idea（构想）** | intake | 目标明确，边界清晰 |
| **discovery（发现）** | planner | 用户、用例、约束条件已定义 |
| **spec（规格）** | planner | 需求、范围、交付物已锁定 |
| **architecture（架构）** | architect | 模块契约、ADR、技术决策已完成 |
| **scaffold（脚手架）** | builder | 项目骨架、规范约定、控制层就绪 |
| **build（构建）** | builder | 功能实现，测试通过 |
| **qa（质量保证）** | reviewer + security-reviewer | 9 门禁通过，0 严重问题 |
| **release（发布）** | release | 发布说明、门禁验证完成 |
| **operate（运营）** | team-lead | 事件已处理，指标健康 |
| **evolve（演进）** | team-lead | 下一迭代规划完成，规范已更新 |

每个阶段有置信度评分（0-1）和三种处理模式：**Generate**（从零生成）、**Reuse**（复用现有产物）、**Skip**（跳过）。

## 🛡 九道质量门禁

每个任务必须通过全部 9 道门禁才能标记为 `done`：

| 门禁 | 检查内容 |
|------|----------|
| **logic（逻辑）** | 控制流、边界情况、错误处理、异步安全 |
| **security（安全）** | OWASP Top 10、密钥泄露、依赖漏洞、配置安全 |
| **architecture（架构）** | 模块边界、契约遵守、分层违规 |
| **architecture_risk（架构风险）** | 循环依赖、上帝对象、单点故障、深层相对导入 |
| **docs（文档）** | API 文档、非显而易见逻辑、变更范围准确性 |
| **knowledge（知识）** | 变更文件 → 检测文档过时 → 生成同步事件 |
| **testing（测试）** | 变更路径的测试覆盖率 |
| **consistency（一致性）** | 命名规范、编码约定、文件结构 |
| **collaboration（协作）** | 检测活跃任务之间的 changeScope 文件重叠冲突 |

## 💡 设计哲学

### 1. 智能路由 > 手动命令
用户用自然语言描述想要什么。系统自动感知项目上下文，用语义匹配分类意图（多语言支持），然后调度代理——不需要斜杠命令，不需要手动确认。只有真正有歧义或破坏性操作才会询问用户。LLM 提供理解力，路由表提供确定性。

### 2. 执行期规则锁定
借鉴自小说创作多 Agent 框架：在 build/qa/release 阶段，`standards/` **只读**。代码必须遵守规范——规范不因代码而改变。"圣经之锁"只在 evolve 阶段打开。

### 3. 只追加的真相
所有事件——阶段转换、任务完成、决策记录——全部写入 `logs/timeline.md`。不修改，不删除。审计追踪不可篡改。

### 4. 唯一状态变更者
只有 `state-updater-agent` 能修改项目状态。仿照数据库事务模式设计。无并发写入，无竞态条件，始终一致。

### 5. 知识同步是一等公民
每次代码变更自动触发文档陈旧检查。文档不会落后于代码，因为系统把过时文档当作 bug 处理——不是事后补救。

## 📊 健康仪表板

基于 React 19 的健康仪表板，从文件系统实时读取数据并计算：

- **健康信号**：测试覆盖率、Agent 覆盖率、文档完整度、安全判决
- **风险热力图**：按严重程度排序的风险项，可展开查看详情
- **行动卡片**：建议的下一步操作，标注优先级
- **趋势图**：最近 7 天活动可视化
- **时间线**：完整不可变事件日志

```bash
npm run dev     # 启动仪表板 localhost:5173
```

## 📈 项目数据一览

```
                    项目规模
┌─────────────────────────────────────────────────────┐
│                                                     │
│   15 个 Agent     ████████████████░░░░  80% 已运营   │
│   14 条命令       ███████████████░░░░░  78% 已运营   │
│    7 个技能       ████████░░░░░░░░░░░░  35% 已运营   │
│   10 个阶段       ████████████████████  100% 已完成   │
│    9 道门禁       ████████████████████  100% 已激活   │
│   12 个数据类型   ████████████████░░░░  80% 已稳定    │
│  265+ 测试用例    ████████████████████  100% 通过     │
│   20 个测试文件   ████████████████████  100% 通过     │
│    0 安全漏洞     ████████████████████  100% 干净     │
│    8 份设计文档   ████████████████████  100% 完整     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🧪 开发

```bash
npm run typecheck       # TypeScript 严格模式
npm test                # 265+ 测试用例 (vitest)
npm run lint            # ESLint
npm run format:check    # Prettier
npm run check           # 全部检查
npm run data:sync       # 从文件系统重新生成前端数据
```

### Pre-commit 钩子

自动运行：ESLint → Prettier → typecheck → tests → frontend build → data sync。6 项全部通过才能提交。

## 🗺 路线图

- [x] 5 阶段 CI 流水线 (typecheck → lint → build → test → security + bug scan)
- [x] 每任务 9 道质量门禁
- [x] 知识同步 + 文档过期检测
- [ ] 多平台适配器 (Codex, Gemini, Qoder) —— 协议已定义，实现待完成
- [ ] GitHub App：PR 集成审查报告
- [ ] 团队协作模式（多开发者任务冲突检测）
- [ ] 社区技能与规范插件市场
- [ ] VS Code / JetBrains 扩展：仪表板悬浮窗

## 🤝 参与贡献

欢迎贡献。提交前请先阅读 `.ai-first/standards/` 中的编码规范。

1. Fork 本仓库
2. 创建特性分支
3. 通过 pre-commit 检查（`npm run check`）
4. 提交 PR —— reviewer agent 将自动运行 9 门禁审查

## 📄 许可证

MIT —— 详见 [LICENSE](LICENSE)

---

<p align="center">
  <sub>用自身的控制平面构建。.ai-first/ 目录管理着 ai-first 项目自身。<br>
  这才是重点。</sub>
</p>

<p align="center">
  <sub><a href="#english">↑ English</a> · <a href="#中文">↑ 中文</a></sub>
</p>
