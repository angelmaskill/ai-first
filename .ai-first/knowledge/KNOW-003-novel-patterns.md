---
id: KNOW-003
type: workflow_note
title: Novel Framework Patterns
stability: stable
reviewDate: "2026-06-26"
expiresAt: null
relatedPaths: [.ai-first/locks/rules.lock, .ai-first/logs/timeline.md, .claude/agents/state-updater-agent.md]
sourceRefs: [多Agent小说创作框架源码分析.md]
---

# Novel Framework Patterns

Three design patterns borrowed from a multi-agent novel creation framework
and adapted for the AI-first project lifecycle system.

## Pattern 1: Bible Rules Locking

**Origin**: Novel framework's "bible lock" — core rules are frozen during
execution phases; characters (agents) must follow rules, not change them.

**Adaptation**: `locks/rules.lock` makes `standards/` and stable `knowledge/`
read-only during build, qa, and release stages. During evolve, the lock is
removed so standards can be updated.

**Why**: Prevents mid-implementation standards drift. When rules are locked,
code must conform to rules — rules do not change to fit code.

**State machine**:
- Entering build/qa/release → create `locks/rules.lock`
- Entering evolve/idea/discovery → delete `locks/rules.lock`

## Pattern 2: Append-Only Timeline

**Origin**: Novel framework's event log — all events are appended, never
modified or deleted. Provides an immutable audit trail.

**Adaptation**: `logs/timeline.md` records all significant events: stage
transitions, task completions, decisions, scans, syncs. Format:
`[ISO timestamp] [EVENT_TYPE] message`.

**Why**: Provides a linear, searchable history of every state change.
No event can be silently altered or deleted after recording.

**Event types**: PROJECT_INIT, STATE, STRUCTURE, SCAN, ASSESS, GUIDANCE,
SYNC, STAGE_TRANSITION, BUILD_COMPLETE, DECISION, PIPELINE_VALIDATION

## Pattern 3: Dedicated State Updater

**Origin**: Novel framework's dedicated state-manager — a single entity
responsible for all state mutations. No other agent modifies state.

**Adaptation**: `state-updater-agent` is the ONLY agent permitted to
mutate project state (symlink, project.yml, task status, timeline).
All other agents request state changes through it.

**Why**: Single audit trail. No concurrent mutations. Consistency
verification after every operation (symlink target must match project.yml
currentStage).

**Operations**: OP-1 Stage Transition, OP-2 Task Status Update, OP-3
Create Task, OP-4 Append Timeline, OP-5 Write State File.
