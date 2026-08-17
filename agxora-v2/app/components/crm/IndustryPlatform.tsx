"use client";

import type { JSX } from "react";
import type { IndustryModulePlan } from "../../lib/crm";
import { integrationLabel } from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

function moduleSlug(mod: string): string {
  return mod
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function IndustryPlatform({
  industries,
}: {
  readonly industries: readonly IndustryModulePlan[];
}): JSX.Element {
  const { t } = useLocale();

  return (
    <CrmGlassCard padding="p-5">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("crm.industry.intro")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {industries.map((industry) => (
          <article
            key={industry.key}
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t(`crm.industry.catalog.${industry.key}.label`)}
              </h3>
              <CrmBadge tone={industry.status === "ready" ? "accent" : "warning"}>
                {t(integrationLabel(industry.status))}
              </CrmBadge>
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t(`crm.industry.catalog.${industry.key}.description`)}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {industry.plannedModules.map((mod) => (
                <CrmBadge key={mod}>{t(`crm.industry.modules.${moduleSlug(mod)}`)}</CrmBadge>
              ))}
            </div>
          </article>
        ))}
      </div>
    </CrmGlassCard>
  );
}
