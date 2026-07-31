"use client";

import Link from "next/link";
import { useEffect, useState, type JSX, type ReactNode } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { saasCommercialStore } from "../store";
import { billingService } from "../billing";
import { listPaymentProviders } from "../payments";
import { refreshSubscriptionNotifications } from "../notifications";
import { useSaasCommercial } from "../hooks/useSaasCommercial";
import type {
  BillingInvoice,
  CommercialPlanId,
  PaymentProviderId,
  QuotaCheckResult,
} from "../types";

/**
 * Customer subscription portal — upgrade/downgrade/cancel, invoices, usage, methods.
 */
export function CustomerBillingPortal(): JSX.Element {
  const saas = useSaasCommercial();
  const [providerId, setProviderId] = useState<PaymentProviderId>("stripe");
  const [coupon, setCoupon] = useState("");
  const [notice, setNotice] = useState(
    "Billing runs through the commercial service layer — no payment SDK in the UI.",
  );
  const [busy, setBusy] = useState(false);
  const [draftProfile, setDraftProfile] = useState<{
    companyName?: string;
    billingEmail?: string;
    vatId?: string;
    taxId?: string;
  } | null>(null);

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
    refreshSubscriptionNotifications(saas.organizationId, saas.email);
  }, [saas.hydrated, saas.organizationId, saas.email]);

  const profileName =
    draftProfile?.companyName ?? saas.profile?.companyName ?? "";
  const profileEmail =
    draftProfile?.billingEmail ?? saas.profile?.billingEmail ?? "";
  const vatId = draftProfile?.vatId ?? saas.profile?.vatId ?? "";
  const taxId = draftProfile?.taxId ?? saas.profile?.taxId ?? "";

  const invoiceColumns: DataTableColumn<BillingInvoice>[] = [
    { key: "number", header: "Invoice", render: (r) => r.number },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "amountUsd",
      header: "Amount",
      render: (r) => `$${r.amountUsd.toFixed(2)}`,
    },
    {
      key: "issuedAt",
      header: "Issued",
      render: (r) => r.issuedAt.slice(0, 10),
    },
  ];

  const quotaColumns: DataTableColumn<QuotaCheckResult>[] = [
    { key: "metric", header: "Metric", render: (r) => r.metric },
    { key: "used", header: "Used", render: (r) => String(r.used) },
    { key: "limit", header: "Limit", render: (r) => String(r.limit) },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.exceeded ? "Exceeded" : r.softWarning ? "Warning" : "OK",
    },
  ];

  const onCheckout = async (planId: CommercialPlanId) => {
    setBusy(true);
    try {
      const { session, amountUsd } = await billingService.startCheckout({
        organizationId: saas.organizationId,
        planId,
        providerId,
        actorUserId: saas.userId ?? undefined,
        email: saas.email,
        couponCode: coupon || undefined,
      });
      billingService.completeCheckout({
        organizationId: saas.organizationId,
        planId,
        amountUsd,
        providerId: session.providerId,
        actorUserId: saas.userId ?? undefined,
        email: saas.email,
      });
      setNotice(`Activated ${planId} via ${session.providerId} (mock checkout).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  const onCancel = () => {
    billingService.cancel(
      saas.organizationId,
      saas.userId ?? undefined,
      saas.email,
    );
    setNotice("Subscription cancelled.");
  };

  const saveProfile = () => {
    billingService.updateProfile({
      organizationId: saas.organizationId,
      companyName: profileName,
      billingEmail: profileEmail,
      vatId: vatId || undefined,
      taxId: taxId || undefined,
      country: saas.profile?.country ?? "DE",
      updatedAt: new Date().toISOString(),
    });
    setNotice("Billing profile saved.");
  };

  if (!saas.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Loading billing…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          Commercial SaaS
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Subscription & Billing
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Manage your plan, usage quotas, invoices, and payment methods.
          Payment providers stay behind the billing service.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/dashboard/billing/admin">
            <Button size="sm" variant="secondary">
              Admin billing
            </Button>
          </Link>
          <Link href="/dashboard/settings#billing">
            <Button size="sm" variant="ghost">
              Settings billing
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Current license
        </h2>
        <dl className="grid gap-3 sm:grid-cols-4 text-sm">
          <Meta label="Plan" value={saas.license?.planId ?? "—"} />
          <Meta label="Status" value={saas.licenseStatus ?? "—"} />
          <Meta label="Seats" value={String(saas.license?.seats ?? "—")} />
          <Meta
            label="Renews / trial"
            value={
              (saas.license?.renewsAt ?? saas.license?.trialEndsAt ?? "—").slice(
                0,
                10,
              )
            }
          />
        </dl>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Enabled modules: {saas.features.join(", ") || "none"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="danger" onClick={onCancel} disabled={busy}>
            Cancel subscription
          </Button>
        </div>
      </Card>

      <Card className="space-y-4" padding="20px" hover={false}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Plans
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-2" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Provider
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value as PaymentProviderId)}
                className="rounded-lg border px-2 py-1"
                style={fieldStyle}
              >
                {listPaymentProviders().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon (LAUNCH20)"
              className="rounded-lg border px-2 py-1"
              style={fieldStyle}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {saas.plans.map((plan) => {
            const current = saas.license?.planId === plan.id;
            return (
              <div
                key={plan.id}
                className="flex flex-col gap-2 rounded-2xl p-4"
                style={{
                  border: plan.highlighted
                    ? "1px solid color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)"
                    : "1px solid color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)",
                  background: plan.highlighted
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 8%, transparent)"
                    : "transparent",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {plan.name}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {plan.description}
                </p>
                <p className="text-lg font-semibold" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                  {plan.priceMonthlyUsd == null
                    ? "Contact sales"
                    : `$${plan.priceMonthlyUsd}/mo`}
                </p>
                <ul className="space-y-1 text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  <li>{plan.limits.users} users</li>
                  <li>{plan.limits.aiRequestsPerMonth.toLocaleString()} AI req/mo</li>
                  <li>{plan.limits.storageMb.toLocaleString()} MB storage</li>
                  <li>{plan.features.length} module features</li>
                </ul>
                <Button
                  size="sm"
                  variant={current ? "secondary" : "primary"}
                  disabled={busy || current || plan.priceMonthlyUsd == null}
                  onClick={() => void onCheckout(plan.id)}
                >
                  {current
                    ? "Current plan"
                    : plan.priceMonthlyUsd == null
                      ? "Contact sales"
                      : "Choose plan"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Usage & quotas
        </h2>
        <DataTable
          columns={quotaColumns}
          rows={[...saas.quotas]}
          rowKey={(r) => r.metric}
          minWidth={560}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Invoices
          </h2>
          {saas.invoices.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              No invoices yet.
            </p>
          ) : (
            <DataTable
              columns={invoiceColumns}
              rows={[...saas.invoices]}
              rowKey={(r) => r.id}
              minWidth={480}
            />
          )}
        </Card>

        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Payment methods
          </h2>
          {saas.paymentMethods.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              No payment methods on file.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {saas.paymentMethods.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl px-3 py-2"
                  style={{
                    border:
                      "1px solid color-mix(in srgb, var(--agx-border, #334155) 55%, transparent)",
                    color: "var(--agx-text, #f8fafc)",
                  }}
                >
                  {m.brand} ···· {m.last4} · {m.providerId}
                  {m.isDefault ? " · default" : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Company billing profile
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <input
              value={profileName}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  companyName: e.target.value,
                }))
              }
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
            />
          </Field>
          <Field label="Billing email">
            <input
              value={profileEmail}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  billingEmail: e.target.value,
                }))
              }
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
            />
          </Field>
          <Field label="VAT ID">
            <input
              value={vatId}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  vatId: e.target.value,
                }))
              }
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
              placeholder="Placeholder"
            />
          </Field>
          <Field label="Tax ID">
            <input
              value={taxId}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  taxId: e.target.value,
                }))
              }
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
              placeholder="Placeholder"
            />
          </Field>
        </div>
        <Button size="sm" variant="primary" onClick={saveProfile}>
          Save profile
        </Button>
      </Card>

      <Card className="space-y-2" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Notifications
        </h2>
        {saas.notifications.slice(0, 6).map((n) => (
          <div
            key={n.id}
            className="rounded-xl px-3 py-2 text-sm"
            style={{
              border:
                "1px solid color-mix(in srgb, var(--agx-border, #334155) 50%, transparent)",
              color: "var(--agx-text, #f8fafc)",
              opacity: n.read ? 0.65 : 1,
            }}
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {n.body}
            </p>
          </div>
        ))}
        {saas.notifications.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            No billing notifications.
          </p>
        ) : null}
      </Card>

      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </div>
  );
}

const fieldStyle = {
  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
  background: "rgba(255,255,255,0.04)",
  color: "var(--agx-text, #f8fafc)",
} as const;

function Meta({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {label}
      </dt>
      <dd className="mt-1" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </dd>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span
        className="block text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
