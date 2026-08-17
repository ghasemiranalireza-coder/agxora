"use client";

import type { JSX } from "react";
import { useT } from "@/app/lib/i18n";
import type { IntegrationPlan } from "../../lib/automation";
import { Badge, Card } from "../ui";
import { IntegrationStatusBadge } from "./shared/StatusAndDialog";

export function AutomationIntegrations({
  integrations,
}: {
  readonly integrations: readonly IntegrationPlan[];
}): JSX.Element {
  const t = useT();

  return (
    <Card padding="24px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("automation.integrations.intro")}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border p-4 transition-colors hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_28%,transparent)]"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
              opacity: item.status === "disabled" ? 0.7 : 1,
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
              <IntegrationStatusBadge status={item.status} />
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("automation.integrations.category")}{" "}
              <span style={{ color: "var(--agx-text, #f8fafc)" }}>{item.category}</span>
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("automation.integrations.reservedAdapter")}{" "}
              <span className="font-mono" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {item.adapter}
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              <span className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("automation.integrations.description")}{" "}
              </span>
              {item.notes}
            </p>
            <div className="mt-3">
              <Badge>{item.category}</Badge>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
