"use client";

import { useMemo, useState, type JSX } from "react";
import type { PublishStatus, QueueItem } from "../../lib/creator-studio";
import { formatDateTime, formatLabel, publishStatusLabel } from "../../lib/creator-studio";
import { useT } from "../../lib/i18n";
import { Badge, Card, DataTable, FilterSelect } from "../ui";
import type { DataTableColumn, BadgeTone } from "../ui";

function statusTone(status: PublishStatus): BadgeTone {
  switch (status) {
    case "published":
      return "positive";
    case "scheduled":
    case "approved":
      return "accent";
    case "review":
      return "warning";
    case "archive":
      return "default";
    default:
      return "default";
  }
}

const STATUSES: readonly PublishStatus[] = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "archive",
];

export function PublishingQueue({
  items,
}: {
  readonly items: readonly QueueItem[];
}): JSX.Element {
  const t = useT();
  const [status, setStatus] = useState<PublishStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (status === "all" ? items : items.filter((item) => item.status === status)),
    [items, status],
  );

  const columns = useMemo<readonly DataTableColumn<QueueItem>[]>(
    () => [
      {
        key: "title",
        header: t("creator.queue.columns.title"),
        render: (row) => <span className="font-medium">{row.title}</span>,
      },
      {
        key: "platform",
        header: t("creator.queue.columns.platform"),
        render: (row) => row.platform,
      },
      {
        key: "format",
        header: t("creator.queue.columns.format"),
        render: (row) => t(formatLabel(row.format)),
      },
      {
        key: "status",
        header: t("creator.queue.columns.status"),
        render: (row) => (
          <Badge tone={statusTone(row.status)}>{t(publishStatusLabel(row.status))}</Badge>
        ),
      },
      {
        key: "scheduled",
        header: t("creator.queue.columns.scheduled"),
        render: (row) =>
          row.scheduledAt ? (
            <span className="tabular-nums">{formatDateTime(row.scheduledAt)}</span>
          ) : (
            "—"
          ),
      },
      {
        key: "author",
        header: t("creator.queue.columns.author"),
        render: (row) => row.author,
      },
    ],
    [t],
  );

  return (
    <Card padding="24px">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("creator.queue.title")}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <Badge key={s} tone={statusTone(s)}>
              {t(publishStatusLabel(s))}
            </Badge>
          ))}
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        minWidth={820}
        page={page}
        pageSize={8}
        onPageChange={setPage}
        emptyTitle={t("creator.queue.emptyTitle")}
        emptyDescription={t("creator.queue.emptyDescription")}
        toolbar={
          <FilterSelect
            label={t("creator.queue.filterStatus")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PublishStatus | "all");
              setPage(1);
            }}
          >
            <option value="all">{t("creator.queue.allStatuses")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(publishStatusLabel(s))}
              </option>
            ))}
          </FilterSelect>
        }
      />
    </Card>
  );
}
