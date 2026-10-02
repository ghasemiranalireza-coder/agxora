"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type JSX } from "react";
import { Button } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
import { useTheme } from "@/app/lib/theme";
import {
  draftFirstResultFacts,
  findFirstMarketingGoal,
  marketingChannelChoices,
  type FirstResultFactDraft,
  type FirstResultStep,
} from "@/app/lib/marketing/firstResult";
import { resumeFirstMarketingGoal } from "@/app/lib/marketing/resumeFirstGoal";
import { MarketingClaimNotice, marketingDraftFingerprint } from "@/features/agents/components/MarketingClaimNotice";
import { InstagramPublishPanel } from "./InstagramPublishPanel";
import { useAgentOperatingSystem } from "@/features/agents/hooks";
import { editMarketingDraft } from "@/features/agents/marketing/edit";
import type { MarketingChannelIntent, MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import "./first-result.css";

interface FactView {
  readonly category: string;
  readonly statement: string;
  readonly allowedForMarketing: boolean;
}

interface FirstResultPayload {
  readonly ok: true;
  readonly access: "allowed" | "blocked";
  readonly blockCode: string;
  readonly message: string | null;
  readonly facts: readonly FactView[];
  readonly missingFacts: readonly string[];
  readonly worker: "active" | "paused" | "missing";
  readonly goal: { readonly id: string; readonly status: string; readonly channelIntent: string | null; readonly error: string | null } | null;
  readonly proposal: MarketingPlanDocument | null;
  readonly claimResult: "PASS" | "BLOCKED" | "EDIT_REQUIRED" | null;
  readonly approvalGranted: boolean;
  readonly stored: boolean;
  readonly verified: boolean;
  readonly next: FirstResultStep | "blocked" | "failed";
  readonly steps: readonly { readonly id: FirstResultStep; readonly done: boolean }[];
}

const STEP_KEYS: Record<FirstResultStep, string> = {
  business: "dashboard.firstResult.steps.business",
  confirm: "dashboard.firstResult.steps.confirm",
  goal: "dashboard.firstResult.steps.goal",
  prepare: "dashboard.firstResult.steps.prepare",
  review: "dashboard.firstResult.steps.review",
  approve: "dashboard.firstResult.steps.approve",
  verified: "dashboard.firstResult.steps.verified",
};

async function readStatus(): Promise<FirstResultPayload> {
  const response = await fetch("/api/v1/marketing/first-result", { credentials: "include", cache: "no-store" });
  const body = (await response.json()) as FirstResultPayload & { ok?: boolean; error?: string };
  if (!response.ok || body.ok !== true) {
    throw new Error(body.error || "dashboard.firstResult.loadFailed");
  }
  return body;
}

export function FirstGovernedResult(): JSX.Element | null {
  const t = useT();
  const { tokens } = useTheme();
  const aos = useAgentOperatingSystem();
  const [status, setStatus] = useState<FirstResultPayload | null>(null);
  const [hidden, setHidden] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [offer, setOffer] = useState("");
  const [location, setLocation] = useState("");
  const [drafts, setDrafts] = useState<readonly FirstResultFactDraft[] | null>(null);
  const [channel, setChannel] = useState<MarketingChannelIntent | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<{ result: string; fingerprint: string } | null>(null);

  const reload = useCallback(async () => {
    const next = await readStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setHidden(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden || !status) return null;

  const goal = findFirstMarketingGoal(aos.businessGoals, aos.organizationId);
  const plan = goal ? aos.plans.find((item) => item.id === goal.planId) : undefined;
  const prepareResult = plan?.steps.find((step) => step.capabilityId === "MARKETING_PREPARE_PLAN")?.result;
  const liveDraft =
    prepareResult && typeof prepareResult === "object" && prepareResult !== null && "plan" in prepareResult
      ? (prepareResult as { plan?: MarketingPlanDocument }).plan
      : undefined;
  const draft = liveDraft ?? status.proposal ?? undefined;
  const fingerprint = draft ? marketingDraftFingerprint(draft) : "";
  const claimsPass = claim?.fingerprint === fingerprint && claim.result === "PASS";
  const approval = goal
    ? aos.approvals.find((item) => item.taskId === goal.taskId && item.state === "REQUIRES_APPROVAL")
    : undefined;

  const prepareDrafts = () => {
    const built = draftFirstResultFacts({ businessName, businessType, offer, location });
    if (!built.ok) {
      setError(t("dashboard.firstResult.missing"));
      return;
    }
    setError(null);
    setDrafts(built.facts);
  };

  const confirmFact = async (fact: FirstResultFactDraft) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/agents/marketing/business-facts", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          category: fact.category,
          statement: fact.statement,
          allowedForMarketing: true,
        }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; result?: { conflict?: boolean; verification?: string } };
      if (!response.ok || !body.ok) throw new Error(body.error || t("dashboard.firstResult.confirmFailed"));
      if (body.result?.conflict) {
        setError(body.result.verification || t("dashboard.firstResult.conflict"));
      }
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("dashboard.firstResult.confirmFailed"));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!channel) {
      setError(t("dashboard.firstResult.channelHint"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      agentOsService.ensureWorkspace(aos.organizationId);
      await agentsStore.flushPersistence();
      const send = () =>
        fetch("/api/v1/marketing/first-result", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channelIntent: channel }),
        });
      let response = await send();
      let body = (await response.json()) as { ok?: boolean; error?: string; code?: string };
      if (!response.ok && body.code === "missing_runtime") {
        agentOsService.ensureWorkspace(aos.organizationId);
        await agentsStore.flushPersistence();
        response = await send();
        body = (await response.json()) as { ok?: boolean; error?: string; code?: string };
      }
      if (!response.ok || !body.ok) throw new Error(body.error || t("dashboard.firstResult.startFailed"));
      await agentsStore.hydrateAsync({ force: true });
      const resumed = await resumeFirstMarketingGoal();
      const next = await reload();
      if (resumed === "paused") throw new Error(t("dashboard.firstResult.runtimePaused"));
      if (resumed === "missing" && !next.proposal) throw new Error(t("dashboard.firstResult.reload"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("dashboard.firstResult.startFailed"));
    } finally {
      setBusy(false);
    }
  };

  const resumeWorker = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/agents/workforce/marketing", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || t("dashboard.firstResult.resumeFailed"));
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("dashboard.firstResult.resumeFailed"));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (state: "APPROVED" | "REJECTED") => {
    if (!approval || (state === "APPROVED" && !claimsPass)) return;
    setBusy(true);
    setError(null);
    try {
      await agentOsService.resolveApproval({
        approvalId: approval.id,
        state,
        decidedBy: aos.userId ?? undefined,
      });
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("dashboard.firstResult.approveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const confirmed = (fact: FirstResultFactDraft) =>
    status.facts.some(
      (item) => item.category === fact.category && item.statement === fact.statement && item.allowedForMarketing,
    );

  const showForm = status.access === "allowed" && status.missingFacts.length > 0 && !drafts && !goal && !status.verified;
  const showConfirm = status.access === "allowed" && drafts && status.missingFacts.length > 0 && !status.verified;
  const showChannel = status.access === "allowed" && status.missingFacts.length === 0 && !goal && !status.verified && status.worker !== "paused";

  return (
    <section
      id="first-result"
      className="agx-glass-panel agx-dash-panel agx-first-result"
      aria-labelledby="first-result-title"
      data-testid="first-governed-result"
      style={{
        padding: "clamp(16px, 4vw, 24px)",
        borderRadius: "24px",
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        display: "grid",
        gap: "16px",
      }}
    >
      <div>
        <h2 id="first-result-title" style={{ fontSize: "18px" }}>
          {t("dashboard.firstResult.title")}
        </h2>
        <p style={{ color: "var(--agx-text-muted, #94a3b8)", fontSize: "14px", marginTop: "6px" }}>
          {t("dashboard.firstResult.subtitle")}
        </p>
      </div>
      <ol className="agx-first-result__steps" aria-label={t("dashboard.firstResult.progress")}>
        {status.steps.map((step) => (
          <li key={step.id} data-done={step.done ? "true" : "false"}>
            {t(STEP_KEYS[step.id])}
          </li>
        ))}
      </ol>
      {error ? (
        <p role="alert" style={{ color: "var(--agx-danger, #f87171)", fontSize: "13px" }}>
          {error}
        </p>
      ) : null}
      {status.access === "blocked" ? (
        <div className="agx-first-result__grid">
          <p>{status.message}</p>
          <Link href="/dashboard/settings#billing">
            <Button size="sm" variant="primary">{t("dashboard.firstResult.openBilling")}</Button>
          </Link>
        </div>
      ) : null}
      {status.access === "allowed" && status.worker === "paused" && !status.verified ? (
        <div className="agx-first-result__grid">
          <p>{t("dashboard.firstResult.workerPaused")}</p>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void resumeWorker()}>
            {t("dashboard.firstResult.resumeWorker")}
          </Button>
        </div>
      ) : null}
      {showForm ? (
        <form
          className="agx-first-result__grid"
          onSubmit={(event) => {
            event.preventDefault();
            prepareDrafts();
          }}
        >
          <label>
            {t("dashboard.firstResult.businessName")}
            <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} required />
          </label>
          <label>
            {t("dashboard.firstResult.businessType")}
            <input value={businessType} onChange={(event) => setBusinessType(event.target.value)} required />
          </label>
          <label>
            {t("dashboard.firstResult.offer")}
            <input value={offer} onChange={(event) => setOffer(event.target.value)} required />
          </label>
          <label>
            {t("dashboard.firstResult.location")}
            <input value={location} onChange={(event) => setLocation(event.target.value)} required />
          </label>
          <Button type="submit" size="sm" variant="primary">{t("dashboard.firstResult.continue")}</Button>
        </form>
      ) : null}
      {showConfirm && drafts ? (
        <div className="agx-first-result__grid">
          <p>{t("dashboard.firstResult.confirmHint")}</p>
          {drafts.map((fact) => (
            <div key={fact.category} className="agx-first-result__card">
              <p>{t(`dashboard.firstResult.categories.${fact.category}`)}</p>
              <p>{fact.statement}</p>
              {confirmed(fact) ? (
                <p>{t("dashboard.firstResult.confirmed")}</p>
              ) : (
                <Button size="sm" variant="primary" disabled={busy} onClick={() => void confirmFact(fact)}>
                  {t("dashboard.firstResult.confirm")}
                </Button>
              )}
            </div>
          ))}
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDrafts(null)}>
            {t("dashboard.firstResult.edit")}
          </Button>
        </div>
      ) : null}
      {showChannel ? (
        <div className="agx-first-result__grid">
          <p>{t("dashboard.firstResult.channelTitle")}</p>
          <p>{t("dashboard.firstResult.channelHint")}</p>
          <p>{t("dashboard.firstResult.notPublished")}</p>
          <div className="agx-first-result__choice" role="group" aria-label={t("dashboard.firstResult.channelTitle")}>
            {marketingChannelChoices().map((item) => (
              <button key={item} type="button" aria-pressed={channel === item} onClick={() => setChannel(item)}>
                {t(`dashboard.firstResult.channels.${item}`)}
              </button>
            ))}
          </div>
          <Button size="sm" variant="primary" disabled={busy || !channel} onClick={() => void start()}>
            {t("dashboard.firstResult.start")}
          </Button>
        </div>
      ) : null}
      {draft ? (
        <div className="agx-first-result__grid" data-testid="first-result-review">
          <p>{t("dashboard.firstResult.notPublished")}</p>
          <p>{draft.strategy}</p>
          <p>
            {t("dashboard.firstResult.audience")}: {draft.audience || t("dashboard.firstResult.audienceEmpty")}
          </p>
          <p>
            {t("dashboard.firstResult.channelLabel")}: {t(`dashboard.firstResult.channels.${draft.channelIntent}`)}
          </p>
          {plan ? (
            <MarketingClaimNotice
              plan={draft}
              planId={plan.id}
              onResult={(result, nextFingerprint) => setClaim({ result, fingerprint: nextFingerprint })}
            />
          ) : null}
          <ol className="agx-first-result__grid">
            {draft.contentItems.map((item, index) => (
              <li key={item.day} className="agx-first-result__card">
                <p>
                  {t("dashboard.firstResult.day", { day: item.day })} · {item.theme}
                </p>
                <textarea
                  rows={3}
                  value={item.draftCopy}
                  readOnly={!approval || !plan}
                  onChange={(event) => {
                    if (!plan || !approval) return;
                    editMarketingDraft({
                      organizationId: aos.organizationId,
                      planId: plan.id,
                      itemIndex: index,
                      draftCopy: event.target.value,
                    });
                  }}
                />
                <p>
                  {t("dashboard.firstResult.cta")}: {item.callToAction}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      {goal && !draft && !status.verified ? <p>{t("dashboard.firstResult.preparing")}</p> : null}
      {goal?.error ? <p role="alert">{goal.error}</p> : null}
      {approval ? (
        <div className="agx-first-result__actions">
          <p>{t("dashboard.firstResult.approveHint")}</p>
          <Button size="sm" variant="primary" disabled={busy || !claimsPass} onClick={() => void decide("APPROVED")}>
            {t("dashboard.firstResult.approve")}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void decide("REJECTED")}>
            {t("dashboard.firstResult.reject")}
          </Button>
        </div>
      ) : null}
      {status.verified ? (
        <div className="agx-first-result__grid" data-testid="first-result-verified">
          <h3>{t("dashboard.firstResult.verifiedTitle")}</h3>
          <p>{t("dashboard.firstResult.verifiedBody")}</p>
          {goal && plan && draft?.channelIntent === "instagram" ? (
            <InstagramPublishPanel goalId={goal.id} planId={plan.id} day={draft.contentItems[0]?.day ?? 1} />
          ) : null}
        </div>
      ) : null}
      {status.stored && !status.verified && status.approvalGranted ? <p>{t("dashboard.firstResult.verifying")}</p> : null}
    </section>
  );
}
