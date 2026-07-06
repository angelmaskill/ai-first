---
name: init
description: Initialize a new greenfield project with .ai-first/ control layer
agent: intake-agent
---

# /init <path>

Initialize a greenfield project with the AI-first control layer.

## Steps

1. Create `.ai-first/` directory skeleton:
   ```bash
   mkdir -p .ai-first/{
     state/stage-01-idea,
     snapshots,
     tasks,
     change-scopes,
     locks,
     reviews,
     knowledge,
     standards/{frontend,backend,algorithm,data,fullstack,security,workflow},
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

2. Write `.ai-first/project.yml`:
   ```yaml
   id: proj-{random}
   name: {project name}
   slug: {project slug}
   description: {user-provided description}
   mode: greenfield
   teamMode: fullstack
   ownershipModel: mixed
   rootPath: {absolute path}
   codeDomains: []
   currentStage: idea
   status: active
   createdAt: {now}
   updatedAt: {now}
   ```

3. Write initial situation:
   ```bash
   echo "# Stage: Idea\n\n**Started**: {date}\n**Lead Agent**: intake\n\n## Current State\n\nProject initialized. Ready for intake.\n" > .ai-first/state/stage-01-idea/situation.md
   ```

4. Create symlink: `ln -sf stage-01-idea .ai-first/state/current`

5. Dispatch **intake-agent** to clarify project goals.

## Output

After init completes, the intake-agent will produce:
- `.ai-first/artifacts/goals.md` — clarified project goals and scope
- `.ai-first/state/stage-01-idea/assessment.md` — stage assessment
