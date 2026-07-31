"use client";

import type { JSX } from "react";
import { customerStore, useCustomerStore, useSelectedCustomer } from "../../lib/customers";
import { Button, Card, Dialog } from "../ui";
import { CustomerStatusBadge } from "./CustomerStatusBadge";

const DETAIL_TABS = [
  "Profile",
  "Projects",
  "Invoices",
  "Documents",
  "Activity",
  "Notes",
] as const;

export function CustomerDetailsPanel(): JSX.Element {
  const state = useCustomerStore();
  const customer = useSelectedCustomer();

  return (
    <Dialog
      open={state.detailsOpen && Boolean(customer)}
      title={customer?.companyName ?? "Customer"}
      wide
      onClose={() => customerStore.closeDetails()}
      footer={
        customer ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => customerStore.openEdit(customer)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => customerStore.requestDelete(customer.id)}
            >
              Delete
            </Button>
          </>
        ) : null
      }
    >
      {customer ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <CustomerStatusBadge status={customer.status} />
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border px-2 py-0.5 text-[11px]"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  color: "var(--agx-text-muted, #94a3b8)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {DETAIL_TABS.map((tab) => (
              <span
                key={tab}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor:
                    tab === "Profile"
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)"
                      : "var(--agx-card-border, rgba(255,255,255,0.12))",
                  color:
                    tab === "Profile"
                      ? "var(--agx-accent, #22d3ee)"
                      : "var(--agx-text-muted, #94a3b8)",
                  background:
                    tab === "Profile"
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
                      : "transparent",
                }}
              >
                {tab}
                {tab !== "Profile" ? " · soon" : ""}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Contact" value={customer.contactPerson} />
            <DetailCard label="Email" value={customer.email} />
            <DetailCard label="Phone" value={customer.phone || "—"} />
            <DetailCard label="Mobile" value={customer.mobile || "—"} />
            <DetailCard
              label="Address"
              value={[
                customer.street,
                [customer.postalCode, customer.city].filter(Boolean).join(" "),
                customer.country,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            />
            <DetailCard label="Tax Number" value={customer.taxNumber || "—"} />
            <DetailCard label="VAT ID" value={customer.vatId || "—"} />
            <DetailCard
              label="Updated"
              value={new Date(customer.updatedAt).toLocaleString()}
            />
          </div>

          <Card padding="16px" hover={false}>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              Notes
            </p>
            <p
              className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {customer.notes || "No notes yet."}
            </p>
          </Card>

          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Projects, Invoices, Documents, and Activity tabs are architecture-ready
            for future module wiring.
          </p>
        </div>
      ) : null}
    </Dialog>
  );
}

function DetailCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <Card padding="14px" hover={false}>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </p>
      <p className="mt-1.5 text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </p>
    </Card>
  );
}
