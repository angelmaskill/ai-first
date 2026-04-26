---
id: STANDARD-004
domain: workflow
title: Code Review Process
stability: stable
severity: mandatory
relatedPaths: [.claude/agents/reviewer-agent.md, .claude/commands/review.md]
---

# Code Review Process

Every implementation task must pass a structured 9-gate review before
being marked done. Reviews are conducted by reviewer-agent and
security-reviewer-agent running in parallel.

## Rule

No task may transition from "in_progress" to "done" without a review
report showing all 9 gates passed (or passed_with_warnings with no
critical/high findings).

## Review Gates

1. **logic** — Control flow correctness, edge cases, error handling
2. **security** — OWASP Top 10, secrets, dependencies, config
3. **architecture** — Module boundaries, contracts, layer violations
4. **architecture_risk** — Cyclic deps, god objects, SPOF, deep imports
5. **docs** — API docs, non-obvious logic comments
6. **knowledge** — Changed files vs stale knowledge items
7. **testing** — Test coverage for changed paths
8. **consistency** — Naming, conventions, file structure
9. **collaboration** — Active task changeScope overlap detection

## Parallel Execution

reviewer-agent and security-reviewer-agent run independently.
Neither may override the other's gate verdicts:
- Security verdict is authoritative for the security gate
- Reviewer aggregates but does not overturn

## Loop Limit

If any gate fails, loop back to builder-agent for fixes (max 3 iterations).
After 3 failed attempts, escalate to team-lead-agent for architectural review.

## Report Format

All reviews write to `.ai-first/reviews/{task-id}-review.md` with:
- Findings with file:line, severity, resolution
- Individual gate statuses
- Overall PASS/FAIL verdict
- Actionable recommendations
