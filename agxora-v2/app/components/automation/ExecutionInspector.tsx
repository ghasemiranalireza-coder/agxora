"use client";

import { useState, type JSX, type ReactNode } from "react";
import { useT } from "@/app/lib/i18n";
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
  const t = useT();
  const [notice, setNotice] = useState(t("automation.executionInspector.noticeDefault"));

  if (!run) {
    return (
      <Card className="h-full" padding="24px" hover={false}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("automation.executionInspector.title")}
        </h3>
        <EmptyState
          title={t("automation.executionInspector.emptyTitle")}
          description={t("automation.executionInspector.emptyDescription")}
        />
      </Card>
    );
  }

  return (
    <Card className="h-full space-y-3" padding="24px" hover={false}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("automation.executionInspector.title")}
        </h3>
        <RunStatusBadge status={run.status} />
      </div>

      <dl>
        <DetailRow label={t("automation.executionInspector.workflowName")}>{run.workflowName}</DetailRow>
        <DetailRow label={t("automation.executionInspector.trigger")}>{run.trigger}</DetailRow>
        <DetailRow label={t("automation.executionInspector.executionId")}>
          <span className="font-mono text-xs">{run.id}</span>
        </DetailRow>
        <DetailRow label={t("automation.executionInspector.started")}>{formatDateTime(run.startedAt)}</DetailRow>
        <DetailRow label={t("automation.executionInspector.finished")}>
          {run.finishedAt ? formatDateTime(run.finishedAt) : t("automation.executionInspector.emDash")}
        </DetailRow>
        <DetailRow label={t("automation.executionInspector.duration")}>
          <span className="tabular-nums">{formatDuration(run.durationMs)}</span>
        </DetailRow>
        <DetailRow label={t("automation.executionInspector.status")}>{runStatusLabel(run.status)}</DetailRow>
        <DetailRow label={t("automation.executionInspector.success")}>{run.status === "success" || run.status === "retried" ? t("automation.executionInspector.yes") : t("automation.executionInspector.no")}</DetailRow>
        <DetailRow label={t("automation.executionInspector.failed")}>{run.status === "failed" ? t("automation.executionInspector.yes") : t("automation.executionInspector.no")}</DetailRow>
        <DetailRow label={t("automation.executionInspector.retryAvailable")}>{run.retryAvailable ? t("automation.executionInspector.yes") : t("automation.executionInspector.no")}</DetailRow>
        <DetailRow label={t("automation.executionInspector.executedBy")}>{run.executedBy}</DetailRow>
      </dl>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.executionInspector.input")}
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
          {t("automation.executionInspector.output")}
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
          {t("automation.executionInspector.aiSummary")}
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{t("automation.executionInspector.errorMessage")}</p>
          <p className="mt-1 font-mono text-xs leading-relaxed">{run.errorMessage}</p>
        </div>
      ) : null}

      {run.retryAvailable ? (
        <Button
          variant="primary"
          disabled={!run.retryAvailable}
          onClick={() => setNotice(t("automation.executionInspector.noticeQueued", { id: run.id }))}
        >
          {t("automation.executionInspector.retry")}
        </Button>
      ) : (
        <Button variant="secondary" disabled>
          {t("automation.executionInspector.retryUnavailable")}
        </Button>
      )}
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </Card>
  );
}
