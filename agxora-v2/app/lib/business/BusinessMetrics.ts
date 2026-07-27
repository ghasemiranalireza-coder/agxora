/**
 * Universal business metrics — every organization shares this scoreboard.
 * Industry templates add specialized KPI overlays on top.
 */

import type { BusinessType } from "./BusinessType";

export type UniversalMetricKey =
  | "revenue"
  | "profit"
  | "expenses"
  | "growth"
  | "customers"
  | "orders"
  | "invoices"
  | "tasks"
  | "employees"
  | "automationPercent"
  | "aiUsage"
  | "riskScore"
  | "healthScore";

export interface MetricDefinition {
  readonly key: string;
  readonly label: string;
  readonly unit: "currency" | "count" | "percent" | "score" | "ratio";
  readonly description: string;
  readonly higherIsBetter: boolean;
}

export interface MetricValue {
  readonly key: string;
  readonly value: number;
  readonly previousValue?: number;
  readonly updatedAt: string;
}

export interface BusinessMetricSnapshot {
  readonly organizationId: string;
  readonly businessType: BusinessType;
  readonly universal: Readonly<Record<UniversalMetricKey, number>>;
  readonly specialized: readonly MetricValue[];
  readonly generatedAt: string;
}

export const UNIVERSAL_METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  { key: "revenue", label: "Revenue", unit: "currency", description: "Top-line revenue", higherIsBetter: true },
  { key: "profit", label: "Profit", unit: "currency", description: "Net profit", higherIsBetter: true },
  { key: "expenses", label: "Expenses", unit: "currency", description: "Operating expenses", higherIsBetter: false },
  { key: "growth", label: "Growth", unit: "percent", description: "Period-over-period growth", higherIsBetter: true },
  { key: "customers", label: "Customers", unit: "count", description: "Active customers", higherIsBetter: true },
  { key: "orders", label: "Orders", unit: "count", description: "Orders / bookings", higherIsBetter: true },
  { key: "invoices", label: "Invoices", unit: "count", description: "Open + paid invoices", higherIsBetter: true },
  { key: "tasks", label: "Tasks", unit: "count", description: "Open operational tasks", higherIsBetter: false },
  { key: "employees", label: "Employees", unit: "count", description: "Active workforce", higherIsBetter: true },
  { key: "automationPercent", label: "Automation %", unit: "percent", description: "Automated process coverage", higherIsBetter: true },
  { key: "aiUsage", label: "AI Usage", unit: "count", description: "AI interactions in period", higherIsBetter: true },
  { key: "riskScore", label: "Risk Score", unit: "score", description: "Operational / compliance risk (0-100)", higherIsBetter: false },
  { key: "healthScore", label: "Health Score", unit: "score", description: "Overall business health (0-100)", higherIsBetter: true },
] as const;

/** Industry-specific KPI overlays used by the Business Brain. */
export const SPECIALIZED_METRICS: Readonly<
  Record<BusinessType, readonly MetricDefinition[]>
