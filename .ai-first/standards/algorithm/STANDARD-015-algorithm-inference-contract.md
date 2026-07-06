---
id: STANDARD-015
domain: algorithm
title: Algorithm Inference Contract
stability: draft
severity: mandatory
relatedPaths: [algorithms/, ml/, models/, src/]
---

# Algorithm Inference Contract

## Rule

Any algorithm used by backend or application code must expose a stable
inference contract. Backend code should not depend on undocumented model
internals, notebook cells, or ad hoc output structures.

## Contract Fields

The contract must define:

1. Input schema and required fields
2. Output schema and confidence or score semantics
3. Error cases and fallback behavior
4. Model or artifact version
5. Latency and resource assumptions when relevant
6. Compatibility notes for backend consumers

## Change Rules

- Breaking schema changes require a fullstack change scope
- Backend consumers must be updated in the same task when the contract changes
- Evaluation evidence must be attached when the model version changes
- Default thresholds must be named and documented

## Review Checklist

- Backend integration references the contract, not an implicit model detail
- Tests or fixtures cover representative inference inputs
- Failure modes are visible to the caller
- Contract changes are reflected in documentation or knowledge sync output

## Status

This standard is `draft`. It should become stable after one backend-algorithm
integration is completed and reviewed.
