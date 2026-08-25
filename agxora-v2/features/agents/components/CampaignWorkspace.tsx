"use client";

import { useEffect, useState, type JSX } from "react";
import { Badge, Button, Card } from "@/app/components/ui";
import { catalogCopy, localizeThrownError, useT } from "@/app/lib/i18n";
import { evaluateCampaignReadiness } from "../campaigns/readiness";
import type { Campaign } from "../campaigns/types";
import type { LeadActionQueue } from "../crm/types";
import { operationsService } from "../execution/service";
import { growthService } from "../growth/service";
import { useAgentOperatingSystem } from "../hooks";

export function CampaignWorkspace(): JSX.Element {
  const t = useT();
  const aos = useAgentOperatingSystem();
  const orgId = aos.organizationId;
  const snapshot = growthService.snapshot(orgId);
  const campaign = snapshot.campaigns[0];
  const [notice, setNotice] = useState(t("agents.campaigns.noticeReady"));
  const [busy, setBusy] = useState(false);
  const [leadActionQueue, setLeadActionQueue] = useState<LeadActionQueue>(
    snapshot.leadActionQueue,
  );
  const pendingApprovals = snapshot.approvals.filter(
    (item) => item.state === "REQUIRES_APPROVAL",
  );

  useEffect(() => {
    let cancelled = false;
    void growthService.getLeadActionQueue(orgId).then((queue) => {
      if (!cancelled) setLeadActionQueue(queue);
    });
    return () => {
      cancelled = true;
    };
  }, [
    orgId,
    snapshot.crmFollowUps.length,
    snapshot.crmLink?.updatedAt,
    snapshot.approvals.length,
    aos.tasks.length,
    aos.executions.length,
  ]);

  const run = async (action: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      setNotice(t(successKey));
      const queue = await growthService.getLeadActionQueue(orgId);
      setLeadActionQueue(queue);
    } catch (error) {
      setNotice(localizeThrownError(t, error, "agents.campaigns.noticeFailed"));
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
          {t("agents.tabs.campaigns")}
        </p>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.growth.noFakePublish")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await growthService.planCampaign(orgId);
              }, "agents.campaigns.noticePlanned")
            }
          >
            {t("agents.campaigns.actions.plan")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !campaign}
            onClick={() =>
              void run(async () => {
                await growthService.evaluateReadiness(orgId);
                await growthService.generateInsights(orgId);
              }, "agents.campaigns.noticeReadiness")
            }
          >
            {t("agents.campaigns.actions.readiness")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !campaign}
            onClick={() =>
              void run(async () => {
                await growthService.requestCampaignApproval(orgId, campaign?.id);
              }, "agents.campaigns.noticeApprovalRequested")
            }
          >
            {t("agents.campaigns.actions.requestApproval")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !snapshot.profile}
            onClick={() =>
              void run(async () => {
                await growthService.requestCrmSync(orgId, campaign?.id);
              }, "agents.crmBridge.noticeRequested")
            }
          >
            {t("agents.crmBridge.actions.sync")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || !snapshot.crmLink}
            onClick={() =>
              void run(async () => {
                await growthService.requestCrmFollowUp(orgId, {
                  campaignId: campaign?.id,
                  kind: "general",
                });
              }, "agents.crmFollowUp.noticeRequested")
            }
          >
            {t("agents.crmFollowUp.actions.create")}
          </Button>
        </div>
      </Card>

      {campaign && snapshot.profile ? (
        <CampaignDetail
          campaign={campaign}
          jobs={operationsService.list(orgId)}
          readiness={evaluateCampaignReadiness({
            profile: snapshot.profile,
            campaign,
            accounts: snapshot.accounts,
            website: snapshot.websiteProjects[0],
          })}
          insights={snapshot.insights}
          crmLink={snapshot.crmLink}
          crmSync={snapshot.crmSync}
          crmLead={snapshot.crmLead}
          crmFollowUps={snapshot.crmFollowUps}
          leadActionQueue={leadActionQueue}
          busy={busy}
          onCompleteFollowUp={(followUpId) =>
            void run(async () => {
              await growthService.requestCrmFollowUpComplete(orgId, {
                followUpId,
                campaignId: campaign.id,
                completionNote: "Operator marked follow-up complete from Campaigns.",
              });
            }, "agents.crmFollowUp.noticeCompleteRequested")
          }
          onExecuteLeadAction={(profileId, action, followUpId, targetCrmStatus) =>
            void run(async () => {
              const result = await growthService.executeLeadAction(orgId, {
                profileId,
                action,
                followUpId,
                campaignId: campaign.id,
                targetCrmStatus,
              });
              if (result.execution.status === "INVALID") {
                throw new Error(result.execution.message ?? "invalid_lead_action");
              }
              if (result.execution.status === "REVIEWED") {
                return;
              }
            }, "agents.leadQueue.noticeActionRequested")
          }
        />
      ) : (
        <Card padding="24px" hover={false}>
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.campaigns.empty")}
          </p>
        </Card>
      )}

      {pendingApprovals.length > 0 ? (
        <Card className="space-y-3" padding="24px" hover={false}>
          <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("agents.history.approvalsTitle")}
          </h3>
          {pendingApprovals.map((approval) => (
            <div key={approval.id} className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{approval.action}</span>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await growthService.resolveApproval({
                      approvalId: approval.id,
                      state: "APPROVED",
                      decidedBy: "operator",
                    });
                  }, "agents.notice.approvalApproved")
                }
              >
                {t("agents.actions.approve")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await growthService.resolveApproval({
                      approvalId: approval.id,
                      state: "REJECTED",
                      decidedBy: "operator",
                    });
                  }, "agents.notice.approvalRejected")
                }
              >
                {t("agents.actions.reject")}
              </Button>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function CampaignDetail({
  campaign,
  jobs,
  readiness,
  insights,
  crmLink,
  crmSync,
  crmLead,
  crmFollowUps,
  leadActionQueue,
  busy,
  onCompleteFollowUp,
  onExecuteLeadAction,
}: {
  readonly campaign: Campaign;
  readonly jobs: ReturnType<typeof operationsService.list>;
  readonly readiness: ReturnType<typeof evaluateCampaignReadiness>;
  readonly insights: ReturnType<typeof growthService.snapshot>["insights"];
  readonly crmLink: ReturnType<typeof growthService.snapshot>["crmLink"];
  readonly crmSync: ReturnType<typeof growthService.snapshot>["crmSync"];
  readonly crmLead: ReturnType<typeof growthService.snapshot>["crmLead"];
  readonly crmFollowUps: ReturnType<typeof growthService.snapshot>["crmFollowUps"];
  readonly leadActionQueue: LeadActionQueue;
  readonly busy: boolean;
  readonly onCompleteFollowUp: (followUpId: string) => void;
  readonly onExecuteLeadAction: (
    profileId: string,
    action: string,
    followUpId?: string,
    targetCrmStatus?: import("@/app/lib/crm/directory").CrmCustomerStatus,
  ) => void;
}): JSX.Element {
  const t = useT();
  const priorityTone = (
    priority: (typeof leadActionQueue.items)[number]["priority"],
  ): "critical" | "warning" | "positive" | "default" | "accent" => {
    if (priority === "CRITICAL") return "critical";
    if (priority === "HIGH") return "warning";
    if (priority === "MEDIUM") return "accent";
    if (priority === "LOW") return "default";
    return "positive";
  };
  const executableAction = (
    recommended: (typeof leadActionQueue.items)[number]["recommendedAction"],
  ): string | null => {
    if (recommended === "CREATE_FOLLOW_UP") return "CREATE_FOLLOW_UP";
    if (recommended === "COMPLETE_OVERDUE_FOLLOW_UP") {
      return "COMPLETE_OVERDUE_FOLLOW_UP";
    }
    if (recommended === "COMPLETE_PENDING_FOLLOW_UP") {
      return "COMPLETE_OVERDUE_FOLLOW_UP";
    }
    if (recommended === "REVIEW_BLOCKED_FOLLOW_UP") {
      return "COMPLETE_OVERDUE_FOLLOW_UP";
    }
    if (recommended === "RETRY_FAILED_FOLLOW_UP") return "RETRY_FAILED_FOLLOW_UP";
    if (recommended === "REVIEW_CRM_LINK") return "REVIEW_CRM_LINK";
    if (recommended === "ADVANCE_CRM_STATUS") return "ADVANCE_CRM_STATUS";
    return null;
  };
  return (
    <Card className="space-y-4" padding="24px" hover={false}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {campaign.name}
        </h2>
        <Badge tone="warning">
          {catalogCopy(t, `agents.campaigns.status.${campaign.status}`, campaign.status)}
        </Badge>
        {campaign.executionResult && !campaign.executionResult.available ? (
          <Badge>{t("agents.growth.publishingNotConfigured")}</Badge>
        ) : null}
        {crmLink ? (
          <Badge tone="positive">
            {catalogCopy(
              t,
              `agents.crmBridge.outcome.${crmLink.outcome}`,
              crmLink.outcome,
            )}
          </Badge>
        ) : (
          <Badge>{t("agents.crmBridge.status.unlinked")}</Badge>
        )}
      </div>
      <DetailRow label={t("agents.campaigns.labels.objective")} value={campaign.objective.statement} />
      <DetailRow label={t("agents.campaigns.labels.audience")} value={campaign.audience.description} />
      <DetailRow label={t("agents.campaigns.labels.offer")} value={campaign.offer} />
      <DetailRow label={t("agents.campaigns.labels.cta")} value={campaign.websiteCta} />
      <DetailRow label={t("agents.campaigns.labels.strategy")} value={campaign.strategy} />
      <DetailRow
        label={t("agents.crmBridge.labels.status")}
        value={
          crmSync
            ? catalogCopy(t, `agents.crmBridge.syncStatus.${crmSync.status}`, crmSync.status)
            : t("agents.crmBridge.status.unlinked")
        }
      />
      <DetailRow
        label={t("agents.crmFollowUp.labels.nextAction")}
        value={catalogCopy(
          t,
          `agents.crmFollowUp.nextAction.${crmLead.nextAction.code}`,
          crmLead.nextAction.code,
        )}
      />
      {crmLink ? (
        <>
          <DetailRow
            label={t("agents.crmBridge.labels.customer")}
            value={crmLink.companyName}
          />
          <DetailRow
            label={t("agents.crmBridge.labels.contact")}
            value={crmLink.contactName ?? t("agents.operations.emptyValue")}
          />
          <DetailRow
            label={t("agents.crmFollowUp.labels.open")}
            value={String(crmLead.openFollowUps.length)}
          />
          <DetailRow
            label={t("agents.crmFollowUp.labels.overdue")}
            value={String(crmLead.overdueFollowUps.length)}
          />
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("agents.crmBridge.labels.record")}
            </p>
            <a
              className="text-sm underline"
              href={crmLink.href}
              style={{ color: "var(--agx-accent, #22d3ee)" }}
            >
              {t("agents.crmBridge.actions.openCrm")}
            </a>
          </div>
        </>
      ) : null}
      {crmFollowUps.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("agents.crmFollowUp.labels.list")}</p>
          {crmFollowUps.slice(0, 5).map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2">
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {catalogCopy(t, `agents.crmFollowUp.status.${item.status}`, item.status)}
                {" · "}
                {catalogCopy(t, `agents.crmFollowUp.kind.${item.kind}`, item.kind)}
                {" · "}
                {item.title}
              </p>
              {item.status === "pending" ||
              item.status === "blocked" ||
              item.status === "failed" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onCompleteFollowUp(item.id)}
                >
                  {t("agents.crmFollowUp.actions.complete")}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("agents.leadQueue.title")}</p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.leadQueue.subtitle")}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.leadQueue.counts", {
            critical: String(leadActionQueue.counts.critical),
            high: String(leadActionQueue.counts.high),
            medium: String(leadActionQueue.counts.medium),
            low: String(leadActionQueue.counts.low),
          })}
        </p>
        {leadActionQueue.items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.leadQueue.empty")}
          </p>
        ) : (
          leadActionQueue.items.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start gap-2 border-t border-white/5 pt-2"
            >
              <Badge tone={priorityTone(item.priority)}>
                {catalogCopy(
                  t,
                  `agents.leadQueue.priority.${item.priority}`,
                  item.priority,
                )}
              </Badge>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {item.companyName}
                  {item.overdueFollowUpCount > 0 ? (
                    <>
                      {" · "}
                      <span style={{ color: "var(--agx-danger, #f87171)" }}>
                        {t("agents.leadQueue.overdue")}
                      </span>
                    </>
                  ) : null}
                </p>
                <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("agents.leadQueue.labels.score")}: {String(item.score)}
                  {" · "}
                  {t("agents.leadQueue.labels.nextAction")}:{" "}
                  {catalogCopy(
                    t,
                    `agents.leadQueue.action.${item.recommendedAction}`,
                    item.recommendedAction,
                  )}
                </p>
                <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("agents.leadQueue.labels.reasons")}:{" "}
                  {item.reasons
                    .map((reason) =>
                      catalogCopy(t, `agents.leadQueue.reasons.${reason}`, reason),
                    )
                    .join(" · ")}
                </p>
                {item.crmStatus ? (
                  <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {t("agents.leadQueue.labels.crmStatus")}:{" "}
                    {catalogCopy(
                      t,
                      `agents.leadQueue.crmStatus.${item.crmStatus}`,
                      item.crmStatus,
                    )}
                    {item.targetCrmStatus
                      ? ` → ${catalogCopy(
                          t,
                          `agents.leadQueue.crmStatus.${item.targetCrmStatus}`,
                          item.targetCrmStatus,
                        )}`
                      : ""}
                  </p>
                ) : null}
                {item.followUpStatus ? (
                  <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {t("agents.leadQueue.labels.followUp")}:{" "}
                    {catalogCopy(
                      t,
                      `agents.crmFollowUp.status.${item.followUpStatus}`,
                      item.followUpStatus,
                    )}
                    {item.dueAt
                      ? ` · ${t("agents.crmFollowUp.labels.due")}: ${item.dueAt.slice(0, 10)}`
                      : ""}
                  </p>
                ) : null}
                {item.execution ? (
                  <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {t("agents.leadQueue.labels.execution")}:{" "}
                    {catalogCopy(
                      t,
                      `agents.leadQueue.executionStatus.${item.execution.status}`,
                      item.execution.status,
                    )}
                    {item.execution.message ? ` · ${item.execution.message}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.href ? (
                  <a
                    className="text-sm underline"
                    href={item.href}
                    style={{ color: "var(--agx-accent, #22d3ee)" }}
                  >
                    {t("agents.crmBridge.actions.openCrm")}
                  </a>
                ) : null}
                {(() => {
                  const action = executableAction(item.recommendedAction);
                  if (!action) return null;
                  const labelKey =
                    action === "CREATE_FOLLOW_UP"
                      ? "agents.leadQueue.controls.create"
                      : action === "RETRY_FAILED_FOLLOW_UP"
                        ? "agents.leadQueue.controls.retry"
                        : action === "REVIEW_CRM_LINK"
                          ? "agents.leadQueue.controls.review"
                          : action === "ADVANCE_CRM_STATUS"
                            ? "agents.leadQueue.controls.advance"
                            : "agents.leadQueue.controls.complete";
                  const needsFollowUp =
                    action === "COMPLETE_OVERDUE_FOLLOW_UP" ||
                    action === "RETRY_FAILED_FOLLOW_UP";
                  return (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={
                        busy ||
                        (needsFollowUp && !item.followUpId) ||
                        item.execution?.status === "WAITING_FOR_APPROVAL" ||
                        item.execution?.status === "RUNNING"
                      }
                      onClick={() => {
                        if (action === "REVIEW_CRM_LINK" && item.href) {
                          window.open(item.href, "_blank", "noopener,noreferrer");
                        }
                        onExecuteLeadAction(
                          item.profileId,
                          action,
                          item.followUpId,
                          action === "ADVANCE_CRM_STATUS"
                            ? item.targetCrmStatus
                            : undefined,
                        );
                      }}
                    >
                      {t(labelKey)}
                    </Button>
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>
      <DetailRow
        label={t("agents.campaigns.labels.approval")}
        value={
          campaign.approvalState
            ? catalogCopy(t, `agents.approvalState.${campaign.approvalState}`, campaign.approvalState)
            : t("agents.campaigns.approval.none")
        }
      />
      <div>
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.campaigns.labels.channels")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {campaign.channels
            .filter((channel) => channel.enabled)
            .map((channel) => (
              <Badge key={channel.id}>
                {catalogCopy(t, `agents.campaigns.channels.${channel.id}`, channel.id)}
              </Badge>
            ))}
        </div>
      </div>
      <DetailRow
        label={t("agents.campaigns.labels.timeline")}
        value={`${campaign.startDate} → ${campaign.endDate}`}
      />
      <div className="space-y-2">
        <p className="text-sm font-semibold">
          {t("agents.campaigns.labels.readiness")} {String(readiness.score)}
        </p>
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.campaigns.labels.blockers")}
        </p>
        {readiness.blockers.map((code) => (
          <p key={code} className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {catalogCopy(t, `agents.campaigns.blockers.${code}`, code)}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("agents.campaigns.labels.tasks")}</p>
        {campaign.tasks.map((item) => {
          const job = jobs.find(
            (entry) => entry.campaignTaskId === item.id || entry.id === item.executionJobId,
          );
          return (
            <p key={item.id} className="text-sm">
              {catalogCopy(t, `agents.campaigns.taskStatus.${item.status}`, item.status)}
              {" · "}
              {catalogCopy(t, `agents.campaigns.tasks.${item.code}`, item.code)}
              {job
                ? ` · ${catalogCopy(t, `agents.operations.status.${job.status}`, job.status)}`
                : ""}
            </p>
          );
        })}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("agents.campaigns.labels.milestones")}</p>
        {campaign.milestones.map((item) => (
          <p key={item.id} className="text-sm">
            {catalogCopy(t, `agents.campaigns.milestones.${item.code}`, item.code)}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("agents.campaigns.labels.insights")}</p>
        {insights.map((insight) => (
          <p key={insight.id} className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {catalogCopy(t, `agents.campaigns.insightTypes.${insight.type}`, insight.type)}
            {" · "}
            {catalogCopy(t, `agents.campaigns.insights.${insight.code}`, insight.code)}
          </p>
        ))}
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
