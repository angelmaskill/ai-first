# Stage: Build

**Started**: 2026-04-26
**Lead Agent**: builder
**Previous Stage**: scaffold (implicit — project structure established)

## Current State

AI-first is an intelligent multi-agent orchestration layer for Claude Code. It
has been refactored from a TypeScript CLI tool into a native Claude Code
configuration-based system inspired by Claude-Book's design patterns.

## What Exists

- `.claude/CLAUDE.md` — Main orchestrator with 10-stage lifecycle
- `.claude/agents/*.md` — 8 specialized agent definitions (intake, planner,
  architect, builder, reviewer, security-reviewer, release, team-lead)
- `.claude/skills/*/SKILL.md` — 3 skills (prd-generator, code-scaffold,
  security-scan)
- `.claude/settings.json` — Permissions and agent/skill enablement
- `src/core/harness/subagent-dispatcher.ts` — Retained algorithmic core
  (topological sort, complexity scoring, multi-strategy task splitting)
- `.ai-first/` — Project state and artifact storage

## What Remains (TypeScript)

Only `subagent-dispatcher.ts` and its dependency `models.ts` are retained as
code. The dispatcher provides algorithmic capabilities that cannot be
expressed in declarative configuration:
- Topological sort for dependency-based parallel execution planning
- Complexity scoring with numerical thresholds
- Multi-strategy task splitting (by domain, by file groups, single-task)

## Open Questions

- Should the subagent-dispatcher be invoked as an npm script or kept as a
  standalone tsx module?
- What's the next feature to build?
