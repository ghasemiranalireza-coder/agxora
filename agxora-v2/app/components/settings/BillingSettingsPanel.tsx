"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type JSX } from "react";
import { VAT_NOTICE } from "@/app/lib/billing/catalog";
import { Button } from "../ui";
import { useLocale } from "../../lib/i18n";
import { SettingsNotice, SettingsPanel } from "./forms/SettingsControls";

interface CatalogPlan {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly monthly: string;
  readonly yearly: string;
  readonly seats: number;
  readonly governedExecutionsPerMonth: number;
  readonly features: readonly string[];
  readonly recommended: boolean;
}

interface PublicSubscription {
  readonly planCode: string;
  readonly planName: string;
  readonly displayStatus: "Active" | "Past due" | "Canceled at period end" | "Expired";
  readonly currency: string;
  readonly interval: "month" | "year";
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly seatLimit: number;
  readonly seatsUsed: number;
  readonly executionLimit: number;
  readonly executionsUsed: number;
  readonly priceLabel: string;
  readonly paidAccess: boolean;
}

interface BillingResponse {
  readonly ok?: boolean;
  readonly configured?: boolean;
  readonly catalog?: readonly CatalogPlan[];
  readonly subscription?: PublicSubscription | null;
  readonly message?: string;
}

const STATUS_KEY = {
  Active: "settings.billing.statusActive",
  "Past due": "settings.billing.statusPastDue",
  "Canceled at period end": "settings.billing.statusCancelAtPeriodEnd",
  Expired: "settings.billing.statusExpired",
} as const;

export function BillingSettingsPanel(): JSX.Element {
  const { t } = useLocale();
  const [view, setView] = useState<BillingResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [interval, setInterval] = useState<"month" | "year">("month");

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/billing/subscription", { cache: "no-store" });
    const body = (await response.json()) as BillingResponse;
    if (!response.ok || !body.ok) {
      throw new Error(body.message || t("settings.billing.loadError"));
    }
    setView(body);
    if (body.subscription?.interval) setInterval(body.subscription.interval);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/billing/subscription", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as BillingResponse;
        if (cancelled) return;
        if (!response.ok || !body.ok) {
          setError(body.message || t("settings.billing.loadError"));
          return;
        }
        setView(body);
        if (body.subscription?.interval) setInterval(body.subscription.interval);
      })
      .catch(() => {
        if (!cancelled) setError(t("settings.billing.loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function checkout(planCode: string) {
    setBusy(planCode);
    setNotice("");
    try {
      const response = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode, billingInterval: interval }),
      });
      const body = (await response.json()) as { ok?: boolean; mode?: string; url?: string; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || t("settings.billing.loadError"));
      if (body.mode === "checkout" && body.url) {
        window.location.assign(body.url);
        return;
      }
      setNotice(t("settings.billing.planChangePending"));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("settings.billing.loadError"));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setNotice("");
    try {
      const response = await fetch("/api/v1/billing/cancel", { method: "POST" });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || t("settings.billing.loadError"));
      setConfirmCancel(false);
      setNotice(t("settings.billing.cancelPending"));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("settings.billing.loadError"));
    } finally {
      setBusy(null);
    }
  }

  const subscription = view?.subscription ?? null;

  return (
    <SettingsPanel title={t("settings.billing.title")} description={t("settings.billing.panelDescription")}>
      <SettingsNotice>{t("settings.billing.notFinanceNotice")}</SettingsNotice>
      <SettingsNotice>{t("settings.billing.returnNotice")}</SettingsNotice>
      {error ? <SettingsNotice>{error}</SettingsNotice> : null}
      {notice ? <SettingsNotice>{notice}</SettingsNotice> : null}
      {!view && !error ? <SettingsNotice>{t("settings.billing.loading")}</SettingsNotice> : null}
      {view && view.configured === false ? <SettingsNotice>{t("settings.billing.unavailable")}</SettingsNotice> : null}

      {subscription ? (
        <div className="mb-6 grid gap-2 text-sm">
          <p>
            <strong>{subscription.planName}</strong>
            {" · "}
            {t(STATUS_KEY[subscription.displayStatus])}
          </p>
          <p>
            {t("settings.billing.price")}: {subscription.priceLabel} {VAT_NOTICE}
          </p>
          <p>
            {subscription.interval === "year" ? t("settings.billing.intervalYear") : t("settings.billing.intervalMonth")}
          </p>
          <p>
            {t("settings.billing.period")}: {subscription.currentPeriodStart.slice(0, 10)} – {subscription.currentPeriodEnd.slice(0, 10)}
          </p>
          <p>
            {t("settings.billing.seats")}: {subscription.seatsUsed} / {subscription.seatLimit}
          </p>
          <p>
            {t("settings.billing.executions")}: {subscription.executionsUsed} / {subscription.executionLimit}
          </p>
          {subscription.cancelAtPeriodEnd ? <p>{t("settings.billing.statusCancelAtPeriodEnd")}</p> : null}
          {!subscription.cancelAtPeriodEnd && subscription.paidAccess ? (
            confirmCancel ? (
              <Button size="sm" variant="secondary" disabled={busy === "cancel"} onClick={() => void cancel()}>
                {t("settings.billing.confirmCancel")}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirmCancel(true)}>
                {t("settings.billing.cancel")}
              </Button>
            )
          ) : null}
        </div>
      ) : view ? (
        <SettingsNotice>{t("settings.billing.none")}</SettingsNotice>
      ) : null}

      {view?.catalog && view.configured ? (
        <div className="mb-4 grid gap-3">
          <div className="flex gap-2">
            <Button size="sm" variant={interval === "month" ? "primary" : "secondary"} onClick={() => setInterval("month")}>
              {t("settings.billing.intervalMonth")}
            </Button>
            <Button size="sm" variant={interval === "year" ? "primary" : "secondary"} onClick={() => setInterval("year")}>
              {t("settings.billing.intervalYear")}
            </Button>
          </div>
          {view.catalog.map((plan) => (
            <div key={plan.code} className="rounded-lg border p-3" style={{ borderColor: "var(--agx-ds-border)" }}>
              <p className="font-medium">{plan.name}</p>
              <p className="text-sm">
                {interval === "year" ? plan.yearly : plan.monthly} {VAT_NOTICE}
              </p>
              <ul className="my-2 list-disc pl-5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Button size="sm" variant="primary" disabled={busy === plan.code} onClick={() => void checkout(plan.code)}>
                {subscription ? t("settings.billing.changePlan") : t("settings.billing.checkout")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4">
        <Link href="/dashboard/finance">
          <Button size="sm" variant="secondary">
            {t("settings.billing.openFinance")}
          </Button>
        </Link>
      </div>
    </SettingsPanel>
  );
}
