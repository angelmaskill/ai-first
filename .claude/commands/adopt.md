---
name: adopt
description: Inject .ai-first/ control layer into an existing (brownfield) project
agent: intake-agent
---

# /adopt <path>

Inject the AI-first control layer into an existing project without modifying
the original code structure.

## Steps

1. Scan the repository structure:
   ```bash
   ls -la {path}
   find {path} -maxdepth 2 -type d | head -40
   ```

2. Detect code domains:
   - Frontend hints: `frontend`, `web`, `ui`, `client`, `app`, `apps`, `src/components`, `src/pages`
   - Backend hints: `backend`, `api`, `server`, `services`, `src/routes`, `src/controllers`
   - Docs hints: `docs`, `wiki`, `README.md`

3. Create `.ai-first/` skeleton (same as init but starting at `build` stage):
   ```bash
   mkdir -p .ai-first/{
     state/stage-01-build,
     snapshots,
     tasks,
     change-scopes,
     locks,
     reviews,
     knowledge,
     standards/{frontend,backend,fullstack,security,workflow},
     wiki,
     sync,
     reports,
     skills,
     tool-adapters,
     domains,
     logs,
     artifacts
   }
   ```

4. Write `.ai-first/project.yml` with `mode: brownfield`, `currentStage: build`, and detected `codeDomains`.

5. Write initial situation with detected structure.

6. Create symlink: `ln -sf stage-01-build .ai-first/state/current`

7. Run initial scans:
   - Call **security-scan** skill for baseline security report
   - Produce optimization suggestions based on structure gaps

## Output

After adopt completes:
- `.ai-first/project.yml` — project identity with detected domains
- `.ai-first/state/stage-01-build/situation.md` — current state assessment
- `.ai-first/reports/security-baseline.md` — initial security scan
