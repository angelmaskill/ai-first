---
name: security-scan
description: >
  Run a systematic security scan of the codebase. Use this skill to check for
  secret leakage, vulnerable dependencies, insecure configurations, and auth
  weaknesses. Triggers during build, QA, and operate stages. Produces a
  structured report with severity ratings and concrete remediations.
---

# Security Scanner

Run a security scan across the repository using systematic pattern matching
combined with semantic review. This is NOT just documentation — execute the
scan commands below.

## When to Use This Skill

- After implementation completes and before QA gates
- As part of `/adopt` baseline scan
- When `/scan` is invoked
- Periodically during the operate stage

## Phase 1: Automated Pattern Scan (execute these commands)

### 1.1 Secret Detection
```bash
echo "=== SECRET DETECTION ==="
grep -rn "API_KEY\|SECRET\|TOKEN\|PASSWORD\|password\|secret\|private_key" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --include="*.json" --include="*.yml" --include="*.yaml" \
  --include="*.env" --include="*.config" \
  . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai-first \
  | grep -v "import\|export\|process\.env\|\.d\.ts"
```

### 1.2 Gitignore Check
```bash
echo "=== GITIGNORE CHECK ==="
test -f .gitignore && grep -E "\.env$|\.pem$|credentials|secrets" .gitignore || echo "WARNING: .gitignore missing or incomplete"
```

### 1.3 Env Files Check
```bash
echo "=== ENV FILE CHECK ==="
find . -name "*.env" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null
git ls-files "*.env" 2>/dev/null && echo "WARNING: .env files tracked by git!"
```

### 1.4 Dependency Audit
```bash
echo "=== DEPENDENCY AUDIT ==="
test -f package.json && npm audit --json 2>/dev/null | python3 -c "
import json,sys
try:
  data = json.load(sys.stdin)
  vulns = data.get('vulnerabilities', {})
  critical = sum(1 for v in vulns.values() if v.get('severity') == 'critical')
  high = sum(1 for v in vulns.values() if v.get('severity') == 'high')
  print(f'Vulnerabilities: {len(vulns)} (Critical: {critical}, High: {high})')
except: print('npm audit failed or no vulnerabilities found')
" 2>/dev/null || echo "npm audit not available"
```

### 1.5 Risky Code Patterns
```bash
echo "=== RISKY PATTERNS ==="
echo "--- Dynamic code execution:"
grep -rn "Function(" --include="*.ts" --include="*.tsx" --include="*.js" . --exclude-dir=node_modules --exclude-dir=.ai-first | head -10
echo "--- Unsanitized HTML:"
grep -rn "innerHTML\s*=" --include="*.ts" --include="*.tsx" --include="*.js" . --exclude-dir=node_modules --exclude-dir=.ai-first | head -10
echo "--- SQL concatenation:"
grep -rn "+\s*[\"']\s*SELECT\|+\s*[\"']\s*INSERT\|+\s*[\"']\s*UPDATE\|+\s*[\"']\s*DELETE" --include="*.ts" --include="*.tsx" --include="*.js" . --exclude-dir=node_modules --exclude-dir=.ai-first | head -10
```

## Phase 2: Configuration Review

### 2.1 TypeScript Strict Mode
```bash
echo "=== TSCONFIG CHECK ==="
test -f tsconfig.json && grep -E '"strict"|"noImplicitAny"|"strictNullChecks"' tsconfig.json || echo "No tsconfig.json"
```

### 2.2 Debug Flags
```bash
echo "=== DEBUG FLAGS ==="
grep -rn "DEBUG\|debug\s*=\s*true\|NODE_ENV.*development" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.env" . --exclude-dir=node_modules --exclude-dir=.ai-first --exclude-dir=.git | head -10
```

## Phase 3: Report Generation

Compile all findings into `.ai-first/reports/security-{timestamp}.md`:

```markdown
# Security Scan Report
**Date**: {timestamp}
**Scope**: full repository

## Critical Findings
{any secret leaks, tracked .env files, critical vulnerabilities}

## High Severity
{insecure patterns, high-severity npm vulns}

## Medium Severity
{missing .gitignore entries, risky patterns in non-critical paths}

## Low Severity
{configuration improvements, hardening suggestions}

## Dependency Status
- Total: {N}
- Vulnerable: {N} (Critical: N, High: N, Medium: N)

## Summary Table
| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |

**Verdict**: [CLEAN / NEEDS REVIEW / BLOCKING]
```

## Quality Standards
- Phase 1 commands MUST be executed — do not skip automation
- Every finding must cite a specific file path
- Critical findings block release
- False positives must be explicitly noted
- Report must be written to disk, not just displayed
