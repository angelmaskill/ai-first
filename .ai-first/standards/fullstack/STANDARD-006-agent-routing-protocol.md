---
id: STANDARD-006
domain: fullstack
title: Deterministic Agent Routing Protocol
stability: stable
version: "1.0"
created: 2026-04-26
---

# STANDARD-006: Deterministic Agent Routing Protocol

## Problem Statement

Claude Code dispatches agents by having the LLM semantically match agent
descriptions to user requests. This is probabilistic — the same input can
route to different agents across calls. For a multi-agent orchestration
system, this non-determinism is unacceptable.

## Solution Overview

**Two-phase routing**: LLM classifies user intent into a predefined category,
then a deterministic lookup table (`routing.yml`) maps that category to
specific agents.

```
User request → [LLM: extract intent label] → [routing.yml: lookup agent] → dispatch
                    ↑ probability here           ↑ deterministic here
```

The probability is further eliminated by a **mandatory confirmation gate**
that puts a human in the loop before any free-text dispatch.

## Core Components

### 1. Routing Manifest (`routing.yml`)

Single source of truth. Contains:
- **Intent routes**: keywords arrays + primary/fallback/parallel agent mappings
- **Slash commands**: deterministic hard-coded agent dispatch
- **Complexity thresholds**: when to invoke algorithmic task splitting
- **Stage gates**: which intents are valid at which lifecycle stages

### 2. Intent Classification

LLM extracts action verbs and domain nouns from user input, matches against
keyword arrays in routing.yml. Produces:
- Primary intent label
- Confidence score (0-1)
- Runner-up intents (if close match)

### 3. Confirmation Gate

| Scenario | Action |
|----------|--------|
| Slash command | Dispatch immediately (zero probability) |
| Free-text, confidence ≥ 0.85 | Brief confirmation, then dispatch |
| Free-text, confidence < 0.85 | Show top candidates, user selects |
| Ambiguous (multiple matches) | Show all candidates, user selects |

### 4. Complexity-Based Splitting

When intent is `implementing` and complexity > 0.6:
- Run `npx tsx src/core/harness/subagent-dispatcher.ts`
- Produces deterministic DispatchPlan with topological sort
- Defines parallel execution groups and dependency ordering

## Agent Selection Rules

- `primary_agent`: Always dispatched for this intent
- `parallel_agents`: Co-dispatched simultaneously (independent tasks)
- `fallback_agent`: Used only if primary is unavailable
- `chain`: Sequential dispatch after primary completes
- `exclusive: true`: No other agent may be substituted

## Verification

To verify routing determinism:
1. Run the same free-text request 5 times
2. Confirm the same intent label is produced each time
3. Confirm the same agent is dispatched each time
4. If labels diverge, refine keywords in routing.yml

## Relationship to Other Standards

- **STANDARD-002** (Agent Domain Boundaries): routing.yml enforces domain
  boundaries by preventing cross-domain agent dispatch
- **STANDARD-004** (Code Review Process): reviewing intent auto-dispatches
  parallel security-reviewer-agent
- **STANDARD-005** (Knowledge Sync): knowledge-sync intent is triggered
  automatically post-build via chain rules
