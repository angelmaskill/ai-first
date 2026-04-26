# API Contract Consistency

**Domain**: fullstack
**Status**: candidate
**Source Knowledge**: KNOW-001

## Rule

When a task modifies an API endpoint or shared type, the same task MUST update
both the frontend consumer and backend provider in a single ChangeScope.

## Checklist

1. Frontend types stay in sync with backend response shapes
2. Error response format is consistent across all endpoints
3. Breaking changes are flagged in the ChangeScope risk assessment
4. Fullstack reviewer checks contract consistency in QA gate
