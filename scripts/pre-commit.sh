#!/usr/bin/env bash
set -euo pipefail

# Pre-commit hook: security & quality checks on staged files
# Part of AI-first automation pipeline (Iteration 3)

STAGED=$(git diff --cached --name-only --diff-filter=ACM)
EXIT_CODE=0

check_secrets() {
  local patterns=(
    'API[_-]?KEY\s*=\s*["'"'"'][A-Za-z0-9_-]{8,}'
    'SECRET[_-]?KEY\s*=\s*["'"'"'][A-Za-z0-9_-]{8,}'
    'password\s*=\s*["'"'"'][^"'"'"']+["'"'"']'
    'BEGIN\s+(RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY'
    'github[_-]?token\s*[:=]\s*["'"'"']?[A-Za-z0-9_-]{8,}'
    'npm[_-]?auth[_-]?token\s*[:=]\s*'
    'AUTH_TOKEN\s*=\s*["'"'"']'
    'DATABASE_URL\s*=\s*["'"'"']postgres'
  )

  for file in $STAGED; do
    [[ -f "$file" ]] || continue
    # Skip binary files
    if file "$file" | grep -q 'binary'; then continue; fi

    for pattern in "${patterns[@]}"; do
      if grep -nE "$pattern" "$file" 2>/dev/null; then
        echo "  [SECRET] Possible secret in $file (pattern: ${pattern:0:40}...)"
        EXIT_CODE=1
      fi
    done
  done
}

check_env_files() {
  for file in $STAGED; do
    case "$file" in
      *.env|*.env.*|*secret*|*credential*|*.pem|*.key|*.pkcs12|*.pfx|*.jks|*.keystore)
        if [[ "$file" != .env.example ]] && [[ "$file" != *.sample ]]; then
          echo "  [BLOCKED] Sensitive file staged: $file"
          EXIT_CODE=1
        fi
        ;;
    esac
  done
}

check_empty_catch() {
  for file in $STAGED; do
    [[ -f "$file" ]] || continue
    case "$file" in
      *.ts|*.tsx|*.js|*.jsx)
        if grep -n 'catch\s*(\s*[a-zA-Z_]*\s*)\s*{\s*}' "$file" 2>/dev/null; then
          echo "  [BUG-RISK] Empty catch block in $file"
          EXIT_CODE=1
        fi
        ;;
    esac
  done
}

check_console() {
  for file in $STAGED; do
    [[ -f "$file" ]] || continue
    case "$file" in
      *.ts|*.tsx|*.js|*.jsx)
        local count=$(grep -c 'console\.\(log\|warn\|error\|debug\|info\)(' "$file" 2>/dev/null || echo 0)
        if [ "$count" -gt 20 ]; then
          echo "  [STYLE] $file has $count console statements (limit: 20)"
          EXIT_CODE=1
        elif [ "$count" -gt 0 ]; then
          echo "  [STYLE] $file has $count console statements (under limit of 20)"
        fi
        ;;
    esac
  done
}

check_typecheck() {
  echo "  [TYPE] Running tsc --noEmit..."
  if npx tsc --noEmit 2>&1; then
    echo "  [TYPE] TypeScript compilation: PASS"
  else
    echo "  [TYPE] TypeScript compilation: FAIL"
    EXIT_CODE=1
  fi
}

check_tests() {
  echo "  [TEST] Running vitest run --changed..."
  if npx vitest run --changed 2>&1; then
    echo "  [TEST] Tests: PASS"
  else
    echo "  [TEST] Tests: FAIL"
    EXIT_CODE=1
  fi
}

echo "AI-first pre-commit: scanning staged files..."
check_secrets
check_env_files
check_empty_catch
check_console
check_typecheck
check_tests

if [[ $EXIT_CODE -ne 0 ]]; then
  echo ""
  echo "Pre-commit checks FAILED. Fix issues above before committing."
  echo "Use git commit --no-verify to bypass (not recommended)."
fi

exit $EXIT_CODE
