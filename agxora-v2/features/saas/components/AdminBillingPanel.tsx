"use client";

import { useEffect, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
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
  const saas = useSaasCommercial();

  useEffect(() => {
    saasCommercialStore.hydrate();
  }, []);

  const licenseColumns: DataTableColumn<LicenseRecord>[] = [
    { key: "organizationId", header: "Organization", render: (r) => r.organizationId },
    { key: "planId", header: "Plan", render: (r) => r.planId },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "seats", header: "Seats", render: (r) => String(r.seats) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              suspendLicense(r.organizationId, saas.userId ?? undefined)
            }
          >
            Suspend
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
            Lifetime
          </Button>
        </div>
      ),
    },
  ];

  const invoiceColumns: DataTableColumn<BillingInvoice>[] = [
    { key: "number", header: "Invoice", render: (r) => r.number },
    {
      key: "organizationId",
      header: "Org",
      render: (r) => r.organizationId,
    },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "amountUsd",
      header: "Amount",
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
          Refund
        </Button>
      ),
    },
  ];

  const auditColumns: DataTableColumn<SaasAuditEvent>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    { key: "action", header: "Action", render: (r) => r.action },
    {
      key: "organizationId",
      header: "Org",
      render: (r) => r.organizationId,
    },
  ];

  if (!saas.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Loading admin billing…
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
          Admin
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Billing administration
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Internal management for subscriptions, licenses, invoices, email queue,
          and commercial audit events.
        </p>
        <SaasNavLink href="/dashboard/billing" variant="secondary">
          Customer portal
        </SaasNavLink>
      </Card>

      <Card className="space-y-3" padding="20px" hover={false}>
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Licenses & subscriptions
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
          All invoices
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
          Plan catalog
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
                  ? "Custom"
                  : `€${plan.priceMonthlyUsd}/mo`}{" "}
                · {plan.features.length} features
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
          Email queue (mock)
        </h2>
        {emails.length === 0 ? (
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            No emails queued.
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
          Commercial audit
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
