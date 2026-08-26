"use client";

import { useState, type JSX } from "react";
import { Badge, Button, Card } from "@/app/components/ui";
import { catalogCopy, localizeThrownError, useT } from "@/app/lib/i18n";
import { operationsService } from "../execution/service";
import { canRetryJob, type ExecutionJob } from "../execution/jobs";
import { growthService } from "../growth/service";
import { useAgentOperatingSystem } from "../hooks";

export function OperationsWorkspace(): JSX.Element {
  const t = useT();
  const aos = useAgentOperatingSystem();
  const orgId = aos.organizationId;
  const overview = operationsService.overview(orgId);
  const [selectedId, setSelectedId] = useState<string | null>(overview.jobs[0]?.id ?? null);
  const [notice, setNotice] = useState(t("agents.operations.noticeReady"));
  const [busy, setBusy] = useState(false);
  const selected = selectedId
    ? operationsService.get(orgId, selectedId)
    : overview.jobs[0];
  const events = operationsService
    .events(orgId)
    .filter((event) => (selected ? event.executionJobId === selected.id : true))
    .slice(0, 12);

  const run = async (action: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      setNotice(t(successKey));
    } catch (error) {
      setNotice(localizeThrownError(t, error, "agents.operations.noticeFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("agents.tabs.operations")}
        </p>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.growth.noFakePublish")}
        </p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <CountCard label={t("agents.operations.counts.queued")} value={overview.counts.queued} />
          <CountCard label={t("agents.operations.counts.running")} value={overview.counts.running} />
          <CountCard
            label={t("agents.operations.counts.waiting")}
            value={overview.counts.waitingForApproval}
          />
          <CountCard label={t("agents.operations.counts.blocked")} value={overview.counts.blocked} />
          <CountCard label={t("agents.operations.counts.failed")} value={overview.counts.failed} />
          <CountCard
            label={t("agents.operations.counts.completed")}
            value={overview.counts.completed}
          />
        </div>
      </Card>

      <Card className="space-y-3" padding="24px" hover={false}>
        <p className="text-sm font-semibold">{t("agents.operations.queueTitle")}</p>
        {overview.jobs.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.operations.empty")}
          </p>
        ) : (
          overview.jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              className="flex w-full flex-wrap items-center gap-2 rounded-lg px-2 py-2 text-left"
              onClick={() => setSelectedId(job.id)}
            >
              <Badge>
                {catalogCopy(t, `agents.operations.priority.${job.priority}`, job.priority)}
              </Badge>
              <span className="text-sm">{job.title}</span>
              <Badge tone="warning">
                {catalogCopy(t, `agents.operations.status.${job.status}`, job.status)}
              </Badge>
            </button>
          ))
        )}
      </Card>

      {selected ? (
        <JobDetail
          job={selected}
          busy={busy}
          onStart={() =>
            void run(async () => {
              await operationsService.start(orgId, selected.id);
            }, "agents.operations.noticeStarted")
          }
          onPause={() =>
            void run(async () => {
              operationsService.pause(orgId, selected.id);
            }, "agents.operations.noticePaused")
          }
          onCancel={() =>
            void run(async () => {
              operationsService.cancel(orgId, selected.id);
            }, "agents.operations.noticeCancelled")
          }
          onRetry={() =>
            void run(async () => {
              await operationsService.retry(orgId, selected.id);
            }, "agents.operations.noticeRetry")
          }
          onApprove={() =>
            void run(async () => {
              if (!selected.approvalId) return;
              await growthService.resolveApproval({
                approvalId: selected.approvalId,
                state: "APPROVED",
                decidedBy: "operator",
              });
            }, "agents.notice.approvalApproved")
          }
          onReject={() =>
            void run(async () => {
              if (!selected.approvalId) return;
              await growthService.resolveApproval({
                approvalId: selected.approvalId,
                state: "REJECTED",
                decidedBy: "operator",
              });
            }, "agents.notice.approvalRejected")
          }
        />
      ) : null}

      <Card className="space-y-2" padding="24px" hover={false}>
        <p className="text-sm font-semibold">{t("agents.operations.eventsTitle")}</p>
        {events.map((event) => (
          <p key={event.id} className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {event.timestamp.slice(11, 16)}{" "}
            {catalogCopy(t, `agents.operations.events.${event.type}`, event.type)}
          </p>
        ))}
      </Card>
    </div>
  );
}

