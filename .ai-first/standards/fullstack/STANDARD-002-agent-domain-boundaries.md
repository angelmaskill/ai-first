---
id: STANDARD-002
domain: fullstack
title: Agent Domain Boundaries
stability: stable
severity: mandatory
relatedPaths: [.claude/agents/]
---

# Agent Domain Boundaries

Every agent MUST have explicit domain-boundary clauses defining what it
MUST NOT do. This prevents agents from overstepping their role boundaries.

## Rule

All agent definitions (`.claude/agents/*.md`) must include:

1. **MUST NOT items** in the Constraints section, each defining a specific
   domain boundary
2. Each MUST NOT must reference the agent whose domain it protects
   (e.g., "不可推翻 reviewer-agent 的独立 gate 裁决")
3. At least 2 MUST NOT items per agent

## Standard Boundaries

| Agent Domain | Protected By | MUST NOT Violation |
|-------------|-------------|-------------------|
| Code implementation | builder-agent | Other agents must not write production code |
| Code review (quality) | reviewer-agent | Other agents must not override gate verdicts |
| Security review | security-reviewer-agent | reviewer must not override security verdicts |
| Architecture design | architect-agent | reviewer must not redesign; builder must not change architecture |
| State mutation | state-updater-agent | Other agents must not modify symlink, project.yml, timeline |
| Standards modification | architect-agent (evolve stage) | builder must not modify standards/ |
| Task scope definition | planner-agent | builder must not change task scope |
| Knowledge seeding | knowledge-sync-agent | Other agents must not modify knowledge without sync event |

## Enforcement

During build/qa/release stages, rules are locked (`locks/rules.lock`).
Any agent found modifying another agent's protected domain is a gate failure.

## Rationale

Without explicit domain boundaries, agents can silently conflict:
- A builder modifying architecture creates unreviewed design drift
- A reviewer changing code creates unverified fixes
- Multiple agents updating project.yml creates race conditions
