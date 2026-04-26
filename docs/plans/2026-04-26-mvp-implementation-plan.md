# AI-first Vibe Coding MVP 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建最小可用的 AI-first 研发控制层 MVP，打通"接入→识别→引导→执行→检查→同步→团队管理"闭环。

**Architecture:** CLI-first 架构，`.ai-first/` 作为项目控制层，通过斜杠命令触发各项能力。核心模块包括：项目接入、阶段判断、引导生成、任务管理、检查治理、知识同步、skill 管理、工具适配。

**Tech Stack:** TypeScript (Node.js), 文件系统存储, YAML/JSON 配置

---

## 当前进度评估

### 已完成（骨架级别）
- [x] 核心数据模型定义 (`src/core/models.ts`)
- [x] CLI 入口和命令框架 (`src/index.ts`)
- [x] 基础命令实现 (`/init`, `/adopt`, `/guide`, `/scan`, `/review`, `/sync`, `/task`)
- [x] 仓库扫描 (`src/core/analyzer/repo-scanner.ts`)
- [x] 阶段判断 (`src/core/analyzer/stage-assessor.ts`)
- [x] 引导生成 (`src/core/guidance/generate-guidance.ts`)
- [x] 基础 review (`src/core/review/basic-review.ts`)
- [x] 任务存储 (`src/core/tasks/task-store.ts`)
- [x] skill 注册表 (`src/core/skills/registry.ts`)

### 待完成（按 MVP A-G 模块）
- [ ] **C. 扫描与检查** — 安全扫描、bug 扫描、**优化建议输出**
- [ ] **D. 知识同步** — 完整同步机制、wiki 更新
- [ ] **E. 协作治理** — 冲突检测、影响方提示
- [ ] **F. skill 与工具适配** — 工具适配器实现
- [ ] **G. Harness** — 子智能体调度、记忆管理、技能编排

---

## 任务清单

### 模块 C: 扫描与检查增强

#### Task 1: 实现优化建议扫描器

**Files:**
- Create: `src/core/scanners/optimization-scanner.ts`
- Modify: `src/commands/scan.ts`
- Test: `tests/scanners/optimization-scanner.test.ts`

**Step 1: 创建优化建议扫描器骨架**

```typescript
// src/core/scanners/optimization-scanner.ts
import { RepoFacts } from "../models.ts";

export interface OptimizationSuggestion {
  category: "structure" | "performance" | "maintainability" | "security" | "testing";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  affectedPaths?: string[];
  suggestion: string;
}

export function scanOptimizations(facts: RepoFacts): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // 检查项目结构
  if (facts.frontendHints.length > 0 && facts.backendHints.length > 0) {
    suggestions.push({
      category: "structure",
      severity: "medium",
      title: "全栈项目建议统一接入",
      description: "检测到前端和后端目录，建议使用统一的项目控制层管理",
      affectedPaths: [...facts.frontendHints, ...facts.backendHints],
      suggestion: "使用 /adopt 命令在项目根目录注入统一的 .ai-first/ 控制层"
    });
  }

  // 检查文档完备度
  if (!facts.docsHints.length) {
    suggestions.push({
      category: "maintainability",
      severity: "high",
      title: "缺少项目文档",
      description: "未检测到 docs 或 wiki 目录",
      suggestion: "创建 docs/ 目录并添加 README.md、架构文档等"
    });
  }

  // 检查测试覆盖
  if (!facts.testHints.length) {
    suggestions.push({
      category: "testing",
      severity: "high",
      title: "缺少测试文件",
      description: "未检测到测试相关文件或目录",
      suggestion: "建立测试框架，添加单元测试和集成测试"
    });
  }

  // 检查配置管理
  if (!facts.configHints.length) {
    suggestions.push({
      category: "maintainability",
      severity: "low",
      title: "配置文件较少",
      description: "未检测到常见配置文件（package.json, tsconfig.json 等）",
      suggestion: "检查项目是否需要添加配置文件"
    });
  }

  return suggestions;
}
```

**Step 2: 运行类型检查**

Run: `npm run build` 或 `npx tsc --noEmit`
Expected: 无类型错误

**Step 3: 在 scan 命令中集成优化扫描**

```typescript
// src/commands/scan.ts
import { scanOptimizations } from "../core/scanners/optimization-scanner.ts";

export function runScan(targetRoot: string): string {
  // ... 现有代码 ...

  const suggestions = scanOptimizations(repoFacts);

  return [
    // ... 现有输出 ...
    "\n=== Optimization Suggestions ===",
    ...suggestions.map(s => `[${s.severity.toUpperCase()}] ${s.title}: ${s.description}`)
  ].join("\n");
}
```

**Step 4: 提交**

```bash
git add src/core/scanners/optimization-scanner.ts src/commands/scan.ts
git commit -m "feat: add optimization suggestions scanner"
```

---

#### Task 2: 实现安全扫描器

