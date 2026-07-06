---
name: task
description: Create a new task with owner, reviewer, and change scope
agent: builder-agent
---

# /task "<title>" [--owner <name>] [--reviewer <name>] [--scope <paths>] [--priority p0-p3]

Create a structured task with ownership and change boundaries.

## Steps

0. **Deterministic core (G2 收编)** — create the task + inferred scope via the TS core so the YAML schema is authoritative (Claude AND Codex share one task format):
   ```bash
   npm run task:create -- "<title>" --domain <domain-id> [--runtime codex] \
     [--accept-test npm-test] [--accept-exists <path>] [--accept-manual]
   # or: ai-first task:create "<title>" --domain <domain-id> ...
   ```
   This runs `task-core.createTask()` + `scope-core.inferChangeScope()` and writes `.ai-first/tasks/<id>.yml` + `.ai-first/change-scopes/<id>.yml` with `acceptanceCriteria` populated. Manual authoring (step 1+) remains valid but the TS path is the source of truth for the schema.

1. Parse arguments:
   - `title`: task description (required)
   - `--owner`: who implements (default: ask)
   - `--reviewer`: who reviews (default: assign based on domain)
   - `--scope`: comma-separated file paths (default: auto-detect from context)
   - `--priority`: p0 (critical) to p3 (nice-to-have)

2. Determine current stage from `.ai-first/state/current`

3. Create task file at `.ai-first/tasks/{task-id}.yml`:
   ```yaml
   id: task-{timestamp}-{random}
   title: {title}
   description: {description}
   stage: {current stage}
   mode: execute
   status: todo
   priority: {priority}
   owner:
     type: user
     id: {owner}
     name: {owner}
   reviewer:
     type: user
     id: {reviewer}
     name: {reviewer}
   changeScope:
     paths: [{scope paths}]
     riskLevel: low
     parallelSafe: true
   createdAt: {now}
   updatedAt: {now}
   ```

4. **Conflict Detection** — Check ALL scope paths against ALL active tasks:

   ```bash
   echo "=== Conflict Check ==="
   CONFLICTS=0
   for path in {scope_paths}; do
     # Find active tasks (not done, not canceled) that reference this path
     HITS=$(grep -rl "status: \(todo\|in_progress\|blocked\|review_pending\)" .ai-first/tasks/ 2>/dev/null | \
            xargs grep -l "$path" 2>/dev/null)
     if [ -n "$HITS" ]; then
       echo "CONFLICT: $path also in:"
       echo "$HITS" | while read hit; do
         echo "  - $(basename $hit .yml)"
       done
       CONFLICTS=$((CONFLICTS + 1))
     fi
   done

   if [ "$CONFLICTS" -gt 0 ]; then
     echo ""
     echo "WARNING: $CONFLICTS path conflict(s) detected."
     echo "Set parallelSafe: false if tasks must be sequential."
     echo "If tasks modify different parts of the same file, coordinate owners."
   else
     echo "No path conflicts — safe to proceed."
   fi
   ```

   Conflict severity:
   - **Same file, same function/area** → BLOCKING (serialize tasks)
   - **Same file, different areas** → WARNING (coordinate merge order)
   - **Same directory, different files** → INFO (likely parallel-safe)

5. Run dispatch analysis for complex tasks:

   Count total scope paths:
   ```bash
   TOTAL_PATHS=$(echo "{scope_paths}" | tr ',' '\n' | wc -l)
   DOMAIN_COUNT=0
   # Count how many of frontend/backend/shared/docs have paths
   for domain in frontend backend shared docs; do
     count=$(grep -c "^\s*- " <<< "$DOMAIN_PATHS" 2>/dev/null || echo 0)
     if [ "$count" -gt 0 ]; then DOMAIN_COUNT=$((DOMAIN_COUNT + 1)); fi
   done
   ```

   If `TOTAL_PATHS > 5` or `DOMAIN_COUNT > 1`:
   ```bash
   echo "Complex task detected — running dispatcher..."
   npx tsx src/core/harness/dispatch-cli.ts .ai-first/tasks/{task-id}.yml
   ```
   This produces `.ai-first/tasks/dispatch-{task-id}.yml` with:
   - Subtask breakdown with assigned agent types
   - Parallel execution groups (topological sort)
   - Estimated duration
   - Complexity score

   If `TOTAL_PATHS <= 5` and single domain: skip dispatch (simple task).

6. Report the created task with its ID and dispatch plan if applicable.

## Output

```
## Task Created: task-20260426-a3f2k1
### {title}
- Owner: @{owner}
- Reviewer: @{reviewer}
- Scope: {paths}
- Priority: {priority}
- Status: todo
- Complexity: {N}%
- Dispatch: {N subtasks in N parallel groups} (or "simple — no dispatch needed")

Tip: Use /complete {task-id} to run the post-build chain
```
