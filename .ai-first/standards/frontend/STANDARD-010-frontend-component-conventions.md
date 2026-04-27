---
id: STANDARD-010
domain: frontend
title: Frontend Component Conventions
stability: draft
severity: recommended
relatedPaths: [.claude/skills/code-scaffold/SKILL.md]
---

# Frontend Component Conventions

## Rule

Frontend components follow the directory layout and naming conventions
defined by the code-scaffold skill. Since no frontend source paths exist yet
(paths: [] in project.yml), these conventions are provisioned for future
frontend work.

## Directory Layout

Per code-scaffold canonical layout:

```
src/frontend/
  components/       # Reusable UI components (one per file)
  pages/            # Page-level components (one per route)
  hooks/            # Shared React hooks
  styles/           # Component-scoped styles
```

## Naming

- Components: PascalCase filenames (e.g., `UserProfile.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`)
- CSS modules: co-located with component, matching filename

## Component Structure

1. One exported component per file
2. Props interface exported alongside component
3. No default exports (use named exports for tree-shaking)
4. Maximum component size: 300 lines (extract sub-components above this)

## State Management

- Local state: React hooks (useState, useReducer)
- Shared state: determined by architecture decision (not prescribed here)
- Server state: determined by API consumption standard (STANDARD-011)

## Status

This standard is `draft`. It will stabilize when frontend paths
are populated and at least one build cycle has validated these conventions.
