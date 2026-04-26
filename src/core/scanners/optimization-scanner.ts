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
