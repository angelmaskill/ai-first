---
id: STANDARD-014
domain: algorithm
title: Algorithm Reproducibility
stability: draft
severity: mandatory
relatedPaths: [algorithms/, ml/, models/, notebooks/, experiments/]
---

# Algorithm Reproducibility

## Rule

Algorithm work must be reproducible from a clean checkout. A reviewer should
be able to identify the data version, feature definition, training or
evaluation command, metrics, and produced artifact without asking the author.

## Required Metadata

Every algorithm task must document:

1. Input data source and version
2. Feature definition or feature extraction entry point
3. Training, evaluation, or inference command
4. Metric names, metric direction, and acceptance threshold
5. Random seed or deterministic setting when applicable
6. Model or output artifact path
7. Known limitations and cases not covered

## Notebook Boundary

Notebooks may be used for exploration, but production behavior must live in
reviewable source files with tests or repeatable evaluation commands.

## Review Checklist

- Data version is explicit
- Evaluation command can be run by another developer
- Metrics are compared against the previous baseline when one exists
- Generated artifacts are not committed unless intentionally tracked
- Inference inputs and outputs are documented when backend code depends on them

## Status

This standard is `draft`. It should be stabilized after the first real
algorithm task uses it end to end.
