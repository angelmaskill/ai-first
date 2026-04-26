---
name: skills
description: List registered skills with their status, supported stages, and assigned agents
---

# /skills

Show all registered skills and their current status.

## Steps

1. Scan `.claude/skills/` for skill definitions:
   ```bash
   find .claude/skills -name "SKILL.md" | sort
   ```

2. For each skill, extract frontmatter:
   - Name, description, supported stages, task types
   - Risk level, review requirement

3. Cross-reference with project skills in `.ai-first/skills/` if any

4. Display a formatted table

## Output

```
## Registered Skills

| Skill | Stages | Risk | Review | Agent |
|-------|--------|------|--------|-------|
| prd-generator | idea, discovery, spec | low | yes | planner-agent |
| code-scaffold | architecture, scaffold, build | medium | yes | builder-agent |
| security-scan | build, qa, operate | high | yes | security-reviewer-agent |

To invoke a skill: just describe what you need and I'll match the right skill.
Or use the Skill tool directly with the skill name.
```
