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
import { Card, Section, Skeleton } from "../ui";
import { DocumentsKpiOverview } from "./DocumentsKpiOverview";
import { LibraryWorkspace } from "./LibraryWorkspace";

const KnowledgeBase = dynamic(
  () => import("./KnowledgeBase").then((m) => m.KnowledgeBase),
  { ssr: false, loading: () => <SectionSkeleton label="Loading knowledge base…" /> },
);

const ApprovalQueue = dynamic(
  () => import("./ApprovalQueue").then((m) => m.ApprovalQueue),
  { ssr: false, loading: () => <SectionSkeleton label="Loading approval queue…" /> },
);

const AiKnowledgePanel = dynamic(
  () => import("./AiKnowledgePanel").then((m) => m.AiKnowledgePanel),
  { ssr: false, loading: () => <SectionSkeleton label="Loading AI insights…" /> },
);

const DocumentsActivity = dynamic(
  () => import("./DocumentsActivity").then((m) => m.DocumentsActivity),
  { ssr: false, loading: () => <SectionSkeleton label="Loading activity…" /> },
);

const DocumentsIntegrations = dynamic(
  () => import("./DocumentsIntegrations").then((m) => m.DocumentsIntegrations),
  { ssr: false, loading: () => <SectionSkeleton label="Loading integrations…" /> },
);

const DocumentsSecurity = dynamic(
  () => import("./DocumentsSecurity").then((m) => m.DocumentsSecurity),
  { ssr: false, loading: () => <SectionSkeleton label="Loading security…" /> },
);

function SectionSkeleton({ label }: { readonly label: string }): JSX.Element {
  return (
    <Card padding="20px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {label}
      </p>
      <div className="space-y-3">
        <Skeleton height={40} width="100%" />
        <Skeleton height={96} width="100%" />
        <Skeleton height={96} width="66%" />
      </div>
    </Card>
  );
}

/**
 * AI Documents & Knowledge Hub — enterprise foundation.
 * Additive module; does not modify Hero, Finance, CRM, Creator, or Automation.
 */
export function DocumentsHubPage(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const [insightDocId, setInsightDocId] = useState<string | null>(
    KNOWLEDGE_DOCUMENTS[0]?.id ?? null,
  );

  const insightDoc = useMemo(
    () => KNOWLEDGE_DOCUMENTS.find((d) => d.id === insightDocId) ?? KNOWLEDGE_DOCUMENTS[0] ?? null,
    [insightDocId],
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
          AGXORA Knowledge OS
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          Documents
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Enterprise AI Documents & Knowledge Hub — the central knowledge system every AGXORA module
          can attach to and retrieve from. Architecture first. Future AI ready.
        </p>
      </motion.header>

      <Section id="documents-kpis" title="Knowledge Dashboard" delay={0.04}>
        <DocumentsKpiOverview metrics={DOCUMENTS_KPIS} />
      </Section>

      <Section
        id="documents-library"
        title="Document Library"
        subtitle="All Documents, Recent, Favorites, Shared, Archived, Trash, Knowledge Base — with folders, search, viewer, and versions."
        delay={0.06}
      >
        <LibraryWorkspace documents={KNOWLEDGE_DOCUMENTS} folders={DOCUMENT_FOLDERS} />
      </Section>

      <Section
        id="documents-knowledge"
        title="Knowledge Base"
        subtitle="Articles, policies, processes, manuals, FAQs, and internal wiki."
        delay={0.08}
      >
        <KnowledgeBase articles={KNOWLEDGE_ARTICLES} />
      </Section>

      <Section
        id="documents-approvals"
        title="Approvals"
        subtitle="Draft, In Review, Approved, Rejected, Archived — linked with Automation architecture."
        delay={0.1}
      >
        <ApprovalQueue documents={KNOWLEDGE_DOCUMENTS} />
      </Section>

      <Section
        id="documents-ai"
        title="AI Knowledge Layer"
        subtitle="Summary, keywords, classification, tags, folders, related docs, duplicates, translation, OCR, and searchs only."
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
        title="Activity"
        subtitle="Recent changes, uploads, views, shares, and audit history."
        delay={0.14}
      >
        <DocumentsActivity activity={DOCUMENT_ACTIVITY} />
      </Section>

      <Section
        id="documents-integrations"
        title="Integrations"
        subtitle="Drive adapters reserved — no live connectors."
        delay={0.16}
      >
        <DocumentsIntegrations integrations={DOCUMENT_INTEGRATIONS} />
      </Section>

      <Section
        id="documents-security"
        title="Security & Sharing"
        subtitle="RBAC, audit trail, encryption, retention, and share scopes."
        delay={0.18}
      >
        <DocumentsSecurity controls={SECURITY_CONTROLS} />
      </Section>
    </div>
  );
}
