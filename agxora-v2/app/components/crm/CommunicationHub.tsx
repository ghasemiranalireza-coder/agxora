"use client";

import type { JSX } from "react";
import type { ChannelAdapterPlan } from "../../lib/crm";
import { integrationLabel } from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

function statusTone(
  status: ChannelAdapterPlan["status"],
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "connected":
      return "positive";
    case "ready":
      return "accent";
    case "planned":
      return "warning";
    default:
      return "default";
  }
}

export function CommunicationHub({
  channels,
}: {
  readonly channels: readonly ChannelAdapterPlan[];
}): JSX.Element {
  const { t } = useLocale();

  return (
    <CrmGlassCard padding="p-5">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("crm.communication.intro")}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {channels.map((channel) => (
          <article
            key={channel.id}
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {channel.channel}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {channel.category}
                </p>
              </div>
              <CrmBadge tone={statusTone(channel.status)}>
                {t(integrationLabel(channel.status))}
              </CrmBadge>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("crm.communication.adapterPrefix")}{" "}
              <span style={{ color: "var(--agx-text, #f8fafc)" }}>{channel.adapter}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {channel.notes}
            </p>
          </article>
        ))}
      </div>
    </CrmGlassCard>
  );
}