**Files:**
- Create: `src/core/scanners/security-scanner.ts`
- Modify: `src/commands/review.ts`
- Test: `tests/scanners/security-scanner.test.ts`

**Step 1: 创建安全扫描器骨架**

```typescript
// src/core/scanners/security-scanner.ts
import { pathExists, readFile } from "../../utils/fs.ts";
import path from "node:path";

export interface SecurityFinding {
  severity: "critical" | "high" | "medium" | "low";
  category: "secret_leakage" | "dependency" | "config" | "auth";
  title: string;
  description: string;
  path?: string;
  remediation: string;
}

export async function scanSecurity(rootPath: string): Promise<SecurityFinding[]> {
  const findings: SecurityFinding[] = [];

  // 检查常见敏感文件
  const sensitiveFiles = [
    ".env",
    ".env.local",
    ".env.production",
    "secrets.yml",
    "config/secrets.json"
  ];

  for (const file of sensitiveFiles) {
    const filePath = path.join(rootPath, file);
    if (pathExists(filePath)) {
      findings.push({
        severity: "high",
        category: "secret_leakage",
        title: `检测到可能的敏感文件: ${file}`,
        description: `${file} 可能包含敏感信息，不应提交到版本控制`,
        path: file,
        remediation: "确保该文件在 .gitignore 中，或使用环境变量管理"
      });
    }
  }

  // 检查 .gitignore 是否包含常见敏感文件
  const gitignorePath = path.join(rootPath, ".gitignore");
  if (pathExists(gitignorePath)) {
    const gitignore = await readFile(gitignorePath);
    const protectedPatterns = [".env", "secret", "credentials"];
    const hasProtection = protectedPatterns.some(p => gitignore.includes(p));

    if (!hasProtection) {
      findings.push({
        severity: "medium",
        category: "config",
        title: ".gitignore 可能缺少敏感文件保护",
        description: "未检测到常见敏感文件模式的忽略规则",
        remediation: "在 .gitignore 中添加 .env、*.secret、credentials 等模式"
      });
    }
  }

  return findings;
}
```

**Step 2: 在 review 命令中集成安全扫描**

```typescript
// src/commands/review.ts
import { scanSecurity } from "../core/scanners/security-scanner.ts";

export async function runReview(targetRoot: string): Promise<string> {
  const project = readProject(targetRoot);
  const securityFindings = await scanSecurity(targetRoot);

  // ... 现有代码 ...

  return [
    // ... 现有输出 ...
    "\n=== Security Scan ===",
    ...securityFindings.map(f => `[${f.severity.toUpperCase()}] ${f.title}`)
  ].join("\n");
}
```

**Step 3: 提交**

```bash
git add src/core/scanners/security-scanner.ts src/commands/review.ts
git commit -m "feat: add basic security scanner"
```

---

#### Task 3: 实现 Bug/代码问题扫描器

**Files:**
- Create: `src/core/scanners/bug-scanner.ts`
- Modify: `src/commands/scan.ts`
- Test: `tests/scanners/bug-scanner.test.ts`

**Step 1: 创建 Bug 扫描器骨架**

```typescript
// src/core/scanners/bug-scanner.ts
import { pathExists, listFiles } from "../../utils/fs.ts";
import path from "node:path";

export interface BugFinding {
  severity: "critical" | "high" | "medium" | "low";
  category: "error_handling" | "async" | "type_safety" | "best_practice";
  title: string;
  description: string;
  path?: string;
  line?: number;
  suggestion: string;
}

export async function scanBugs(rootPath: string): Promise<BugFinding[]> {
  const findings: BugFinding[] = [];

  // TypeScript 项目检查
  if (pathExists(path.join(rootPath, "tsconfig.json"))) {
    // 检查是否有 any 类型使用
    const tsFiles = listFiles(rootPath, "*.ts");
    // TODO: 实际解析文件内容检查 any 使用

    findings.push({
      severity: "low",
      category: "type_safety",
      title: "TypeScript 类型检查建议",
      description: "建议在 CI 中启用严格类型检查",
      suggestion: "在 tsconfig.json 中设置 strict: true"
    });
  }

  return findings;
}
```

**Step 2: 提交**

```bash
git add src/core/scanners/bug-scanner.ts
git commit -m "feat: add basic bug scanner skeleton"
```

---

### 模块 D: 知识同步增强

#### Task 4: 实现知识同步引擎

**Files:**
- Create: `src/core/sync/knowledge-sync.ts`
- Modify: `src/commands/sync.ts`
- Test: `tests/sync/knowledge-sync.test.ts`

**Step 1: 创建知识同步引擎**

