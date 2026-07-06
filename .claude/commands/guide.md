---
name: guide
description: Show current project stage, health, and next-step guidance
agent: team-lead-agent
---

# /guide

Display the current project stage, health signals, and recommended next actions.

## Steps

0. **Deterministic core (G2 收编)** — get the objective verdict first, then layer your natural-language explanation on top of it:
   ```bash
   npm run guide -- "$(pwd)"
   # or via the unified CLI: ai-first guide "$(pwd)"
   ```
   This runs `guide-core.ts buildGuide()` → returns `{ stage, needsConfirmation, confidence, blocker, nextSteps, recommendedRuntime, recommendedCommand }`. Use its output as the source of truth for stage/confidence/next-step — do NOT re-derive them by hand. Steps 1–4 below remain valid for richer context, but `npm run guide` is the authoritative path shared by Claude AND Codex.

1. Read current state:
   ```
   readlink .ai-first/state/current
   cat .ai-first/state/current/situation.md
   cat .ai-first/state/current/assessment.md
   cat .ai-first/project.yml
   ```

2. Check for active tasks:
   ```bash
   ls .ai-first/tasks/*.yml 2>/dev/null
   ```

3. Check for pending sync events:
   ```bash
   ls .ai-first/sync/*.yml 2>/dev/null
   ```

4. Dispatch **team-lead-agent** to produce a guidance card covering:
   - Current stage and confidence
   - Active tasks and their status
   - Pending reviews or sync events
   - Top 3 recommended next actions (prioritized)
   - Risks and blockers

## Output

A guidance card displayed to the user:
```
## Current Stage: build (confidence: high)
## Active Tasks: 2 in progress, 1 pending review
## Pending Sync: 1 event (API docs may be stale)
## Recommended Next:
  1. Complete review for task-xxx
  2. Sync API documentation
  3. Advance to QA stage
## Risks: Knowledge sync lagging behind code changes
```
