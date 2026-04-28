# Delivery Handoff Checklist: AI-First v0.1.0

**Date**: 2026-04-27
**Stage**: release
**Next Stage**: operate

## 1. What This Is

AI-First is a multi-agent orchestration layer for Claude Code. It is NOT a
separate application — it lives entirely within the `.claude/` and `.ai-first/`
directories of a project repository. When Claude Code is invoked in this repo,
the orchestrator in `.claude/CLAUDE.md` takes over and coordinates 15
specialized agents through a 10-stage lifecycle.

## 2. How to Operate

### Starting Claude Code
```bash
cd /path/to/ai-first
claude
```
The orchestrator auto-loads via `.claude/CLAUDE.md`. No separate service to start.

### Key Slash Commands (for project operators)

| Command | What it does |
|---------|-------------|
| `/guide` | Show current stage, active tasks, next actions |
| `/health` | Project health dashboard (tests, reviews, sync, risks) |
| `/scan` | Re-run security + bug scans |
| `/advance` | Move to next lifecycle stage (validates exit checklist) |
| `/review [task-id]` | Run full 9-gate QA review |
| `/sync` | Trigger knowledge sync |
| `/task "<title>"` | Create a new structured task |
| `/complete [task-id]` | Post-build trigger chain (scans -> sync -> review) |

### Current State
- **Stage**: release
- **Next stage**: operate
- **Active tasks**: 0 (all done)
- **Sync events**: 4 confirmed, 0 pending

## 3. File System Layout

```
.ai-first/
  state/current -> stage-08-release/     # symlink tracking current stage
  artifacts/                              # stage outputs (goals, requirements, architecture, release)
  knowledge/                              # 3 domain knowledge items
  standards/frontend/ backend/ etc.       # 11 project standards
  reviews/                                # QA review reports
  reports/                                # scan reports (security, bug, optimization)
  sync/                                   # sync event YAML files
  snapshots/                              # ProjectSnapshot + GuidanceCard
  logs/timeline.md                        # append-only audit trail
  locks/rules.lock                        # bible lock (active during build/qa/release)
  tasks/                                  # structured task YAML files
```

## 4. Key Operational Procedures

### Stage Transition
```
/advance
```
This triggers the stage exit checklist:
1. All tasks must be `done` or `canceled`
2. All sync events must be `confirmed` or `dismissed`
3. Required artifacts must exist
4. Knowledge-sync-agent runs and reports no critical findings
5. State-updater-agent updates symlink + project.yml

### Creating and Executing Tasks
```
/task "Implement feature X"
```
Creates a task YAML with owner, reviewer, and changeScope. Then:
- For simple tasks (<5 files, single domain): dispatch builder-agent directly
- For complex tasks: `npx tsx src/core/harness/subagent-dispatcher.ts <task-file>` generates a split plan

After implementation:
```
/complete <task-id>
```
Triggers: bug-scan -> security-scan -> knowledge-sync -> reviewer + security-reviewer (parallel)

### Handling a Failed QA Gate
If `/complete` reports a gate failure:
1. Read the review report in `.ai-first/reviews/`
2. Dispatch builder-agent with the review report as context
3. Re-run `/complete <task-id>` (max 3 iterations)

### Bible Lock Protocol
During build, qa, and release stages, `standards/` and stable `knowledge/`
items are locked (`.ai-first/locks/rules.lock` exists). Standards cannot
be changed during these stages.

When advancing to operate/evolve, the lock is automatically removed.

## 5. Dependencies

- **Claude Code** (required): The orchestrator runs as a Claude Code configuration
- **Node.js + TypeScript**: For the algorithmic core (`src/core/harness/`)
- **tsx**: Zero-config TypeScript execution
- **vitest**: Test framework
- **npm packages**: 0 known vulnerabilities (audit clean)

## 6. Known Caveats

1. **ESLint warnings (38)**: `no-explicit-any` and `no-console` are expected and accepted.
2. **CI grep-based scanning**: Low-fidelity secret detection. Upgrade to trufflehog/gitleaks in a future iteration.
3. **Frontend domain empty**: Frontend code paths are declared but no code exists yet.
4. **Snake game not integrated**: Lives at `/tmp/snake-game-project/`, not within the project tree.
5. **Single platform validated**: Only Claude Code adapter is E2E validated.

## 7. Health Monitoring

Run `/health` periodically to check:
- Test coverage and pass rates
- Review status (any failed gates?)
- Knowledge sync status (any stale docs?)
- Risk summary (any locked files, blocked tasks?)

Or read state directly:
```bash
# Current stage
readlink .ai-first/state/current

# Active tasks
grep -l "status: in_progress" .ai-first/tasks/*.yml

# Pending sync events
grep -l "status: pending" .ai-first/sync/*.yml

# Lock status
ls .ai-first/locks/
```

## 8. Incident Response

### If orchestrator behaves unexpectedly
1. Check `.claude/CLAUDE.md` for correctness
2. Verify `routing.yml` is intact
3. Run `/scan` to re-baseline security and bugs
4. Run `/sync` to check knowledge staleness

### If a task is blocked
1. Check for conflicting changeScopes in `.ai-first/tasks/`
2. Verify no active locks in `.ai-first/locks/`
3. Run `/guide` to see current state and pending actions

### If scans report findings
1. Read the specific report in `.ai-first/reports/`
2. Create a task with `/task` to address findings
3. Re-run `/scan` after fix

## 9. Sign-off Checklist

- [x] All 9 QA gates passed (qa-full-review-20260427.md)
- [x] Snake game QA passed (snake-qa-20260427-final.md)
- [x] Bug scan CLEAN (2 reports, 0 findings)
- [x] Security scan CLEAN (2 reports, 0 vulns)
- [x] 221+ tests passing
- [x] TypeScript strict mode enabled
- [x] npm audit clean (0 vulnerabilities)
- [x] .env excluded by .gitignore
- [x] 4 sync events confirmed
- [x] All tasks done
- [x] Release notes written
- [x] Delivery handoff written

**Ready for**: operate stage (`/advance`)
