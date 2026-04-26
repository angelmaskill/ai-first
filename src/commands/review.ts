import path from "node:path";
import { readProject } from "./shared.ts";
import { createBasicReview } from "../core/review/basic-review.ts";
import { writeFile } from "../utils/fs.ts";
import { writeReviewReportMarkdown } from "../core/reports/report-writer.ts";
import { scanSecurity } from "../core/scanners/security-scanner.ts";

export function runReview(targetRoot: string): string {
  const project = readProject(targetRoot);
  const securityFindings = scanSecurity(targetRoot);
  const report = createBasicReview(project, targetRoot);

  // Add security findings to the report
  const findingsWithSecurity = [
    ...report.findings,
    ...securityFindings.map((finding): {
      id: string;
      severity: "critical" | "high" | "medium" | "low";
      category: "logic" | "security" | "architecture" | "docs" | "knowledge" | "testing" | "consistency";
      title: string;
      detail: string;
      relatedPaths?: string[];
      resolutionHint?: string;
    } => ({
      id: `security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: finding.severity,
      category: (finding.category === "secret_leakage" || finding.category === "auth" || finding.category === "dependency") ? "security" : "consistency",
      title: finding.title,
      detail: finding.description,
      relatedPaths: finding.path ? [finding.path] : undefined,
      resolutionHint: finding.remediation
    }))
  ];

  // Update report status if critical/high security findings exist
  const hasCriticalSecurity = securityFindings.some(f => f.severity === "critical" || f.severity === "high");
  const updatedStatus = hasCriticalSecurity ? "failed" : report.status;

  const updatedReport = {
    ...report,
    findings: findingsWithSecurity,
    status: updatedStatus
  };

  const filePath = path.join(targetRoot, ".ai-first", "reviews", `${report.createdAt.replace(/[:]/g, "-")}.json`);
  writeFile(filePath, `${JSON.stringify(updatedReport, null, 2)}\n`);
  writeReviewReportMarkdown(targetRoot, updatedReport);

  return [
    `Review status: ${updatedReport.status}`,
    `Stage: ${updatedReport.stage}`,
    `Findings: ${updatedReport.findings.length}`,
    ...updatedReport.findings.map((finding) => `- [${finding.severity}] ${finding.title}: ${finding.detail}`)
  ].join("\n");
}
