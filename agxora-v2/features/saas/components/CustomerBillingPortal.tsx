"use client";

import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
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
import { BillingPlanCard } from "./BillingPlanCard";
import { SaasNavLink } from "./SaasNavLink";

/**
 * Customer subscription portal — upgrade/downgrade/cancel, invoices, usage, methods.
 */
export function CustomerBillingPortal(): JSX.Element {
  const t = useT();
  const saas = useSaasCommercial();
  const [providerId, setProviderId] = useState<PaymentProviderId>("stripe");
  const [coupon, setCoupon] = useState("");
  const [notice, setNotice] = useState(t("billing.portal.noticeInitial"));
  const [busy, setBusy] = useState(false);
  const [selectingPlanId, setSelectingPlanId] = useState<CommercialPlanId | null>(
    null,
  );
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
      billingEmail: saas.email ?? "",
    });
    refreshSubscriptionNotifications(saas.organizationId, saas.email);
  }, [saas.hydrated, saas.organizationId, saas.email]);

  const profileName =
    draftProfile?.companyName ?? saas.profile?.companyName ?? "";
  const profileEmail =
    draftProfile?.billingEmail ?? saas.profile?.billingEmail ?? "";
  const vatId = draftProfile?.vatId ?? saas.profile?.vatId ?? "";
  const taxId = draftProfile?.taxId ?? saas.profile?.taxId ?? "";

  const invoiceColumns: DataTableColumn<BillingInvoice>[] = useMemo(
    () => [
      {
        key: "number",
        header: t("billing.portal.columns.invoice"),
        render: (r) => r.number,
      },
      {
        key: "status",
        header: t("billing.portal.columns.status"),
        render: (r) => r.status,
      },
      {
        key: "amountUsd",
        header: t("billing.portal.columns.amount"),
        render: (r) => `€${r.amountUsd.toFixed(2)}`,
      },
      {
        key: "issuedAt",
        header: t("billing.portal.columns.issued"),
        render: (r) => r.issuedAt.slice(0, 10),
      },
    ],
    [t],
  );

  const quotaColumns: DataTableColumn<QuotaCheckResult>[] = useMemo(
    () => [
      {
        key: "metric",
        header: t("billing.portal.columns.metric"),
        render: (r) => r.metric,
      },
      {
        key: "used",
        header: t("billing.portal.columns.used"),
        render: (r) => String(r.used),
      },
      {
        key: "limit",
        header: t("billing.portal.columns.limit"),
        render: (r) => String(r.limit),
      },
      {
        key: "status",
        header: t("billing.portal.columns.status"),
        render: (r) =>
          r.exceeded
            ? t("billing.portal.quotaStatus.exceeded")
            : r.softWarning
              ? t("billing.portal.quotaStatus.warning")
              : t("billing.portal.quotaStatus.ok"),
      },
    ],
    [t],
  );

  const onCheckout = async (planId: CommercialPlanId) => {
    setBusy(true);
    setSelectingPlanId(planId);
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
      setNotice(
        t("billing.portal.noticeActivated", {
          planId,
          providerId: session.providerId,
        }),
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : t("billing.portal.noticeCheckoutFailed"),
      );
    } finally {
      setBusy(false);
      setSelectingPlanId(null);
    }
  };

  const onCancel = () => {
    billingService.cancel(
      saas.organizationId,
      saas.userId ?? undefined,
      saas.email,
    );
    setNotice(t("billing.portal.noticeCancelled"));
  };

  const onRenew = () => {
    billingService.renew(
      saas.organizationId,
      saas.userId ?? undefined,
      saas.email,
    );
    setNotice(t("billing.portal.noticeRenewed"));
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
    setNotice(t("billing.portal.noticeProfileSaved"));
  };

  if (!saas.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("billing.portal.loading")}
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
          {t("billing.portal.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("billing.portal.title")}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("billing.portal.lead")}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <SaasNavLink href="/pricing" variant="secondary">
            {t("billing.publicPricing")}
          </SaasNavLink>
          <SaasNavLink href="/contact-sales" variant="secondary">
            {t("billing.contactSales")}
          </SaasNavLink>
          <SaasNavLink href="/dashboard/billing/admin" variant="secondary">
            {t("billing.portal.adminBilling")}
          </SaasNavLink>
          <SaasNavLink href="/dashboard/settings#billing" variant="ghost">
            {t("billing.portal.settingsBilling")}
          </SaasNavLink>
        </div>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("billing.portal.currentLicense")}
        </h2>
        <dl className="grid gap-3 sm:grid-cols-4 text-sm">
          <Meta label={t("billing.portal.plan")} value={saas.license?.planId ?? "—"} />
          <Meta label={t("billing.portal.status")} value={saas.licenseStatus ?? "—"} />
          <Meta label={t("billing.portal.seats")} value={String(saas.license?.seats ?? "—")} />
          <Meta
            label={t("billing.portal.renewsTrial")}
            value={
              (saas.license?.renewsAt ?? saas.license?.trialEndsAt ?? "—").slice(
                0,
                10,
              )
            }
          />
        </dl>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("billing.portal.enabledModules", {
            modules: saas.features.join(", ") || t("billing.portal.none"),
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={onRenew} disabled={busy}>
            {t("billing.portal.renew")}
          </Button>
          <Button size="sm" variant="danger" onClick={onCancel} disabled={busy}>
            {t("billing.portal.cancelSubscription")}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4" padding="20px" hover={false}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("billing.portal.plans")}
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-2" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("billing.portal.provider")}
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value as PaymentProviderId)}
                className="agx-ui-control rounded-lg border px-2 py-1"
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
              placeholder={t("billing.portal.couponPlaceholder")}
              className="agx-ui-control rounded-lg border px-2 py-1"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {saas.plans.map((plan) => {
            const current = saas.license?.planId === plan.id;
            return (
              <BillingPlanCard
                key={plan.id}
                plan={plan}
                current={current}
                busy={busy}
                selecting={selectingPlanId === plan.id}
                onSelect={(planId) => void onCheckout(planId)}
              />
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("billing.portal.usageQuotas")}
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
            {t("billing.portal.invoices")}
          </h2>
          {saas.invoices.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("billing.portal.noInvoices")}
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
            {t("billing.portal.paymentMethods")}
          </h2>
          {saas.paymentMethods.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("billing.portal.noPaymentMethods")}
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
                  {m.isDefault ? ` · ${t("billing.portal.default")}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("billing.portal.companyProfile")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("billing.portal.company")}>
            <input
              value={profileName}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  companyName: e.target.value,
                }))
              }
              className="agx-ui-control w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("billing.portal.billingEmail")}>
            <input
              value={profileEmail}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  billingEmail: e.target.value,
                }))
              }
              className="agx-ui-control w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("billing.portal.vatId")}>
            <input
              value={vatId}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  vatId: e.target.value,
                }))
              }
              className="agx-ui-control w-full rounded-xl border px-3 py-2 text-sm"
              placeholder={t("billing.portal.vatPlaceholder")}
            />
          </Field>
          <Field label={t("billing.portal.taxId")}>
            <input
              value={taxId}
              onChange={(e) =>
                setDraftProfile((prev) => ({
                  ...prev,
                  taxId: e.target.value,
                }))
              }
              className="agx-ui-control w-full rounded-xl border px-3 py-2 text-sm"
              placeholder={t("billing.portal.taxPlaceholder")}
            />
          </Field>
        </div>
        <Button size="sm" variant="primary" onClick={saveProfile}>
          {t("billing.portal.saveProfile")}
        </Button>
      </Card>

      <Card className="space-y-2" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("billing.portal.notifications")}
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
            {t("billing.portal.noNotifications")}
          </p>
        ) : null}
      </Card>

      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </div>
  );
}


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
