"use client";

import { useMemo, useState, type JSX } from "react";
import type { RunStatus, WorkflowRun } from "../../lib/automation";
import { formatDateTime, formatDuration, runStatusLabel } from "../../lib/automation";
import { Badge, Button, Card, DataTable, FilterSelect } from "../ui";
import type { BadgeTone, DataTableColumn } from "../ui";

function statusTone(status: RunStatus): BadgeTone {
  switch (status) {
    case "success":
      return "positive";
    case "failed":
      return "critical";
    case "pending":
      return "warning";
    case "retried":
    case "running":
      return "accent";
    default:
      return "default";
  }
}

export function WorkflowHistory({
  runs,
}: {
  readonly runs: readonly WorkflowRun[];
}): JSX.Element {
  const [status, setStatus] = useState<RunStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WorkflowRun | null>(null);
  const [notice, setNotice] = useState("Execution adapters reserved — retry queues ready.");

  const filtered = useMemo(
    () => (status === "all" ? runs : runs.filter((r) => r.status === status)),
    [runs, status],
  );

  const columns: readonly DataTableColumn<WorkflowRun>[] = [
    {
      key: "workflow",
      header: "Workflow",
      render: (row) => <span className="font-medium">{row.workflowName}</span>,
    },
    { key: "trigger", header: "Trigger", render: (row) => row.trigger },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{runStatusLabel(row.status)}</Badge>
      ),
    },
    {
      key: "started",
      header: "Started",
      render: (row) => (
        <span className="tabular-nums">{formatDateTime(row.startedAt)}</span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => (
        <span className="tabular-nums">{formatDuration(row.durationMs)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelected(row)}>
            Details
          </Button>
          {row.status === "failed" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setNotice(`Retry queued for ${row.id} (executor reserved).`)}
            >
              Retry
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-3" padding="20px" hover={false}>
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Workflow History · Execution Log
        </h3>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          minWidth={860}
          page={page}
          pageSize={6}
          onPageChange={setPage}
          emptyTitle="No workflow runs"
          emptyDescription="Execution history will appear here as automations run."
          toolbar={
            <FilterSelect
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as RunStatus | "all");
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="retried">Retry</option>
              <option value="running">Running</option>
            </FilterSelect>
          }
        />
        <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
      </Card>

      <Card className="xl:col-span-2 space-y-3" padding="20px" hover={false}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Execution Details
        </h3>
        {selected ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Run</dt>
              <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{selected.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Workflow</dt>
              <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{selected.workflowName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Status</dt>
              <dd>
                <Badge tone={statusTone(selected.status)}>
                  {runStatusLabel(selected.status)}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Duration</dt>
              <dd className="tabular-nums" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {formatDuration(selected.durationMs)}
              </dd>
            </div>
            <p className="pt-2 leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {selected.detail}
            </p>
          </dl>
        ) : (
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Select a run to inspect execution details, success/failure, and retry options.
          </p>
        )}
      </Card>
    </div>
  );
}
