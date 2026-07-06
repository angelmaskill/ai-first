import { describe, it, expect } from "vitest";
import { buildTaskContextBundle, renderPromptV0 } from "./context-bundle-core.ts";
import type { ChangeScope, CodeDomain, StandardItem, Task } from "../models.ts";

const task: Task = {
  id: "t1",
  projectId: "p",
  title: "实现登录接口",
  description: "在 backend 实现 /auth/login",
  stage: "build",
  mode: "execute",
  domainIds: ["domain-backend"],
  status: "todo",
  priority: "p1",
  acceptanceCriteria: [
    {
      id: "ac-1",
      description: "测试通过",
      check: { kind: "test", commandId: "npm-test" },
      required: true,
    },
  ],
  runtime: "codex",
  createdAt: "",
  updatedAt: "",
};

const scope: ChangeScope = {
  id: "s",
  projectId: "p",
  taskId: "t1",
  summary: "登录",
  frontendPaths: [],
  backendPaths: ["src/backend/"],
  sharedPaths: [],
  docsPaths: [],
  riskLevel: "low",
  parallelSafe: true,
  lockMode: "none",
  createdAt: "",
  updatedAt: "",
};

const domains: CodeDomain[] = [
  { id: "domain-backend", name: "Backend", kind: "backend", paths: ["src/backend/"] },
];

const standards: StandardItem[] = [
  {
    id: "STANDARD-012",
    projectId: "p",
    name: "Backend API Design",
    description: "x",
    category: "backend",
    content: "...",
    examples: ["统一错误码", "RESTful 路径"],
    status: "accepted",
    createdAt: "",
    updatedAt: "",
  },
];

describe("context-bundle-core buildTaskContextBundle", () => {
  it("includes only domains involved in the task", () => {
    const b = buildTaskContextBundle(task, scope, domains, standards, "build");
    expect(b.domainContexts.length).toBe(1);
    expect(b.domainContexts[0].kind).toBe("backend");
  });

  it("picks standards whose category matches the scope buckets", () => {
    const b = buildTaskContextBundle(task, scope, domains, standards, "build");
    expect(b.relevantStandards.length).toBe(1);
    expect(b.relevantStandards[0].id).toBe("STANDARD-012");
  });
});

describe("context-bundle-core renderPromptV0 (§4.2)", () => {
  it("renders task, scope, domain context, standards, acceptance, and the open-ended closing line", () => {
    const b = buildTaskContextBundle(task, scope, domains, standards, "build");
    const prompt = renderPromptV0(b);
    expect(prompt).toContain("# 任务");
    expect(prompt).toContain("实现登录接口");
    expect(prompt).toContain("# 改动范围");
    expect(prompt).toContain("src/backend/");
    expect(prompt).toContain("# 相关 domain 上下文");
    expect(prompt).toContain("# 相关规范");
    expect(prompt).toContain("STANDARD-012");
    expect(prompt).toContain("# 验收条件");
    expect(prompt).toContain("npm-test");
    expect(prompt).toContain("你可以自由决定实现方式");
    expect(prompt).toContain("不需要输出 JSON 或任何固定格式");
  });

  it("does NOT demand a structured report (lenient-out philosophy)", () => {
    const b = buildTaskContextBundle(task, scope, domains, [], "build");
    const prompt = renderPromptV0(b);
    // explicitly tells Codex it does NOT need to output a fixed format
    expect(prompt).toMatch(/不需要输出 JSON 或任何固定格式/);
    // never demands a status field
    expect(prompt).not.toMatch(/必须输出\s*status/);
    expect(prompt).not.toMatch(/输出\s*status:\s*done/);
  });
});
