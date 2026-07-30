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
    <div className="mx-auto w-full max-w-[1400px] space-y-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          AGXORA Marketing OS
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          AI Creator Studio
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Enterprise content production — generate, brand, plan, publish, and measure AI-powered
          campaigns across every channel.
        </p>
      </motion.header>

      <Section id="creator-kpis" title="Dashboard" delay={0.04}>
        <CreatorKpiOverview metrics={CREATOR_KPI_METRICS} />
      </Section>

      <Section
        id="creator-workspace"
        title="Workspace"
        subtitle="Create Content · Campaigns · Media Library · Templates · Brand Assets · Publishing Queue · Analytics"
        delay={0.06}
      >
        <div
          className="mb-4 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Creator workspace"
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
                {item.label}
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
            <Card padding="20px">
              {templates.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {templates.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                        {t.name}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                        {t.folder}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.tags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No templates"
                  description="Reusable content and design templates will live here."
                />
              )}
            </Card>
          ) : null}
          {tab === "brand" ? (
            <Card padding="20px">
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
        title="Future Integrations"
        subtitle="Official platform adapters reserved — no fake live connections."
        delay={0.1}
      >
        <FutureIntegrations platforms={CREATOR_PLATFORM_INTEGRATIONS} />
      </Section>

      <Section
        id="creator-ai-features"
        title="AI Features"
        subtitle="Capability map for production, brand, schedule, and localization."
        delay={0.12}
      >
        <AiFeaturesPanel features={AI_CREATOR_FEATURES} />
      </Section>
    </div>
  );
}
