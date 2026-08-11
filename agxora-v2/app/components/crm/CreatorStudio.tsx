"use client";

import type { JSX } from "react";
import type { CreatorPlatformPlan } from "../../lib/crm";
import { integrationLabel } from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

export function CreatorStudio({
  platforms,
}: {
  readonly platforms: readonly CreatorPlatformPlan[];
}): JSX.Element {
  const { t } = useLocale();

  return (
    <CrmGlassCard padding="p-5">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("crm.creatorStudio.intro")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {platforms.map((platform) => (
          <article
            key={platform.id}
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {platform.platform}
              </h3>
              <CrmBadge tone="warning">{t(integrationLabel(platform.status))}</CrmBadge>
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {platform.adapter}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {platform.capabilities.map((cap) => (
                <CrmBadge key={cap}>{cap}</CrmBadge>
              ))}
            </div>
          </article>
        ))}
      </div>
    </CrmGlassCard>
  );
}
