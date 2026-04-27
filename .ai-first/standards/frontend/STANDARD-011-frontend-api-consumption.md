---
id: STANDARD-011
domain: frontend
title: Frontend API Consumption
stability: draft
severity: recommended
relatedPaths: [.ai-first/standards/fullstack/STANDARD-001-api-consistency.md]
---

# Frontend API Consumption

## Rule

Frontend code consumes backend APIs through a typed service layer.
Direct fetch/axios calls in components are not permitted.

## Service Layer Pattern

```typescript
// services/userService.ts
import type { User, CreateUserPayload } from "../types/user";

export async function getUsers(): Promise<User[]> { /* ... */ }
export async function createUser(payload: CreateUserPayload): Promise<User> { /* ... */ }
```

## Type Sharing

Frontend types mirror backend response shapes. When a backend API changes,
the corresponding frontend type must be updated in the same ChangeScope.
This enforces STANDARD-001 (API Contract Consistency) from the consumer side.

## Error Handling

All API calls must handle:
1. Network errors (timeout, connection refused)
2. HTTP error responses (4xx, 5xx)
3. Unexpected response shapes (type guard validation)

A shared `ApiError` type and `handleApiError` utility must be used
consistently across all service functions.

## Status

This standard is `draft`. It will stabilize when the first frontend service
layer is implemented and reviewed.
