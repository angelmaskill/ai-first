---
name: adopt
description: Inject .ai-first/ control layer into an existing (brownfield) project
agent: intake-agent
---

# /adopt <path>

Inject the AI-first control layer into an existing project without modifying
the original code structure.

## Steps

### 0. Deterministic core (G2 收编)

The adopt pipeline is fully implemented in TS:
```bash
npm run adopt -- "$(pwd)"          # bootstrap .ai-first/ + project.yml + runtime profiles
npm run scan:domains:write -- "$(pwd)"   # detect domains, write .ai-first/domains/<kind>.yml
# or: ai-first adopt "$(pwd)"; ai-first scan --write "$(pwd)"
```
`adopt-cli.ts` → `project-adopter.adoptProject()` (creates the skeleton, project.yml with detected codeDomains, runtime profiles). The manual steps below are only for edge cases the TS path doesn't cover.

1. Prefer the shared adopt command when this repository has the TypeScript runtime available:
   ```bash
   npm run adopt -- {path}
   ```
   This creates `.ai-first/`, writes or merges `.ai-first/project.yml`, and generates
   `.ai-first/runtime/claude-code.yml` plus `.ai-first/runtime/codex.yml`.

2. If the shared adopt command is unavailable, scan the repository structure:
   ```bash
   ls -la {path}
   find {path} -maxdepth 2 -type d | head -40
   ```

3. Detect code domains:
   - Frontend hints: `frontend`, `web`, `ui`, `client`, `app`, `apps`, `src/components`, `src/pages`
   - Backend hints: `backend`, `api`, `server`, `services`, `src/routes`, `src/controllers`
   - Algorithm/ML hints: `algorithm`, `algorithms`, `algo`, `ml`, `models`, `notebooks`
   - Data hints: `data`, `data-pipeline`, `datasets`, `etl`, `features`, `pipelines`, `analytics`
   - Infrastructure hints: `infra`, `infrastructure`, `deploy`, `k8s`, `terraform`, `.github`, `Dockerfile`
   - Docs hints: `docs`, `wiki`, `README.md`
   - Preferred shared command when available:
     ```bash
     npm run scan:domains -- {path}
     ```

4. Create `.ai-first/` skeleton (same as init but starting at `build` stage):
   ```bash
   mkdir -p .ai-first/{
     state/stage-06-build,
     snapshots,
     tasks,
     change-scopes,
     locks,
     reviews,
     knowledge,
     standards/{frontend,backend,algorithm,data,fullstack,security,workflow},
     runtime,
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

5. Write `.ai-first/project.yml` with `mode: brownfield`, `currentStage: build`, and detected `codeDomains`.

6. Write initial situation with detected structure.

7. Create symlink: `ln -sf stage-06-build .ai-first/state/current`

8. Run initial scans:
   - Call **security-scan** skill for baseline security report
   - Produce optimization suggestions based on structure gaps

## Output

After adopt completes:
- `.ai-first/project.yml` — project identity with detected domains
- `.ai-first/state/stage-06-build/situation.md` — current state assessment
- `.ai-first/reports/security-baseline.md` — initial security scan
