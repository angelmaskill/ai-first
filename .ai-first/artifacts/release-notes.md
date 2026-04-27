# Release Notes: AI-First v0.1.0

**Date**: 2026-04-27
**Stage**: release

## Summary
Initial MVP release of AI-first — a multi-agent orchestration layer for
Claude Code that guides projects through a 10-stage lifecycle.

## What's Included

### Agent Ecosystem (15 agents)
- Lifecycle agents: intake, planner, architect, builder, reviewer,
  security-reviewer, release, team-lead
- Pipeline agents: repo-scanner, stage-assessor, knowledge-sync
- Infrastructure agents: state-updater, skill-recommend, marketplace-skill
- Testing agents: smoke-case

### Command System (14 slash commands)
init, adopt, guide, scan, decide, review, sync, advance, complete,
task, wiki, skills, standards, health

### Skills (7)
security-scan, bug-scan, optimization-scanner, code-scaffold,
prd-generator, test-generator, wiki-generator

### Algorithmic Core
- Subagent dispatcher with topological sort for parallel execution
- Complexity scoring with numerical thresholds
- Multi-strategy task splitting
- Deterministic agent routing protocol (routing.yml as single source of truth)

### Quality System
- 9-gate review (logic, security, architecture, architecture_risk,
  docs, knowledge, testing, consistency, collaboration)
- Automated bug and security scanning
- Knowledge sync with reviewDate-based expiry tracking
- Pre-commit hook: 6 checks (secrets, env, catch, console, typecheck, test)
- CI pipeline: typecheck → test → security-scan → bug-scan

### Knowledge Management
- 3 knowledge items with expiry metadata
- 11 standards across 5 domains (7 stable + 4 draft)
- 9 wiki pages auto-generated from knowledge base
- Knowledge-sync-agent with expiry check + sync processing + wiki trigger

### Novel Patterns
- Bible rules locking (standards frozen during execution stages)
- Append-only timeline for immutable audit trail
- Dedicated state-updater agent for all state mutations

## Verification
- TypeScript strict mode (noUnusedLocals, noUnusedParameters, noImplicitReturns): PASS
- 94 tests passing (7 files): PASS
- Full 9-gate QA review: PASSED
- Security scan: CLEAN
- Bug scan: CLEAN
- Optimization scan: CLEAN
- ESLint: 0 errors, 38 warnings
- Prettier: PASS
- npm audit: 0 vulnerabilities

## Known Gaps
- Frontend domain has paths: [] — no frontend code exists yet
- ESLint warnings (38) are all no-explicit-any / no-console — acceptable for CLI tool
- Multi-platform adapter protocol defined but only Claude Code adapter E2E validated
