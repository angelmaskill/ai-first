---
name: health
description: Show project health summary — stage, tests, reviews, risks
agent: team-lead-agent
---

# /health

Display a one-page project health summary by reading all snapshots,
reviews, sync events, and state files.

## Steps

### 1. Quick Facts
```bash
echo "=== Project Health: $(grep 'name:' .ai-first/project.yml | head -1 | awk '{print $2}') ==="
echo ""
echo "Stage: $(readlink .ai-first/state/current | sed 's/stage-[0-9]*-//')"
echo "Mode: $(grep 'mode:' .ai-first/project.yml | awk '{print $2}')"
echo "Rules: $(test -f .ai-first/locks/rules.lock && echo 'LOCKED' || echo 'UNLOCKED')"
```

### 2. Agent & Command Coverage
```bash
echo ""
echo "=== Coverage ==="
AGENTS=$(ls .claude/agents/*.md 2>/dev/null | wc -l)
COMMANDS=$(ls .claude/commands/*.md 2>/dev/null | wc -l)
SKILLS=$(ls .claude/skills/*/SKILL.md 2>/dev/null | wc -l)
echo "Agents: $AGENTS  Commands: $COMMANDS  Skills: $SKILLS"
```

### 3. Test Status
```bash
echo ""
echo "=== Tests ==="
npx vitest run --reporter=verbose 2>&1 | tail -5 || echo "vitest not available"
SRC=$(find src/ -name "*.ts" ! -name "*.test.*" 2>/dev/null | wc -l)
TEST=$(find . -name "*.test.*" 2>/dev/null | wc -l)
echo "Test:Source ratio: $TEST/$SRC"
```

### 4. Review Status
```bash
echo ""
echo "=== Reviews ==="
FAILED=$(grep -rl "Verdict.*FAILED" .ai-first/reviews/ 2>/dev/null | wc -l)
PASSED=$(grep -rl "Verdict.*PASSED" .ai-first/reviews/ 2>/dev/null | wc -l)
echo "Passed: $PASSED  Failed: $FAILED"
```

### 5. Sync & Knowledge
```bash
echo ""
echo "=== Knowledge ==="
KNOWLEDGE=$(ls .ai-first/knowledge/*.md 2>/dev/null | grep -v INDEX | grep -v TEMPLATE | grep -v DECISION | wc -l)
STANDARDS=$(ls .ai-first/standards/*/*.md 2>/dev/null | wc -l)
SYNC_OPEN=$(grep -rl "status: suggested\|status: pending" .ai-first/sync/ 2>/dev/null | wc -l)
echo "Knowledge items: $KNOWLEDGE  Standards: $STANDARDS  Open sync: $SYNC_OPEN"
```

### 6. Risk Summary
```bash
echo ""
echo "=== Top Risks ==="
# Check test coverage
if [ "$TEST" -eq 0 ]; then
  echo "[CRITICAL] Zero test coverage"
elif [ "$(echo "$TEST/$SRC < 0.1" | bc 2>/dev/null)" = "1" ]; then
  echo "[WARNING] Low test coverage ($TEST/$SRC)"
else
  echo "[OK] Test coverage adequate"
fi

# Check for stale knowledge
if [ "$SYNC_OPEN" -gt 0 ]; then
  echo "[WARNING] $SYNC_OPEN pending sync events"
else
  echo "[OK] Knowledge in sync"
fi

# Check artifacts
ARTIFACTS=$(ls .ai-first/artifacts/*.md 2>/dev/null | wc -l)
if [ "$ARTIFACTS" -lt 3 ]; then
  echo "[WARNING] Only $ARTIFACTS artifacts (expected 3+)"
else
  echo "[OK] $ARTIFACTS artifacts present"
fi
```

### 7. Recent Timeline
```bash
echo ""
echo "=== Recent Activity ==="
tail -5 .ai-first/logs/timeline.md 2>/dev/null || echo "No timeline"
```

## Output Format

All sections are printed to stdout. The command aggregates into a single
readable health summary. No files are written.
