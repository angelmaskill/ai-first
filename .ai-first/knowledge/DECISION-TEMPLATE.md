# Decision Template

Use `/decide "<title>"` to create a decision record. Decisions are stored as
`KnowledgeItem(type=decision)` in the knowledge base.

## When to Record a Decision

- Choosing between two or more technical approaches
- Accepting a known trade-off or risk
- Setting a new convention or standard
- Rejecting a seemingly obvious approach for non-obvious reasons
- Marking a constraint that future work must respect

## File Naming

`knowledge/KNOW-{id}-decision-{slug}.md`

## Decision Record Format

```markdown
---
id: KNOW-XXX
type: decision
category: architecture | security | workflow | tooling | api-contract
title: {decision title}
stability: confirmed
relatedPaths:
  - path/to/affected/file
createdAt: {ISO timestamp}
---

# Decision: {title}

## Context
Why this decision was needed.

## Decision
What was decided, clearly stated.

## Alternatives Considered
| Alternative | Reason Rejected |
|-------------|----------------|
| option A | why not |
| option B | why not |

## Consequences
### Positive
- benefit

### Negative / Trade-offs
- cost
```
