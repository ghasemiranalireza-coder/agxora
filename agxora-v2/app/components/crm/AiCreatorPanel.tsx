"use client";

import type { JSX } from "react";
import type { AiCreatorCapability } from "../../lib/crm";
import { integrationLabel } from "../../lib/crm";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

export function AiCreatorPanel({
  capabilities,
}: {
  readonly capabilities: readonly AiCreatorCapability[];
}): JSX.Element {
  return (
    <CrmGlassCard padding="p-5">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Future-ready AI Creator surface — ideas, captions, hashtags, calendar, campaigns, brand
        voice, image/video generation, analytics, scheduling, publishing queue, and insights.
        No real provider APIs wired yet.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((cap) => (
          <article
            key={cap.id}
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {cap.label}
              </h3>
              <CrmBadge tone={cap.status === "ready" ? "accent" : "warning"}>
                {integrationLabel(cap.status)}
              </CrmBadge>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {cap.description}
            </p>
          </article>
        ))}
      </div>
    </CrmGlassCard>
  );
}
