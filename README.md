# AI-first

AI-first is a scaffold control plane for vibe coding workflows. It wraps a project with an `.ai-first/` control layer so the project can be scanned, guided, reviewed, and gradually turned into a reusable team knowledge source.

## Quick Start

```bash
# Install dependencies
npm install

# Initialize a new project
npm start init /path/to/project

# Scan an existing project
npm start scan /path/to/project

# Get guidance on next steps
npm start guide /path/to/project
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `init <path>` | Initialize a greenfield project with `.ai-first/` control layer |
| `adopt <path>` | Inject `.ai-first/` into an existing project |
| `scan <path>` | Analyze project state and generate reports (security, bugs, optimization) |
| `guide <path>` | Show current stage and next-step guidance |
| `review <path>` | Run a baseline control-layer review |
| `sync <path>` | Trigger manual knowledge-sync check |
| `task <path>` | Create a task with change scope |
| `skills <path>` | Show registered skills |
| `standards <path>` | Show registered standards |

## Architecture

### Core Modules

- **models.ts** — 12 core data types (Project, Task, ChangeScope, etc.)
- **scanners/** — Security, bug, and optimization scanners
- **sync/** — Knowledge sync engine
- **harness/** — Subagent dispatcher, memory manager, skill orchestrator
- **tools/** — Tool adapter protocol

### `.ai-first/` Structure

```
.ai-first/
├── project.yml          # Project identity and state
├── snapshots/           # Stage assessments
├── tasks/               # Task definitions
├── change-scopes/       # Change boundaries
├── reviews/             # Review results
├── knowledge/           # Project knowledge
├── standards/           # Team standards
├── wiki/                # Internal wiki
├── sync/                # Sync events
├── domains/             # Business domain mapping
├── skills/              # Skill configurations
├── tool-adapters/       # Tool adapter configs
└── reports/             # Scan reports
```

## Documentation

See `docs/` for:
- Product requirements and capability map
- Core data models
- Lifecycle state machine
- Protocol design
- MVP implementation plan

## Development

```bash
# Run directly (uses tsx for TypeScript execution)
npm start -- <command> [args]

# Check types
npx tsc --noEmit
```