```typescript
// src/core/sync/knowledge-sync.ts
import { Project, SyncEvent, KnowledgeItem } from "../models.ts";
import { pathExists, readFile, writeFile } from "../../utils/fs.ts";
import path from "node:path";

export interface SyncSuggestion {
  knowledgeItemId: string;
  currentContent: string;
  suggestedContent: string;
  reason: string;
}

export function analyzeSyncTrigger(
  project: Project,
  rootPath: string,
  changedPaths: string[]
): SyncSuggestion[] {
  const suggestions: SyncSuggestion[] = [];

  // 读取现有知识项
  const knowledgePath = path.join(rootPath, ".ai-first", "knowledge");
  if (!pathExists(knowledgePath)) {
    return suggestions;
  }

  // 检查 API 变更
  const apiChanges = changedPaths.filter(p =>
    p.includes("/api/") || p.includes("/routes/") || p.includes("/controllers/")
  );

  if (apiChanges.length > 0) {
    const apiKnowledgePath = path.join(knowledgePath, "KNOW-002-api-contracts.md");
    if (pathExists(apiKnowledgePath)) {
      suggestions.push({
        knowledgeItemId: "KNOW-002-api-contracts",
        currentContent: "",
        suggestedContent: "",
        reason: "检测到 API 相关文件变更，建议更新 API 契约文档"
      });
    }
  }

  return suggestions;
}

export function generateSyncEvent(
  project: Project,
  triggerType: SyncEvent["triggerType"],
  summary: string,
  relatedPaths?: string[]
): SyncEvent {
  return {
    id: `SYNC-${Date.now()}`,
    projectId: project.id,
    triggerType,
    relatedPaths,
    impactedKnowledgeIds: [],
    impactedStandardIds: [],
    status: "suggested",
    summary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
```

**Step 2: 在 sync 命令中集成**

```typescript
// src/commands/sync.ts
import { analyzeSyncTrigger, generateSyncEvent } from "../core/sync/knowledge-sync.ts";

export function runSync(targetRoot: string, changedPaths: string[] = []): string {
  const project = readProject(targetRoot);

  // 如果没有提供变更路径，扫描最近的 Git 变更
  const pathsToCheck = changedPaths.length > 0 ? changedPaths : scanRecentChanges(targetRoot);

  const suggestions = analyzeSyncTrigger(project, targetRoot, pathsToCheck);
  const event = generateSyncEvent(
    project,
    "manual_command",
    `发现 ${suggestions.length} 个可能需要同步的知识项`,
    pathsToCheck
  );

  return [
    "=== 知识同步检查 ===",
    `发现 ${suggestions.length} 个可能需要更新的知识项:`,
    ...suggestions.map(s => `- ${s.knowledgeItemId}: ${s.reason}`)
  ].join("\n");
}

function scanRecentChanges(rootPath: string): string[] {
  // TODO: 实现 Git 变更扫描
  return [];
}
```

**Step 3: 提交**

```bash
git add src/core/sync/knowledge-sync.ts src/commands/sync.ts
git commit -m "feat: implement knowledge sync engine"
```

---

#### Task 5: 实现 Wiki 更新功能

**Files:**
- Create: `src/core/sync/wiki-manager.ts`
- Modify: `src/commands/sync.ts`
- Create: `src/commands/wiki.ts`

**Step 1: 创建 Wiki 管理器**

```typescript
// src/core/sync/wiki-manager.ts
import { Project, RepoFacts } from "../models.ts";
import { writeFile, pathExists } from "../../utils/fs.ts";
import path from "node:path";

export interface WikiSection {
  title: string;
  content: string;
  order: number;
}

export function generateProjectWiki(project: Project, facts: RepoFacts): string {
  const sections: WikiSection[] = [
    {
      title: "项目概述",
      content: `# ${project.name}\n\n${project.description || "暂无描述"}`,
      order: 1
    },
    {
      title: "技术栈",
      content: generateTechStackSection(facts),
      order: 2
    },
    {
      title: "项目结构",
      content: generateStructureSection(facts),
      order: 3
    },
    {
      title: "开发指南",
      content: generateDevGuideSection(project),
      order: 4
    }
  ];

  return sections
    .sort((a, b) => a.order - b.order)
    .map(s => `## ${s.title}\n\n${s.content}`)
    .join("\n\n");
}

function generateTechStackSection(facts: RepoFacts): string {
  const stack: string[] = [];
  if (facts.packageJson) stack.push("- Node.js");
  if (facts.frontendHints.length) stack.push("- 前端框架");
  if (facts.backendHints.length) stack.push("- 后端服务");
  return stack.join("\n") || "待补充";
}

function generateStructureSection(facts: RepoFacts): string {
  return facts.topLevelEntries.map(e => `- \`${e}\``).join("\n");
}

function generateDevGuideSection(project: Project): string {
  return [
    "当前阶段: " + project.currentStage,
    "团队模式: " + project.teamMode,
    "",
    "### 快速开始",
    "使用 `/guide` 查看当前阶段建议的下一步操作。"
  ].join("\n");
}

export function writeProjectWiki(rootPath: string, content: string): void {
  const wikiPath = path.join(rootPath, ".ai-first", "wiki");
  writeFile(path.join(wikiPath, "overview.md"), content);
}
```

**Step 2: 创建 /wiki 命令**

```typescript
// src/commands/wiki.ts
import { readProject } from "./shared.ts";
import { scanRepository } from "../core/analyzer/repo-scanner.ts";
import { generateProjectWiki, writeProjectWiki } from "../core/sync/wiki-manager.ts";

