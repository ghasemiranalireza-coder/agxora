"use client";

import type { JSX } from "react";
import type { KnowledgeArticle } from "../../lib/documents";
import { formatDate, knowledgeKindLabel } from "../../lib/documents";
import { Badge, Card } from "../ui";
import { DocStatusBadge } from "./shared/StatusBadges";

export function KnowledgeBase({
  articles,
}: {
  readonly articles: readonly KnowledgeArticle[];
}): JSX.Element {
  return (
    <Card padding="20px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Articles, policies, processes, manuals, FAQs, and internal wiki — the narrative layer of the
        Knowledge Hub.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <article
            key={article.id}
            className="flex h-full flex-col rounded-2xl border p-4 transition-colors hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_28%,transparent)]"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <Badge tone="accent">{knowledgeKindLabel(article.kind)}</Badge>
              <DocStatusBadge status={article.status} />
            </div>
            <h3 className="mt-3 font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {article.title}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {article.summary}
            </p>
            <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {article.owner} · {formatDate(article.updatedAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {article.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
