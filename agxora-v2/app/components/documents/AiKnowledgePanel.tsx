"use client";

import { useMemo, useState, type JSX } from "react";
import type { KnowledgeDocument } from "../../lib/documents";
import { Badge, Button, Card, EmptyState } from "../ui";

const AI_FEATURES = [
  { id: "summary", title: "AI Summary", description: "Condensed document understanding for every module." },
  { id: "keywords", title: "AI Keywords", description: "Extracted topic signals for search and routing." },
  { id: "classification", title: "AI Classification", description: "Category / department taxonomy suggestion." },
  { id: "tags", title: "AI Suggested Tags", description: "Tag recommendations without mutating the graph." },
  { id: "folder", title: "AI Suggested Folder", description: "Smart placement into nested folders." },
  { id: "related", title: "AI Related Documents", description: "Graph neighbors across the knowledge hub." },
  { id: "duplicate", title: "AI Duplicate Detection", description: "Near-duplicate detection for document libraries." },
  { id: "translation", title: "AI Translation", description: "Translation readiness flag — no live model." },
  { id: "ocr", title: "AI OCR", description: "OCR pipeline reserved for scans and PDFs." },
  { id: "search", title: "AI Search", description: "Semantic search reserved for future index." },
] as const;

export function AiKnowledgePanel({
  document,
}: {
  readonly document: KnowledgeDocument | null;
}): JSX.Element {
  const [notice, setNotice] = useState("AI features are architecture only — no live model calls.");

  const related = useMemo(() => document?.ai.relatedDocumentIds ?? [], [document]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-2 space-y-3" padding="24px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          AI Feature Architecture
        </h3>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Every capability is reserved for the future AI index. UI shows deterministic mock insights.
        </p>
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {AI_FEATURES.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border p-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {f.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {f.description}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="xl:col-span-3 space-y-4" padding="24px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Insights for Selected Document
        </h3>
        {!document ? (
          <EmptyState
            title="Select a document"
            description="Open a file in the library to inspect AI summary, keywords, and suggestions."
          />
        ) : (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                AI Summary
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {document.ai.summary}
              </p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                AI Keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {document.ai.keywords.map((k) => (
                  <Badge key={k} tone="accent">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>AI Classification</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{document.ai.classification}</dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>AI Suggested Folder</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{document.ai.suggestedFolder}</dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>AI Translation</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {document.ai.translationReady ? "Ready" : "Not applicable"}
                </dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>AI OCR</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {document.ai.ocrReady ? "Ready" : "Not applicable"}
                </dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                AI Suggested Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {document.ai.suggestedTags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                AI Related Documents
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
                  No related documents indexed.
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
                AI Duplicate Detection: possible duplicate of{" "}
                <span className="font-mono text-xs">{document.ai.duplicateOfId}</span>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                AI Duplicate Detection: no near-duplicates flagged.
              </p>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setNotice("AI Search queued.")}
            >
              Run AI Search
            </Button>
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {notice}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
