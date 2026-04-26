---
id: STANDARD-003
domain: security
title: Security Scanning Requirements
stability: stable
severity: mandatory
relatedPaths: [.claude/skills/security-scan/SKILL.md]
---

# Security Scanning Requirements

Every code change must pass automated security scanning before review.

## Rule

Before QA gate review, the security scanner must run and report zero
critical or high-severity findings. Any critical finding blocks the
review gate.

## Scan Categories

| Category | Severity if Found | Check |
|----------|-------------------|-------|
| Secret leakage | critical | API_KEY, SECRET, TOKEN, PASSWORD patterns in source |
| Git hygiene | high | .env files tracked by git, missing .gitignore entries |
| Risky patterns | high | eval(), Function(), innerHTML assignment |
| Dependency audit | high | npm audit critical/high vulnerabilities |
| Config security | medium | Debug flags enabled, strict mode disabled |

## Automation

The security scanner skill runs these checks automatically:
1. Pattern-based grep for secrets in .ts, .tsx, .js, .json, .yml, .env
2. .gitignore completeness check
3. Tracked .env file detection
4. npm audit JSON parsing
5. Risky code pattern detection (Function constructor, innerHTML)

## Enforceability

- Rules locked during build/qa/release stages
- Security-reviewer-agent verdict is authoritative — reviewer-agent must not override
- Critical findings → gate failed → cannot advance stage
