# AI Project Lifecycle Simulation

This fixture is a small brownfield AI product used to validate the AI-first
research and development workflow.

It intentionally contains frontend, backend, algorithm, data, shared, docs, and
tests paths so the scaffold can detect and manage multiple development domains.

## Domain Map

- `frontend/`: UI state and rendering helpers.
- `backend/`: API orchestration and recommendation endpoint logic.
- `algorithm/`: ranking logic used by the backend.
- `data/`: sample catalog records and schema notes.
- `shared/`: shared runtime contracts.
- `docs/`: product and architecture notes.

## Local Checks

```bash
npm test
npm run typecheck
npm run lint
```

The scripts are dependency-free and use Node.js only.

## AI-First Fixture Boundary

This project lives inside the scaffold repository on purpose. Treat it as a
stable example fixture, not as a production business project.

Source-like fixture state is kept under:

- `.ai-first/project.yml`
- `.ai-first/domains/`
- `.ai-first/standards/`
- `.ai-first/artifacts/`
- `.ai-first/tasks/`
- `.ai-first/change-scopes/`
- `.ai-first/runtime/`

Volatile runtime evidence is intentionally ignored by this fixture:

- `.ai-first/logs/`
- `.ai-first/locks/`
- `.ai-first/reports/`
- `.ai-first/sync/`
- `.ai-first/state/current`

The validation transcript is documented in `VALIDATION.md`, so reruns do not
need to commit every generated report or sync event.

## Safe Rerun Commands

From the scaffold repository root:

```bash
npm run validate:example-lifecycle
npm run guide -- examples/ai-project-lifecycle-sim
```

When running state-changing commands, either pass the fixture path explicitly or
change into this directory first:

```bash
cd examples/ai-project-lifecycle-sim
../../node_modules/.bin/tsx ../../src/core/stage/stage-gate-cli.ts build qa
```

Do not run stage-advance commands from the scaffold root unless the intent is to
change the scaffold repository's own `.ai-first` state.
