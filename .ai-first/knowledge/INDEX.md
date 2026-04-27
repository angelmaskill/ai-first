# AI-First Project Knowledge Index

**Generated**: 2026-04-26
**Stability**: draft

## Knowledge Items

| ID | Title | Category | Stability | Review Date | Expires |
|----|-------|----------|-----------|-------------|---------|
| KNOW-001 | Project Overview | project_fact | stable | 2026-06-26 | Never |
| KNOW-002 | TS→Markdown Refactoring Changelog | changelog | stable | 2026-06-26 | Never |
| KNOW-003 | Novel Framework Patterns | workflow_note | stable | 2026-06-26 | Never |

## How to Add Knowledge

1. Create a file `knowledge/KNOW-XXX-title.md`
2. Use YAML frontmatter with type, stability, reviewDate, expiresAt, and relatedPaths
3. Knowledge items are consumed by the wiki-generator and knowledge-sync-agent

## Knowledge Maintenance

- **Review Date**: Each item has a `reviewDate` in its frontmatter. Items past their reviewDate trigger a `knowledge_expired` sync event.
- **Expiry**: Items with `expiresAt` set to a date are auto-archived after that date by the knowledge-sync-agent.
- **Review Trigger**: The knowledge-sync-agent checks all knowledge items on each run and creates `knowledge_expired` events for any past-due items.
