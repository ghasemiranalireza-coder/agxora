/**
 * Centralized KPI Engine — configurable business metrics.
 */

import type {
  AnalyticsDomain,
  KpiDefinition,
  KpiId,
  KpiSnapshot,
  KpiTrend,
} from "../types";

export const KPI_CATALOG: readonly KpiDefinition[] = [
  {
    id: "revenue",
    name: "Revenue",
    description: "Total recognized revenue in period.",
    domain: "finance",
    format: "currency",
    unit: "USD",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "mrr",
    name: "MRR",
    description: "Monthly recurring revenue.",
    domain: "finance",
    format: "currency",
    unit: "USD",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "arr",
    name: "ARR",
    description: "Annual recurring revenue.",
    domain: "finance",
    format: "currency",
    unit: "USD",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Period-over-period growth rate.",
    domain: "executive",
    format: "percent",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "customer_acquisition",
    name: "Customer Acquisition",
    description: "New customers acquired.",
    domain: "crm",
    format: "number",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "retention",
    name: "Retention",
    description: "Customer retention rate.",
    domain: "crm",
    format: "percent",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "churn",
    name: "Churn",
    description: "Customer churn rate.",
    domain: "crm",
    format: "percent",
    configurable: true,
    higherIsBetter: false,
  },
  {
    id: "project_success",
    name: "Project Success",
    description: "Projects delivered on time / scope.",
    domain: "projects",
    format: "percent",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "workflow_success",
    name: "Workflow Success",
    description: "Successful workflow executions.",
    domain: "workflow",
    format: "percent",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "agent_performance",
    name: "Agent Performance",
    description: "AI agent task success score.",
    domain: "ai",
    format: "score",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "automation_success",
    name: "Automation Success",
    description: "Automation / integration reliability.",
    domain: "integration",
    format: "percent",
    configurable: true,
    higherIsBetter: true,
  },
  {
    id: "custom",
    name: "Custom KPI",
    description: "Extension point for organization-defined KPIs.",
    domain: "executive",
    format: "number",
    configurable: true,
    higherIsBetter: true,
  },
] as const;

export function getKpiDefinition(id: KpiId): KpiDefinition | undefined {
  return KPI_CATALOG.find((k) => k.id === id);
}

export function listKpisByDomain(
  domain?: AnalyticsDomain,
): readonly KpiDefinition[] {
  if (!domain) return KPI_CATALOG;
  return KPI_CATALOG.filter((k) => k.domain === domain);
}

function trendOf(
  value: number,
  previous: number,
  higherIsBetter: boolean,
): KpiTrend {
  if (Math.abs(value - previous) < 0.0001) return "flat";
  const up = value > previous;
  if (higherIsBetter) return up ? "up" : "down";
  return up ? "down" : "up";
}

export function buildKpiSnapshot(input: {
  readonly kpiId: KpiId;
  readonly organizationId: string;
  readonly value: number;
  readonly previousValue: number;
  readonly target?: number;
}): KpiSnapshot {
  const def = getKpiDefinition(input.kpiId);
  const previous = input.previousValue;
  const deltaPercent =
    previous === 0
      ? undefined
      : Math.round(((input.value - previous) / Math.abs(previous)) * 1000) / 10;
  return {
    kpiId: input.kpiId,
    organizationId: input.organizationId,
    value: input.value,
    previousValue: previous,
    deltaPercent,
    trend: trendOf(input.value, previous, def?.higherIsBetter ?? true),
    asOf: new Date().toISOString(),
    target: input.target,
  };
}

/** Seed realistic demo KPI values for an organization. */
export function seedKpiSnapshots(organizationId: string): readonly KpiSnapshot[] {
  const seeds: readonly {
    id: KpiId;
    value: number;
    previous: number;
    target?: number;
  }[] = [
    { id: "revenue", value: 482_500, previous: 451_200, target: 500_000 },
    { id: "mrr", value: 38_400, previous: 36_100, target: 40_000 },
    { id: "arr", value: 460_800, previous: 433_200, target: 480_000 },
    { id: "growth", value: 6.9, previous: 5.2, target: 8 },
    { id: "customer_acquisition", value: 42, previous: 37, target: 50 },
    { id: "retention", value: 94.2, previous: 93.1, target: 95 },
    { id: "churn", value: 2.1, previous: 2.4, target: 2 },
    { id: "project_success", value: 88, previous: 84, target: 90 },
    { id: "workflow_success", value: 97.4, previous: 96.1, target: 98 },
    { id: "agent_performance", value: 86, previous: 81, target: 90 },
    { id: "automation_success", value: 95.5, previous: 94.0, target: 97 },
  ];
  return seeds.map((s) =>
    buildKpiSnapshot({
      kpiId: s.id,
      organizationId,
      value: s.value,
      previousValue: s.previous,
      target: s.target,
    }),
  );
}
