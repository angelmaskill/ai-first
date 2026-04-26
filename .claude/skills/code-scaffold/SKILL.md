---
name: code-scaffold
description: >
  Generate project scaffold layouts and implementation plans. Use this skill
  when setting up a new project structure, defining directory conventions,
  or preparing the skeleton that builders will implement within. Triggers
  during architecture, scaffold, and build stages.
---

# Code Scaffold Generator

Generate scaffold recommendations for build-ready project layouts. This skill
produces concrete directory structures, naming conventions, and tooling
configurations that builders follow during implementation.

## When to Use This Skill

- Setting up a greenfield project structure
- Defining conventions for a new module in a brownfield project
- The architect says "design the scaffold layout"
- The orchestrator says "call code-scaffold"

## Workflow

### Phase 1: Analyze Context
1. Read the architecture decisions from `.ai-first/artifacts/architecture.md`
2. Identify: monorepo vs polyrepo, frontend/backend split, team mode
3. Determine the technology stack (TypeScript, React, Node, etc.)

### Phase 2: Design Layout
Design the directory tree following these principles:
- **Flat where possible**: Don't nest beyond 3 levels without strong reason
- **Colocate by feature**: Related files live together (not by type)
- **Clear boundaries**: Module boundaries visible in the directory structure
- **Convention over configuration**: Minimize config files at root

Example layout for a full-stack TypeScript project:
```
project/
  src/
    frontend/          # UI layer
      components/
      pages/
      hooks/
    backend/           # API layer
      routes/
      services/
      models/
    shared/            # Shared types and utilities
      types/
      utils/
  tests/
  docs/
```

### Phase 3: Define Conventions
Document for each area:
- Naming conventions (files, functions, types, tests)
- Import order rules
- Error handling pattern
- Logging pattern
- Testing pattern

### Phase 4: Write Output
Write to `.ai-first/artifacts/scaffold-plan.md`:

```markdown
# Scaffold Plan: [Project Name]

## Directory Layout
[Annotated tree]

## Naming Conventions
- Files: [pattern]
- Functions: [pattern]
- Types: [pattern]
- Tests: [pattern]

## Tooling
- Package manager: [npm/pnpm/yarn]
- TypeScript: strict mode, ES2022 target
- Linting: [config]
- Formatting: [config]

## Module Boundaries
- Frontend never imports from backend directly
- Shared module has zero dependencies on frontend or backend
- Each module has a public API surface (index.ts barrel)
```

### Phase 5: Generate .gitignore (MANDATORY)

EVERY scaffold MUST create a `.gitignore` file at the project root with at minimum:

```
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
```

If the project has additional languages or frameworks, extend accordingly.
The builder-agent MUST verify `.gitignore` exists before completing scaffold stage.

## Quality Standards
- Directory depth max 3 levels from src/
- Each directory must have a clear, single responsibility
- Module boundaries must be enforceable (not just documentation)
- Conventions must be concrete enough that builder-agent can follow without ambiguity
