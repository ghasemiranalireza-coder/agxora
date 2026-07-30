"use client";

import { useState, type JSX, type ReactNode } from "react";
import type { WorkflowRun } from "../../lib/automation";
import { formatDateTime, formatDuration, runStatusLabel } from "../../lib/automation";
import { Button, Card, EmptyState } from "../ui";
import { RunStatusBadge } from "./shared/StatusAndDialog";

function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2.5 text-sm last:border-b-0" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
      <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>{label}</dt>
      <dd className="max-w-[60%] text-right" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {children}
      </dd>
    </div>
  );
}

export function ExecutionInspector({
  run,
}: {
  readonly run: WorkflowRun | null;
}): JSX.Element {
  const [notice, setNotice] = useState("Retry adapter reserved — no live re-execution yet.");

  if (!run) {
    return (
      <Card className="h-full" padding="20px" hover={false}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Execution Details
        </h3>
        <EmptyState
          title="Select an execution"
          description="Choose a run from Workflow History to inspect inputs, outputs, and AI summary."
        />
      </Card>
    );
  }

  return (
    <Card className="h-full space-y-3" padding="20px" hover={false}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Execution Details
        </h3>
        <RunStatusBadge status={run.status} />
      </div>

      <dl>
        <DetailRow label="Workflow Name">{run.workflowName}</DetailRow>
        <DetailRow label="Trigger">{run.trigger}</DetailRow>
        <DetailRow label="Execution ID">
          <span className="font-mono text-xs">{run.id}</span>
        </DetailRow>
        <DetailRow label="Started">{formatDateTime(run.startedAt)}</DetailRow>
        <DetailRow label="Finished">
          {run.finishedAt ? formatDateTime(run.finishedAt) : "—"}
        </DetailRow>
        <DetailRow label="Duration">
          <span className="tabular-nums">{formatDuration(run.durationMs)}</span>
        </DetailRow>
        <DetailRow label="Status">{runStatusLabel(run.status)}</DetailRow>
        <DetailRow label="Success">{run.status === "success" || run.status === "retried" ? "Yes" : "No"}</DetailRow>
        <DetailRow label="Failed">{run.status === "failed" ? "Yes" : "No"}</DetailRow>
        <DetailRow label="Retry Available">{run.retryAvailable ? "Yes" : "No"}</DetailRow>
        <DetailRow label="Executed By">{run.executedBy}</DetailRow>
      </dl>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Input
        </p>
        <pre
          className="overflow-x-auto rounded-xl border p-3 text-xs leading-relaxed"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
            background: "rgba(0,0,0,0.2)",
            color: "var(--agx-text-muted, #94a3b8)",
          }}
        >
          {run.input}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Output
        </p>
        <pre
          className="overflow-x-auto rounded-xl border p-3 text-xs leading-relaxed"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
            background: "rgba(0,0,0,0.2)",
            color: "var(--agx-text-muted, #94a3b8)",
          }}
        >
          {run.output}
        </pre>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          AI Summary
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {run.aiSummary}
        </p>
      </div>

      {run.errorMessage ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{
            borderColor: "rgba(251,113,133,0.35)",
            background: "rgba(251,113,133,0.1)",
            color: "#fb7185",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Error Message</p>
          <p className="mt-1 font-mono text-xs leading-relaxed">{run.errorMessage}</p>
        </div>
      ) : null}

      {run.retryAvailable ? (
        <Button
          variant="primary"
          disabled={!run.retryAvailable}
          onClick={() => setNotice(`Retry queued for ${run.id} (placeholder).`)}
        >
          Retry
        </Button>
      ) : (
        <Button variant="secondary" disabled>
          Retry unavailable
        </Button>
      )}
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </Card>
  );
}
