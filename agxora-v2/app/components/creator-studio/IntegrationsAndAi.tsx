"use client";

import type { JSX } from "react";
import type { AiFeaturePlan, PlatformIntegrationPlan } from "../../lib/creator-studio";
import { integrationLabel } from "../../lib/creator-studio";
import { Badge, Card } from "../ui";

export function FutureIntegrations({
  platforms,
}: {
  readonly platforms: readonly PlatformIntegrationPlan[];
}): JSX.Element {
  return (
    <Card padding="20px">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Future integrations — optional. No live APIs until connected. Instagram, TikTok, YouTube,
        Facebook, LinkedIn, Pinterest, Threads, X, Meta Business, Google Ads, Google Analytics.
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
                  {platform.category}
                </p>
              </div>
              <Badge tone="warning">{integrationLabel(platform.status)}</Badge>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Adapter: <span style={{ color: "var(--agx-text, #f8fafc)" }}>{platform.adapter}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {platform.notes}
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
  return (
    <Card padding="20px">
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        AI feature map — ideas, captions, hashtags, calendar, campaigns, audience, schedule, brand
        consistency, rewrite, translate, multi-language.
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
                {feature.label}
              </h3>
              <Badge tone={feature.status === "ready" ? "accent" : "warning"}>
                {integrationLabel(feature.status)}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </Card>
  );
}
