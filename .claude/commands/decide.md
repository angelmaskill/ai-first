---
name: decide
description: Record a technical or architectural decision with rationale and alternatives
agent: architect-agent
---

# /decide "<title>" [--category <category>] [--scope <paths>]

Record a technical decision in the project knowledge base for traceability and future reference.

## Steps

### 1. Parse Arguments

- `title`: decision title (required)
- `--category`: architecture | security | workflow | tooling | api-contract (default: architecture)
- `--scope`: comma-separated file paths affected by this decision

### 2. Capture Context

```bash
echo "=== Decision Context ==="
echo "Current stage: $(readlink .ai-first/state/current | xargs basename | sed 's/stage-[0-9]*-//')"
echo "Active tasks:"
grep -rl "status: in_progress" .ai-first/tasks/ 2>/dev/null | head -5 | xargs -I{} basename {} .yml
echo ""
echo "Recent decisions:"
ls .ai-first/knowledge/KNOW-*-decision*.md 2>/dev/null | tail -3
```

### 3. Build Decision Record

Prompt for (or infer from context):
- **Context**: What situation led to this decision?
- **Decision**: What was decided?
- **Alternatives**: What else was considered and why rejected?
- **Consequences**: What becomes easier/harder because of this?
- **Scope**: Which files/modules are affected?

### 4. Write Decision Knowledge Item

Write to `.ai-first/knowledge/KNOW-{id}-decision-{slug}.md`:

```markdown
---
id: KNOW-{id}
type: decision
category: {category}
title: {title}
stability: confirmed
relatedPaths:
{scope paths as YAML list}
createdAt: {timestamp}
---

# Decision: {title}

## Context
{why this decision was needed}

## Decision
{what was decided, clearly stated}

## Alternatives Considered
| Alternative | Reason Rejected |
|-------------|----------------|
| {alt 1} | {reason} |
| {alt 2} | {reason} |

## Consequences
### Positive
- {what becomes easier}

### Negative / Trade-offs
- {what becomes harder or what we're accepting}

## Affected Modules
{scope paths as list}

## Related
- Tasks: {task IDs if applicable}
- Standards: {standard IDs if applicable}
```

### 5. Output

```bash
cat >> .ai-first/logs/timeline.md << TLENTRY
[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [DECISION] KNOW-{id}: {title} — category: {category}, scope: {N} paths
TLENTRY
```

```
## Decision Recorded: {title}
- ID: KNOW-{id}
- Category: {category}
- Scope: {N} paths
- Written to: .ai-first/knowledge/KNOW-{id}-decision-{slug}.md
```
