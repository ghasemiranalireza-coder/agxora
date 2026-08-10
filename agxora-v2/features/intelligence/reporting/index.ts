/**
 * Reporting engine — executive / department / operational / management.
 */

import type { ReportDefinition, ReportKind } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

const REPORTS: readonly {
  kind: ReportKind;
  title: string;
  description: string;
  domains: ReportDefinition["domains"];
  scheduleCron?: string;
}[] = [
  {
    kind: "executive",
    title: "Executive Weekly",
    description: "CEO-level health, revenue, risk, and growth brief.",
    domains: ["executive", "finance", "crm", "projects"],
    scheduleCron: "0 8 * * 1",
  },
  {
    kind: "department",
    title: "Sales Department Report",
    description: "Pipeline, acquisition, and retention for sales leadership.",
    domains: ["crm", "finance"],
    scheduleCron: "0 9 * * 1",
  },
  {
    kind: "operational",
    title: "Operations Daily",
    description: "Workflows, integrations, and identity posture.",
    domains: ["workflow", "integration", "identity"],
  },
  {
    kind: "management",
    title: "Delivery Management",
    description: "Project success, capacity, and document throughput.",
    domains: ["projects", "documents", "ai"],
  },
];

export function seedReports(organizationId: string): readonly ReportDefinition[] {
  return REPORTS.map((r) => ({
    id: createId("rpt"),
    organizationId,
    kind: r.kind,
    title: r.title,
    description: r.description,
    domains: r.domains,
    scheduleCron: r.scheduleCron,
    exportFormats: ["pdf", "csv", "xlsx"],
    createdAt: new Date().toISOString(),
  }));
}

/**
 * Export stub — no file is generated.
 * Callers must surface an unavailable state (never imply success).
 */
export function exportReportPlaceholder(
  report: ReportDefinition,
  format: "pdf" | "csv" | "xlsx",
): {
  readonly ok: false;
  readonly format: string;
  readonly reportId: string;
  readonly reason: string;
} {
  return {
    ok: false,
    format,
    reportId: report.id,
    reason: "Export unavailable — report generation is not connected yet.",
  };
}