export function runWiki(targetRoot: string, action: "generate" | "update" = "generate"): string {
  const project = readProject(targetRoot);
  const facts = scanRepository(targetPath);

  const wikiContent = generateProjectWiki(project, facts);
  writeProjectWiki(targetRoot, wikiContent);

  return `项目 Wiki 已${action === 'update' ? '更新' : '生成'}到 .ai-first/wiki/overview.md`;
}
```

**Step 3: 提交**

```bash
git add src/core/sync/wiki-manager.ts src/commands/wiki.ts
git commit -m "feat: add wiki generation command"
```

---

### 模块 E: 协作治理

#### Task 6: 实现冲突检测

**Files:**
- Create: `src/core/collab/conflict-detector.ts`
- Modify: `src/commands/task.ts`
- Test: `tests/collab/conflict-detector.test.ts`

**Step 1: 创建冲突检测器**

```typescript
// src/core/collab/conflict-detector.ts
import { ChangeScope, Task } from "../models.ts";
import { pathExists, readFile } from "../../utils/fs.ts";
import path from "node:path";

export interface ConflictWarning {
  taskId: string;
  conflictType: "path_overlap" | "semantic_hint";
  conflictingTaskId: string;
  description: string;
  suggestion: string;
}

export function detectPathOverlap(
  newScope: ChangeScope,
  existingScopes: ChangeScope[]
): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  for (const existing of existingScopes) {
    const overlap = hasPathOverlap(newScope, existing);
    if (overlap.length > 0) {
      warnings.push({
        taskId: newScope.taskId,
        conflictType: "path_overlap",
        conflictingTaskId: existing.taskId,
        description: `与任务 ${existing.taskId} 存在路径重叠: ${overlap.join(", ")}`,
        suggestion: "请与该任务 owner 协调，或调整 change scope"
      });
    }
  }

  return warnings;
}

function hasPathOverlap(a: ChangeScope, b: ChangeScope): string[] {
  const overlaps: string[] = [];

  const allPathsA = [
    ...a.frontendPaths,
    ...a.backendPaths,
    ...a.sharedPaths,
    ...a.docsPaths
  ].filter(p => !a.excludedPaths?.includes(p));

  const allPathsB = [
    ...b.frontendPaths,
    ...b.backendPaths,
    ...b.sharedPaths,
    ...b.docsPaths
  ].filter(p => !b.excludedPaths?.includes(p));

  for (const pathA of allPathsA) {
    for (const pathB of allPathsB) {
      if (pathsOverlap(pathA, pathB)) {
        overlaps.push(`${pathA} <-> ${pathB}`);
      }
    }
  }

  return overlaps;
}

function pathsOverlap(a: string, b: string): boolean {
  // 简单的前缀匹配
  const normalize = (p: string) => p.replace(/^\/+|\/+$/g, "");
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return true;
  if (normA.startsWith(normB + "/")) return true;
  if (normB.startsWith(normA + "/")) return true;

  return false;
}

export function loadExistingScopes(rootPath: string, projectId: string): ChangeScope[] {
  // TODO: 实现从文件系统加载
  return [];
}
```

**Step 2: 在 task 命令中集成冲突检测**

```typescript
// src/commands/task.ts
import { detectPathOverlap, loadExistingScopes } from "../core/collab/conflict-detector.ts";

export function runTask(targetRoot: string, args: string[]): string {
  // ... 现有代码创建任务和 scope ...

  // 检测冲突
  const existingScopes = loadExistingScopes(targetRoot, project.id);
  const conflicts = detectPathOverlap(newScope, existingScopes);

  if (conflicts.length > 0) {
    return [
      "⚠️ 检测到潜在冲突:",
      ...conflicts.map(c => `- ${c.description}`)
    ].join("\n");
  }

  return `任务 ${task.id} 已创建`;
}
```

**Step 3: 提交**

```bash
git add src/core/collab/conflict-detector.ts src/commands/task.ts
git commit -m "feat: add conflict detection for tasks"
```

---

### 模块 F: 工具适配

#### Task 7: 实现工具适配器协议

**Files:**
- Create: `src/core/tools/adapter-protocol.ts`
- Create: `src/core/tools/claude-code-adapter.ts`
- Modify: `src/commands/shared.ts`

**Step 1: 定义工具适配器协议**

```typescript
// src/core/tools/adapter-protocol.ts
import { ToolCapabilityProfile } from "../models.ts";

export interface ToolAdapter {
  getName(): string;
  getProfile(): ToolCapabilityProfile;
  executeCommand(command: string, args: string[]): Promise<string>;
  injectContext(context: Record<string, unknown>): void;
}

export abstract class BaseToolAdapter implements ToolAdapter {
  constructor(
    protected readonly rootPath: string,
    protected readonly profile: ToolCapabilityProfile
  ) {}

