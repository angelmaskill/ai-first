---
name: optimization-scanner
description: >
  Analyze code for performance, structure, and maintainability optimization
  opportunities. Run on brownfield adoption, before releases, or when /scan
  is invoked. Produces structured optimization suggestions ranked by impact
  and effort.
---

# Optimization Scanner

Analyze project code for optimization opportunities across performance,
structure, maintainability, and bundle size. Unlike bug-scan (which finds
defects) and security-scan (which finds vulnerabilities), this scanner
finds improvement opportunities.

## When to Use This Skill

- Brownfield project adoption — mandatory initial scan
- Before release stage — identify quick wins
- When `/scan` is invoked
- After major refactors

## Workflow

### Phase 1: Performance Analysis

```bash
echo "=== Large files (>300 lines) ==="
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" \
  -exec wc -l {} + 2>/dev/null | sort -rn | head -20 | awk '$1 > 300 {print $1, $2}'

echo "=== Deep nesting (>4 levels) ==="
# Look for deeply nested directories
find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" | \
  awk -F/ '{depth=NF-1; if(depth>4) print depth, $0}' | sort -rn | head -10

echo "=== Circular dependency risk ==="
# Check for barrel import patterns that could cause cycles
grep -rl "export \* from" --include="*.ts" --include="*.tsx" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null | wc -l
echo "barrel export files detected"
```

### Phase 2: Maintainability Analysis

```bash
echo "=== Functions with many parameters (>4) ==="
grep -rn "function\s\+\w\+\s*(" --include="*.ts" --include="*.tsx" . \
  --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | \
  grep -o "([^)]*)" | awk -F',' '{if(NF>4) print NF " params:", $0}' | head -10

echo "=== Magic numbers ==="
grep -rn "\b[0-9]\{2,\}\b" --include="*.ts" --include="*.tsx" . \
  --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | \
  grep -v "import\|require\|version\|0x[0-9a-fA-F]" | head -10

echo "=== Duplicate code indicators ==="
# Count files with similar names (potential copy-paste)
find . -type f -name "*.ts" ! -path "*/node_modules/*" ! -path "*/.git/*" | \
  xargs -I{} basename {} .ts | sort | uniq -c | sort -rn | head -10 | awk '$1 > 1'

echo "=== Missing TypeScript strict features ==="
if [ -f tsconfig.json ]; then
  echo "noUnusedLocals: $(grep -c 'noUnusedLocals.*true' tsconfig.json)"
  echo "noUnusedParameters: $(grep -c 'noUnusedParameters.*true' tsconfig.json)"
  echo "strictNullChecks: $(grep -c 'strictNullChecks.*true' tsconfig.json)"
  echo "noImplicitReturns: $(grep -c 'noImplicitReturns.*true' tsconfig.json)"
fi
```

### Phase 3: Structure Analysis

```bash
echo "=== Module cohesion check ==="
# Files per top-level directory
for dir in $(find . -maxdepth 2 -type d ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/.ai-first/*"); do
  count=$(find "$dir" -maxdepth 1 -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l)
  if [ "$count" -gt 10 ]; then
    echo "HIGH: $dir has $count files — consider splitting"
  fi
done

echo "=== Unused dependency check ==="
if [ -f package.json ]; then
  DEPS=$(node -e "const p=require('./package.json'); console.log(Object.keys({...p.dependencies||{}, ...p.devDependencies||{}}).length)")
  echo "Total dependencies: $DEPS"
  echo "Tip: run 'npx depcheck' for unused dependency detection"
fi
```

### Phase 4: Severity Classification

| Finding | Severity | Impact |
|---------|----------|--------|
| Missing strict TS options | high | Type safety, bug prevention |
| Files >500 lines | medium | Readability, testability |
| Circular dependency risk | high | Build reliability, tree-shaking |
| >4 function parameters | low | API design |
| Magic numbers | low | Maintainability |
| High directory file count | medium | Module boundaries |
| Unused dependencies | medium | Bundle size, install time |

### Phase 5: Generate Report

Write to `.ai-first/reports/optimization-{timestamp}.md`:

```markdown
# Optimization Scan Report
**Date**: {timestamp}
**Files Analyzed**: {N}

## Critical (fix now)
| Finding | Location | Impact | Effort | Suggestion |
|---------|----------|--------|--------|------------|

## High Priority (fix this sprint)
| Finding | Location | Impact | Effort | Suggestion |
|---------|----------|--------|--------|------------|

## Medium Priority (fix when touching this code)
| Finding | Location | Impact | Effort | Suggestion |
|---------|----------|--------|--------|------------|

## Low Priority (nice to have)
| Finding | Location | Suggestion |
|---------|----------|------------|

## Quick Wins (high impact, low effort)
{top 3 items sorted by impact/effort ratio}

## Summary
- Critical: {N}
- High: {N}
- Medium: {N}
- Low: {N}
- Quick wins available: {N}
```

## Quality Standards
- Every finding MUST have a concrete file:line location
- Every finding MUST have a specific, actionable suggestion
- Rank findings by impact/effort ratio — show quick wins first
- Do NOT flag intentional design choices as problems
- Do NOT recommend adding dependencies as solutions
