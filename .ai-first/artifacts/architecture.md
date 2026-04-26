# Architecture: AI-First

**Date**: 2026-04-26
**Stage**: architecture
**Version**: 0.1.0

## ADR-001: Claude-Book Configuration Pattern over TypeScript Code

**Status**: Accepted
**Date**: 2026-04-26

### Context
The original AI-first was a TypeScript CLI with programmatic orchestration — agent registry,
stage machine, skill orchestrator, memory manager, sync engine. This produced 4000+ lines of
TypeScript but was mostly mock implementations and couldn't actually dispatch Claude Code agents.

### Decision
Adopt Claude-Book's pure Markdown configuration pattern:
- Agent definitions → `.claude/agents/*.md` with YAML frontmatter
- Skill definitions → `.claude/skills/*/SKILL.md`
- Command definitions → `.claude/commands/*.md`
- Orchestration → `.claude/CLAUDE.md` with natural language workflows

### Consequences
- **Gain**: System actually works — Claude Code natively dispatches agents and skills
- **Gain**: Reduced TypeScript from 4000 to 500 lines (87% reduction)
- **Loss**: No compile-time type checking for agent definitions
- **Loss**: Deterministic routing replaced with LLM semantic matching
- **Mitigation**: Retained algorithmic core (subagent-dispatcher.ts) for topological sort and complexity scoring

### Alternatives Considered
- **Hybrid approach** (TypeScript CLI + Claude Code agent calls): Rejected — adds complexity without benefit
- **Multi-platform adapters**: Rejected for MVP — single platform (Claude Code) is sufficient

---

## ADR-002: Symlink-Based State Management

**Status**: Accepted
**Date**: 2026-04-26

### Context
Need to track which of 10 lifecycle stages the project is currently in. Must be atomic,
transparent, and work without any runtime dependency.

### Decision
Use a filesystem symlink: `.ai-first/state/current → stage-XX-{name}/`

Each stage directory contains:
- `situation.md` — project context, goals, constraints
- `assessment.md` — stage assessment with confidence scoring

`project.yml` mirrors the stage name as `currentStage` for programmatic access.

### Consequences
- **Gain**: Atomic updates (`ln -sf target current.new → mv current.new current`)
- **Gain**: No runtime dependency — any tool can `readlink` to check stage
- **Risk**: Symlink and project.yml can drift → mitigated by state-updater-agent consistency checks

---

## ADR-003: Bible Rules Locking

**Status**: Accepted
**Date**: 2026-04-26

### Context
During execution stages (build, qa, release), code must conform to standards. If standards
can change mid-execution, code and standards can drift in a feedback loop.

### Decision
Lock `standards/` and stable `knowledge/` during build, qa, and release stages via a lock file
at `.ai-first/locks/rules.lock`. Unlock during evolve, idea, and discovery stages.

### State machine
```
Enter build/qa/release → create locks/rules.lock
Enter evolve/idea/discovery → delete locks/rules.lock
```

### Consequences
- **Gain**: Standards are authoritative during execution — code adapts, not rules
- **Gain**: Clear signal to agents: locked = follow rules, unlocked = improve rules
- **Risk**: Can't fix incorrect standards during build → mitigated by evolve stage as escape hatch

---

## ADR-004: Dedicated State Updater Agent

**Status**: Accepted
**Date**: 2026-04-26

### Context
Multiple agents need to update project state (symlink, project.yml, task status, timeline).
Concurrent mutations risk inconsistency.

### Decision
Designate `state-updater-agent` as the sole agent permitted to mutate project state. All other
agents request state changes through it.

### Operations
- OP-1: Stage Transition (update symlink + project.yml)
- OP-2: Task Status Update
- OP-3: Create Task
- OP-4: Append Timeline
- OP-5: Write State File

### Consequences
- **Gain**: Single audit trail for all state mutations
- **Gain**: Consistency verification after every operation
- **Risk**: state-updater-agent becomes a bottleneck → mitigated by batching operations

---

## ADR-005: Append-Only Timeline

**Status**: Accepted
**Date**: 2026-04-26

### Context
Need an immutable record of all project events for auditing and trend analysis.

### Decision
`logs/timeline.md` is append-only. Entries are never modified or deleted. Format:
`[ISO timestamp] [EVENT_TYPE] message`

### Event Types
PROJECT_INIT, STATE, STRUCTURE, SCAN, ASSESS, GUIDANCE, SYNC, STAGE_TRANSITION,
BUILD_COMPLETE, DECISION, PIPELINE_VALIDATION, RULES_UNLOCKED, FULL_CYCLE

---

## ADR-006: 9-Gate Quality Review

**Status**: Accepted
**Date**: 2026-04-26

### Context
Every implementation task needs quality verification before completion.

### Decision
9 independent review gates, each owned by a specific agent:
1. **logic** (reviewer) — Control flow, edge cases, error handling
2. **security** (security-reviewer) — OWASP Top 10, secrets, config
3. **architecture** (reviewer) — Module boundaries, contracts, layer violations
4. **architecture_risk** (reviewer) — Cyclic deps, god objects, SPOF
5. **docs** (reviewer) — API docs, change scope accuracy
6. **knowledge** (knowledge-sync) — Stale docs detection
7. **testing** (reviewer) — Test coverage for changed paths
8. **consistency** (reviewer) — Naming, conventions, file structure
9. **collaboration** (reviewer) — Active task changeScope overlap

### Consequences
- **Gain**: Comprehensive coverage — no single gate can be a rubber stamp
- **Gain**: Parallelizable — reviewer and security-reviewer run independently
- **Risk**: 9 gates can feel heavy for small tasks → mitigated by proportional review depth

---

## Module Architecture

```
ai-first/
  .claude/              # Claude Code native configuration
    CLAUDE.md           # Main orchestrator
    agents/             # 14 agent definitions (.md)
    commands/           # 13 slash commands (.md)
    skills/             # 6 skill definitions (SKILL.md)
  .ai-first/            # Project state and artifacts
    state/              # Symlink-based stage tracking
    knowledge/          # Domain knowledge base
    standards/          # Project standards (5 domains)
    reviews/            # Review reports
    reports/            # Scan and sync reports
    snapshots/          # ProjectSnapshot + GuidanceCard
    sync/               # Sync event YAML files
    artifacts/          # Stage output documents
    logs/               # Append-only timeline
    locks/              # Rules lock files
    tasks/              # Structured task YAML files
  src/                  # TypeScript algorithmic core
    core/
      harness/          # subagent-dispatcher (topological sort)
      tools/            # Tool adapter protocol + adapters
      agents/           # Agent type mappings
    utils/              # text, time utilities
```

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript (strict) | Type safety for algorithmic core |
| Runtime | tsx | Zero-config TypeScript execution |
| Test framework | vitest | Fast, native ESM, compatible with tsx |
| Agent dispatch | Claude Code native | Actual AI scheduling vs mock |
| State tracking | Filesystem symlink | Atomic, zero-dependency |
| Configuration | Markdown + YAML frontmatter | Human-readable, Claude-native |
| Locking | Filesystem lock file | Simple, visible, no runtime needed |
