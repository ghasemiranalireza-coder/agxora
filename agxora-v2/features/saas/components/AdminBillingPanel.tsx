"use client";

import { useEffect, useMemo, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
import { saasCommercialStore } from "../store";
import { billingService } from "../billing";
import {
  grantLifetimeLicense,
  suspendLicense,
} from "../license";
import { useSaasCommercial } from "../hooks/useSaasCommercial";
import { listQueuedEmails } from "../email";
import type {
  BillingInvoice,
  LicenseRecord,
  SaasAuditEvent,
} from "../types";
import { SaasNavLink } from "./SaasNavLink";

/**
 * Internal admin billing panel — subscriptions, plans, licenses, usage, audit.
 */
export function AdminBillingPanel(): JSX.Element {
  const t = useT();
  const saas = useSaasCommercial();

  useEffect(() => {
    saasCommercialStore.hydrate();
  }, []);

  const licenseColumns: DataTableColumn<LicenseRecord>[] = useMemo(
    () => [
      {
        key: "organizationId",
        header: t("billing.admin.columns.organization"),
        render: (r) => r.organizationId,
      },
      {
        key: "planId",
        header: t("billing.admin.columns.plan"),
        render: (r) => r.planId,
      },
      {
        key: "status",
        header: t("billing.admin.columns.status"),
        render: (r) => r.status,
      },
      {
        key: "seats",
        header: t("billing.admin.columns.seats"),
        render: (r) => String(r.seats),
      },
      {
        key: "actions",
        header: t("billing.admin.columns.actions"),
        render: (r) => (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                suspendLicense(r.organizationId, saas.userId ?? undefined)
              }
            >
              {t("billing.admin.suspend")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                grantLifetimeLicense(
                  r.organizationId,
                  "enterprise",
                  saas.userId ?? undefined,
                )
              }
            >
              {t("billing.admin.lifetime")}
            </Button>
          </div>
        ),
      },
    ],
    [saas.userId, t],
  );

  const invoiceColumns: DataTableColumn<BillingInvoice>[] = useMemo(
    () => [
      {
        key: "number",
        header: t("billing.admin.columns.invoice"),
        render: (r) => r.number,
      },
      {
        key: "organizationId",
        header: t("billing.admin.columns.org"),
        render: (r) => r.organizationId,
      },
      {
        key: "status",
        header: t("billing.admin.columns.status"),
        render: (r) => r.status,
      },
      {
        key: "amountUsd",
        header: t("billing.admin.columns.amount"),
        render: (r) => `€${r.amountUsd.toFixed(2)}`,
      },
      {
        key: "refund",
        header: "",
        render: (r) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              billingService.refundPlaceholder(
                r.organizationId,
                r.id,
                saas.userId ?? undefined,
              )
            }
          >
            {t("billing.admin.refund")}
          </Button>
        ),
      },
    ],
    [saas.userId, t],
  );

  const auditColumns: DataTableColumn<SaasAuditEvent>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: t("billing.admin.columns.when"),
        render: (r) => new Date(r.createdAt).toLocaleString(),
      },
      {
        key: "action",
        header: t("billing.admin.columns.action"),
        render: (r) => r.action,
      },
      {
        key: "organizationId",
        header: t("billing.admin.columns.org"),
        render: (r) => r.organizationId,
      },
    ],
    [t],
  );

  if (!saas.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("billing.admin.loading")}
      </div>
    );
  }

  const emails = listQueuedEmails();

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("billing.admin.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("billing.admin.title")}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("billing.admin.lead")}
        </p>
        <SaasNavLink href="/dashboard/billing" variant="secondary">
          {t("billing.admin.customerPortal")}
        </SaasNavLink>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("billing.admin.licenses")}
        </h2>
        <DataTable
          columns={licenseColumns}
          rows={[...saas.allLicenses]}
          rowKey={(r) => r.id}
          minWidth={720}
        />
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("billing.admin.allInvoices")}
        </h2>
        <DataTable
          columns={invoiceColumns}
          rows={[...saas.allInvoices]}
          rowKey={(r) => r.id}
          minWidth={720}
        />
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("billing.admin.planCatalog")}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {saas.plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl p-3 text-sm"
              style={{
                border:
                  "1px solid color-mix(in srgb, var(--agx-border, #334155) 55%, transparent)",
                color: "var(--agx-text, #f8fafc)",
              }}
            >
              <p className="font-medium">{plan.name}</p>
              <p
                className="mt-1 text-[11px]"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {plan.priceMonthlyUsd == null
                  ? t("billing.admin.custom")
                  : t("billing.planCard.pricePerMonth", {
                      price: plan.priceMonthlyUsd,
                    })}{" "}
                · {t("billing.admin.features", { count: plan.features.length })}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("billing.admin.emailQueue")}
        </h2>
        {emails.length === 0 ? (
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("billing.admin.noEmails")}
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {emails.slice(0, 8).map((mail) => (
              <li
                key={mail.id}
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                [{mail.status}] {mail.templateId} → {mail.to} — {mail.subject}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("billing.admin.commercialAudit")}
        </h2>
        <DataTable
          columns={auditColumns}
          rows={[...saasCommercialStore.listAudit()].slice(0, 40)}
          rowKey={(r) => r.id}
          minWidth={640}
        />
      </Card>
    </div>
  );
}
