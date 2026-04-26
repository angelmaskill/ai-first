# Release Notes: AI-First v0.1.0

**Date**: 2026-04-26
**Stage**: release

## Summary
Initial MVP release of AI-first — a multi-agent orchestration layer for
Claude Code that guides projects through a 10-stage lifecycle.

## What's Included

### Agent Ecosystem (14 agents)
- Lifecycle agents: intake, planner, architect, builder, reviewer,
  security-reviewer, release, team-lead
- Pipeline agents: repo-scanner, stage-assessor, knowledge-sync
- Infrastructure agents: state-updater, skill-recommend, marketplace-skill

### Command System (13 slash commands)
init, adopt, guide, scan, decide, review, sync, advance, complete,
task, wiki, skills, standards

### Skills (6)
security-scan, bug-scan, optimization-scanner, code-scaffold,
prd-generator, wiki-generator

### Algorithmic Core
- Subagent dispatcher with topological sort for parallel execution
- Complexity scoring with numerical thresholds
- Multi-strategy task splitting

### Quality System
- 9-gate review (logic, security, architecture, architecture_risk,
  docs, knowledge, testing, consistency, collaboration)
- Automated bug and security scanning
- Knowledge sync to prevent documentation rot

### Novel Patterns
- Bible rules locking (standards frozen during execution stages)
- Append-only timeline for immutable audit trail
- Dedicated state-updater agent for all state mutations

## Known Gaps
- Test coverage at 0.09 ratio (acceptable for MVP, needs improvement)
- Missing architecture.md artifact (ADR backfill planned)
- No CI/CD pipeline configured

## Verification
- TypeScript strict mode: ✓
- All 10 tests passing: ✓
- Full 9-gate QA review: PASSED
- Security scan: CLEAN
- Bug scan: CLEAN
