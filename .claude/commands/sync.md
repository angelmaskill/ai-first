---
name: sync
description: Manually trigger knowledge sync check — the safety fuse for keeping docs aligned with code
agent: knowledge-sync-agent
---

# /sync

Manually trigger a knowledge synchronization check. This is the safety fuse
to ensure project documentation stays aligned with code changes.

## Steps

1. Identify recently changed files:
   ```bash
   git diff --name-only HEAD~5 2>/dev/null || git log --oneline -10
   ```

2. For each changed file, determine the sync category:
   - `routes/`, `controllers/`, `api/` → **API contract** docs may need update
   - `models/`, `schemas/`, `types/` → **Data model** docs may need update
   - `architecture/`, `modules/`, `src/*/index.ts` → **Architecture** docs may need update
   - `auth*`, `middleware/`, `config/security` → **Security** standards may need update
   - `package.json`, `tsconfig.json`, `docker*` → **Config** docs may need update

3. For each match, create a sync event:
   ```yaml
   # .ai-first/sync/sync-{date}-{id}.yml
   id: sync-xxx
   triggerType: manual_command
   relatedPaths: [{paths}]
   impactedKnowledgeIds: [{matched knowledge items}]
   status: suggested
   summary: {what needs updating}
   ```

4. Dispatch **knowledge-sync-agent** to generate update suggestions for each stale knowledge item.

5. Report findings to the user with accept/reject prompts.

## Output

A sync report:
```
## Knowledge Sync Report
### Stale Items (3 found)
- API docs (routes/users.ts changed) — suggest updating endpoint signatures
- Data model (models/user.ts changed) — suggest updating schema docs
- Config docs (package.json changed) — suggest updating dependency list

### Actions
- [ ] Review and update each item
- [ ] Run /review to validate changes
```
