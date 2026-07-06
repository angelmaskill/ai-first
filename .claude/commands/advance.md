---
name: advance
description: Advance project to the next lifecycle stage
agent: team-lead-agent
---

# /advance

Advance the project to the next stage in the 10-stage lifecycle. Validates
the stage exit checklist before transitioning.

## Stage Sequence

```
idea → discovery → spec → architecture → scaffold → build → qa → release → operate → evolve
```

## Steps

### 0. Determine Advancement Mode

Read the mode from the most recent active task, or default to `generate`.
> **`skip` 模式已废弃**（阶段门 §7.1）：task `mode` 类型已收紧为 `generate | reuse | execute`，
> 旧 yml 里的 `mode: skip` 会被 reader 降级为 `execute`。阶段推进只能通过客观门（step 2）。

```bash
MODE="generate"  # default
ACTIVE_TASK=$(ls -t .ai-first/tasks/task-*.yml 2>/dev/null | head -1)
if [ -n "$ACTIVE_TASK" ]; then
  TASK_MODE=$(grep "mode:" "$ACTIVE_TASK" | head -1 | awk '{print $2}')
  if [ -n "$TASK_MODE" ]; then
    MODE="$TASK_MODE"
  fi
fi
echo "Advancement mode: $MODE"
```

Mode behavior（无 skip 分支）：
- **reuse**: Check for existing artifacts; if found, copy/adapt them instead of generating new.
- **generate**: Normal flow — lead agent generates all artifacts from scratch.
- **execute**: Like generate, but for build/implementation stages.

### 1. Determine Current and Next Stage

```bash
CURRENT=$(readlink .ai-first/state/current | xargs basename)
echo "Current stage: $CURRENT"
```

Map current stage to next stage:

| Current | Next |
|---------|------|
| stage-01-idea | stage-02-discovery |
| stage-02-discovery | stage-03-spec |
| stage-03-spec | stage-04-architecture |
| stage-04-architecture | stage-05-scaffold |
| stage-05-scaffold | stage-06-build |
| stage-06-build | stage-07-qa |
| stage-07-qa | stage-08-release |
| stage-08-release | stage-09-operate |
| stage-09-operate | stage-10-evolve |
| stage-10-evolve | stage-02-discovery |

### 2. 客观阶段门（mandatory）

**所有推进必须先过客观门**（阶段门方案 §4.2 + ADR-005）。门是纯函数 `canAdvance()`，
消费 task yml + ExecutionReport + artifacts + sync events，不接受 agent 自报、不接受 skip。

```bash
# 只检查（不推进）：
npm run stage:gate -- "$CURRENT_STAGE_NAME" "$NEXT_STAGE_NAME"
# 例如：npm run stage:gate -- build qa
```

- 退出码 0 = allowed；非 0 = blocked，输出 blockers 后**必须 ABORT**。
- **不允许** 用 `mode: skip`、自报"做完了"、或绕过门。`skip` 已从 Task.mode 移除。
- 如确实需异常恢复（维护者通道），手动跑：
  `npm run stage:gate -- <from> <to> --break-glass --operator <name> --reason <必填> --risk <必填>`
  （强制写审计到 `.ai-first/logs/break-glass/`，且先于推进）

**门通过后推进**（唯一状态写入点，advanceState — ADR-009）：

```bash
npm run stage:advance -- "$CURRENT_STAGE_NAME" "$NEXT_STAGE_NAME"
```

`stage:advance` 内部再次校验门通过，然后创建下一阶段目录、改 symlink、改 project.yml、写 timeline、
处理 rules.lock——一步到位，避免多处写状态。

#### 2.1–2.5 人类可读补充清单（客观判定以 stage:gate 退出码为准）

Below is a human-readable summary of what `canAdvance()` checks. It is **not** the source of truth —
the CLI exit code is. Use this only to understand blockers.

- **2.1 Active Tasks**: 当前阶段（from）所有 task 必须 `done` 或 `canceled`。
- **2.2 Sync Events**: 无 `status: pending/suggested` 的 SyncEvent。
- **2.3 Review Gates**: `.ai-first/reviews/` 无 `Verdict.*FAILED` 或 `status: failed`（QA 阶段强制非空）。
- **2.4 Required Artifacts**: 见 `STAGE_EXIT_REQUIREMENTS`（idea=goals.md / discovery=requirements.md / architecture=architecture.md / scaffold=architecture.md（v0.1 复用）/ build=implementation-summary.md / release=release-notes.md+delivery-handoff.md）。
- **2.5 Knowledge Sync**: `npm run sync` 已跑过（无 critical findings）。

### 3. Transition（由 stage:advance 完成，不再手写 bash）

> **不要** 在本命令里手写 mkdir/symlink/sed/timeline——那会与 `advanceState()` 形成两套状态逻辑（ADR-009 禁止）。
> Step 2 调用的 `npm run stage:advance` 已经完成了：
> 创建下一阶段 state 目录 → 改 `state/current` symlink → 改 `project.yml.currentStage` → 写 timeline → 处理 `rules.lock`（execution 阶段锁 standards/，evolve/idea/discovery 解锁）。

### 4. Dispatch Lead Agent (mode-aware)

| Mode | Action |
|------|--------|
| **reuse** | Dispatch lead agent with instruction: "Reuse existing {artifact} from .ai-first/artifacts/ — adapt for current context without regenerating from scratch." |
| **generate** | Dispatch lead agent normally — full generation. |
| **execute** | Dispatch builder-agent normally — full implementation. |

Normal lead agent assignments:
- idea/discovery: intake-agent
- spec: planner-agent
- architecture: architect-agent
- scaffold/build: builder-agent
- qa: reviewer-agent
- release: release-agent
- operate/evolve: team-lead-agent

## Safety Rules

### YOU MUST
- Step 2 的 `stage:gate` 退出码为 0 才能推进；非 0 必须修 blockers
- 推进只能通过 `stage:advance`（或维护者显式 `--break-glass`），不得手写 bash 改状态
- Report the transition clearly

### YOU MUST NOT
- 用 `mode: skip` 或自报"做完了"绕过门（`skip` 已从 Task.mode 移除）
- 在本命令里直接 mkdir/symlink/sed 改状态（违反 ADR-009 单一状态入口）
- Advance with active tasks or pending sync events
- Leave project.yml and symlink out of sync
