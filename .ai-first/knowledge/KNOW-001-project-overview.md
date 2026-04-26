---
id: KNOW-001
type: project_fact
title: Project Overview
stability: stable
relatedPaths: [.claude/CLAUDE.md, .ai-first/project.yml]
sourceRefs: [docs/AI-first-vibe-coding-脚手架-产品能力地图与MVP范围定义.md]
---

# AI-First Project

A meta-agent orchestration layer that guides software projects through a
structured 10-stage lifecycle from idea to evolve. Built on Claude Code
native agent/skill dispatch via `.claude/agents/*.md` and `.claude/skills/*/SKILL.md`.

## Core Design

- **Not a code writer**: Orchestrates agents, never implements directly
- **10-stage lifecycle**: idea → discovery → spec → architecture → scaffold → build → qa → release → operate → evolve
- **Quality-gated**: Every task passes 9 review gates before completion (logic, security, architecture, architecture_risk, docs, knowledge, testing, consistency, collaboration)
- **Knowledge-synced**: Changes trigger documentation sync events
- **Rules-locked**: standards/ and stable knowledge/ are read-only during build/qa/release stages

## Key Components

- **14 specialized agents**: intake, planner, architect, builder, reviewer, security-reviewer, release, team-lead, repo-scanner, stage-assessor, knowledge-sync, state-updater, skill-recommend, marketplace-skill
- **13 slash commands**: init, adopt, guide, scan, decide, review, sync, advance, complete, task, wiki, skills, standards
- **6 skills**: security-scan, bug-scan, optimization-scanner, wiki-generator, prd-generator, code-scaffold
- Subagent dispatcher with topological sort for parallel execution
- Symlink-based stage tracking: `state/current → stage-XX-{stage}`
