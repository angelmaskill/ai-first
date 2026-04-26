---
name: task-template
description: Template for creating structured task YAML files in .ai-first/tasks/
---

# Task YAML Template

Copy this template to `.ai-first/tasks/{task-id}.yml` when creating a new task.

```yaml
id: task-20260426-a3f2k1
projectId: proj-h7k3m
title: "Implement user authentication"
description: >
  Add JWT-based authentication with login, register, and token refresh
  endpoints. Support role-based access control.
stage: build
mode: execute
priority: p1
status: todo
owner:
  type: user
  id: alice
  name: Alice
reviewer:
  type: user
  id: bob
  name: Bob
changeScope:
  frontendPaths:
    - src/frontend/pages/login.tsx
    - src/frontend/components/AuthGuard.tsx
  backendPaths:
    - src/backend/routes/auth.ts
    - src/backend/services/auth-service.ts
    - src/backend/models/user.ts
  sharedPaths:
    - src/shared/types/auth.ts
  docsPaths:
    - docs/auth-flow.md
  riskLevel: high
  parallelSafe: false
createdAt: "2026-04-26T10:00:00Z"
updatedAt: "2026-04-26T10:00:00Z"
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| id | yes | Unique task ID: `task-{YYYYMMDD}-{random}` |
| projectId | yes | Reference to project.yml id |
| title | yes | Short, actionable title |
| description | yes | What needs to be done, acceptance criteria |
| stage | yes | Current lifecycle stage |
| mode | yes | `generate` / `reuse` / `skip` / `execute` |
| priority | yes | `p0` (critical) to `p3` (nice-to-have) |
| status | yes | `todo` → `in_progress` → `blocked` → `review_pending` → `done` |
| owner | yes | Who is responsible for implementation |
| reviewer | yes | Who is responsible for review |
| changeScope | yes | File paths affected by this task |
| changeScope.riskLevel | yes | `low` / `medium` / `high` |
| changeScope.parallelSafe | yes | Can this task run in parallel with others? |
| createdAt | yes | ISO 8601 timestamp |
| updatedAt | yes | ISO 8601 timestamp |

## Status Workflow

```
todo → in_progress → review_pending → done
  ↓                     ↓
blocked ←───────────────┘
```

- **todo**: Created but not started
- **in_progress**: Currently being implemented
- **blocked**: Cannot proceed (dependency, decision needed)
- **review_pending**: Implementation done, awaiting reviewer
- **done**: Review passed, gates cleared
