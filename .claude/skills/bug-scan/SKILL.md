---
name: bug-scan
description: >
  Systematic code quality scan using pattern matching. Checks for common
  issues: console.log statements, empty catch blocks, any type overuse,
  empty promise catches. Run this before every review. Produces structured
  findings with file:line locations.
---

# Bug Scanner

Run a systematic pattern-based scan for common code quality issues.
This complements the reviewer-agent's semantic review by guaranteeing
exhaustive pattern coverage.

## When to Use This Skill

- After builder-agent completes a task
- When `/scan` is invoked
- Before QA stage entry
- Before release preparation

## Phase 1: Automated Pattern Scan

Execute ALL of these commands. Do not skip any.

### 1.1 Console Log Detection
```bash
echo "=== CONSOLE STATEMENTS ==="
grep -rn "console\.\(log\|debug\|info\|warn\|error\|trace\)" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first \
  --exclude-dir=dist --exclude-dir=build \
  | grep -v "//.*console" \
  | grep -v "/\*.*console" \
  | head -50
```

### 1.2 Empty Catch Blocks
```bash
echo "=== EMPTY CATCH BLOCKS ==="
grep -rn "catch\s*(\s*[^)]*\s*)\s*{\s*}" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first
```

### 1.3 Any Type Overuse
```bash
echo "=== ANY TYPE USAGE ==="
ANY_COUNT=$(grep -rn ": any" --include="*.ts" --include="*.tsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first | wc -l)
echo "Total 'any' type usages: $ANY_COUNT"
if [ "$ANY_COUNT" -gt 20 ]; then
  echo "WARNING: High 'any' type usage ($ANY_COUNT instances)"
  grep -rn ": any" --include="*.ts" --include="*.tsx" \
    . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first | head -15
fi
```

### 1.4 Empty Promise Catch
```bash
echo "=== EMPTY PROMISE CATCH ==="
grep -rn "\.catch\s*(\s*)\s*$" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first
```

### 1.5 TODO/FIXME Tracking
```bash
echo "=== TODO/FIXME ==="
grep -rn "TODO\|FIXME\|HACK\|XXX" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first | head -30
```

## Phase 2: Severity Classification

Classify each finding:

| Severity | Criteria |
|----------|----------|
| high | Empty catch blocks, unhandled promise rejections |
| medium | Console statements in production paths, any type in public API |
| low | TODO/FIXME without ticket reference, any type in test files |

## Phase 3: Report

Write to `.ai-first/reports/bug-scan-{timestamp}.md`:

```markdown
# Bug Scan Report
**Date**: {timestamp}
**Files Scanned**: {N} .ts/.tsx/.js/.jsx

## Console Statements ({N})
| File | Line | Statement |
|------|------|-----------|
| path/to/file.ts | 42 | console.log(result) |

## Empty Catch Blocks ({N})
| File | Line |
|------|------|

## Any Type Usage
Total: {N} instances [(OK / WARNING / CRITICAL)]

## Empty Promise Catches ({N})
| File | Line |
|------|------|

## TODO/FIXME ({N})
| File | Line | Message |
|------|------|---------|

## Summary
| Category | Count | Severity |
|----------|-------|----------|
| Console statements | N | medium |
| Empty catch | N | high |
| Any type | N | medium |
| Empty promise catch | N | high |
| TODO/FIXME | N | low |

**Verdict**: [CLEAN / NEEDS CLEANUP / BLOCKING]
```

## Quality Standards
- ALL commands in Phase 1 must execute — no shortcuts
- Every finding must have a file path and line number
- Report must be written to disk
