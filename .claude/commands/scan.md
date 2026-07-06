---
name: scan
description: Re-scan project state and generate updated reports (security, structure, optimization)
agent: security-reviewer-agent
---

# /scan

Re-analyze the project state and generate updated diagnostic reports.

## Steps

0. **Deterministic core (G2 收编)** — run the TS scanner before the shell-based checks so Claude and Codex share one domain verdict:
   ```bash
   npm run scan:domains -- "$(pwd)"          # JSON to stdout
   npm run scan:domains:write -- "$(pwd)"    # write .ai-first/domains/<kind>.yml
   # or via the unified CLI: ai-first scan --write "$(pwd)"
   ```
   This runs `repo-domain-detector.ts` + `domain-enricher.ts` (techStack / testCommands / buildCommands). The hand-rolled `find`/`grep` steps below remain useful for the security/quality scans the TS core does not yet cover.

1. Scan project structure:
   ```bash
   find . -maxdepth 3 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.ai-first/*' | sort
   ls -la
   ```

2. Run security scan:
   - Execute the **security-scan** skill
   - Check for secrets in code, dependency vulnerabilities, config issues

3. Check code quality (if source exists):
   ```bash
   grep -rn "console\.\(log\|debug\|info\|warn\)" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules | grep -v '.ai-first'
   grep -rn "catch\s*(\s*\)" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
   grep -rn ": any" --include="*.ts" --include="*.tsx" . | grep -v node_modules | wc -l
   ```

4. Check optimization signals:
   - Missing docs directory
   - Missing tests directory
   - tsconfig.json strict mode status

5. Write updated assessment to `.ai-first/state/current/assessment.md`

6. Write scan reports to `.ai-first/reports/scan-[timestamp].md`

## Output

A combined scan report with:
- Security findings (severity-ranked)
- Code quality issues (counts and locations)
- Structure/optimization recommendations
- Updated stage confidence
