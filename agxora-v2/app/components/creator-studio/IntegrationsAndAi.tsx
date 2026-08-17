"use client";

import type { JSX } from "react";
import type { AiFeaturePlan, PlatformIntegrationPlan } from "../../lib/creator-studio";
import { integrationLabel } from "../../lib/creator-studio";
import { catalogCopy, useT } from "../../lib/i18n";
import { Badge, Card } from "../ui";

export function FutureIntegrations({
  platforms,
}: {
  readonly platforms: readonly PlatformIntegrationPlan[];
}): JSX.Element {
  const t = useT();

  return (
    <Card padding="24px">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("creator.integrations.lead")}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
              <div>
                <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {platform.platform}
                </h3>
                <p
                  className="mt-1 text-xs uppercase tracking-[0.12em]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {catalogCopy(t, `creator.categories.${platform.category}`, platform.category)}
                </p>
              </div>
              <Badge tone="warning">{t(integrationLabel(platform.status))}</Badge>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("creator.integrations.adapter")}{" "}
              <span style={{ color: "var(--agx-text, #f8fafc)" }}>{platform.adapter}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {catalogCopy(t, `creator.platforms.${platform.id}.notes`, platform.notes)}
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function AiFeaturesPanel({
  features,
}: {
  readonly features: readonly AiFeaturePlan[];
}): JSX.Element {
  const t = useT();

  return (
    <Card padding="24px">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("creator.aiFeaturesPanel.lead")}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.id}
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {catalogCopy(t, `creator.features.${feature.id}.label`, feature.label)}
              </h3>
              <Badge tone={feature.status === "ready" ? "accent" : "warning"}>
                {t(integrationLabel(feature.status))}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {catalogCopy(t, `creator.features.${feature.id}.description`, feature.description)}
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}
