#!/usr/bin/env bash
# §7 Z2 — 主链路模拟脚本（Pilot walkthrough in dry-run mode）.
#
# Drives the full v0.1 main line end-to-end WITHOUT real Codex:
#   adopt → guide → task:create → task:exec (dry-run) → sync
#
# Writes a friction-point report to .ai-first/reports/pilot-<timestamp>.md.
# Safe to run in CI and on any brownfield project.

set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_DIR=".ai-first/reports"
mkdir -p "$REPORT_DIR"
REPORT="$REPORT_DIR/pilot-$TS.md"

section() { echo -e "\n## $1" | tee -a "$REPORT"; }
step()    { echo -e "\n### $1" | tee -a "$REPORT"; }
run()     { echo "\`\`\`bash" >> "$REPORT"; echo "$*" >> "$REPORT"; echo "\`\`\`" >> "$REPORT"; }

echo "# Pilot walkthrough — $TS" > "$REPORT"
echo "" >> "$REPORT"
echo "Repo: \`$ROOT\`" >> "$REPORT"

section "1. adopt (ensure .ai-first/ exists)"
step "npm run adopt"
npm run adopt -- "$ROOT" 2>&1 | tee -a "$REPORT" || echo -e "\n**adopt** returned non-zero (may already be adopted)" | tee -a "$REPORT"

section "2. guide (location sense + next step)"
step "npm run guide"
npm run guide -- "$ROOT" 2>&1 | tee -a "$REPORT" || true

section "3. task:create (sample task for the pilot)"
step "npm run task:create -- \"pilot: 主链路冒烟\" --domain \$(first domain id)"
# Pick the first detected domain id from project.yml, fall back to none.
DOMAIN_ID=$(awk '/^codeDomains:/{flag=1} flag && /^  - id:/{gsub(/ id:/,"",$2); print $2; exit}' .ai-first/project.yml || true)
TASK_TITLE="pilot 主链路冒烟"
npm run task:create -- "$TASK_TITLE" ${DOMAIN_ID:+--domain "$DOMAIN_ID"} --runtime codex --accept-manual 2>&1 | tee -a "$REPORT"

# Locate the most recently created task yml
TASK_YML=$(ls -t .ai-first/tasks/task-*.yml 2>/dev/null | head -1 || true)
if [ -z "$TASK_YML" ]; then
  echo -e "\n**ERROR**: task:create did not produce a task yml — friction point." | tee -a "$REPORT"
  exit 1
fi
TASK_ID=$(basename "$TASK_YML" .yml)

section "4. task:exec (dry-run, --allow-dirty)"
step "npm run task:exec -- --task $TASK_ID --dry-run --allow-dirty"
npm run task:exec -- --task "$TASK_ID" --dry-run --allow-dirty 2>&1 | tee -a "$REPORT" || true

section "5. sync (post-exec doc-rot check)"
step "npm run sync"
npm run sync -- "$ROOT" 2>&1 | tee -a "$REPORT" || true

section "6. friction points & notes"
cat <<EOF >> "$REPORT"
- 采用 dry-run 模式跑通主链路；真实 Codex 执行需 \`--runtime codex\`（不带 --dry-run）。
- 任何一步若在 CI 上非零退出，记为摩擦点，沉淀为 .ai-first/reports/pilot-*.md。
- task:exec 默认要求干净工作区；本脚本用 --allow-dirty 放行（CI 安全）。
EOF

echo -e "\n✅ Pilot complete. Report: $REPORT"
