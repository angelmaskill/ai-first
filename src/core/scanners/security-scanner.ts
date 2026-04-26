import { pathExists } from "../../utils/fs.ts";
import path from "node:path";
import fs from "node:fs";

export interface SecurityFinding {
  severity: "critical" | "high" | "medium" | "low";
  category: "secret_leakage" | "dependency" | "config" | "auth";
  title: string;
  description: string;
  path?: string;
  remediation: string;
}

export function scanSecurity(rootPath: string): SecurityFinding[] {
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
    const gitignore = fs.readFileSync(gitignorePath, "utf8");
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
