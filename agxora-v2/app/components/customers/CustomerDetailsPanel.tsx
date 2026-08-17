"use client";

import type { JSX } from "react";
import {
  customerStore,
  useCustomerStore,
  useSelectedCustomer,
} from "../../lib/customers";
import { formatDisplayDateTime, useT } from "../../lib/i18n";
import { Button, Card, Dialog } from "../ui";
import { CustomerStatusBadge } from "./CustomerStatusBadge";

export function CustomerDetailsPanel(): JSX.Element {
  const t = useT();
  const state = useCustomerStore();
  const customer = useSelectedCustomer();

  return (
    <Dialog
      open={state.detailsOpen && Boolean(customer)}
      title={customer?.companyName ?? t("customers.details.titleFallback")}
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
              {t("customers.details.edit")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => customerStore.requestDelete(customer.id)}
            >
              {t("customers.details.delete")}
            </Button>
          </>
        ) : null
      }
    >
      {customer ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <CustomerStatusBadge status={customer.status} />
            {customer.tags.length > 0 ? (
              customer.tags.map((tag) => (
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
              ))
            ) : (
              <span
                className="text-xs"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {t("customers.details.noTags")}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label={t("customers.details.contact")} value={customer.contactPerson} />
            <DetailCard label={t("customers.details.email")} value={customer.email} />
            <DetailCard label={t("customers.details.phone")} value={customer.phone || "—"} />
            <DetailCard label={t("customers.details.mobile")} value={customer.mobile || "—"} />
            <DetailCard
              label={t("customers.details.address")}
              value={[
                customer.street,
                [customer.postalCode, customer.city].filter(Boolean).join(" "),
                customer.country,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            />
            <DetailCard label={t("customers.details.taxNumber")} value={customer.taxNumber || "—"} />
            <DetailCard label={t("customers.details.vatId")} value={customer.vatId || "—"} />
            <DetailCard
              label={t("customers.details.updated")}
              value={formatDisplayDateTime(customer.updatedAt)}
            />
          </div>

          <Card padding="16px" hover={false}>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {t("customers.details.notes")}
            </p>
            <p
              className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {customer.notes || t("customers.details.noNotes")}
            </p>
          </Card>
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
