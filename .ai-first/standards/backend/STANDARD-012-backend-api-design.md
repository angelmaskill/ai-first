---
id: STANDARD-012
domain: backend
title: Backend API Design
stability: draft
severity: recommended
relatedPaths: [src/, .claude/skills/code-scaffold/SKILL.md]
---

# Backend API Design

## Rule

Backend APIs follow RESTful conventions with consistent error response
format and typed request/response contracts. The existing `src/` code
(TypeScript) establishes the implementation language and module structure.

## API Structure

Per code-scaffold canonical layout:

```
src/backend/
  routes/           # Route handlers (one per resource)
  services/         # Business logic (called by routes)
  models/           # Data models and validation
  middleware/        # Auth, logging, error handling
```

## Endpoint Conventions

- Method + path clearly describes the operation
- Request bodies validated before processing
- Response bodies have consistent envelope: `{ data, error, meta }`
- All endpoints return appropriate HTTP status codes
- Pagination: cursor-based for lists > 100 items

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": []
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

## Route Handler Pattern

Each route handler must:
1. Validate input (params, query, body)
2. Delegate to service layer (no business logic in routes)
3. Return consistent envelope

## Status

This standard is `draft`. It will stabilize after the first build cycle
that creates or modifies backend routes under this convention.
