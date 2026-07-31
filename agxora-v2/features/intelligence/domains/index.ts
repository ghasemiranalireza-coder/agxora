/**
 * Domain analytics providers — each module exposes metrics independently of UI.
 */

import type {
  AnalyticsDomain,
  DomainMetricSeries,
} from "../types";

export interface DomainAnalyticsProvider {
  readonly domain: AnalyticsDomain;
  readonly label: string;
  series(organizationId: string): readonly DomainMetricSeries[];
}

function days(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function series(
  id: string,
  domain: AnalyticsDomain,
  label: string,
  values: readonly number[],
): DomainMetricSeries {
  return {
    id,
    domain,
    label,
    points: values.map((v, i) => ({ t: days(values.length - 1 - i), v })),
  };
}

function makeProvider(
  domain: AnalyticsDomain,
  label: string,
  build: (organizationId: string) => readonly DomainMetricSeries[],
): DomainAnalyticsProvider {
  return { domain, label, series: build };
}

const providers: DomainAnalyticsProvider[] = [
  makeProvider("crm", "CRM Analytics", () => [
    series("crm_leads", "crm", "Leads", [18, 22, 19, 25, 28, 31, 42]),
    series("crm_pipeline", "crm", "Pipeline ($k)", [120, 132, 128, 145, 160, 172, 190]),
  ]),
  makeProvider("projects", "Projects Analytics", () => [
    series("proj_active", "projects", "Active projects", [8, 9, 9, 10, 11, 12, 12]),
    series("proj_on_time", "projects", "On-time %", [82, 84, 83, 86, 87, 88, 88]),
  ]),
  makeProvider("finance", "Finance Analytics", () => [
    series("fin_revenue", "finance", "Revenue ($k)", [62, 65, 64, 70, 74, 78, 82]),
    series("fin_margin", "finance", "Gross margin %", [41, 42, 42, 43, 44, 44, 45]),
  ]),
  makeProvider("documents", "Documents Analytics", () => [
    series("doc_created", "documents", "Documents created", [14, 16, 15, 18, 20, 22, 25]),
    series("doc_views", "documents", "Document views", [210, 230, 240, 260, 280, 300, 320]),
  ]),
  makeProvider("workflow", "Workflow Analytics", () => [
    series("wf_runs", "workflow", "Workflow runs", [40, 44, 42, 48, 52, 55, 60]),
    series("wf_success", "workflow", "Success %", [95, 96, 95, 97, 97, 97, 97.4]),
  ]),
  makeProvider("identity", "Identity Analytics", () => [
    series("id_users", "identity", "Active users", [24, 25, 26, 27, 28, 29, 30]),
    series("id_sessions", "identity", "Sessions", [110, 120, 118, 130, 140, 145, 150]),
  ]),
  makeProvider("ai", "AI Analytics", () => [
    series("ai_tasks", "ai", "Agent tasks", [12, 15, 14, 18, 20, 22, 25]),
    series("ai_success", "ai", "Agent success %", [80, 82, 81, 84, 85, 86, 86]),
  ]),
  makeProvider("integration", "Integration Analytics", () => [
    series("int_calls", "integration", "API / webhook calls", [800, 820, 810, 860, 900, 940, 980]),
    series("int_errors", "integration", "Integration errors", [6, 5, 7, 4, 3, 4, 3]),
  ]),
];

export function listDomainProviders(): readonly DomainAnalyticsProvider[] {
  return providers;
}

export function getDomainProvider(
  domain: AnalyticsDomain,
): DomainAnalyticsProvider | undefined {
  return providers.find((p) => p.domain === domain);
}

export function registerDomainProvider(provider: DomainAnalyticsProvider): void {
  const idx = providers.findIndex((p) => p.domain === provider.domain);
  if (idx >= 0) providers[idx] = provider;
  else providers.push(provider);
}

export function collectAllSeries(
  organizationId: string,
): readonly DomainMetricSeries[] {
  return providers.flatMap((p) => p.series(organizationId));
}
