"use client";

/**
 * Account billing summary — current plan, renewal, usage, invoices, upgrade CTA.
 */

import Link from "next/link";
import { useEffect, type JSX } from "react";
import { Button } from "@/app/components/ui";
import { getCommercialPlan } from "../plans";
import { saasCommercialStore } from "../store";
import { billingService } from "../billing";
import { useSaasCommercial } from "../hooks/useSaasCommercial";

export function AccountBillingSection(): JSX.Element {
  const saas = useSaasCommercial();

  useEffect(() => {
    saasCommercialStore.hydrate();
  }, []);

  useEffect(() => {
    if (!saas.hydrated) return;
    billingService.ensureWorkspace(saas.organizationId);
    billingService.getOrCreateProfile(saas.organizationId, {
      companyName: "AGXORA Organization",
      billingEmail: saas.email ?? "billing@example.com",
    });
  }, [saas.hydrated, saas.organizationId, saas.email]);

  if (!saas.hydrated) {
    return (
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Loading billing…
      </p>
    );
  }

  const planName = saas.license
    ? getCommercialPlan(saas.license.planId).name
    : "—";
  const renewal =
    (saas.license?.renewsAt ?? saas.license?.trialEndsAt ?? "—").slice(0, 10);
  const topUsage = saas.quotas.slice(0, 4);
  const recentInvoices = saas.invoices.slice(0, 5);

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <Meta label="Current Plan" value={planName} />
        <Meta label="Status" value={saas.licenseStatus ?? "—"} />
        <Meta label="Renewal Date" value={renewal} />
        <Meta label="Seats" value={String(saas.license?.seats ?? "—")} />
      </dl>

      <div>
        <h3
          className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Usage
        </h3>
        {topUsage.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            No usage metrics yet.
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
                  {q.metric.replace(/_/g, " ")}
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
          Invoices
        </h3>
        {recentInvoices.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            No billing history yet. Upgrade a plan to generate invoices and renewals.
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
                  {inv.number} · {inv.status}
                </span>
                <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  ${inv.amountUsd.toFixed(2)} · {inv.issuedAt.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/billing">
          <Button size="sm" variant="primary">
            Upgrade
          </Button>
        </Link>
        <Link href="/pricing">
          <Button size="sm" variant="secondary">
            View pricing
          </Button>
        </Link>
        <Link href="/contact-sales">
          <Button size="sm" variant="ghost">
            Contact Sales
          </Button>
        </Link>
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
