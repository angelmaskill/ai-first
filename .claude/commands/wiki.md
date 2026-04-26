---
name: wiki
description: Build or rebuild the project wiki from knowledge, standards, and artifacts
agent: builder-agent
---

# /wiki

Build or rebuild the project wiki in `.ai-first/wiki/` by gathering content
from knowledge/, standards/, artifacts/, and reviews/.

## Steps

### 1. Gather Sources

```bash
echo "=== Knowledge Items ==="
ls .ai-first/knowledge/ 2>/dev/null || echo "No knowledge items yet"

echo "=== Standards ==="
find .ai-first/standards -type f 2>/dev/null || echo "No standards defined"

echo "=== Artifacts ==="
ls .ai-first/artifacts/ 2>/dev/null || echo "No artifacts"

echo "=== Recent Reviews ==="
ls .ai-first/reviews/ 2>/dev/null || echo "No reviews"
```

### 2. Invoke Wiki Generator Skill

Run the **wiki-generator** skill. It handles:
- Page generation (overview, architecture, api-reference, data-model, standards, dev-guide, changelog)
- Cross-reference linking between pages
- Source citation for every claim

### 3. Regenerate Wiki Pages

The wiki-generator skill writes these pages under `.ai-first/wiki/`:

| Page | Source |
|------|--------|
| `overview.md` | project.yml + knowledge/project-overview.md |
| `architecture.md` | artifacts/architecture.md + knowledge/ architecture items |
| `api-reference.md` | knowledge/ api-contract items + standards/fullstack/ |
| `data-model.md` | knowledge/ data-model items + standards/ |
| `standards.md` | standards/ (all domains) |
| `dev-guide.md` | standards/workflow/ + knowledge/ workflow items |
| `changelog.md` | reviews/ + sync/ events |

### 4. Verify Output

```bash
echo "=== Generated Wiki Pages ==="
find .ai-first/wiki -name "*.md" -type f | sort
echo ""
echo "=== Page Count ==="
find .ai-first/wiki -name "*.md" -type f | wc -l
```

### 5. Report

List which pages were generated, which were skipped (no source data), and any cross-reference warnings.

## Output

A complete wiki under `.ai-first/wiki/` with interlinked pages, each citing its sources from knowledge/, standards/, and artifacts/.
