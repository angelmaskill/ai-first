---
name: review
description: Run a full control-layer review — triggers reviewer-agent and security-reviewer-agent
agent: reviewer-agent
---

# /review [task-id]

Run a comprehensive review of recent changes or a specific task.

## Steps

1. Identify review scope:
   - If `task-id` provided: review only files in that task's change scope
   - If no task-id: review files changed since last review

2. Read the task definition if available:
   ```bash
   cat .ai-first/tasks/{task-id}.yml 2>/dev/null
   ```

3. Run **reviewer-agent** (checks logic, architecture, docs, knowledge, testing, consistency):
   - Read changed files
   - Evaluate against 7 gates
   - Produce structured findings with severity and resolution hints

4. Run **security-reviewer-agent** in parallel (checks OWASP Top 10, secrets, dependencies, config):
   - Scan security patterns
   - Audit dependencies
   - Check configuration

5. Merge findings from both agents into a unified review report.

6. Write report to `.ai-first/reviews/review-{task-id}-{timestamp}.md`

7. If any gate fails: mark task as `review_pending`, report to user.
   If all gates pass: mark task as `done`, suggest next action.

## Output

A unified review report:
```
## Review: {task title}
### Verdict: PASSED_WITH_WARNINGS
### Findings
- [medium] [logic]: Missing null check at src/handler.ts:42
- [low] [docs]: New endpoint lacks JSDoc at src/routes/users.ts:15

### Gates
- logic: passed | security: passed | architecture: passed
- docs: passed_with_warnings | knowledge: passed | testing: passed

### Actions
- Add null check before processing response
- Document GET /users/:id endpoint
```
