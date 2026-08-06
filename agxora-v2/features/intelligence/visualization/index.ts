/**
 * Visualization system — reusable chart/table/card specs (UI-agnostic).
 */

import type { ChartKind, ChartSpec, DomainMetricSeries } from "../types";

export function buildChartSpec(input: {
  readonly id: string;
  readonly kind: ChartKind;
  readonly title: string;
  readonly domain: ChartSpec["domain"];
  readonly seriesIds: readonly string[];
}): ChartSpec {
  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    domain: input.domain,
    seriesIds: input.seriesIds,
  };
}

export function defaultExecutiveCharts(
  series: readonly DomainMetricSeries[],
): readonly ChartSpec[] {
  const byDomain = (domain: ChartSpec["domain"]) =>
    series.filter((s) => s.domain === domain).map((s) => s.id);

  return [
    buildChartSpec({
      id: "chart_revenue",
      kind: "line",
      title: "Revenue trend",
      domain: "finance",
      seriesIds: byDomain("finance").slice(0, 1),
    }),
    buildChartSpec({
      id: "chart_pipeline",
      kind: "bar",
      title: "CRM pipeline",
      domain: "crm",
      seriesIds: byDomain("crm").slice(0, 1),
    }),
    buildChartSpec({
      id: "chart_workflows",
      kind: "area",
      title: "Workflow activity",
      domain: "workflow",
      seriesIds: byDomain("workflow").slice(0, 1),
    }),
    buildChartSpec({
      id: "chart_ai",
      kind: "pie",
      title: "AI activity mix",
      domain: "ai",
      seriesIds: byDomain("ai"),
    }),
    buildChartSpec({
      id: "chart_ops_table",
      kind: "table",
      title: "Operational snapshot",
      domain: "executive",
      seriesIds: series.slice(0, 4).map((s) => s.id),
    }),
    buildChartSpec({
      id: "chart_heatmap_placeholder",
      kind: "heatmap",
      title: "Engagement heatmap",
      domain: "crm",
      seriesIds: byDomain("crm"),
    }),
  ];
}

/** Pure helpers for rendering without chart libraries. */
export function normalizeSeries(
  points: readonly { readonly t: string; readonly v: number }[],
): readonly { readonly t: string; readonly v: number; readonly pct: number }[] {
  const max = Math.max(...points.map((p) => p.v), 1);
  return points.map((p) => ({
    ...p,
    pct: Math.round((p.v / max) * 100),
  }));
}
