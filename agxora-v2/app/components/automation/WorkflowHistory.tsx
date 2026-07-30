"use client";

import { useMemo, useState, type JSX } from "react";
import type { RunStatus, WorkflowRun } from "../../lib/automation";
import { formatDateTime, formatDuration } from "../../lib/automation";
import { Card, FilterSelect } from "../ui";
import { ExecutionInspector } from "./ExecutionInspector";
import { RunStatusBadge } from "./shared/StatusAndDialog";

export function WorkflowHistory({
  runs,
}: {
  readonly runs: readonly WorkflowRun[];
}): JSX.Element {
  const [status, setStatus] = useState<RunStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(runs[0]?.id ?? null);

  const filtered = useMemo(
    () => (status === "all" ? runs : runs.filter((r) => r.status === status)),
    [runs, status],
  );

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-3 space-y-3" padding="20px" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Workflow History · Execution Log
          </h3>
          <FilterSelect
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RunStatus | "all");
              setSelectedId(null);
            }}
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="retried">Retry</option>
            <option value="running">Running</option>
          </FilterSelect>
        </div>

        <ul className="space-y-2" role="listbox" aria-label="Workflow runs">
          {filtered.map((run) => {
            const active = selected?.id === run.id;
            return (
              <li key={run.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setSelectedId(run.id)}
                  className="w-full rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                        {run.workflowName}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                        {run.trigger} · {formatDateTime(run.startedAt)} ·{" "}
                        <span className="tabular-nums">{formatDuration(run.durationMs)}</span>
                      </p>
                    </div>
                    <RunStatusBadge status={run.status} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {run.detail}
                  </p>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-2 py-8 text-center text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              No workflow runs match this filter.
            </li>
          ) : null}
        </ul>
      </Card>

      <div className="xl:col-span-2">
        <ExecutionInspector run={selected} />
      </div>
    </div>
  );
}
