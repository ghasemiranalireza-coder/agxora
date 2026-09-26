"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type JSX } from "react";
import { Button } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
import { useTheme } from "@/app/lib/theme";
import type { ActivationStepId } from "@/app/lib/activation/derive";
import { startGuidedCrmFollowUp } from "@/app/lib/activation/startFollowUp";
import { agentsStore } from "@/features/agents/store";
import { FIRST_CUSTOMER_AGENTS_HREF, FIRST_CUSTOMER_CUSTOMER_HREF } from "@/app/lib/workspace/firstCustomerSurface";

interface ActivationCustomer {
  readonly id: string;
  readonly companyName: string;
}

interface ActivationPayload {
  readonly ok: true;
  readonly organizationId: string;
  readonly actorId: string;
  readonly steps: readonly { readonly id: ActivationStepId; readonly done: boolean }[];
  readonly next: ActivationStepId | "done";
  readonly workerId: string | null;
  readonly customers: readonly ActivationCustomer[];
  readonly result: {
    readonly customerId: string;
    readonly companyName: string;
    readonly noteId: string;
    readonly executionId: string;
    readonly verified: true;
  } | null;
}

const STEP_KEYS: Record<ActivationStepId, string> = {
  organization: "dashboard.activation.steps.organization",
  customer: "dashboard.activation.steps.customer",
  worker: "dashboard.activation.steps.worker",
  goal: "dashboard.activation.steps.goal",
  approval: "dashboard.activation.steps.approval",
  verification: "dashboard.activation.steps.verification",
};

async function readActivation(): Promise<ActivationPayload | null> {
  const response = await fetch("/api/v1/activation", { credentials: "include" });
  if (response.status === 401) return null;
  const payload = (await response.json()) as ActivationPayload & { ok?: boolean };
  if (!response.ok || payload.ok !== true) {
    throw new Error("dashboard.activation.loadFailed");
  }
  return payload;
}

export function ActivationChecklist(): JSX.Element | null {
  const t = useT();
  const { tokens } = useTheme();
  const [status, setStatus] = useState<ActivationPayload | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const next = await readActivation();
    setStatus(next);
    setCustomerId((current) => {
      if (current && next?.customers.some((customer) => customer.id === current)) return current;
      return next?.customers[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readActivation()
      .then((next) => {
        if (cancelled || !next) return;
        setStatus(next);
        setCustomerId(next.customers[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) setError(t("dashboard.activation.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (!status) return null;

  const activateWorker = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/agents/workforce/communication", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("dashboard.activation.workerFailed");
      await agentsStore.flushPersistence();
      await agentsStore.hydrateAsync({
        force: true,
        forceOrgSwitch: true,
        organizationId: status.organizationId,
      });
      await reload();
    } catch {
      setError(t("dashboard.activation.workerFailed"));
    } finally {
      setBusy(false);
    }
  };

  const recordFollowUp = async () => {
    if (!status.workerId || !customerId) return;
    setBusy(true);
    setError(null);
    try {
      await startGuidedCrmFollowUp({
        organizationId: status.organizationId,
        actorId: status.actorId,
        workerId: status.workerId,
        customerId,
      });
      await reload();
    } catch {
      setError(t("dashboard.activation.goalFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="agx-glass-panel agx-dash-panel"
      aria-label={t("dashboard.activation.title")}
      data-testid="activation-checklist"
      data-activation-next={status.next}
      style={{
        padding: "24px",
        borderRadius: "24px",
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        display: "grid",
        gap: "16px",
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: "18px", color: tokens.text }}>
          {status.next === "done"
            ? t("dashboard.activation.successTitle")
            : t("dashboard.activation.title")}
        </h2>
        <p style={{ margin: "6px 0 0", color: tokens.textMuted, fontSize: "14px" }}>
          {status.next === "done"
            ? t("dashboard.activation.successBody")
            : t("dashboard.activation.subtitle")}
        </p>
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "8px" }}>
        {status.steps.map((step) => {
          const current = status.next === step.id;
          return (
            <li
              key={step.id}
              data-testid={`activation-step-${step.id}`}
              data-done={step.done ? "true" : "false"}
              data-current={current ? "true" : "false"}
              style={{
                color: step.done ? tokens.textMuted : tokens.text,
                fontWeight: current ? 700 : 500,
                fontSize: "14px",
              }}
            >
              {step.done ? "✓" : current ? "→" : "○"} {t(STEP_KEYS[step.id])}
            </li>
          );
        })}
      </ol>
      {status.next === "customer" ? (
        <Link href={FIRST_CUSTOMER_CUSTOMER_HREF}>{t("dashboard.activation.addCustomer")}</Link>
      ) : null}
      {status.next === "worker" ? (
        <Button type="button" size="sm" disabled={busy} onClick={() => void activateWorker()}>
          {t("dashboard.activation.activateWorker")}
        </Button>
      ) : null}
      {status.next === "goal" ? (
        <div style={{ display: "grid", gap: "8px" }}>
          <label style={{ display: "grid", gap: "4px", fontSize: "13px", color: tokens.textMuted }}>
            {t("dashboard.activation.selectCustomer")}
            <select
              value={customerId}
              data-testid="activation-customer"
              onChange={(event) => setCustomerId(event.target.value)}
            >
              {status.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.companyName}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" disabled={busy || !customerId} onClick={() => void recordFollowUp()}>
            {t("dashboard.activation.recordFollowUp")}
          </Button>
        </div>
      ) : null}
      {status.next === "approval" ? (
        <Link href={FIRST_CUSTOMER_AGENTS_HREF}>{t("dashboard.activation.approve")}</Link>
      ) : null}
      {status.next === "verification" ? (
        <Link href={FIRST_CUSTOMER_AGENTS_HREF}>{t("dashboard.activation.openAgents")}</Link>
      ) : null}
      {status.result ? (
        <dl data-testid="activation-result" style={{ margin: 0, display: "grid", gap: "4px", fontSize: "13px" }}>
          <div>
            <dt>{t("dashboard.activation.customerLabel")}</dt>
            <dd>{status.result.companyName}</dd>
          </div>
          <div>
            <dt>{t("dashboard.activation.noteLabel")}</dt>
            <dd>{status.result.noteId}</dd>
          </div>
          <div>
            <dt>{t("dashboard.activation.executionLabel")}</dt>
            <dd>{status.result.executionId}</dd>
          </div>
          <div>
            <dt>{t("dashboard.activation.verifiedLabel")}</dt>
            <dd>{t("dashboard.activation.verifiedValue")}</dd>
          </div>
        </dl>
      ) : null}
      {error ? (
        <p role="alert" style={{ margin: 0, color: "var(--agx-danger, #f87171)", fontSize: "13px" }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
