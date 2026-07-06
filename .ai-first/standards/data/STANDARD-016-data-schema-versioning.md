---
id: STANDARD-016
domain: data
title: Data Schema Versioning
stability: draft
severity: mandatory
relatedPaths: [data/, datasets/, data-pipeline/, pipelines/, features/]
---

# Data Schema Versioning

## Rule

Data used by backend, analytics, or algorithm code must have an explicit schema
and version. Schema changes must be visible to downstream consumers before code
or model behavior depends on them.

## Required Metadata

Every data schema entry should define:

1. Dataset or table name
2. Schema version
3. Field names, types, nullability, and units
4. Primary key or natural key when available
5. Partitioning or freshness expectation when relevant
6. Ownership and update cadence
7. Downstream consumers

## Change Rules

- Additive changes can be marked compatible when old consumers still work
- Renames, removals, type changes, and semantic changes are breaking changes
- Breaking changes require affected backend, algorithm, and docs paths in the
  same change scope
- PII-related fields must also reference the security standard

## Review Checklist

- Schema version changed when field meaning changed
- Downstream algorithm features or backend models were checked
- Migration or backfill expectations are documented
- Data quality checks exist for required fields

## Status

This standard is `draft`. It should be stabilized after the first data pipeline
or algorithm data dependency is reviewed.
