"use client";

import type { JSX } from "react";
import type { IntegrationPlan } from "../../lib/automation";
import { integrationLabel } from "../../lib/automation";
import { Badge, Card } from "../ui";

export function AutomationIntegrations({
  integrations,
}: {
  readonly integrations: readonly IntegrationPlan[];
}): JSX.Element {
  return (
    <Card padding="20px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Future integrations — architecture only. No fake APIs. Google Workspace, Microsoft 365,
        Slack, Teams, Discord, WhatsApp Business, Stripe, Shopify, DATEV, SAP, HubSpot, Salesforce.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {item.name}
                </h3>
                <p
                  className="mt-1 text-xs uppercase tracking-[0.12em]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {item.category}
                </p>
              </div>
              <Badge tone="warning">{integrationLabel(item.status)}</Badge>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Adapter: <span style={{ color: "var(--agx-text, #f8fafc)" }}>{item.adapter}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {item.notes}
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}