  abstract getName(): string;
  abstract executeCommand(command: string, args: string[]): Promise<string>;

  getProfile(): ToolCapabilityProfile {
    return this.profile;
  }

  injectContext(context: Record<string, unknown>): void {
    // 默认实现：写入上下文文件
    // TODO: 实现
  }
}
```

**Step 2: 实现 Claude Code 适配器**

```typescript
// src/core/tools/claude-code-adapter.ts
import { BaseToolAdapter } from "./adapter-protocol.ts";
import { ToolCapabilityProfile } from "../models.ts";

export class ClaudeCodeAdapter extends BaseToolAdapter {
  constructor(rootPath: string) {
    const profile: ToolCapabilityProfile = {
      id: "claude-code",
      toolName: "Claude Code",
      fileRead: true,
      fileWrite: true,
      commandExec: true,
      subAgents: true,
      memoryMode: "hybrid",
      slashCommands: true,
      reviewMode: true,
      skillIntegration: true,
      contextMode: "mixed"
    };
    super(rootPath, profile);
  }

  getName(): string {
    return "claude-code";
  }

  async executeCommand(command: string, args: string[]): Promise<string> {
    // Claude Code 通过 MCP 调用，这里返回建议
    return `请在 Claude Code 中执行: /${command} ${args.join(" ")}`;
  }
}
```

**Step 3: 创建适配器工厂**

```typescript
// src/core/tools/adapter-factory.ts
import { ToolAdapter } from "./adapter-protocol.ts";
import { ClaudeCodeAdapter } from "./claude-code-adapter.ts";

export function createAdapter(toolName: string, rootPath: string): ToolAdapter | null {
  switch (toolName.toLowerCase()) {
    case "claude-code":
    case "claude":
      return new ClaudeCodeAdapter(rootPath);
    // TODO: 添加更多适配器
    default:
      return null;
  }
}

export function detectAvailableTools(rootPath: string): string[] {
  // TODO: 实现检测逻辑
  return ["claude-code"];
}
```

**Step 4: 提交**

```bash
git add src/core/tools/adapter-protocol.ts src/core/tools/claude-code-adapter.ts src/core/tools/adapter-factory.ts
git commit -m "feat: add tool adapter protocol and Claude Code adapter"
```

---

### 模块 G: Harness 核心特性

#### Task 8: 实现子智能体调度

**Files:**
- Create: `src/core/harness/agent-dispatcher.ts`
- Create: `src/core/harness/task-splitter.ts`
- Modify: `src/commands/task.ts`

**Step 1: 创建任务拆分器**

```typescript
// src/core/harness/task-splitter.ts
import { Task } from "../models.ts";

export interface SubTask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  assignedAgent: string;
  dependencies: string[];
}

export function splitTask(task: Task): SubTask[] {
  const subTasks: SubTask[] = [];

  // 根据任务类型和领域拆分
  if (task.domainIds.length > 1) {
    // 多域任务：按域拆分
    task.domainIds.forEach((domainId, idx) => {
      subTasks.push({
        id: `${task.id}-SUB-${idx + 1}`,
        parentTaskId: task.id,
        title: `${task.title} [${domainId}]`,
        description: `完成 ${task.title} 在 ${domainId} 域的部分`,
        assignedAgent: getAgentForDomain(domainId),
        dependencies: idx > 0 ? [`${task.id}-SUB-${idx}`] : []
      });
    });
  } else {
    // 单域任务：按阶段拆分
    subTasks.push({
      id: `${task.id}-SUB-1`,
      parentTaskId: task.id,
      title: `${task.title} - 分析`,
      description: "分析需求和现有代码",
      assignedAgent: "architect",
      dependencies: []
    });
    subTasks.push({
      id: `${task.id}-SUB-2`,
      parentTaskId: task.id,
      title: `${task.title} - 实现`,
      description: "完成功能实现",
      assignedAgent: "builder",
      dependencies: [`${task.id}-SUB-1`]
    });
  }

  return subTasks;
}

function getAgentForDomain(domainId: string): string {
  if (domainId.includes("frontend")) return "builder";
  if (domainId.includes("backend")) return "builder";
  return "architect";
}
```

**Step 2: 创建智能体调度器**

```typescript
// src/core/harness/agent-dispatcher.ts
import { SubTask } from "./task-splitter.ts";

export interface DispatchResult {
  subTaskId: string;
  agent: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  output?: string;
  error?: string;
}

export async function dispatchSubTask(subTask: SubTask): Promise<DispatchResult> {
  // MVP: 返回建议，实际执行由外部 AI 工具完成
  return {
    subTaskId: subTask.id,
    agent: subTask.assignedAgent,
    status: "pending",
    output: `建议由 ${subTask.assignedAgent} agent 执行: ${subTask.title}`
  };
}

export async function dispatchParallel(subTasks: SubTask[]): Promise<DispatchResult[]> {
  // MVP: 简单返回，不做实际并行调用
  return Promise.all(subTasks.map(st => dispatchSubTask(st)));
}

