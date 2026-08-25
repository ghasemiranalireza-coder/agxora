"use client";

import { useState, type JSX } from "react";
import {
  Badge,
  Button,
  Card,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
} from "@/app/components/ui";
import { catalogCopy, localizeThrownError, useT } from "@/app/lib/i18n";
import { growthService } from "../growth/service";
import { SOCIAL_PLATFORMS, type BrandTone, type SocialPlatformId } from "../growth/types";
import { useAgentOperatingSystem } from "../hooks";
import { WebsitePreview } from "../website/preview";
import type { WebsiteProject } from "../website/types";

export type GrowthWorkspaceMode = "growth" | "website" | "social";

const TONES: readonly BrandTone[] = [
  "professional",
  "friendly",
  "luxury",
  "minimal",
  "corporate",
  "creative",
];

function splitList(value: string): readonly string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function GrowthWorkspace({
  mode,
}: {
  readonly mode: GrowthWorkspaceMode;
}): JSX.Element {
  const t = useT();
  const aos = useAgentOperatingSystem();
  const orgId = aos.organizationId;
  const snapshot = growthService.snapshot(orgId);
  const profile = snapshot.profile;
  const project = snapshot.websiteProjects[0] as WebsiteProject | undefined;
  const [notice, setNotice] = useState(t("agents.growth.noticeReady"));
  const [busy, setBusy] = useState(false);
  const [companyName, setCompanyName] = useState(profile?.companyName ?? "");
  const [industry, setIndustry] = useState(profile?.industry ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [services, setServices] = useState((profile?.services ?? []).join(", "));
  const [audience, setAudience] = useState(profile?.targetAudience ?? "");
  const [usp, setUsp] = useState(profile?.uniqueSellingProposition ?? "");
  const [tone, setTone] = useState<BrandTone>(profile?.brandTone ?? "professional");
  const [platforms, setPlatforms] = useState(
    (profile?.preferredPlatforms ?? ["instagram", "linkedin"]).join(","),
  );

  const run = async (action: () => Promise<void>, successKey: string) => {
    setBusy(true);
    try {
      await action();
      setNotice(t(successKey));
    } catch (error) {
      setNotice(localizeThrownError(t, error, "agents.growth.noticeFailed"));
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = () =>
    run(async () => {
      growthService.saveProfile({
        organizationId: orgId,
        seedFromBusinessOs: true,
        draft: {
          companyName,
          industry,
          description,
          services: splitList(services),
          targetAudience: audience,
          uniqueSellingProposition: usp,
          brandTone: tone,
          preferredPlatforms: splitList(platforms).filter((item): item is SocialPlatformId =>
            SOCIAL_PLATFORMS.includes(item as SocialPlatformId),
          ),
        },
      });
    }, "agents.growth.noticeProfileSaved");

  const pendingApprovals = snapshot.approvals.filter(
    (item) => item.state === "REQUIRES_APPROVAL",
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t(`agents.growth.modes.${mode}`)}
        </p>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.growth.noFakePublish")}
        </p>
        {snapshot.crmLink ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.crmBridge.labels.customer")}: {snapshot.crmLink.companyName}{" "}
            <a href={snapshot.crmLink.href} className="underline" style={{ color: "var(--agx-accent, #22d3ee)" }}>
              {t("agents.crmBridge.actions.openCrm")}
            </a>
            {" · "}
            {t("agents.crmFollowUp.labels.open")}: {String(snapshot.crmLead.openFollowUps.length)}
            {" · "}
            {t("agents.crmFollowUp.labels.nextAction")}:{" "}
            {catalogCopy(
              t,
              `agents.crmFollowUp.nextAction.${snapshot.crmLead.nextAction.code}`,
              snapshot.crmLead.nextAction.code,
            )}
            {" · "}
            {t("agents.leadQueue.labels.queue")}:{" "}
            {String(snapshot.leadActionQueue.counts.total)}
            {snapshot.leadActionQueue.counts.critical > 0
              ? ` · ${t("agents.leadQueue.priority.CRITICAL")}`
              : ""}
          </p>
        ) : (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.crmBridge.status.unlinked")}
            {snapshot.leadActionQueue.counts.total > 0
              ? ` · ${t("agents.leadQueue.labels.queue")}: ${String(snapshot.leadActionQueue.counts.total)}`
              : ""}
          </p>
        )}
      </Card>

      {mode === "growth" ? (
        <>
          <Card className="grid gap-3 md:grid-cols-2" padding="24px" hover={false}>
            <FormField label={t("agents.growth.fields.companyName")}>
              <FormInput value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </FormField>
            <FormField label={t("agents.growth.fields.industry")}>
              <FormInput value={industry} onChange={(event) => setIndustry(event.target.value)} />
            </FormField>
            <FormField label={t("agents.growth.fields.audience")}>
              <FormInput value={audience} onChange={(event) => setAudience(event.target.value)} />
            </FormField>
            <FormField label={t("agents.growth.fields.tone")}>
              <FormSelect value={tone} onChange={(event) => setTone(event.target.value as BrandTone)}>
                {TONES.map((item) => (
                  <option key={item} value={item}>
                    {catalogCopy(t, `agents.growth.tones.${item}`, item)}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label={t("agents.growth.fields.services")}>
              <FormInput value={services} onChange={(event) => setServices(event.target.value)} />
            </FormField>
            <FormField label={t("agents.growth.fields.platforms")}>
              <FormInput value={platforms} onChange={(event) => setPlatforms(event.target.value)} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label={t("agents.growth.fields.usp")}>
                <FormInput value={usp} onChange={(event) => setUsp(event.target.value)} />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label={t("agents.growth.fields.description")}>
                <FormTextArea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button size="sm" disabled={busy} onClick={() => void saveProfile()}>
                {t("agents.growth.actions.saveProfile")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(
                    async () => {
                      growthService.generateStrategy(orgId);
                    },
                    "agents.growth.noticeStrategy",
                  )
                }
              >
                {t("agents.growth.actions.generateStrategy")}
              </Button>
            </div>
          </Card>
          {snapshot.growthStrategy ? (
            <Card className="space-y-2" padding="24px" hover={false}>
              <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("agents.growth.strategyTitle")}
              </h3>
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {snapshot.growthStrategy.summary}
              </p>
              <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {snapshot.growthStrategy.websiteDirection}
              </p>
              <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {snapshot.growthStrategy.socialDirection}
              </p>
            </Card>
          ) : null}
        </>
      ) : null}

      {mode === "website" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await growthService.generateWebsite(orgId);
                }, "agents.growth.noticeWebsite")
              }
            >
              {t("agents.growth.actions.generateWebsite")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !project}
              onClick={() =>
                void run(async () => {
                  await growthService.requestWebsitePublish(orgId);
                }, "agents.growth.noticePublishAttempted")
              }
            >
              {t("agents.growth.actions.attemptPublish")}
            </Button>
          </div>
          {project ? <WebsitePreview project={project} /> : (
            <Card padding="24px" hover={false}>
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("agents.growth.emptyWebsite")}
              </p>
            </Card>
          )}
        </>
      ) : null}

      {mode === "social" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await growthService.generateSocialStrategy(orgId);
                }, "agents.growth.noticeSocialStrategy")
              }
            >
              {t("agents.growth.actions.generateSocialStrategy")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await growthService.generateCalendar(orgId);
                }, "agents.growth.noticeCalendar")
              }
            >
              {t("agents.growth.actions.generateCalendar")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await growthService.generateContent(orgId);
                }, "agents.growth.noticeContent")
              }
            >
              {t("agents.growth.actions.generateContent")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || snapshot.content.length === 0}
              onClick={() =>
                void run(async () => {
                  await growthService.requestSocialPublish(orgId);
                }, "agents.growth.noticePublishAttempted")
              }
            >
              {t("agents.growth.actions.attemptPublish")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || snapshot.content.length === 0}
              onClick={() =>
                void run(async () => {
                  await growthService.requestSocialPublish(orgId, undefined, "schedule");
                }, "agents.growth.noticeScheduleAttempted")
              }
            >
              {t("agents.growth.actions.attemptSchedule")}
            </Button>
          </div>
          <Card className="space-y-2" padding="24px" hover={false}>
            <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("agents.growth.accountsTitle")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {snapshot.accounts.map((account) => (
                <Badge key={account.id} tone="warning">
                  {`${catalogCopy(t, `agents.growth.platforms.${account.platform}`, account.platform)} · ${catalogCopy(t, `agents.growth.accountState.${account.state}`, account.state)}`}
                </Badge>
              ))}
            </div>
            <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("agents.growth.connectionRequired")}
            </p>
          </Card>
          {snapshot.socialStrategy ? (
            <Card className="space-y-2" padding="24px" hover={false}>
              <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("agents.growth.socialStrategyTitle")}
              </h3>
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {snapshot.socialStrategy.summary}
              </p>
              <ul className="list-disc space-y-1 ps-5 text-sm">
                {snapshot.socialStrategy.pillars.map((pillar) => (
                  <li key={pillar.id}>{pillar.name}</li>
                ))}
              </ul>
            </Card>
          ) : null}
          {snapshot.calendars[0] ? (
            <Card className="space-y-3" padding="24px" hover={false}>
              <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("agents.growth.calendarTitle")}
              </h3>
              {snapshot.calendars[0].entries.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{entry.date} · {entry.time}</span>
                  <span>{catalogCopy(t, `agents.growth.platforms.${entry.platform}`, entry.platform)}</span>
                  <span>{entry.topic}</span>
                  <Badge>
                    {catalogCopy(t, `agents.growth.contentStatus.${entry.status}`, entry.status)}
                  </Badge>
                </div>
              ))}
            </Card>
          ) : null}
          {snapshot.content.length > 0 ? (
            <Card className="space-y-3" padding="24px" hover={false}>
              <h3 className="text-base font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("agents.growth.contentTitle")}
              </h3>
              {snapshot.content.map((item) => (
                <div key={item.id} className="space-y-1 rounded-2xl border p-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{catalogCopy(t, `agents.growth.contentTypes.${item.contentType}`, item.contentType)}</Badge>
                    <Badge>
                      {catalogCopy(t, `agents.growth.contentStatus.${item.status}`, item.status)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {item.caption}
                  </p>
                </div>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

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
