/**
 * AGXORA Enterprise Intelligence Center — domain types (Phase 28).
 * Analytics never depend on UI; repository-driven and backend-ready.
 */

export type AnalyticsDomain =
  | "crm"
  | "projects"
  | "finance"
  | "documents"
  | "workflow"
  | "identity"
  | "ai"
  | "integration"
  | "executive";

export type KpiId =
  | "revenue"
  | "mrr"
  | "arr"
  | "growth"
  | "customer_acquisition"
  | "retention"
  | "churn"
  | "project_success"
  | "workflow_success"
  | "agent_performance"
  | "automation_success"
  | "custom";

export type KpiFormat = "currency" | "percent" | "number" | "score";

export type KpiTrend = "up" | "down" | "flat";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertKind =
  | "revenue_drop"
  | "project_delay"
  | "churn_risk"
  | "workflow_failure"
  | "ai_failure"
  | "integration_error"
  | "security";

export type ScorecardId =
  | "sales"
  | "customer_health"
  | "project_success"
  | "automation_efficiency"
  | "ai_quality"
  | "operational_health";

export type ReportKind =
  | "executive"
  | "department"
  | "operational"
  | "management";

export type ForecastKind =
  | "revenue"
  | "customer"
  | "project"
  | "capacity"
  | "growth";

export type ChartKind =
  | "line"
  | "bar"
  | "area"
  | "pie"
  | "heatmap"
  | "table"
  | "card";

export type InsightKind =
  | "trend"
  | "pattern"
  | "recommendation"
  | "executive_summary"
  | "risk"
  | "opportunity";

export type IntelligencePermission =
  | "intelligence.read"
  | "intelligence.export"
  | "intelligence.admin"
  | "intelligence.executive";

export interface AnalyticsFilter {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly workspaceId?: string;
  readonly organizationId?: string;
  readonly departmentId?: string;
  readonly customerId?: string;
  readonly projectId?: string;
  readonly userId?: string;
  readonly domains?: readonly AnalyticsDomain[];
  readonly customGroups?: Readonly<Record<string, string>>;
}

export interface KpiDefinition {
  readonly id: KpiId;
  readonly name: string;
  readonly description: string;
  readonly domain: AnalyticsDomain;
  readonly format: KpiFormat;
  readonly unit?: string;
  readonly configurable: boolean;
  readonly higherIsBetter: boolean;
}

export interface KpiSnapshot {
  readonly kpiId: KpiId;
  readonly organizationId: string;
  readonly value: number;
  readonly previousValue?: number;
  readonly deltaPercent?: number;
  readonly trend: KpiTrend;
  readonly asOf: string;
  readonly target?: number;
}

export interface DomainMetricSeries {
  readonly id: string;
  readonly domain: AnalyticsDomain;
  readonly label: string;
  readonly points: readonly { readonly t: string; readonly v: number }[];
}

export interface BusinessHealthScore {
  readonly organizationId: string;
  readonly overall: number;
  readonly revenue: number;
  readonly customers: number;
  readonly projects: number;
  readonly workflows: number;
  readonly ai: number;
  readonly finance: number;
  readonly operations: number;
  readonly risk: number;
  readonly growth: number;
  readonly asOf: string;
}

export interface IntelligenceAlert {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: AlertKind;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly body: string;
  readonly domain: AnalyticsDomain;
  readonly acknowledged: boolean;
  readonly createdAt: string;
}

export interface Scorecard {
  readonly id: ScorecardId;
  readonly organizationId: string;
  readonly name: string;
  readonly score: number;
  readonly bands: readonly { readonly label: string; readonly max: number }[];
  readonly drivers: readonly { readonly label: string; readonly value: number }[];
  readonly asOf: string;
}

export interface ReportDefinition {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: ReportKind;
  readonly title: string;
  readonly description: string;
  readonly domains: readonly AnalyticsDomain[];
  readonly scheduleCron?: string;
  readonly exportFormats: readonly ("pdf" | "csv" | "xlsx")[];
  readonly createdAt: string;
}

export interface ForecastPlaceholder {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: ForecastKind;
  readonly horizonDays: number;
  readonly baseline: number;
  readonly projected: number;
  readonly confidence: number;
  readonly note: string;
  readonly asOf: string;
}

export interface AiInsight {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: InsightKind;
  readonly title: string;
  readonly summary: string;
  readonly confidence: number;
  readonly domain: AnalyticsDomain;
  readonly createdAt: string;
}

export interface DataExplorerRow {
  readonly id: string;
  readonly domain: AnalyticsDomain;
  readonly entity: string;
  readonly dimension: string;
  readonly measure: number;
  readonly label: string;
  readonly at: string;
}

export interface ChartSpec {
  readonly id: string;
  readonly kind: ChartKind;
  readonly title: string;
  readonly domain: AnalyticsDomain;
  readonly seriesIds: readonly string[];
}

export interface ObservabilitySnapshot {
  readonly organizationId: string;
  readonly businessMetricsCount: number;
  readonly usageEvents24h: number;
  readonly avgQueryMs: number;
  readonly systemHealth: number;
  readonly errorCount24h: number;
  readonly asOf: string;
}

export interface IntelligenceSettings {
  readonly organizationId: string;
  readonly defaultDateRangeDays: number;
  readonly executiveOnlyKpis: boolean;
  readonly enableAiInsights: boolean;
  readonly refreshIntervalSec: number;
}

export const DEFAULT_INTELLIGENCE_SETTINGS: Omit<
  IntelligenceSettings,
  "organizationId"
> = {
  defaultDateRangeDays: 30,
  executiveOnlyKpis: false,
  enableAiInsights: true,
  refreshIntervalSec: 60,
};
