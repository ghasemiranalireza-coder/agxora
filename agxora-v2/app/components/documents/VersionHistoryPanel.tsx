"use client";

import { useState, type JSX } from "react";
import type { KnowledgeDocument } from "../../lib/documents";
import { formatBytesLocalized, formatDateTime } from "../../lib/documents";
import { useLocale } from "../../lib/i18n";
import { Button, Card, EmptyState } from "../ui";

type NoticeState =
  | { readonly kind: "default" }
  | { readonly kind: "restore"; readonly id: string }
  | { readonly kind: "compare"; readonly selected: string; readonly current: string };

export function VersionHistoryPanel({
  document,
}: {
  readonly document: KnowledgeDocument | null;
}): JSX.Element {
  const { t } = useLocale();
  const [notice, setNotice] = useState<NoticeState>({ kind: "default" });
  const [selected, setSelected] = useState<string | null>(null);

  const noticeText =
    notice.kind === "default"
      ? t("documents.versions.noticeDefault")
      : notice.kind === "restore"
        ? t("documents.versions.restoreUnavailable", { id: notice.id })
        : t("documents.versions.compareUnavailable", {
            selected: notice.selected,
            current: notice.current,
          });

  if (!document) {
    return (
      <Card padding="24px" hover={false}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("documents.versions.title")}
        </h3>
        <EmptyState
          title={t("documents.versions.emptyTitle")}
          description={t("documents.versions.emptyDescription")}
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-3" padding="24px" hover={false}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("documents.versions.title")}
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("documents.versions.current", {
            name: document.name,
            version: document.version,
          })}
        </p>
      </div>

      <ul className="space-y-2">
        {document.versions.map((v) => {
          const active = selected === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setSelected(v.id)}
                className="w-full rounded-2xl border px-4 py-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  outlineColor: "var(--agx-accent, #22d3ee)",
                  borderColor: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                    : "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)"
                    : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {v.version}
                  </p>
                  <span className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {formatBytesLocalized(v.sizeBytes, t)}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {v.author} · {formatDateTime(v.createdAt)}
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {v.notes}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={!selected}
          title={t("documents.versions.restoreTitle")}
          onClick={() =>
            selected ? setNotice({ kind: "restore", id: selected }) : undefined
          }
        >
          {t("documents.versions.restore")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!selected}
          title={t("documents.versions.compareTitle")}
          onClick={() =>
            selected
              ? setNotice({
                  kind: "compare",
                  selected,
                  current: document.version,
                })
              : undefined
          }
        >
          {t("documents.versions.compare")}
        </Button>
      </div>
      <p
        className="text-xs"
        role="status"
        aria-live="polite"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {noticeText}
      </p>
    </Card>
  );
}
