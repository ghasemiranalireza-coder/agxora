/**
 * Business health score composition for executive dashboard.
 */

import type { BusinessHealthScore, KpiSnapshot } from "../types";

function kpiValue(snapshots: readonly KpiSnapshot[], id: string): number {
  return snapshots.find((s) => s.kpiId === id)?.value ?? 0;
}

export function computeBusinessHealth(
  organizationId: string,
  snapshots: readonly KpiSnapshot[],
): BusinessHealthScore {
  const revenue = Math.min(100, (kpiValue(snapshots, "mrr") / 40_000) * 100);
  const customers = kpiValue(snapshots, "retention");
  const projects = kpiValue(snapshots, "project_success");
  const workflows = kpiValue(snapshots, "workflow_success");
  const ai = kpiValue(snapshots, "agent_performance");
  const finance = Math.min(100, (kpiValue(snapshots, "revenue") / 500_000) * 100);
  const operations = kpiValue(snapshots, "automation_success");
  const risk = Math.max(0, 100 - kpiValue(snapshots, "churn") * 8);
  const growth = Math.min(100, kpiValue(snapshots, "growth") * 10);

  const overall = Math.round(
    (revenue +
      customers +
      projects +
      workflows +
      ai +
      finance +
      operations +
      risk +
      growth) /
      9,
  );

  return {
    organizationId,
    overall,
    revenue: Math.round(revenue),
    customers: Math.round(customers),
    projects: Math.round(projects),
    workflows: Math.round(workflows),
    ai: Math.round(ai),
    finance: Math.round(finance),
    operations: Math.round(operations),
    risk: Math.round(risk),
    growth: Math.round(growth),
    asOf: new Date().toISOString(),
  };
}