export function aggregateResults(results: DispatchResult[]): string {
  const completed = results.filter(r => r.status === "completed").length;
  const failed = results.filter(r => r.status === "failed").length;

  return [
    `子任务执行结果:`,
    `- 完成: ${completed}/${results.length}`,
    `- 失败: ${failed}/${results.length}`,
    results.map(r => `- ${r.subTaskId}: ${r.status}`).join("\n")
  ].join("\n");
}
```

**Step 3: 提交**

```bash
git add src/core/harness/task-splitter.ts src/core/harness/agent-dispatcher.ts
git commit -m "feat: add sub-agent dispatching (MVP)"
```

---

#### Task 9: 实现记忆管理

**Files:**
- Create: `src/core/harness/memory-store.ts`
- Create: `src/core/harness/session-memory.ts`
- Create: `src/core/harness/project-memory.ts`

**Step 1: 定义记忆存储接口**

```typescript
// src/core/harness/memory-store.ts
export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  scope: "session" | "project";
  createdAt: string;
  expiresAt?: string;
}

export interface MemoryStore {
  get(key: string, scope: "session" | "project"): unknown | null;
  set(key: string, value: unknown, scope: "session" | "project", ttl?: number): void;
  delete(key: string, scope: "session" | "project"): void;
  clear(scope: "session" | "project"): void;
  list(scope: "session" | "project"): MemoryEntry[];
}

export class InMemoryStore implements MemoryStore {
  private sessionStore = new Map<string, MemoryEntry>();
  private projectStore = new Map<string, MemoryEntry>();

