---
id: STANDARD-011
domain: frontend
title: Frontend API Consumption
stability: stable
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

This standard is `stable`. It has been reviewed through a full lifecycle
cycle and is ready for enforcement.

Note: Future iterations should consider adding conventions for
request caching, optimistic update patterns, and request cancellation
(AbortController integration).
