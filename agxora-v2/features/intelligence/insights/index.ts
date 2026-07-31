/**
 * AI Insights architecture — trends, patterns, recommendations, risks.
 */

import type { AiInsight, InsightKind } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

const INSIGHTS: readonly {
  kind: InsightKind;
  title: string;
  summary: string;
  confidence: number;
  domain: AiInsight["domain"];
}[] = [
  {
    kind: "trend",
    title: "MRR accelerating",
    summary: "MRR growth improved for three consecutive periods.",
    confidence: 0.81,
    domain: "finance",
  },
  {
    kind: "pattern",
    title: "Workflow spikes on invoice days",
    summary: "Automation load correlates with month-end invoice issuance.",
    confidence: 0.74,
    domain: "workflow",
  },
  {
    kind: "recommendation",
    title: "Expand retention playbook",
    summary: "Focus CSM outreach on three accounts with declining health.",
    confidence: 0.77,
    domain: "crm",
  },
  {
    kind: "executive_summary",
    title: "Executive brief",
    summary:
      "Company health is strong; watch churn risk and project delays in delivery.",
    confidence: 0.79,
    domain: "executive",
  },
  {
    kind: "risk",
    title: "Delivery risk cluster",
    summary: "Two projects share resource contention — capacity forecast elevated.",
    confidence: 0.7,
    domain: "projects",
  },
  {
    kind: "opportunity",
    title: "Upsell opportunity",
    summary: "High-usage accounts without Business plan show expansion potential.",
    confidence: 0.73,
    domain: "crm",
  },
];

export function seedInsights(organizationId: string): readonly AiInsight[] {
  return INSIGHTS.map((i) => ({
    id: createId("insight"),
    organizationId,
    kind: i.kind,
    title: i.title,
    summary: i.summary,
    confidence: i.confidence,
    domain: i.domain,
    createdAt: new Date().toISOString(),
  }));
}
