---
id: STANDARD-013
domain: backend
title: Backend Data Access
stability: stable
severity: recommended
relatedPaths: [src/]
---

# Backend Data Access

## Rule

Data access is isolated behind a repository or service layer.
Route handlers never interact with data stores directly.

## Repository Pattern

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Filter): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: string, partial: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

## Data Access Rules

1. Services own transactions — repositories are single-operation
2. No raw SQL/query strings in route handlers or services
3. Connection pooling managed at infrastructure level, not application level
4. All write operations log to the append-only timeline via state-updater-agent

## Validation

- Input validation at the route layer (before reaching service)
- Business rule validation at the service layer
- Database constraints as the final safety net

## Status

This standard is `stable`. It has been reviewed through a full lifecycle
cycle and is ready for enforcement.

Note: Future iterations should consider adding conventions for
database migration strategy, seed data management, and query optimization
guidelines (index usage, N+1 prevention).
