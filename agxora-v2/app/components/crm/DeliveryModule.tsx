"use client";

import { useState, type JSX } from "react";
import type { DeliveryNote } from "../../lib/crm";
import { formatDateTime, trackingLabel } from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { CrmBadge, CrmButton, CrmGlassCard } from "./CrmPrimitives";

function trackingTone(
  status: DeliveryNote["trackingStatus"],
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "completed":
      return "positive";
    case "en_route":
    case "arrived":
      return "accent";
    case "scheduled":
      return "warning";
    default:
      return "critical";
  }
}

const COLUMN_KEYS = [
  "lieferschein",
  "order",
  "customer",
  "kind",
  "driver",
  "vehicle",
  "tracking",
  "scheduled",
] as const;

export function DeliveryModule({
  notes,
}: {
  readonly notes: readonly DeliveryNote[];
}): JSX.Element {
  const { t } = useLocale();
  const [message, setMessage] = useState(t("crm.delivery.notices.exportNotConnected"));

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <CrmGlassCard className="space-y-3 xl:col-span-2" padding="p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("crm.delivery.title")}
        </h3>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("crm.delivery.description")}
        </p>
        <div className="flex flex-wrap gap-2">
          <CrmBadge tone="default">{t("crm.delivery.badges.qrUnavailable")}</CrmBadge>
          <CrmBadge tone="default">{t("crm.delivery.badges.barcodeUnavailable")}</CrmBadge>
          <CrmBadge tone="warning">{t("crm.delivery.badges.signatureDemo")}</CrmBadge>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <CrmButton
            variant="primary"
            onClick={() => setMessage(t("crm.delivery.notices.exportPdfUnavailable"))}
          >
            {t("crm.delivery.exportPdf")}
          </CrmButton>
          <CrmButton
            onClick={() => setMessage(t("crm.delivery.notices.historyNotConnected"))}
          >
            {t("crm.delivery.deliveryHistory")}
          </CrmButton>
        </div>
        <p
          className="text-xs"
          role="status"
          aria-live="polite"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {message}
        </p>
      </CrmGlassCard>

      <CrmGlassCard className="xl:col-span-3" padding="p-5">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead>
              <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {COLUMN_KEYS.map((key) => (
                  <th
                    key={key}
                    className="border-b px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}
                  >
                    {t(`crm.delivery.columns.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id} style={{ color: "var(--agx-text, #f8fafc)" }}>
                  <td className="border-b px-3 py-3 font-medium" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {note.number}
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {note.orderNumber}
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {note.customerName}
                  </td>
                  <td className="border-b px-3 py-3 capitalize" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {note.kind}
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {note.driver}
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {note.vehicle}
                  </td>
                  <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    <CrmBadge tone={trackingTone(note.trackingStatus)}>
                      {t(trackingLabel(note.trackingStatus))}
                    </CrmBadge>
                  </td>
                  <td className="border-b px-3 py-3 tabular-nums" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                    {formatDateTime(note.scheduledAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CrmGlassCard>
    </div>
  );
}
