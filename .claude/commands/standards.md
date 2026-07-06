---
name: standards
description: List registered project standards and their compliance status
---

# /standards

Show all registered project standards.

## Steps

1. Scan `.ai-first/standards/` for standard definitions:
   ```bash
   find .ai-first/standards -mindepth 2 -maxdepth 2 -type f -name "STANDARD-*.*" | sort
   ```

2. Check domain directories:
   - `frontend/` — UI component, state, style, accessibility, frontend testing
   - `backend/` — API design, error handling, auth, data access, migrations
   - `algorithm/` — reproducibility, metrics, inference contract, model artifacts
   - `data/` — data source, schema versioning, quality, privacy, leakage checks
   - `fullstack/` — cross-domain contracts and compatibility
   - `security/` — secrets, auth, dependency, OWASP-related rules
   - `workflow/` — review, testing, sync, delivery process

3. For each standard: show domain, title, stability, severity, and related paths.

4. Suggest standards that may need updating based on recent changes

## Output

```
## Project Standards

| Standard | Domain | Stability | Severity |
|----------|--------|-----------|----------|
| STANDARD-012 Backend API Design | backend | stable | recommended |
| STANDARD-014 Algorithm Reproducibility | algorithm | draft | mandatory |

No standards need updating based on recent changes.
```
