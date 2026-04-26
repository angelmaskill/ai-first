---
name: standards
description: List registered project standards and their compliance status
---

# /standards

Show all registered project standards.

## Steps

1. Scan `.ai-first/standards/` for standard definitions:
   ```bash
   ls .ai-first/standards/*.yml 2>/dev/null
   ```

2. Check built-in standards:
   - `api-contract-consistency` — API contracts must be verified end-to-end
   - `ai-first-review-gate` — All changes must pass 7-gate review before merge

3. For each standard: show category, last review date, compliance status

4. Suggest standards that may need updating based on recent changes

## Output

```
## Project Standards

| Standard | Category | Last Review | Status |
|----------|----------|-------------|--------|
| api-contract-consistency | fullstack | never | pending |
| ai-first-review-gate | workflow | 2026-04-26 | active |

No standards need updating based on recent changes.
```
