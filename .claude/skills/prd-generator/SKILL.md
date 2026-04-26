---
name: prd-generator
description: >
  Generate or refine PRD-style requirement artifacts. Use this skill when
  starting a new project, defining scope for a new feature, or formalizing
  requirements before implementation. Triggers during idea, discovery, and
  spec stages. Outputs structured requirements docs with phased milestones.
---

# PRD Generator

Generate Product Requirement Documents (PRDs) from project goals and user
workflows. This skill transforms fuzzy intentions into structured, testable,
phase-organized requirements.

## When to Use This Skill

- Starting a greenfield project from an idea
- Formalizing feature requirements before a build cycle
- Clarifying scope boundaries for a new initiative
- The orchestrator says "call prd-generator" or "generate a PRD"

## Workflow

### Phase 1: Gather Inputs
1. Read the project's goals from `.ai-first/artifacts/goals.md` (if exists)
2. Read the current state from `.ai-first/state/current/situation.md`
3. If brownfield, scan existing code structure for context
4. Identify: target users, core workflows, known constraints

### Phase 2: Generate Requirements
For each user workflow, derive functional requirements:
- **FR-N**: Describe what the system must DO
- Assign priority: p0 (MVP must-have), p1 (essential post-MVP), p2 (nice-to-have), p3 (future)
- Map dependencies: which FRs must be completed before this one

For the project as a whole, identify non-functional requirements:
- **NFR-N**: Performance, security, accessibility, reliability
- Each must have a measurable target (not "fast" but "<200ms p95")

### Phase 3: Define Milestones
Group requirements into phases:
- **M1 (MVP)**: Bare minimum to validate the core hypothesis
- **M2**: Essential features that round out the experience
- **M3+**: Enhancements and nice-to-haves

Each milestone gets:
- Scope description
- Exit criteria (testable)
- T-shirt size estimate (S/M/L/XL)

### Phase 4: Write Output
Write to `.ai-first/artifacts/requirements.md` using the format:

```markdown
# Requirements: [Project Name]

## Functional Requirements
### FR-1: [Title]
- Description: [What the system must do]
- Priority: p0
- Dependencies: none

## Non-Functional Requirements
### NFR-1: [Title]
- Category: performance
- Metric: [Measurable target with number]

## Milestones
### M1: MVP
- Scope: [What's included]
- Exit criteria: [How we know it's done]
- Size: M
```

## Quality Standards
- Every FR must be independently testable
- Every NFR must have a number in its metric
- MVP scope must be genuinely minimal — if in doubt, cut it to M2
- Dependencies must form a DAG (no circular dependencies)
- Use t-shirt sizes, never developer-hours
