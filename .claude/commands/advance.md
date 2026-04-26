---
name: advance
description: Advance project to the next lifecycle stage
agent: team-lead-agent
---

# /advance

Advance the project to the next stage in the 10-stage lifecycle. Validates
the stage exit checklist before transitioning.

## Stage Sequence

```
idea → discovery → spec → architecture → scaffold → build → qa → release → operate → evolve
```

## Steps

### 0. Determine Advancement Mode

Read the mode from the most recent active task, or default to `generate`:

```bash
# Find the mode from the most recent task that targets the NEXT stage
MODE="generate"  # default
ACTIVE_TASK=$(ls -t .ai-first/tasks/task-*.yml 2>/dev/null | head -1)
if [ -n "$ACTIVE_TASK" ]; then
  TASK_MODE=$(grep "mode:" "$ACTIVE_TASK" | head -1 | awk '{print $2}')
  if [ -n "$TASK_MODE" ]; then
    MODE="$TASK_MODE"
  fi
fi

echo "Advancement mode: $MODE"

case "$MODE" in
  skip)
    echo "Mode is SKIP — will advance without running lead agent or checking artifacts"
    ;;
  reuse)
    echo "Mode is REUSE — will look for existing artifacts/templates to reuse"
    ;;
  generate|execute)
    echo "Mode is $MODE — full generation/execution flow"
    ;;
esac
```

Mode behavior:
- **skip**: Skip artifact checks for the current stage, skip dispatching the lead agent. Just transition.
- **reuse**: Check for existing artifacts; if found, copy/adapt them instead of generating new. Dispatch lead agent with "reuse existing" instruction.
- **generate**: Normal flow — lead agent generates all artifacts from scratch.
- **execute**: Like generate, but for build/implementation stages.

### 1. Determine Current and Next Stage

```bash
CURRENT=$(readlink .ai-first/state/current | xargs basename)
echo "Current stage: $CURRENT"
```

Map current stage to next stage:

| Current | Next |
|---------|------|
| stage-01-idea | stage-02-discovery |
| stage-02-discovery | stage-03-spec |
| stage-03-spec | stage-04-architecture |
| stage-04-architecture | stage-05-scaffold |
| stage-05-scaffold | stage-06-build |
| stage-06-build | stage-07-qa |
| stage-07-qa | stage-08-release |
| stage-08-release | stage-09-operate |
| stage-09-operate | stage-10-evolve |
| stage-10-evolve | stage-02-discovery |

### 2. Stage Exit Checklist

Before advancing, verify ALL of the following:

#### 2.1 Active Tasks Check
```bash
echo "=== Active Tasks ==="
# Check for tasks not in 'done' or 'canceled' status
grep -rl "status: \(todo\|in_progress\|blocked\|review_pending\)" .ai-first/tasks/ 2>/dev/null || echo "No active tasks — OK"
```
If any active tasks found: **ABORT**. All tasks must be `done` or `canceled`.

#### 2.2 Sync Events Check
```bash
echo "=== Pending Sync Events ==="
grep -rl "status: suggested\|status: pending" .ai-first/sync/ 2>/dev/null || echo "No pending sync events — OK"
```
If any pending sync events: **ABORT**. All must be `confirmed` or `dismissed`.

#### 2.3 Review Gates Check
```bash
echo "=== Review Status ==="
# Look for FAILED verdicts in review reports
grep -rl "Verdict.*FAILED" .ai-first/reviews/ 2>/dev/null || echo "No failed reviews — OK"
```
If any FAILED reviews: **ABORT**. All gates must pass.

#### 2.4 Required Artifacts Check

**If mode is `skip`**: Skip this check entirely.

**If mode is `reuse`**: Check for existing artifacts to reuse; warn if none found but proceed.

**If mode is `generate` or `execute`**: Verify the expected artifact exists:

| Stage | Required Artifact |
|-------|-------------------|
| idea | `.ai-first/artifacts/goals.md` |
| discovery | `.ai-first/artifacts/requirements.md` |
| architecture | `.ai-first/artifacts/architecture.md` |
| scaffold | `.ai-first/artifacts/scaffold-plan.md` |
| build | `.ai-first/artifacts/implementation-*.md` or compiled output |
| qa | `.ai-first/reviews/` (at least one review report) |
| release | `.ai-first/artifacts/release-notes.md` |

