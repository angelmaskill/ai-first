export interface Translations {
  app: { emptyState: string };
  dashboard: {
    subtitle: string;
    health: string;
    risks: string;
    knowledgeSync: string;
    recentActivity: string;
    suggestedActions: string;
    healthTrend: string;
    riskHeatmap: string;
    searchPlaceholder: string;
    filterAll: string;
    filterGood: string;
    filterWarning: string;
    filterCritical: string;
    showingEntries: string;
    loadMore: string;
    noResults: string;
    footer: { version: string; generated: string };
  };
  action: {
    priority: { p0: string; p1: string; p2: string };
    type: Record<string, string>;
  };
  stage: { label: string; ofTotal: string; unknownFallback: string };
  health: { scoreUnit: string; detailTitle: string; closeDetail: string; overview: string; metrics: string };
  status: { healthy: string; attention: string; critical: string };
  severity: { high: string; medium: string; low: string };
  sync: {
    resolved: string;
    open: string;
    pending: string;
    dismissed: string;
    resolvedLabel: string;
    openLabel: string;
    emptyState: string;
  };
  risk: { emptyState: string };
  stageNames: Record<string, string>;
}

const zh: Translations = {
  app: { emptyState: "未找到项目数据。请在包含 .ai-first/ 控制层的项目中运行。" },
  dashboard: {
    subtitle: "面向结构化软件项目生命周期的多智能体编排脚手架。",
    health: "健康度",
    risks: "风险",
    knowledgeSync: "知识同步",
    recentActivity: "最近活动",
    suggestedActions: "建议操作",
    healthTrend: "健康趋势",
    riskHeatmap: "风险热力图",
    searchPlaceholder: "搜索项目、风险或活动...",
    filterAll: "全部",
    filterGood: "健康",
    filterWarning: "注意",
    filterCritical: "严重",
    showingEntries: "显示 {shown} / {total} 条",
    loadMore: "加载更多",
    noResults: "没有匹配的结果",
    footer: {
      version: "AI-First v0.1.0",
      generated: "由 .ai-first/ 控制层生成",
    },
  },
  action: {
    priority: { p0: "P0 紧急", p1: "P1 重要", p2: "P2 建议" },
    type: { transition: "阶段转换", implement: "实施开发", default: "其他" },
  },
  stage: { label: "生命周期", ofTotal: "/ 10", unknownFallback: "未知阶段: {stage}" },
  health: { scoreUnit: "/ 100", detailTitle: "健康详情", closeDetail: "关闭", overview: "概览", metrics: "指标" },
  status: { healthy: "健康", attention: "注意", critical: "严重" },
  severity: { high: "高", medium: "中", low: "低" },
  sync: {
    resolved: "已解决",
    open: "待处理",
    pending: "进行中",
    dismissed: "已忽略",
    resolvedLabel: "已解决",
    openLabel: "待处理",
    emptyState: "无同步事件。知识库状态良好。",
  },
  risk: { emptyState: "未检测到活跃风险。" },
  stageNames: {
    idea: "构思",
    discovery: "发现",
    spec: "规格",
    architecture: "架构",
    scaffold: "脚手架",
    build: "构建",
    qa: "质量",
    release: "发布",
    operate: "运维",
    evolve: "演进",
  },
};

const en: Translations = {
  app: { emptyState: "No project data found. Run from a project with .ai-first/ control layer." },
  dashboard: {
    subtitle: "Multi-agent orchestration scaffold for structured software project lifecycles.",
    health: "Health",
    risks: "Risks",
    knowledgeSync: "Knowledge Sync",
    recentActivity: "Recent Activity",
    suggestedActions: "Suggested Actions",
    healthTrend: "Health Trend",
    riskHeatmap: "Risk Heatmap",
    searchPlaceholder: "Search projects, risks, or activity...",
    filterAll: "All",
    filterGood: "Healthy",
    filterWarning: "Warning",
    filterCritical: "Critical",
    showingEntries: "Showing {shown} / {total}",
    loadMore: "Load More",
    noResults: "No matching results",
    footer: {
      version: "AI-First v0.1.0",
      generated: "Generated from .ai-first/ control layer",
    },
  },
  action: {
    priority: { p0: "P0 Critical", p1: "P1 Important", p2: "P2 Nice-to-have" },
    type: { transition: "Stage Transition", implement: "Implementation", default: "General" },
  },
  stage: { label: "Lifecycle", ofTotal: "/ 10", unknownFallback: "Unknown stage: {stage}" },
  health: { scoreUnit: "/ 100", detailTitle: "Health Detail", closeDetail: "Close", overview: "Overview", metrics: "Metrics" },
  status: { healthy: "Healthy", attention: "Attention", critical: "Critical" },
  severity: { high: "High", medium: "Medium", low: "Low" },
  sync: {
    resolved: "Resolved",
    open: "Open",
    pending: "Pending",
    dismissed: "Dismissed",
    resolvedLabel: "resolved",
    openLabel: "open",
    emptyState: "No sync events. Knowledge base is clean.",
  },
  risk: { emptyState: "No active risks detected." },
  stageNames: {
    idea: "Idea",
    discovery: "Discovery",
    spec: "Specification",
    architecture: "Architecture",
    scaffold: "Scaffold",
    build: "Build",
    qa: "QA",
    release: "Release",
    operate: "Operate",
    evolve: "Evolve",
  },
};

export const translations: Record<"zh" | "en", Translations> = { zh, en };

export function getStageLabels(lang: "zh" | "en"): Record<string, string> {
  return translations[lang].stageNames;
}