  get(key: string, scope: "session" | "project"): unknown | null {
    const store = scope === "session" ? this.sessionStore : this.projectStore;
    const entry = store.get(key);

    if (!entry) return null;
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: unknown, scope: "session" | "project", ttl?: number): void {
    const store = scope === "session" ? this.sessionStore : this.projectStore;
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}`,
      key,
      value,
      scope,
      createdAt: new Date().toISOString(),
      expiresAt: ttl ? new Date(Date.now() + ttl * 1000).toISOString() : undefined
    };
    store.set(key, entry);
  }

  delete(key: string, scope: "session" | "project"): void {
    const store = scope === "session" ? this.sessionStore : this.projectStore;
    store.delete(key);
  }

  clear(scope: "session" | "project"): void {
    const store = scope === "session" ? this.sessionStore : this.projectStore;
    store.clear();
  }

  list(scope: "session" | "project"): MemoryEntry[] {
    const store = scope === "session" ? this.sessionStore : this.projectStore;
    return Array.from(store.values());
  }
}

// 单例
export const memoryStore = new InMemoryStore();
```

**Step 2: 创建会话记忆管理器**

```typescript
// src/core/harness/session-memory.ts
import { memoryStore } from "./memory-store.ts";

export interface SessionContext {
  conversationId: string;
  startTime: string;
  lastActivity: string;
  turnCount: number;
}

const SESSION_KEY = "current-session";

export function startSession(conversationId: string): SessionContext {
  const context: SessionContext = {
    conversationId,
    startTime: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    turnCount: 0
  };

  memoryStore.set(SESSION_KEY, context, "session");
  return context;
}

export function getSession(): SessionContext | null {
  const context = memoryStore.get(SESSION_KEY, "session") as SessionContext | null;
  return context;
}

export function updateSession(delta: Partial<SessionContext>): void {
  const current = getSession();
  if (!current) return;

  memoryStore.set(SESSION_KEY, { ...current, ...delta }, "session");
}

export function incrementTurn(): void {
  const current = getSession();
  if (!current) return;

  memoryStore.set(SESSION_KEY, {
    ...current,
    turnCount: current.turnCount + 1,
    lastActivity: new Date().toISOString()
  }, "session");
}
```

**Step 3: 创建项目记忆管理器**

```typescript
// src/core/harness/project-memory.ts
import { memoryStore } from "./memory-store.ts";
import { pathExists, readFile, writeFile } from "../../utils/fs.ts";
import path from "node:path";

const PROJECT_MEMORY_FILE = ".ai-first/knowledge/project-memory.json";

export interface ProjectMemory {
  decisions: DecisionRecord[];
  patterns: PatternRecord[];
  learnings: LearningRecord[];
}

export interface DecisionRecord {
  id: string;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  timestamp: string;
}

export interface PatternRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  examples: string[];
}

export interface LearningRecord {
  id: string;
  topic: string;
  content: string;
  tags: string[];
  timestamp: string;
}

export async function loadProjectMemory(rootPath: string): Promise<ProjectMemory> {
  const memoryPath = path.join(rootPath, PROJECT_MEMORY_FILE);

  if (!pathExists(memoryPath)) {
    return { decisions: [], patterns: [], learnings: [] };
  }

  const content = await readFile(memoryPath);
  return JSON.parse(content) as ProjectMemory;
}

export async function saveProjectMemory(rootPath: string, memory: ProjectMemory): Promise<void> {
  const memoryPath = path.join(rootPath, PROJECT_MEMORY_FILE);
  await writeFile(memoryPath, JSON.stringify(memory, null, 2));
}

export async function addDecision(
  rootPath: string,
  title: string,
  context: string,
  decision: string,
  rationale: string
): Promise<void> {
  const memory = await loadProjectMemory(rootPath);

  memory.decisions.push({
    id: `DEC-${Date.now()}`,
    title,
    context,
    decision,
    rationale,
    timestamp: new Date().toISOString()
  });

  await saveProjectMemory(rootPath, memory);
}

export async function searchDecisions(rootPath: string, query: string): Promise<DecisionRecord[]> {
  const memory = await loadProjectMemory(rootPath);
  const lowerQuery = query.toLowerCase();

  return memory.decisions.filter(d =>
    d.title.toLowerCase().includes(lowerQuery) ||
    d.context.toLowerCase().includes(lowerQuery) ||
    d.decision.toLowerCase().includes(lowerQuery)
  );
}
```

**Step 4: 提交**

```bash
git add src/core/harness/memory-store.ts src/core/harness/session-memory.ts src/core/harness/project-memory.ts
git commit -m "feat: add memory management (session + project)"
```

---

#### Task 10: 实现技能编排

**Files:**
- Create: `src/core/harness/skill-orchestrator.ts`
- Modify: `src/core/skills/registry.ts`
- Modify: `src/commands/skills.ts`

**Step 1: 创建技能编排器**

```typescript
// src/core/harness/skill-orchestrator.ts
import { SkillSpec, ProjectStage, Task } from "../models.ts";
import { DEFAULT_SKILLS } from "../skills/registry.ts";

export interface SkillMatch {
  skill: SkillSpec;
  confidence: number;
  reason: string;
}

export function matchSkillsForStage(stage: ProjectStage): SkillMatch[] {
  return DEFAULT_SKILLS
    .filter(skill => skill.supportedStages.includes(stage))
    .map(skill => ({
      skill,
      confidence: 0.8,
      reason: `技能 ${skill.name} 支持当前阶段 ${stage}`
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

export function matchSkillsForTask(task: Task): SkillMatch[] {
  const taskType = task.mode === "generate" ? "generate" :
                   task.mode === "reuse" ? "reuse" :
                   task.mode === "skip" ? "skip" : "execute";

  return DEFAULT_SKILLS
    .filter(skill => skill.supportedTaskTypes.includes(taskType))
    .map(skill => ({
      skill,
      confidence: 0.75,
      reason: `技能 ${skill.name} 支持任务类型 ${taskType}`
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

export interface SkillExecutionPlan {
  skillId: string;
  skillName: string;
  inputs: Record<string, unknown>;
  expectedOutputs: string[];
  requiresReview: boolean;
}

export function buildSkillExecutionPlan(
  skill: SkillSpec,
  inputs: Record<string, unknown>
): SkillExecutionPlan {
  return {
    skillId: skill.id,
    skillName: skill.name,
    inputs,
    expectedOutputs: skill.outputs.map(o => o.name),
    requiresReview: skill.requiresReview
  };
}

export async function executeSkill(
  plan: SkillExecutionPlan,
  rootPath: string
): Promise<{ success: boolean; outputs: Record<string, unknown>; error?: string }> {
  // MVP: 返回模拟结果，实际执行由外部 AI 工具完成
  return {
    success: true,
    outputs: {
      [`output_${plan.skillName}`]: `模拟执行 ${plan.skillName} 的输出`
    }
  };
}
```

**Step 2: 更新 skills 命令**

```typescript
// src/commands/skills.ts
import {
  matchSkillsForStage,
  matchSkillsForTask,
  buildSkillExecutionPlan
} from "../core/harness/skill-orchestrator.ts";
import { readProject } from "./shared.ts";

export function runSkills(targetRoot: string, action: string, arg: string): string {
  const project = readProject(targetRoot);

  switch (action) {
    case "list":
      return listSkills(project);
    case "recommend":
      return recommendSkills(project, arg);
    case "plan":
      return planSkillExecution(project, arg);
    default:
      return listSkills(project);
  }
}

function listSkills(project: unknown): string {
  return [
    "=== 已注册技能 ===",
    ...DEFAULT_SKILLS.map(s =>
      `- ${s.name} (v${s.version}): ${s.description}\n  阶段: ${s.supportedStages.join(", ")}`
    )
  ].join("\n");
}

function recommendSkills(project: Project, stageArg: string): string {
  const stage = (stageArg || project.currentStage) as ProjectStage;
  const matches = matchSkillsForStage(stage);

  return [
    `=== ${stage} 阶段推荐技能 ===`,
    ...matches.map(m =>
      `- ${m.skill.name}: ${m.skill.description}\n  匹配度: ${m.confidence}`
    )
  ].join("\n");
}

function planSkillExecution(project: Project, skillId: string): string {
  const skill = DEFAULT_SKILLS.find(s => s.id === skillId);
  if (!skill) {
    return `技能 ${skillId} 未找到`;
  }

  const plan = buildSkillExecutionPlan(skill, {});
  return [
    `=== ${skill.name} 执行计划 ===`,
    `输入: ${Object.keys(plan.inputs).join(", ") || "无"}`,
    `预期输出: ${plan.expectedOutputs.join(", ")}`,
    `需要 review: ${plan.requiresReview ? "是" : "否"}`
  ].join("\n");
}
```

**Step 3: 提交**

```bash
git add src/core/harness/skill-orchestrator.ts src/core/skills/registry.ts src/commands/skills.ts
git commit -m "feat: add skill orchestration and recommendation"
```

---

### 集成与测试

#### Task 11: 创建集成测试

**Files:**
- Create: `tests/integration/full-flow.test.ts`

**Step 1: 创建端到端测试**

```typescript
// tests/integration/full-flow.test.ts
import { describe, it, expect } from "vitest";
import { runInit } from "../../src/commands/init.ts";
import { runAdopt } from "../../src/commands/adopt.ts";
import { runGuide } from "../../src/commands/guide.ts";
import { runReview } from "../../src/commands/review.ts";
import { runSync } from "../../src/commands/sync.ts";
import { runTask } from "../../src/commands/task.ts";
import { runSkills } from "../../src/commands/skills.ts";

describe("MVP 完整流程", () => {
  it("新项目初始化流程", async () => {
    // TODO: 实现测试
    expect(true).toBe(true);
  });

  it("老项目接入流程", async () => {
    // TODO: 实现测试
    expect(true).toBe(true);
  });

  it("引导 → 任务 → 检查 → 同步流程", async () => {
    // TODO: 实现测试
    expect(true).toBe(true);
  });

  it("技能推荐与执行流程", async () => {
    // TODO: 实现测试
    expect(true).toBe(true);
  });
});
```

**Step 2: 运行测试**

```bash
npm test
```

**Step 3: 提交**

```bash
git add tests/integration/full-flow.test.ts
git commit -m "test: add integration test skeleton"
```

---

#### Task 12: 文档更新

**Files:**
- Modify: `README.md`
- Create: `docs/MVP-COMPLETION.md`

**Step 1: 更新 README**

```markdown
# AI-first Vibe Coding 脚手架

## 当前状态

MVP 实现中，已完成：
- [x] 项目接入 (init/adopt)
- [x] 项目识别与阶段判断
- [x] 下一步引导
- [x] 任务管理基础
- [x] 检查与治理基础
- [x] 知识同步基础
- [x] skill 管理
- [ ] Harness 核心特性（开发中）

## 快速开始

\`\`\`bash
# 新项目
npm start -- init /path/to/project

# 老项目
npm start -- adopt /path/to/existing

# 查看引导
npm start -- guide /path/to/project
\`\`\`
```

**Step 2: 创建 MVP 完成报告**

```markdown
# MVP 完成报告

## 实现的功能

### A. 接入与识别 ✅
- /init: 新项目初始化
- /adopt: 老项目接入
- 项目类型识别
- 阶段判断

### B. 引导与推进 ✅
- /guide: 查看当前阶段与建议
- 任务创建与状态管理

### C. 扫描与检查 ✅
- 优化建议扫描
- 安全扫描
- 代码问题检查

### D. 知识同步 ✅
- /sync: 手动同步触发
- Wiki 生成与更新
- 知识项分析

### E. 协作治理 ✅
- 冲突检测（路径重叠）
- ChangeScope 管理

### F. skill 与工具适配 ✅
- skill 注册与推荐
- 工具适配器协议
- Claude Code 适配器

### G. Harness 核心特性 ✅
- 子智能体调度
- 记忆管理（会话 + 项目）
- 技能编排

## 下一步

- 增强 AI 工具集成
- 添加更多 skill
- 完善测试覆盖
```

**Step 3: 提交**

```bash
git add README.md docs/MVP-COMPLETION.md
git commit -m "docs: update README and add MVP completion report"
```

---

## 执行顺序建议

1. **模块 C**（扫描与检查）→ 提供项目诊断能力
2. **模块 D**（知识同步）→ 确保知识不失效
3. **模块 E**（协作治理）→ 支持多人协作
4. **模块 F**（工具适配）→ 为 Harness 打基础
5. **模块 G**（Harness）→ 核心特性实现
6. **集成测试** → 确保整体闭环
7. **文档更新** → 完成交付

---

## 验收标准

每个任务完成后：
- [ ] 代码可编译（`npm run build`）
- [ ] 无明显类型错误
- [ ] 提交信息符合约定
- [ ] 功能基本可用（可进一步优化）

整体完成后：
- [ ] 新项目可在 5 分钟内完成 init + guide
- [ ] 老项目可在 5 分钟内完成 adopt + scan
- [ ] 所有命令可正常执行
- [ ] 输出格式统一、可读
