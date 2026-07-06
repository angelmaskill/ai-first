# Team Trial Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the validated AI-first scaffold from simulation evidence to a team-ready trial package.

**Architecture:** Keep the scaffold lightweight: deterministic CLI and docs guide the process, while Codex and Claude Code keep their normal coding freedom. Treat the example project as a stable fixture, not as production runtime state.

**Tech Stack:** TypeScript CLI core, Vitest, Node.js example fixture, Markdown operational docs.

---

## File Structure

- `src/core/guide/guide-core.ts`: stage-aware next-step suggestions for build, QA, release, operate, and evolve.
- `src/core/guide/guide-core.test.ts`: regression tests proving QA guidance no longer asks for a generic implementation task.
- `src/core/state/state-updater.ts`: expose whether a stage transition locked, unlocked, or did not touch `rules.lock`.
- `src/core/state/state-updater.test.ts`: regression tests for lock/unlock result metadata.
- `src/core/stage/stage-advance-cli.ts`: render accurate `rules.lock` CLI wording.
- `scripts/validate-example-lifecycle.mjs`: one-command fixture validation.
- `package.json`: add `validate:example-lifecycle`.
- `examples/ai-project-lifecycle-sim/README.md`: define the fixture boundary and safe rerun commands.
- `examples/ai-project-lifecycle-sim/.gitignore`: ignore volatile fixture runtime outputs.
- `docs/AI-first-团队试点落地指南.md`: team rollout handbook covering the six priorities.

## Task 1: Stabilize The Example Fixture

- [x] Add an example-local `.gitignore` for volatile runtime files.
- [x] Expand the example README with fixture purpose, safe commands, and pollution boundaries.
- [x] Add a root validation script that runs example tests, typecheck, lint, and guide smoke check.
- [x] Verify `npm run validate:example-lifecycle`.

## Task 2: Fix Stage-Aware Guide Suggestions

- [x] Add tests for QA guide output.
- [x] Change `deriveNextSteps()` so QA recommends review/sync/release readiness instead of generic implementation task.
- [x] Add release/operate/evolve suggestions aligned with team trial usage.
- [x] Verify targeted guide tests.

## Task 3: Fix Stage Advance Lock Wording

- [x] Add result metadata for `rules.lock` action.
- [x] Update tests for lock and unlock transitions.
- [x] Update CLI output to print locked/unlocked/no-change accurately.
- [x] Verify targeted stage tests.

## Task 4: Document Team Rollout

- [x] Write the team trial handbook around the six priority workstreams.
- [x] Include concrete commands and natural-language expressions for developers.
- [x] Include pilot selection, workflow, and acceptance criteria.
- [x] Cross-reference the simulation report and usage manuals.

## Task 5: Run Verification

- [x] Run `npm run validate:example-lifecycle`.
- [x] Run targeted tests for guide and state updater.
- [x] Run the repository check if targeted validation passes.
- [x] Record any remaining risks in the final response.
