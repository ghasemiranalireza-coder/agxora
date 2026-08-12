"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DOCUMENT_ACTIVITY,
  DOCUMENT_FOLDERS,
  DOCUMENT_INTEGRATIONS,
  DOCUMENTS_KPIS,
  KNOWLEDGE_ARTICLES,
  KNOWLEDGE_DOCUMENTS,
  SECURITY_CONTROLS,
} from "../../lib/documents";
import { useLocale } from "../../lib/i18n";
import { Card, Section, Skeleton } from "../ui";
import { DocumentsKpiOverview } from "./DocumentsKpiOverview";
import { LibraryWorkspace } from "./LibraryWorkspace";

function SectionSkeleton({ labelKey }: { readonly labelKey: string }): JSX.Element {
  const { t } = useLocale();
  return (
    <Card padding="24px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t(labelKey)}
      </p>
      <div className="space-y-3">
        <Skeleton height={40} width="100%" />
        <Skeleton height={96} width="100%" />
        <Skeleton height={96} width="66%" />
      </div>
    </Card>
  );
}

const KnowledgeBase = dynamic(
  () => import("./KnowledgeBase").then((m) => m.KnowledgeBase),
  {
    ssr: false,
    loading: () => <SectionSkeleton labelKey="documents.loading.knowledgeBase" />,
  },
);

const ApprovalQueue = dynamic(
  () => import("./ApprovalQueue").then((m) => m.ApprovalQueue),
  {
    ssr: false,
    loading: () => <SectionSkeleton labelKey="documents.loading.approvals" />,
  },
);

const AiKnowledgePanel = dynamic(
  () => import("./AiKnowledgePanel").then((m) => m.AiKnowledgePanel),
  {
    ssr: false,
    loading: () => <SectionSkeleton labelKey="documents.loading.aiInsights" />,
  },
);

const DocumentsActivity = dynamic(
  () => import("./DocumentsActivity").then((m) => m.DocumentsActivity),
  {
    ssr: false,
    loading: () => <SectionSkeleton labelKey="documents.loading.activity" />,
  },
);

const DocumentsIntegrations = dynamic(
  () => import("./DocumentsIntegrations").then((m) => m.DocumentsIntegrations),
  {
    ssr: false,
    loading: () => <SectionSkeleton labelKey="documents.loading.integrations" />,
  },
);

const DocumentsSecurity = dynamic(
  () => import("./DocumentsSecurity").then((m) => m.DocumentsSecurity),
  {
    ssr: false,
    loading: () => <SectionSkeleton labelKey="documents.loading.security" />,
  },
);

/**
 * AI Documents & Knowledge Hub — enterprise foundation.
 * Additive module; does not modify Hero, Finance, CRM, Creator, or Automation.
 */
export function DocumentsHubPage(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();
  const [insightDocId, setInsightDocId] = useState<string | null>(
    KNOWLEDGE_DOCUMENTS[0]?.id ?? null,
  );

  const insightDoc = useMemo(
    () =>
      KNOWLEDGE_DOCUMENTS.find((d) => d.id === insightDocId) ??
      KNOWLEDGE_DOCUMENTS[0] ??
      null,
    [insightDocId],
  );

  return (
    <div className="agx-ui-module-page agx-page-enter">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="agx-ui-section-title">{t("documents.page.brand")}</p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          {t("documents.page.title")}
        </h1>
        <p
          className="max-w-2xl text-sm sm:text-base"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("documents.page.subtitle")}
        </p>
        <div
          role="status"
          className="mt-3 max-w-2xl rounded-xl border px-3 py-2 text-xs leading-relaxed"
          style={{
            borderColor:
              "color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)",
            background:
              "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)",
            color: "var(--agx-text, #f8fafc)",
          }}
        >
          {t("documents.page.sampleNotice")}
        </div>
      </motion.header>

      <Section id="documents-kpis" title={t("documents.sections.kpis.title")} delay={0.04}>
        <DocumentsKpiOverview metrics={DOCUMENTS_KPIS} />
      </Section>

      <Section
        id="documents-library"
        title={t("documents.sections.library.title")}
        subtitle={t("documents.sections.library.subtitle")}
        delay={0.06}
      >
        <LibraryWorkspace documents={KNOWLEDGE_DOCUMENTS} folders={DOCUMENT_FOLDERS} />
      </Section>

      <Section
        id="documents-knowledge"
        title={t("documents.sections.knowledge.title")}
        subtitle={t("documents.sections.knowledge.subtitle")}
        delay={0.08}
      >
        <KnowledgeBase articles={KNOWLEDGE_ARTICLES} />
      </Section>

      <Section
        id="documents-approvals"
        title={t("documents.sections.approvals.title")}
        subtitle={t("documents.sections.approvals.subtitle")}
        delay={0.1}
      >
        <ApprovalQueue documents={KNOWLEDGE_DOCUMENTS} />
      </Section>

      <Section
        id="documents-ai"
        title={t("documents.sections.ai.title")}
        subtitle={t("documents.sections.ai.subtitle")}
        delay={0.12}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {KNOWLEDGE_DOCUMENTS.filter((d) => !d.trashed)
            .slice(0, 8)
            .map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setInsightDocId(d.id)}
                className="rounded-full border px-3 py-1 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  outlineColor: "var(--agx-accent, #22d3ee)",
                  borderColor:
                    insightDoc?.id === d.id
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                      : "var(--agx-card-border, rgba(255,255,255,0.1))",
                  background:
                    insightDoc?.id === d.id
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
                      : "transparent",
                  color:
                    insightDoc?.id === d.id
                      ? "var(--agx-accent, #22d3ee)"
                      : "var(--agx-text-muted, #94a3b8)",
                }}
              >
                {d.name.length > 28 ? `${d.name.slice(0, 28)}…` : d.name}
              </button>
            ))}
        </div>
        <AiKnowledgePanel document={insightDoc} />
      </Section>

      <Section
        id="documents-activity"
        title={t("documents.sections.activity.title")}
        subtitle={t("documents.sections.activity.subtitle")}
        delay={0.14}
      >
        <DocumentsActivity activity={DOCUMENT_ACTIVITY} />
      </Section>

      <Section
        id="documents-integrations"
        title={t("documents.sections.integrations.title")}
        subtitle={t("documents.sections.integrations.subtitle")}
        delay={0.16}
      >
        <DocumentsIntegrations integrations={DOCUMENT_INTEGRATIONS} />
      </Section>

      <Section
        id="documents-security"
        title={t("documents.sections.security.title")}
        subtitle={t("documents.sections.security.subtitle")}
        delay={0.18}
      >
        <DocumentsSecurity controls={SECURITY_CONTROLS} />
      </Section>
    </div>
  );
}
