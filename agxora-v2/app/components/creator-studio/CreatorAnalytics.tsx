"use client";

import type { JSX } from "react";
import type { AnalyticsMetric, TopPost } from "../../lib/creator-studio";
import { useT } from "../../lib/i18n";
import { Badge, Card } from "../ui";

export function CreatorAnalytics({
  metrics,
  topPosts,
  recommendations,
}: {
  readonly metrics: readonly AnalyticsMetric[];
  readonly topPosts: readonly TopPost[];
  readonly recommendations: readonly string[];
}): JSX.Element {
  const t = useT();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-3 space-y-4" padding="24px">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("creator.analytics.title")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="rounded-2xl border p-4"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {metric.label}
              </p>
              <p
                className="mt-2 text-xl font-semibold tabular-nums"
                style={{ color: "var(--agx-text, #f8fafc)" }}
              >
                {metric.value}
              </p>
              <p
                className="mt-1 text-xs tabular-nums"
                style={{ color: metric.positive ? "#34d399" : "#fb7185" }}
              >
                {metric.change}
              </p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("creator.analytics.topPosts")}
          </h4>
          <ul className="space-y-2">
            {topPosts.map((post) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div>
                  <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {post.title}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {post.platform}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone="accent">
                    {t("creator.analytics.engagement", { value: post.engagement })}
                  </Badge>
                  <Badge>{t("creator.analytics.reach", { value: post.reach })}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="xl:col-span-2 space-y-3" padding="24px">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("creator.analytics.recommendations")}
        </h3>
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <li
              key={rec}
              className="rounded-2xl border px-3 py-3 text-sm leading-relaxed"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
                color: "var(--agx-text-muted, #94a3b8)",
              }}
            >
              {rec}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
