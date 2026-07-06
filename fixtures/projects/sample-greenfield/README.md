# Sample greenfield fixture project (L1)

A minimal but realistic `.ai-first/` skeleton used for:

1. **Onboarding** — copy this directory to bootstrap a new project and run the v0.1 main line.
2. **Integration tests** — a stable fixture the deterministic core can be exercised against.

## What's inside

```
.ai-first/
  project.yml                 # brownfield project w/ a backend domain
  tasks/task-sample-001.yml   # one in_progress task with acceptance criteria
  change-scopes/scope-task-sample-001.yml
  standards/backend/STANDARD-012.md   # one accepted standard with frontmatter
  contracts/CONTRACT-auth.yml         # one cross-domain contract
  knowledge/KNOW-1.yml                # one knowledge item
  runtime/prompts/codex/v0.md         # prompt v0 reference
src/backend/auth.ts                   # a stub source file
```

## Run the v0.1 main line on this fixture

From the ai-first repo root:

```bash
# 1. guide — show stage / next-step
npm run guide -- fixtures/projects/sample-greenfield

# 2. scan — detect domains + write configs (overwrites .ai-first/domains/)
npm run scan:domains:write -- fixtures/projects/sample-greenfield

# 3. task:exec — dry-run the task end-to-end (no real Codex)
npm run task:exec -- --task task-sample-001 \
  --dry-run --allow-dirty \
  --cwd fixtures/projects/sample-greenfield

# 4. sync — generate doc-rot suggestions from the report
npm run sync -- --from-report \
  fixtures/projects/sample-greenfield/.ai-first/reports/report-task-sample-001-*.yml
```

Or drive all of them at once via the unified CLI:

```bash
ai-first pilot fixtures/projects/sample-greenfield
```

## Notes

- The fixture intentionally starts with a clean `.ai-first/` so every command
  produces deterministic, inspectable output.
- `task-sample-001` carries an `npm-test` acceptance criterion; in the fixture
  there is no `package.json`, so `task:exec` (even dry-run) will report
  `review_pending / acceptance_failed` — a faithful demonstration of the
  3-state decision. Add a `package.json` with a `test` script to see `done`.
