"use client";

import { useMemo, useState, type JSX } from "react";
import type { KnowledgeDocument } from "../../lib/documents";
import { formatDateTime } from "../../lib/documents";
import { useLocale } from "../../lib/i18n";
import { Button, Card, EmptyState } from "../ui";
import { DocStatusBadge } from "./shared/StatusBadges";

type ActionKey = "approve" | "reject" | "sendToReview";

type NoticeState =
  | { readonly kind: "default" }
  | { readonly kind: "unavailable"; readonly actionKey: ActionKey; readonly id: string };

export function ApprovalQueue({
  documents,
}: {
  readonly documents: readonly KnowledgeDocument[];
}): JSX.Element {
  const { t } = useLocale();
  const queue = useMemo(
    () => documents.filter((d) => d.status === "draft" || d.status === "in_review"),
    [documents],
  );
  const [notice, setNotice] = useState<NoticeState>({ kind: "default" });

  const noticeText =
    notice.kind === "default"
      ? t("documents.approvals.noticeDefault")
      : t("documents.approvals.unavailable", {
          action: t(`documents.approvals.${notice.actionKey}`),
          id: notice.id,
        });

  const unavailable = (actionKey: ActionKey, docId: string): void => {
    setNotice({ kind: "unavailable", actionKey, id: docId });
  };

  return (
    <Card className="space-y-3" padding="24px" hover={false}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("documents.approvals.title")}
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("documents.approvals.subtitle")}
        </p>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title={t("documents.approvals.emptyTitle")}
          description={t("documents.approvals.emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {queue.map((doc) => (
            <li
              key={doc.id}
              className="rounded-2xl border px-4 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {doc.name}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {doc.owner} · {formatDateTime(doc.updatedAt)} · {doc.department}
                  </p>
                </div>
                <DocStatusBadge status={doc.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  title={t("documents.approvals.approveTitle")}
                  onClick={() => unavailable("approve", doc.id)}
                >
                  {t("documents.approvals.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  title={t("documents.approvals.rejectTitle")}
                  onClick={() => unavailable("reject", doc.id)}
                >
                  {t("documents.approvals.reject")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  title={t("documents.approvals.sendTitle")}
                  onClick={() => unavailable("sendToReview", doc.id)}
                >
                  {t("documents.approvals.sendToReview")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
