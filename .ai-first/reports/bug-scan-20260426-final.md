# Bug Scan Report
**Date**: 2026-04-27T00:08:00Z
**Scope**: full repository
**Skill**: bug-scan

## Console Statements (9)
All in `src/core/harness/dispatch-cli.ts` — a CLI entry point where stderr/stdout are the intended output channel. Not a bug.

| File | Line | Statement | Assessment |
|------|------|-----------|------------|
| src/core/harness/dispatch-cli.ts | 79 | console.error (usage) | Expected — CLI |
| src/core/harness/dispatch-cli.ts | 85 | console.error (file not found) | Expected — CLI |
| src/core/harness/dispatch-cli.ts | 92-94 | console.error (task info) | Expected — CLI |
| src/core/harness/dispatch-cli.ts | 105,108 | console.error (split info) | Expected — CLI |
| src/core/harness/dispatch-cli.ts | 154 | console.error (manifest) | Expected — CLI |
| src/core/harness/dispatch-cli.ts | 172 | console.log (JSON output) | Expected — CLI |

## Empty Catch Blocks
None found.

## Any Type Usage
**Total: 0 instances** — No `: any` type annotations found. TypeScript strict mode is enforced.

## Empty Promise Catches
None found.

## TODO/FIXME
None found.

## Test→Production Leaks
None found — no localhost URLs, test credentials, debug flags, or hardcoded ports in production code.

## Async Safety Review (manual)
- `src/core/tools/claude-code-adapter.ts`: All async methods properly return Promises. Status checks before operations.
- `src/core/tools/codex-adapter.ts`: Same pattern — status gate before send().
- `src/core/harness/subagent-dispatcher.ts`: Pure functions, no async state.

## Null/Undefined Handling
- `subagentToRole()`: Returns direct lookup, no null check needed (TypeScript enforces valid SubagentType).
- `resolveAgentForSubtask()`: Returns `undefined` when no match, caller handles.
- Adapter `query()`: Switch with default case, safe.

## Summary
| Category | Count | Severity |
|----------|-------|----------|
| Console statements | 9 | Low (CLI tool) |
| Empty catch | 0 | — |
| Any type | 0 | — |
| Empty promise catch | 0 | — |
| TODO/FIXME | 0 | — |
| Test→Prod leak | 0 | — |

**Verdict**: CLEAN — no bugs or quality issues found by pattern scan.
