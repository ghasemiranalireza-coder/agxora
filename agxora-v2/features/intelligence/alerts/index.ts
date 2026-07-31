/**
 * Alert engine — architecture for business risk signals.
 */

import type { AlertKind, AlertSeverity, IntelligenceAlert } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

const ALERT_DEFS: readonly {
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  body: string;
  domain: IntelligenceAlert["domain"];
}[] = [
  {
    kind: "revenue_drop",
    severity: "warning",
    title: "Revenue softening in segment",
    body: "Week-over-week revenue dipped 4% in SMB — review pipeline coverage.",
    domain: "finance",
  },
  {
    kind: "project_delay",
    severity: "warning",
    title: "Project at risk of delay",
    body: "Two delivery projects slipped past milestone gates.",
    domain: "projects",
  },
  {
    kind: "churn_risk",
    severity: "critical",
    title: "Customer churn risk elevated",
    body: "Three accounts show declining engagement scores.",
    domain: "crm",
  },
  {
    kind: "workflow_failure",
    severity: "warning",
    title: "Workflow failures detected",
    body: "Invoice reminder workflow failed twice in 24h.",
    domain: "workflow",
  },
  {
    kind: "ai_failure",
    severity: "info",
    title: "AI task retries elevated",
    body: "Agent task retry rate crossed soft threshold.",
    domain: "ai",
  },
  {
    kind: "integration_error",
    severity: "warning",
    title: "Integration errors",
    body: "Slack connector returned intermittent 5xx responses.",
    domain: "integration",
  },
  {
    kind: "security",
    severity: "critical",
    title: "Security alert",
    body: "Unusual API key usage pattern detected (placeholder).",
    domain: "identity",
  },
];

export function seedAlerts(organizationId: string): readonly IntelligenceAlert[] {
  return ALERT_DEFS.map((d) => ({
    id: createId("ialert"),
    organizationId,
    kind: d.kind,
    severity: d.severity,
    title: d.title,
    body: d.body,
    domain: d.domain,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  }));
}

export function acknowledgeAlert(
  alert: IntelligenceAlert,
): IntelligenceAlert {
  return { ...alert, acknowledged: true };
}
