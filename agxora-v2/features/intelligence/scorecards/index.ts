/**
 * Scorecard engine — reusable business health scorecards.
 */

import type { Scorecard, ScorecardId } from "../types";

const BANDS = [
  { label: "Critical", max: 50 },
  { label: "Watch", max: 70 },
  { label: "Healthy", max: 85 },
  { label: "Excellent", max: 100 },
] as const;

function card(
  organizationId: string,
  id: ScorecardId,
  name: string,
  score: number,
  drivers: Scorecard["drivers"],
): Scorecard {
  return {
    id,
    organizationId,
    name,
    score,
    bands: BANDS,
    drivers,
    asOf: new Date().toISOString(),
  };
}

export function seedScorecards(organizationId: string): readonly Scorecard[] {
  return [
    card(organizationId, "sales", "Sales Score", 84, [
      { label: "Pipeline coverage", value: 88 },
      { label: "Win rate", value: 79 },
      { label: "Cycle time", value: 82 },
    ]),
    card(organizationId, "customer_health", "Customer Health Score", 91, [
      { label: "Retention", value: 94 },
      { label: "NPS proxy", value: 86 },
      { label: "Support load", value: 90 },
    ]),
    card(organizationId, "project_success", "Project Success Score", 87, [
      { label: "On-time delivery", value: 88 },
      { label: "Scope control", value: 85 },
      { label: "Utilization", value: 86 },
    ]),
    card(organizationId, "automation_efficiency", "Automation Efficiency", 93, [
      { label: "Workflow success", value: 97 },
      { label: "Manual effort saved", value: 90 },
      { label: "Retry rate", value: 92 },
    ]),
    card(organizationId, "ai_quality", "AI Quality", 86, [
      { label: "Task success", value: 86 },
      { label: "Confidence avg", value: 84 },
      { label: "Escalation rate", value: 88 },
    ]),
    card(organizationId, "operational_health", "Operational Health", 89, [
      { label: "System health", value: 96 },
      { label: "Integration reliability", value: 95 },
      { label: "Identity posture", value: 90 },
    ]),
  ];
}
