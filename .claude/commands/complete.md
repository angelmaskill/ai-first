---
name: complete
description: >
  Post-build trigger chain. Run after builder-agent finishes a task.
  Executes bug-scan, security-scan, knowledge-sync-agent, then reviewer-agent
  and security-reviewer-agent in parallel. Updates task status based on results.
  This is the mandatory post-build quality gate.
---

# /complete [task-id]

Run the full post-build quality gate chain for a completed implementation task.
This is MANDATORY after every builder-agent completes work.

## Steps

### 1. Identify Task

If task-id provided, read that task YAML. Otherwise find the most recent `in_progress` task:

```bash
TASK_FILE=""
if [ -n "$1" ]; then
  TASK_FILE=".ai-first/tasks/$1.yml"
else
  TASK_FILE=$(grep -rl "status: in_progress" .ai-first/tasks/ 2>/dev/null | head -1)
fi

if [ -z "$TASK_FILE" ]; then
  echo "ERROR: No in_progress task found. Specify task-id or create a task first."
  exit 1
fi

echo "=== Post-Build Chain for: $TASK_FILE ==="
TASK_ID=$(basename "$TASK_FILE" .yml)
```

### 2. Phase 0: Multipart Dispatch (if applicable)

Check if a dispatch manifest exists for this task:

```bash
DISPATCH_MANIFEST=".ai-first/tasks/dispatch-${TASK_ID}.yml"
if [ -f "$DISPATCH_MANIFEST" ]; then
  echo "=== Dispatch Manifest Found ==="
  # Read execution groups
  cat "$DISPATCH_MANIFEST"
  echo ""
  echo "Execute subtasks in parallel groups per the executionOrder in the manifest."
  echo "Dispatch builder-agent for each subtask in a group in PARALLEL."
  echo "Wait for all subtasks in a group to complete before advancing to the next group."
  echo "After all groups complete, aggregate results and continue to Phase 1."
else
  echo "No dispatch manifest — single-agent task"
fi
```

If dispatch manifest exists:
1. Read `executionOrder` groups from the manifest
2. For each group, dispatch all subtasks in PARALLEL (they have no mutual dependencies)
3. Wait for the group to complete before advancing to the next
4. After all groups complete: proceed to Phase 1

The manifest's `assignedTo` field tells you which agent type to use for each subtask:
- `executor` → builder-agent
- `code-reviewer` → reviewer-agent
- `planner` → planner-agent
- `architect` → architect-agent
- `writer` → intake-agent (documentation mode)
- `designer` → architect-agent (design mode)

### 3. Phase 1: Exhaustive Scans (run first, fail fast)

#### 2.1 Bug Scan
Run the bug-scan skill's full pattern suite:

```bash
echo "=== BUG SCAN ==="
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%S")

# Console statements (exclude node_modules)
CONSOLE_COUNT=$(grep -rn "console\.\(log\|debug\|info\|warn\|error\|trace\)" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first --exclude-dir=dist \
  2>/dev/null | grep -v "//.*console" | wc -l)

# Empty catch blocks
EMPTY_CATCH=$(grep -rn "catch\s*(\s*[^)]*\s*)\s*{\s*}" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first 2>/dev/null | wc -l)

# Any type count
ANY_COUNT=$(grep -rn ": any" --include="*.ts" --include="*.tsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first 2>/dev/null | wc -l)

# Empty promise catch
EMPTY_PROMISE=$(grep -rn "\.catch\s*(\s*)\s*$" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first 2>/dev/null | wc -l)

echo "Console statements: $CONSOLE_COUNT"
echo "Empty catch blocks: $EMPTY_CATCH"
echo "Any type usages: $ANY_COUNT"
echo "Empty promise catches: $EMPTY_PROMISE"

# Verdict
BUG_VERDICT="CLEAN"
if [ "$EMPTY_CATCH" -gt 0 ] || [ "$EMPTY_PROMISE" -gt 0 ]; then
  BUG_VERDICT="BLOCKING"
elif [ "$CONSOLE_COUNT" -gt 5 ] || [ "$ANY_COUNT" -gt 20 ]; then
  BUG_VERDICT="NEEDS_CLEANUP"
fi
echo "Bug scan verdict: $BUG_VERDICT"
```

#### 2.2 Security Scan
Run the security-scan skill's pattern suite:

```bash
echo "=== SECURITY SCAN ==="

# Secrets in source
SECRETS=$(grep -rniE "(password|secret|token|api_key|apiKey|auth_key)\s*[:=]\s*['\"][^'\"]{3,}['\"]" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.html" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first 2>/dev/null | wc -l)

# .gitignore exists
GITIGNORE_OK=0
if [ -f .gitignore ]; then
  GITIGNORE_OK=1
else
  echo "WARNING: .gitignore missing"
fi

# Risky patterns (Function constructor, HTML injection sinks)
RISKY=$(grep -rniE "(Function\s*\(|eval\s*\(|innerHTML\s*=|document\.write)" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.html" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first 2>/dev/null | wc -l)

echo "Secrets found: $SECRETS"
echo ".gitignore present: $GITIGNORE_OK"
echo "Risky patterns: $RISKY"

SEC_VERDICT="CLEAN"
if [ "$SECRETS" -gt 0 ] || [ "$GITIGNORE_OK" -eq 0 ]; then
  SEC_VERDICT="BLOCKING"
elif [ "$RISKY" -gt 0 ]; then
  SEC_VERDICT="NEEDS_CLEANUP"
fi
echo "Security scan verdict: $SEC_VERDICT"
```

### 4. Phase 2: Knowledge Sync

Dispatch **knowledge-sync-agent** to detect stale docs and generate sync events:

- Check git diff for changed files
- Classify each changed file into trigger categories
- Cross-reference with existing knowledge items
- Generate sync events in `.ai-first/sync/`
- Write sync report to `.ai-first/reports/sync-$TIMESTAMP.md`

### 5. Phase 3: Parallel Review

Run these TWO agents in parallel — they are independent:

- **reviewer-agent**: 7-gate review (logic, architecture, security triage, docs, knowledge, testing, consistency)
  → writes `.ai-first/reviews/$TASK_ID-review.md`
- **security-reviewer-agent**: OWASP Top 10, dependency audit, auth/authz, config security
  → writes `.ai-first/reports/security-$TIMESTAMP.md`

Both MUST complete before proceeding to Phase 4.

### 6. Phase 4: Aggregate Results and Update Task

Collect verdicts from all phases:

```
Bug scan:     [CLEAN / NEEDS_CLEANUP / BLOCKING]
Security scan: [CLEAN / NEEDS_CLEANUP / BLOCKING]
Reviewer:     [PASSED / PASSED_WITH_WARNINGS / FAILED]
Security rev: [PASSED / PASSED_WITH_WARNINGS / FAILED]
```

Update task status:

```
If BLOCKING or FAILED in any phase:
  → status: blocked
  → add note about what's blocking
  → loop back to builder-agent (max 3 iterations)

If NEEDS_CLEANUP or PASSED_WITH_WARNINGS:
  → status: review_pending
  → list cleanup items

If ALL CLEAN/PASSED:
  → status: done
  → updatedAt: now
```

### 6. Report Summary

```markdown
## Post-Build Chain Complete: [Task Title]

| Phase | Verdict |
|-------|---------|
| Bug Scan | CLEAN |
| Security Scan | CLEAN |
| Knowledge Sync | 2 sync events |
| Reviewer | PASSED |
| Security Reviewer | PASSED |

**Task Status**: done ✅
```

### 7. Append to Timeline

```bash
VERDICT_SUMMARY="CLEAN"
# Determine final verdict
if [ "$BUG_VERDICT" = "BLOCKING" ] || [ "$SEC_VERDICT" = "BLOCKING" ]; then
  VERDICT_SUMMARY="BLOCKED"
elif [ "$BUG_VERDICT" = "NEEDS_CLEANUP" ] || [ "$SEC_VERDICT" = "NEEDS_CLEANUP" ]; then
  VERDICT_SUMMARY="NEEDS_CLEANUP"
fi

cat >> .ai-first/logs/timeline.md << TLENTRY
[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [BUILD_COMPLETE] Task: $TASK_ID → status: {status} | Bug: $BUG_VERDICT | Security: $SEC_VERDICT | Overall: $VERDICT_SUMMARY
TLENTRY
```

## Loop Back Rule

If any gate fails, dispatch builder-agent with the review reports. After re-implementation, re-run the full `/complete` chain. Maximum 3 iterations. If still failing after 3, escalate to team-lead-agent.

## Safety Rules

### YOU MUST
- Run Phase 1 (scans) before Phase 3 (reviews) — fail fast on cheap checks
- Run reviewer-agent and security-reviewer-agent in PARALLEL (they are independent)
- Block on any BLOCKING or FAILED verdict
- Update task status based on aggregate results
- Write all reports to `.ai-first/reports/` and `.ai-first/reviews/`

### YOU MUST NOT
- Skip the knowledge-sync step — it's the safety fuse
- Proceed past a BLOCKING verdict
- Let a task stay `in_progress` after the chain completes
- Skip any phase even if "it looks fine"