function CountCard({ label, value }: { readonly label: string; readonly value: number }): JSX.Element {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 8%, transparent)" }}>
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {label}
      </p>
      <p className="text-lg font-semibold">{String(value)}</p>
    </div>
  );
}

function JobDetail({
  job,
  busy,
  onStart,
  onPause,
  onCancel,
  onRetry,
  onApprove,
  onReject,
}: {
  readonly job: ExecutionJob;
  readonly busy: boolean;
  readonly onStart: () => void;
  readonly onPause: () => void;
  readonly onCancel: () => void;
  readonly onRetry: () => void;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}): JSX.Element {
  const t = useT();
  const showStart = (job.status === "QUEUED" || job.status === "READY") && !busy;
  const showPause = (job.status === "QUEUED" || job.status === "READY") && !job.paused && !busy;
  const showCancel = job.status !== "COMPLETED" && job.status !== "CANCELLED" && !busy;
  const showRetry = canRetryJob(job) && !busy;
  const showApproval = job.status === "WAITING_FOR_APPROVAL" && Boolean(job.approvalId) && !busy;
  return (
    <Card className="space-y-3" padding="24px" hover={false}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{job.title}</h2>
        <Badge tone="warning">
          {catalogCopy(t, `agents.operations.status.${job.status}`, job.status)}
        </Badge>
      </div>
      <DetailRow label={t("agents.operations.labels.id")} value={job.id} />
      <DetailRow
        label={t("agents.operations.labels.agent")}
        value={catalogCopy(t, `agents.catalog.${job.agentId}.name`, job.agentId)}
      />
      <DetailRow
        label={t("agents.operations.labels.campaign")}
        value={job.campaignId ?? t("agents.operations.emptyValue")}
      />
      <DetailRow
        label={t("agents.operations.labels.tool")}
        value={catalogCopy(t, `agents.toolsCatalog.${job.toolId}.name`, job.toolId)}
      />
      <DetailRow
        label={t("agents.operations.labels.priority")}
        value={catalogCopy(t, `agents.operations.priority.${job.priority}`, job.priority)}
      />
      <DetailRow
        label={t("agents.operations.labels.approval")}
        value={
          job.status === "WAITING_FOR_APPROVAL"
            ? catalogCopy(t, "agents.approvalState.REQUIRES_APPROVAL", "REQUIRES_APPROVAL")
            : job.result?.status === "rejected"
              ? catalogCopy(t, "agents.approvalState.REJECTED", "REJECTED")
              : job.approvalId
                ? catalogCopy(t, "agents.approvalState.APPROVED", "APPROVED")
                : t("agents.campaigns.approval.none")
        }
      />
      <DetailRow
        label={t("agents.operations.labels.attempts")}
        value={`${String(job.attempts.length)} / ${String(job.maxAttempts)}`}
      />
      <DetailRow
        label={t("agents.operations.labels.started")}
        value={job.startedAt ?? t("agents.operations.emptyValue")}
      />
      <DetailRow
        label={t("agents.operations.labels.completed")}
        value={job.completedAt ?? t("agents.operations.emptyValue")}
      />
      <DetailRow
        label={t("agents.operations.labels.blocker")}
        value={
          job.blocker
            ? catalogCopy(
                t,
                job.blocker.code === "crm.unavailable"
                  ? "agents.crmBridge.blockers.unavailable"
                  : `agents.campaigns.blockers.${job.blocker.code}`,
                job.blocker.code,
              )
            : t("agents.operations.emptyValue")
        }
      />
      {job.toolId === "crm" ? (
        <>
          <DetailRow
            label={t("agents.crmBridge.labels.status")}
            value={
              job.params.growthAction === "crm_follow_up_complete" ||
              job.params.action === "complete_follow_up"
                ? job.status === "COMPLETED"
                  ? t("agents.crmFollowUp.ops.completeSucceeded")
                  : job.status === "BLOCKED"
                    ? t("agents.crmFollowUp.status.blocked")
                    : job.status === "FAILED"
                      ? t("agents.crmFollowUp.status.failed")
                      : catalogCopy(t, `agents.operations.status.${job.status}`, job.status)
                : job.params.growthAction === "crm_follow_up_cancel" ||
                    job.params.action === "cancel_follow_up"
                  ? job.status === "COMPLETED"
                    ? t("agents.crmFollowUp.ops.cancelSucceeded")
                    : job.status === "FAILED"
                      ? t("agents.crmFollowUp.status.failed")
                      : catalogCopy(t, `agents.operations.status.${job.status}`, job.status)
                : job.params.growthAction === "crm_follow_up_reschedule" ||
                    job.params.action === "reschedule_follow_up"
                  ? job.status === "COMPLETED"
                    ? t("agents.crmFollowUp.ops.rescheduleSucceeded")
                    : job.status === "FAILED"
                      ? t("agents.crmFollowUp.status.failed")
                      : catalogCopy(t, `agents.operations.status.${job.status}`, job.status)
                : job.params.growthAction === "crm_follow_up" ||
                    job.params.action === "create_follow_up"
                  ? job.status === "COMPLETED"
                    ? t("agents.crmFollowUp.ops.createSucceeded")
                    : job.status === "BLOCKED"
                      ? t("agents.crmFollowUp.status.blocked")
                      : job.status === "FAILED"
                        ? t("agents.crmFollowUp.status.failed")
                        : catalogCopy(t, `agents.operations.status.${job.status}`, job.status)
                  : job.status === "COMPLETED"
                    ? t("agents.crmBridge.syncStatus.completed")
                    : job.status === "BLOCKED"
                      ? t("agents.crmBridge.syncStatus.blocked")
                      : catalogCopy(t, `agents.operations.status.${job.status}`, job.status)
            }
          />
          {job.result?.metadata.customerId ? (
            <DetailRow
              label={t("agents.crmBridge.labels.customer")}
              value={job.result.metadata.customerId}
            />
          ) : null}
          {typeof job.result?.metadata.customerId === "string" &&
          job.result.metadata.customerId.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("agents.crmBridge.labels.record")}
              </p>
              <a
                className="text-sm underline"
                href={`/dashboard/crm/${encodeURIComponent(job.result.metadata.customerId)}`}
                style={{ color: "var(--agx-accent, #22d3ee)" }}
              >
                {t("agents.crmBridge.actions.openCrm")}
              </a>
            </div>
          ) : null}
        </>
      ) : null}
      <DetailRow
        label={t("agents.operations.labels.externalEffect")}
        value={
          job.result?.externalEffect
            ? t("agents.operations.externalEffect.yes")
            : t("agents.operations.externalEffect.no")
        }
      />
      <DetailRow
        label={t("agents.operations.labels.result")}
        value={
          job.result
            ? catalogCopy(t, `agents.operations.result.${job.result.status}`, job.result.status)
            : t("agents.operations.emptyValue")
        }
      />
      <div className="flex flex-wrap gap-2">
        {showStart ? (
          <Button size="sm" disabled={busy} onClick={onStart}>
            {t("agents.operations.actions.start")}
          </Button>
        ) : null}
        {showPause ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={onPause}>
            {t("agents.operations.actions.pause")}
          </Button>
        ) : null}
        {showApproval ? (
          <>
            <Button size="sm" disabled={busy} onClick={onApprove}>
              {t("agents.actions.approve")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
              {t("agents.actions.reject")}
            </Button>
          </>
        ) : null}
        {showRetry ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={onRetry}>
            {t("agents.operations.actions.retry")}
          </Button>
        ) : null}
        {showCancel ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
            {t("agents.operations.actions.cancel")}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function DetailRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {label}
      </p>
      <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </p>
    </div>
  );
}