```bash
echo "=== Required Artifact ==="
# Check based on current stage
ls .ai-first/artifacts/ 2>/dev/null || echo "No artifacts — check required"
```

#### 2.5 Knowledge Sync Check
```bash
echo "=== Recent Knowledge Sync ==="
ls -lt .ai-first/reports/sync-*.md 2>/dev/null | head -1 || echo "No sync reports — WARNING"
```
Knowledge-sync-agent must have been called. If no sync report exists, run `/sync` first.

### 3. Perform Transition

If all checks pass:

```bash
CURRENT_STAGE_NUM=$(echo $CURRENT | grep -o '[0-9]\+' | head -1)
NEXT_NUM=$((CURRENT_STAGE_NUM + 1))

# Map to directory name
case $NEXT_NUM in
  2) NEXT="stage-02-discovery" ;;
  3) NEXT="stage-03-spec" ;;
  4) NEXT="stage-04-architecture" ;;
  5) NEXT="stage-05-scaffold" ;;
  6) NEXT="stage-06-build" ;;
  7) NEXT="stage-07-qa" ;;
  8) NEXT="stage-08-release" ;;
  9) NEXT="stage-09-operate" ;;
  10) NEXT="stage-10-evolve" ;;
esac

# Create next stage directory and situation
mkdir -p ".ai-first/state/$NEXT"
cat > ".ai-first/state/$NEXT/situation.md" << SITUATION
# Stage: ${NEXT#stage-??-}
**Started**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Lead Agent**: {lead agent for this stage}
**Previous Stage**: $CURRENT

## Current State

Stage advanced from $CURRENT. Ready for ${NEXT#stage-??-} stage work.
SITUATION

# Update symlink
rm .ai-first/state/current
ln -sf "$NEXT" .ai-first/state/current

# Update project.yml
STAGE_NAME=$(echo $NEXT | sed 's/stage-[0-9]*-//')
# Use sed to update currentStage in project.yml
sed -i '' "s/currentStage: .*/currentStage: $STAGE_NAME/" .ai-first/project.yml

# Bible lock management: lock standards/ during execution stages, unlock during evolve
case "$STAGE_NAME" in
  build|qa|release)
    cat > .ai-first/locks/rules.lock << LOCKFILE
# Rules Lock
**Locked at**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Stage**: $STAGE_NAME
**Effect**: standards/ and stable knowledge/ are READ-ONLY
**Reason**: Rules are locked during execution stages. Code must conform to rules — rules do not change to fit code.
**Unlock**: Advance to evolve stage.
LOCKFILE
    echo "Rules locked — standards/ and stable knowledge/ are now read-only"
    ;;
  evolve|idea|discovery)
    rm -f .ai-first/locks/rules.lock
    echo "Rules unlocked — standards/ and knowledge/ can be modified"
    ;;
esac

# Append to timeline (append-only, never modify previous entries)
cat >> .ai-first/logs/timeline.md << TLENTRY
[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [STAGE_TRANSITION] $CURRENT → $NEXT ($STAGE_NAME) — mode: $MODE
TLENTRY

echo "Advanced to $NEXT (stage: $STAGE_NAME)"
```

### 4. Dispatch Lead Agent (mode-aware)

| Mode | Action |
|------|--------|
| **skip** | Do NOT dispatch. Report: "Stage skipped per task mode." |
| **reuse** | Dispatch lead agent with instruction: "Reuse existing {artifact} from .ai-first/artifacts/ — adapt for current context without regenerating from scratch." |
| **generate** | Dispatch lead agent normally — full generation. |
| **execute** | Dispatch builder-agent normally — full implementation. |

Normal lead agent assignments:
- idea/discovery: intake-agent
- spec: planner-agent
- architecture: architect-agent
- scaffold/build: builder-agent
- qa: reviewer-agent
- release: release-agent
- operate/evolve: team-lead-agent

## Safety Rules

### YOU MUST
- Run every checklist item — do not skip any
- Abort if any check fails, with a clear message about what's blocking
- Update BOTH the symlink AND project.yml in the same step
- Report the transition clearly

### YOU MUST NOT
- Skip stage exit checks even if "it looks fine"
- Advance with active tasks or pending sync events
- Leave project.yml and symlink out of sync
