"use client";

import { useMemo, useState, type JSX } from "react";
import type { KnowledgeDocument } from "../../lib/documents";
import { useLocale } from "../../lib/i18n";
import { Badge, Button, Card, EmptyState } from "../ui";

const AI_FEATURE_IDS = [
  "summary",
  "keywords",
  "classification",
  "tags",
  "folder",
  "related",
  "duplicate",
  "translation",
  "ocr",
  "search",
] as const;

export function AiKnowledgePanel({
  document,
}: {
  readonly document: KnowledgeDocument | null;
}): JSX.Element {
  const { t } = useLocale();
  const [noticeKey, setNoticeKey] = useState<"default" | "searchUnavailable">("default");

  const related = useMemo(() => document?.ai.relatedDocumentIds ?? [], [document]);

  const notice =
    noticeKey === "default"
      ? t("documents.ai.noticeDefault")
      : t("documents.ai.searchUnavailable");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-2 space-y-3" padding="24px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("documents.ai.architectureTitle")}
        </h3>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("documents.ai.architectureIntro")}
        </p>
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {AI_FEATURE_IDS.map((id) => (
            <li
              key={id}
              className="rounded-xl border p-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t(`documents.ai.features.${id}.title`)}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t(`documents.ai.features.${id}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="xl:col-span-3 space-y-4" padding="24px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("documents.ai.insightsTitle")}
        </h3>
        {!document ? (
          <EmptyState
            title={t("documents.ai.emptyTitle")}
            description={t("documents.ai.emptyDescription")}
          />
        ) : (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("documents.ai.summary")}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {document.ai.summary}
              </p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("documents.ai.keywords")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {document.ai.keywords.map((keyword) => (
                  <Badge key={keyword} tone="accent">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("documents.ai.classification")}
                </dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{document.ai.classification}</dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("documents.ai.suggestedFolder")}
                </dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{document.ai.suggestedFolder}</dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("documents.ai.translation")}
                </dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {document.ai.translationReady
                    ? t("documents.ai.sampleReady")
                    : t("documents.ai.notApplicable")}
                </dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>{t("documents.ai.ocr")}</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {document.ai.ocrReady
                    ? t("documents.ai.sampleReady")
                    : t("documents.ai.notApplicable")}
                </dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("documents.ai.suggestedTags")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {document.ai.suggestedTags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("documents.ai.related")}
              </p>
              {related.length > 0 ? (
                <ul className="space-y-1 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {related.map((id) => (
                    <li key={id} className="font-mono text-xs">
                      {id}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("documents.ai.noRelated")}
                </p>
              )}
            </div>
            {document.ai.duplicateOfId ? (
              <div
                className="rounded-xl border p-3 text-sm"
                style={{
                  borderColor: "rgba(251,191,36,0.35)",
                  background: "rgba(251,191,36,0.1)",
                  color: "#fbbf24",
                }}
              >
                {t("documents.ai.duplicateOf")}{" "}
                <span className="font-mono text-xs">{document.ai.duplicateOfId}</span>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("documents.ai.noDuplicates")}
              </p>
            )}
            <Button
              variant="primary"
              size="sm"
              title={t("documents.ai.searchTitle")}
              onClick={() => setNoticeKey("searchUnavailable")}
            >
              {t("documents.ai.runSearch")}
            </Button>
            <p
              className="text-xs"
              role="status"
              aria-live="polite"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {notice}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
