"use client";

import { useMemo, useState, type JSX } from "react";
import type { PublishStatus, QueueItem } from "../../lib/creator-studio";
import { formatDateTime, formatLabel, publishStatusLabel } from "../../lib/creator-studio";
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

const COLUMNS: readonly DataTableColumn<QueueItem>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => <span className="font-medium">{row.title}</span>,
  },
  { key: "platform", header: "Platform", render: (row) => row.platform },
  {
    key: "format",
    header: "Format",
    render: (row) => formatLabel(row.format),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge tone={statusTone(row.status)}>{publishStatusLabel(row.status)}</Badge>
    ),
  },
  {
    key: "scheduled",
    header: "Scheduled",
    render: (row) =>
      row.scheduledAt ? (
        <span className="tabular-nums">{formatDateTime(row.scheduledAt)}</span>
      ) : (
        "—"
      ),
  },
  { key: "author", header: "Author", render: (row) => row.author },
];

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
  const [status, setStatus] = useState<PublishStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (status === "all" ? items : items.filter((item) => item.status === status)),
    [items, status],
  );

  return (
    <Card padding="24px">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Publishing Queue
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <Badge key={s} tone={statusTone(s)}>
              {publishStatusLabel(s)}
            </Badge>
          ))}
        </div>
      </div>
      <DataTable
        columns={COLUMNS}
        rows={filtered}
        rowKey={(row) => row.id}
        minWidth={820}
        page={page}
        pageSize={8}
        onPageChange={setPage}
        emptyTitle="No posts in queue"
        emptyDescription="Drafts, reviews, and scheduled posts will appear here."
        toolbar={
          <FilterSelect
            label="Filter status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PublishStatus | "all");
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {publishStatusLabel(s)}
              </option>
            ))}
          </FilterSelect>
        }
      />
    </Card>
  );
}
