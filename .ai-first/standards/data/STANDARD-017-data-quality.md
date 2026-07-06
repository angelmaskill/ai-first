---
id: STANDARD-017
domain: data
title: Data Quality
stability: draft
severity: mandatory
relatedPaths: [data/, datasets/, data-pipeline/, pipelines/, analytics/]
---

# Data Quality

## Rule

Data pipeline changes must include quality checks that match the risk of the
data. "Pipeline runs" is not enough; the output must be checked for correctness,
freshness, completeness, and privacy expectations.

## Required Checks

Use the smallest useful set for the change:

1. Row count or volume sanity check
2. Required field completeness
3. Type and range validation
4. Duplicate key detection
5. Freshness or partition availability
6. PII and leakage check when sensitive fields are present
7. Downstream feature or report impact check

## Failure Handling

Each data pipeline should document what happens when checks fail:

- Block the pipeline
- Quarantine the output
- Alert a maintainer
- Continue with a degraded but visible status

## Review Checklist

- Quality checks are tied to the changed dataset
- Sensitive fields are identified and handled deliberately
- Algorithm and backend consumers are listed when affected
- The task explains how to reproduce or inspect the check result

## Status

This standard is `draft`. It should become stable after it has been used by at
least one real data pipeline or data-dependent algorithm task.
