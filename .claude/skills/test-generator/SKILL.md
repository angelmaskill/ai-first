---
name: test-generator
description: >
  AI-assisted test generation. Analyzes source code changes and generates test
  skeletons, suggests test cases for uncovered branches, provides coverage
  improvement recommendations, and identifies edge cases. Complements the
  reviewer-agent testing gate by proactively creating tests rather than just
  checking their existence.
---

# Test Generator

Generate and improve tests based on code analysis. This skill bridges the
gap between "tests exist" and "tests are good" — it doesn't just check
coverage, it produces test code.

## When to Use This Skill

- After builder-agent completes a feature implementation
- When test coverage drops below threshold
- During `/complete` post-build chain (before review)
- When `/health` shows test:source ratio < 0.5
- On demand: "generate tests for {file}"

## Phase 1: Coverage Analysis

### 1.1 Run Coverage Report
```bash
echo "=== COVERAGE REPORT ==="
if [ -f "package.json" ] && grep -q "vitest" package.json; then
  npx vitest run --coverage 2>/dev/null || npx vitest run 2>&1 | tail -5
elif [ -f "package.json" ] && grep -q "jest" package.json; then
  npx jest --coverage 2>/dev/null || npx jest 2>&1 | tail -5
else
  echo "No test runner detected (vitest or jest)"
fi
```

### 1.2 Identify Changed Files Without Tests
```bash
echo "=== FILES WITHOUT TESTS ==="
for f in $(git diff --name-only HEAD~1 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' | grep -v '\.test\.\|\.spec\.\|\.d\.ts'); do
  test_file="${f%.*}.test.${f##*.}"
  if [ ! -f "$test_file" ] && [ ! -f "${f//\//}.test.${f##*.}" ]; then
    echo "MISSING: $f → no test file found"
  fi
done
```

### 1.3 Test:Source Ratio
```bash
echo "=== TEST:SOURCE RATIO ==="
SRC_COUNT=$(find src -name "*.ts" -not -name "*.test.*" -not -name "*.d.ts" 2>/dev/null | wc -l)
TEST_COUNT=$(find src -name "*.test.ts" -name "*.test.tsx" 2>/dev/null | wc -l)
echo "Source files: $SRC_COUNT, Test files: $TEST_COUNT"
if [ "$SRC_COUNT" -gt 0 ]; then
  RATIO=$(echo "scale=2; $TEST_COUNT / $SRC_COUNT" | bc 2>/dev/null || echo "n/a")
  echo "Ratio: $RATIO (target: >= 0.5)"
fi
```

## Phase 2: Test Case Generation

For each source file identified in Phase 1, analyze its exports and generate
appropriate test skeletons.

### 2.1 Identify Testable Units

Read the source file and identify:
- **Pure functions**: input → output, no side effects
- **Functions with side effects**: DB calls, API calls, file I/O
- **React components / UI**: rendering output
- **Classes / Services**: method behavior
- **Error paths**: catch blocks, error returns, null/undefined guards
- **Edge cases**: empty arrays, boundary values, type coercion

### 2.2 Generate Test Skeleton

For each testable unit, produce a test skeleton:

```typescript
import { describe, it, expect, vi } from "vitest";
import { functionName } from "./module";

describe("functionName", () => {
  // Happy path
  it("returns expected output for valid input", () => {
    const result = functionName(validInput);
    expect(result).toEqual(expectedOutput);
  });

  // Edge cases
  it("handles empty input gracefully", () => {
    expect(() => functionName(null)).not.toThrow();
  });

  // Error path
  it("throws/rejects on invalid input", () => {
    expect(() => functionName(invalidInput)).toThrow();
  });

  // Boundary
  it("handles boundary values correctly", () => {
    const result = functionName(boundaryValue);
    expect(result).toBeDefined();
  });
});
```

### 2.3 Coverage Target

Aim for this coverage profile per file:

| Type | Happy Path | Edge Cases | Error Paths | Integration |
|------|-----------|------------|-------------|-------------|
| Pure function | 1-2 tests | 1-2 tests | 1 test | — |
| Service/API call | 1-2 tests | 1 test | 2-3 tests | 1 mock test |
| UI component | 1 render test | 1 interaction test | 1 error state | 1 snapshot |
| CLI command | 1 success path | 1 bad input | 1 missing dep | — |

## Phase 3: Gap Detection

### 3.1 Uncovered Branches

Scan source files for patterns commonly missed by tests:
- `catch` blocks with no test coverage
- `if/else` branches with only one side tested
- `switch` cases without full coverage
- Optional chaining without null path tests
- Async error handling without rejection tests

### 3.2 Boundary Value Analysis

For functions accepting:
- **Numbers**: test 0, negative, MAX_VALUE, NaN, Infinity
- **Strings**: test empty, single char, very long, unicode, SQL/HTML injection
- **Arrays**: test empty, single element, large, nested
- **Objects**: test null, missing keys, extra keys, wrong types
- **Dates**: test past, future, epoch, invalid

## Phase 4: Report

Write to `.ai-first/reports/test-generation-{timestamp}.md`:

```markdown
# Test Generation Report
**Date**: {timestamp}
**Source files analyzed**: {N}
**New test files created**: {N}
**Existing tests extended**: {N}

## Files Without Test Coverage ({N})
| File | Risk | Suggested Tests |
|------|------|-----------------|
| src/api/auth.ts | high | Token expiry, invalid credentials, network failure |

## Coverage Gaps ({N})
| File | Function | Missing Coverage |
|------|----------|-----------------|
| src/utils/format.ts | parseDate | Error path: invalid date string |

## Generated Test Files
{list of created/updated test files with test counts}

## Coverage Impact
- Before: {ratio} ({test_count} tests)
- After: {ratio} ({test_count} tests)
- Delta: +{N} tests

## Verdict
[COVERAGE IMPROVED / NEEDS MORE TESTS]
```

## Quality Standards
- All generated tests must compile (no syntax errors)
- Every generated test skeleton must have at least 1 happy path test
- Mock external dependencies — never hit real APIs/DBs in unit tests
- Generated tests must be written to disk, not just displayed
- Report must be saved to `.ai-first/reports/`