> = {
  hotel: [
    { key: "occupancy", label: "Occupancy", unit: "percent", description: "Rooms occupied", higherIsBetter: true },
    { key: "adr", label: "ADR", unit: "currency", description: "Average daily rate", higherIsBetter: true },
    { key: "revpar", label: "RevPAR", unit: "currency", description: "Revenue per available room", higherIsBetter: true },
  ],
  restaurant: [
    { key: "foodCost", label: "Food Cost %", unit: "percent", description: "Cost of goods / food sales", higherIsBetter: false },
    { key: "covers", label: "Covers", unit: "count", description: "Guests served", higherIsBetter: true },
    { key: "ticketTime", label: "Ticket Time", unit: "ratio", description: "Average kitchen ticket minutes", higherIsBetter: false },
  ],
  laundry: [
    { key: "plantUtilization", label: "Plant Utilization", unit: "percent", description: "Machine capacity used", higherIsBetter: true },
    { key: "onTimeDelivery", label: "On-Time Delivery", unit: "percent", description: "Routes delivered on SLA", higherIsBetter: true },
    { key: "chemicalUsage", label: "Chemical Usage", unit: "ratio", description: "Chemical cost efficiency", higherIsBetter: false },
  ],
  cleaning: [
    { key: "jobsCompleted", label: "Jobs Completed", unit: "count", description: "Cleaning jobs finished", higherIsBetter: true },
    { key: "reworkRate", label: "Rework Rate", unit: "percent", description: "Jobs requiring return visits", higherIsBetter: false },
  ],
  medical: [
    { key: "noShowRate", label: "No-Show Rate", unit: "percent", description: "Missed appointments", higherIsBetter: false },
    { key: "panelLoad", label: "Panel Load", unit: "ratio", description: "Patients per practitioner", higherIsBetter: false },
  ],
  healthcare: [
    { key: "patientThroughput", label: "Patient Throughput", unit: "count", description: "Encounters in period", higherIsBetter: true },
    { key: "readmissionRisk", label: "Readmission Risk", unit: "score", description: "Care continuity risk", higherIsBetter: false },
  ],
  legal: [
    { key: "matterAging", label: "Matter Aging", unit: "ratio", description: "Average matter age (days)", higherIsBetter: false },
    { key: "realization", label: "Realization", unit: "percent", description: "Billed vs worked", higherIsBetter: true },
  ],
  manufacturing: [
    { key: "yield", label: "Yield", unit: "percent", description: "Good units / total", higherIsBetter: true },
    { key: "downtime", label: "Downtime", unit: "percent", description: "Unplanned downtime", higherIsBetter: false },
    { key: "scrapRate", label: "Scrap Rate", unit: "percent", description: "Scrap / waste rate", higherIsBetter: false },
  ],
  retail: [
    { key: "sellThrough", label: "Sell-Through", unit: "percent", description: "Units sold / received", higherIsBetter: true },
    { key: "basketSize", label: "Basket Size", unit: "currency", description: "Average transaction value", higherIsBetter: true },
  ],
  logistics: [
    { key: "onTimeRate", label: "On-Time Rate", unit: "percent", description: "Deliveries on schedule", higherIsBetter: true },
    { key: "costPerMile", label: "Cost / Mile", unit: "currency", description: "Transport cost efficiency", higherIsBetter: false },
  ],
  warehouse: [
    { key: "inventoryTurns", label: "Inventory Turns", unit: "ratio", description: "Stock turnover", higherIsBetter: true },
    { key: "pickAccuracy", label: "Pick Accuracy", unit: "percent", description: "Correct picks", higherIsBetter: true },
  ],
  construction: [
    { key: "jobMargin", label: "Job Margin", unit: "percent", description: "Project profitability", higherIsBetter: true },
    { key: "scheduleVariance", label: "Schedule Variance", unit: "percent", description: "Delay vs plan", higherIsBetter: false },
  ],
  consulting: [
    { key: "utilization", label: "Utilization", unit: "percent", description: "Billable utilization", higherIsBetter: true },
    { key: "engagementHealth", label: "Engagement Health", unit: "score", description: "Client engagement score", higherIsBetter: true },
  ],
  agency: [
    { key: "retainerHealth", label: "Retainer Health", unit: "score", description: "Retainer renewal outlook", higherIsBetter: true },
    { key: "campaignRoi", label: "Campaign ROI", unit: "ratio", description: "Campaign return", higherIsBetter: true },
  ],
  real_estate: [
    { key: "daysOnMarket", label: "Days on Market", unit: "ratio", description: "Average listing age", higherIsBetter: false },
    { key: "showingConversion", label: "Showing Conversion", unit: "percent", description: "Showings to offers", higherIsBetter: true },
  ],
  education: [
    { key: "enrollment", label: "Enrollment", unit: "count", description: "Active learners", higherIsBetter: true },
    { key: "completionRate", label: "Completion Rate", unit: "percent", description: "Program completion", higherIsBetter: true },
  ],
  automotive: [
    { key: "lotTurn", label: "Lot Turn", unit: "ratio", description: "Vehicle inventory turns", higherIsBetter: true },
    { key: "serviceAbsorption", label: "Service Absorption", unit: "percent", description: "Service covers overhead", higherIsBetter: true },
  ],
  beauty: [
    { key: "rebookingRate", label: "Rebooking Rate", unit: "percent", description: "Clients who rebook", higherIsBetter: true },
    { key: "chairUtilization", label: "Chair Utilization", unit: "percent", description: "Station utilization", higherIsBetter: true },
  ],
  fitness: [
    { key: "memberRetention", label: "Member Retention", unit: "percent", description: "Membership retention", higherIsBetter: true },
    { key: "classFill", label: "Class Fill", unit: "percent", description: "Class capacity filled", higherIsBetter: true },
  ],
  agriculture: [
    { key: "yieldPerAcre", label: "Yield / Acre", unit: "ratio", description: "Production efficiency", higherIsBetter: true },
    { key: "inputCost", label: "Input Cost", unit: "currency", description: "Seed/feed/chemical spend", higherIsBetter: false },
  ],
  transport: [
    { key: "fleetUtilization", label: "Fleet Utilization", unit: "percent", description: "Active fleet usage", higherIsBetter: true },
    { key: "otp", label: "On-Time Performance", unit: "percent", description: "Schedule adherence", higherIsBetter: true },
  ],
  insurance: [
    { key: "lossRatio", label: "Loss Ratio", unit: "percent", description: "Claims vs premiums", higherIsBetter: false },
    { key: "policyRetention", label: "Policy Retention", unit: "percent", description: "Renewed policies", higherIsBetter: true },
  ],
  finance: [
    { key: "aum", label: "AUM", unit: "currency", description: "Assets under management", higherIsBetter: true },
    { key: "nplRatio", label: "NPL Ratio", unit: "percent", description: "Non-performing exposure", higherIsBetter: false },
  ],
  financial_services: [
    { key: "clientAum", label: "Client AUM", unit: "currency", description: "Advised assets", higherIsBetter: true },
    { key: "complianceScore", label: "Compliance Score", unit: "score", description: "Regulatory readiness", higherIsBetter: true },
  ],
  technology: [
    { key: "releaseCadence", label: "Release Cadence", unit: "ratio", description: "Releases per period", higherIsBetter: true },
    { key: "uptime", label: "Uptime", unit: "percent", description: "Service availability", higherIsBetter: true },
  ],
  saas: [
    { key: "nrr", label: "NRR", unit: "percent", description: "Net revenue retention", higherIsBetter: true },
    { key: "churn", label: "Churn", unit: "percent", description: "Logo / revenue churn", higherIsBetter: false },
  ],
  ecommerce: [
    { key: "conversionRate", label: "Conversion Rate", unit: "percent", description: "Visits to orders", higherIsBetter: true },
    { key: "ltv", label: "LTV", unit: "currency", description: "Customer lifetime value", higherIsBetter: true },
  ],
  accounting: [
    { key: "realization", label: "Realization", unit: "percent", description: "Billed vs standard", higherIsBetter: true },
    { key: "filingOnTime", label: "Filing On-Time", unit: "percent", description: "Deadlines met", higherIsBetter: true },
  ],
  freelancer: [
    { key: "pipelineValue", label: "Pipeline Value", unit: "currency", description: "Open opportunity value", higherIsBetter: true },
    { key: "utilization", label: "Utilization", unit: "percent", description: "Billable time share", higherIsBetter: true },
  ],
  government: [
    { key: "serviceLevel", label: "Service Level", unit: "percent", description: "SLA attainment", higherIsBetter: true },
    { key: "constituentSatisfaction", label: "Constituent Satisfaction", unit: "score", description: "Public satisfaction", higherIsBetter: true },
  ],
  nonprofit: [
    { key: "donorRetention", label: "Donor Retention", unit: "percent", description: "Repeat donors", higherIsBetter: true },
    { key: "programEfficiency", label: "Program Efficiency", unit: "percent", description: "Program spend ratio", higherIsBetter: true },
  ],
};

export function getSpecializedMetrics(
  type: BusinessType,
): readonly MetricDefinition[] {
  return SPECIALIZED_METRICS[type] ?? [];
}

export function createEmptyUniversalMetrics(): Record<UniversalMetricKey, number> {
  return {
    revenue: 0,
    profit: 0,
    expenses: 0,
    growth: 0,
    customers: 0,
    orders: 0,
    invoices: 0,
    tasks: 0,
    employees: 0,
    automationPercent: 0,
    aiUsage: 0,
    riskScore: 20,
    healthScore: 70,
  };
}

export function createMetricSnapshot(input: {
  organizationId: string;
  businessType: BusinessType;
  universal?: Partial<Record<UniversalMetricKey, number>>;
  specialized?: readonly MetricValue[];
}): BusinessMetricSnapshot {
  return {
    organizationId: input.organizationId,
    businessType: input.businessType,
    universal: {
      ...createEmptyUniversalMetrics(),
      ...input.universal,
    },
    specialized: input.specialized ?? [],
    generatedAt: new Date().toISOString(),
  };
}
