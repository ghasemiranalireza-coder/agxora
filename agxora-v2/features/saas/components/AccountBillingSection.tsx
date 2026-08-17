"use client";

/**
 * Account billing summary — current plan, renewal, usage, invoices, upgrade CTA.
 */

import { useEffect, type JSX } from "react";
import { saasCommercialStore } from "../store";
import { billingService } from "../billing";
import { getCommercialPlan } from "../plans";
import { useSaasCommercial } from "../hooks/useSaasCommercial";
import { SaasNavLink } from "./SaasNavLink";
import { catalogCopy, useT } from "@/app/lib/i18n";

export function AccountBillingSection(): JSX.Element {
  const saas = useSaasCommercial();
  const t = useT();

  useEffect(() => {
    saasCommercialStore.hydrate();
  }, []);

  useEffect(() => {
    if (!saas.hydrated) return;
    billingService.ensureWorkspace(saas.organizationId);
    billingService.getOrCreateProfile(saas.organizationId, {
      companyName: "AGXORA Organization",
      billingEmail: saas.email ?? "",
    });
  }, [saas.hydrated, saas.organizationId, saas.email]);

  if (!saas.hydrated) {
    return (
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("common.loading")}
      </p>
    );
  }

  const planName = saas.license
    ? catalogCopy(
        t,
        `pricing.plans.${saas.license.planId}.name`,
        getCommercialPlan(saas.license.planId).name,
      )
    : "—";
  const renewal =
    (saas.license?.renewsAt ?? saas.license?.trialEndsAt ?? "—").slice(0, 10);
  const topUsage = saas.quotas.slice(0, 4);
  const recentInvoices = saas.invoices.slice(0, 5);

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <Meta label={t("billing.account.currentPlan")} value={planName} />
        <Meta
          label={t("billing.account.status")}
          value={
            saas.licenseStatus
              ? catalogCopy(t, `billing.licenseStatus.${saas.licenseStatus}`, saas.licenseStatus)
              : "—"
          }
        />
        <Meta label={t("billing.account.renewalDate")} value={renewal} />
        <Meta label={t("billing.account.seats")} value={String(saas.license?.seats ?? "—")} />
      </dl>

      <div>
        <h3
          className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("billing.account.usage")}
        </h3>
        {topUsage.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("billing.account.noUsage")}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {topUsage.map((q) => (
              <li
                key={q.metric}
                className="rounded-xl px-3 py-2 text-sm"
                style={{
                  border:
                    "1px solid color-mix(in srgb, var(--agx-border, #334155) 55%, transparent)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              >
                <span className="block text-[11px] uppercase tracking-wider" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {catalogCopy(t, `billing.quotas.${q.metric}`, q.metric.replace(/_/g, " "))}
                </span>
                {q.used.toLocaleString()} / {q.limit.toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3
          className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("billing.account.invoices")}
        </h3>
        {recentInvoices.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("billing.account.noInvoices")}
          </p>
        ) : (
          <ul className="space-y-2">
            {recentInvoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
                style={{
                  border:
                    "1px solid color-mix(in srgb, var(--agx-border, #334155) 55%, transparent)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              >
                <span>
                  {inv.number} · {catalogCopy(t, `billing.invoiceStatus.${inv.status}`, inv.status)}
                </span>
                <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  €{inv.amountUsd.toFixed(2)} · {inv.issuedAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <SaasNavLink href="/dashboard/billing" variant="primary">
          {t("billing.upgrade")}
        </SaasNavLink>
        <SaasNavLink href="/pricing" variant="secondary">
          {t("billing.viewPricing")}
        </SaasNavLink>
        <SaasNavLink href="/contact-sales" variant="ghost">
          {t("billing.contactSales")}
        </SaasNavLink>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div>
      <dt
        className="text-[11px] uppercase tracking-wider"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </dt>
      <dd className="mt-1 font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </dd>
    </div>
  );
}
