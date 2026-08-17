"use client";

import { useMemo, useState, type JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AI_CREATOR_FEATURES,
  AI_RECOMMENDATIONS,
  ANALYTICS_METRICS,
  BRAND_VOICES,
  CAMPAIGNS,
  CONTENT_CALENDAR,
  CONTENT_FORMATS,
  CREATOR_KPI_METRICS,
  CREATOR_PLATFORM_INTEGRATIONS,
  MEDIA_ASSETS,
  PUBLISHING_QUEUE,
  TOP_POSTS,
  WORKSPACE_TABS,
  type WorkspaceTab,
} from "../../lib/creator-studio";
import { useT } from "../../lib/i18n";
import { Badge, Card, EmptyState, Section } from "../ui";
import { AiContentGenerator } from "./AiContentGenerator";
import { CampaignPlanner } from "./CampaignPlanner";
import { CreatorAnalytics } from "./CreatorAnalytics";
import { CreatorKpiOverview } from "./CreatorKpiOverview";
import { AiFeaturesPanel, FutureIntegrations } from "./IntegrationsAndAi";
import { MediaLibrary } from "./MediaLibrary";
import { PublishingQueue } from "./PublishingQueue";

/**
 * AI Creator Studio — enterprise content production OS.
 * Additive module; does not import or mutate Hero / Globe / Finance / CRM.
 */
export function CreatorStudioPage(): JSX.Element {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<WorkspaceTab>("create");

  const brandAssets = useMemo(
    () => MEDIA_ASSETS.filter((a) => a.folder.includes("Brand") || a.kind === "logo"),
    [],
  );
  const templates = useMemo(
    () => MEDIA_ASSETS.filter((a) => a.kind === "template" || a.folder.includes("Templates")),
    [],
  );

  return (
    <div className="agx-ui-module-page agx-page-enter">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="agx-ui-section-title">{t("creator.page.eyebrow")}</p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          {t("creator.page.title")}
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("creator.page.lead")}
        </p>
      </motion.header>

      <Section id="creator-kpis" title={t("creator.page.dashboard")} delay={0.04}>
        <CreatorKpiOverview metrics={CREATOR_KPI_METRICS} />
      </Section>

      <Section
        id="creator-workspace"
        title={t("creator.page.workspace")}
        subtitle={t("creator.page.workspaceSubtitle")}
        delay={0.06}
      >
        <div
          className="mb-4 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label={t("creator.page.workspaceAria")}
        >
          {WORKSPACE_TABS.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                style={{
                  borderColor: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                    : "var(--agx-card-border, rgba(255,255,255,0.1))",
                  background: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
                    : "transparent",
                  color: active
                    ? "var(--agx-accent, #22d3ee)"
                    : "var(--agx-text-muted, #94a3b8)",
                }}
              >
                {t(`creator.tabs.${item.id}`)}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === "create" ? (
            <AiContentGenerator formats={CONTENT_FORMATS} voices={BRAND_VOICES} />
          ) : null}
          {tab === "campaigns" ? (
            <CampaignPlanner campaigns={CAMPAIGNS} calendar={CONTENT_CALENDAR} />
          ) : null}
          {tab === "media" ? <MediaLibrary assets={MEDIA_ASSETS} /> : null}
          {tab === "templates" ? (
            <Card padding="24px">
              {templates.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {templates.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                        {item.folder}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={t("creator.templates.emptyTitle")}
                  description={t("creator.templates.emptyDescription")}
                />
              )}
            </Card>
          ) : null}
          {tab === "brand" ? (
            <Card padding="24px">
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {brandAssets.map((asset) => (
                  <li
                    key={asset.id}
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                      {asset.name}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {asset.folder}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {tab === "queue" ? <PublishingQueue items={PUBLISHING_QUEUE} /> : null}
          {tab === "analytics" ? (
            <CreatorAnalytics
              metrics={ANALYTICS_METRICS}
              topPosts={TOP_POSTS}
              recommendations={AI_RECOMMENDATIONS}
            />
          ) : null}
        </div>
      </Section>

      <Section
        id="creator-integrations"
        title={t("creator.page.integrations")}
        subtitle={t("creator.page.integrationsSubtitle")}
        delay={0.1}
      >
        <FutureIntegrations platforms={CREATOR_PLATFORM_INTEGRATIONS} />
      </Section>

      <Section
        id="creator-ai-features"
        title={t("creator.page.aiFeatures")}
        subtitle={t("creator.page.aiFeaturesSubtitle")}
        delay={0.12}
      >
        <AiFeaturesPanel features={AI_CREATOR_FEATURES} />
      </Section>
    </div>
  );
}
