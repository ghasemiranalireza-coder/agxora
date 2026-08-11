"use client";

import { useState, type JSX } from "react";
import type { DatevExportRecord, ExportFormat } from "../../lib/finance";
import { exportStatusLabel, formatDate } from "../../lib/finance";
import { useLocale } from "../../lib/i18n";
import { FinanceBadge, FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

const EXPORT_FORMATS: readonly ExportFormat[] = ["datev", "csv", "pdf", "xml"];

const HISTORY_COLUMNS = [
  "export",
  "format",
  "period",
  "created",
  "status",
  "steuerberater",
] as const;

function exportTone(
  status: DatevExportRecord["status"],
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "delivered":
      return "positive";
    case "ready":
      return "accent";
    case "queued":
      return "warning";
    default:
      return "critical";
  }
}

export function DatevIntegration({
  history,
}: {
  readonly history: readonly DatevExportRecord[];
}): JSX.Element {
  const { t } = useLocale();
  const [noticeKey, setNoticeKey] = useState<
    "default" | "exportUnavailable" | "refreshUnavailable"
  >("default");
  const [unavailableTitle, setUnavailableTitle] = useState("");

  const notice =
    noticeKey === "exportUnavailable"
      ? t("finance.datev.exportUnavailable", { title: unavailableTitle })
      : noticeKey === "refreshUnavailable"
        ? t("finance.datev.refreshUnavailable")
        : t("finance.datev.noticeDefault");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <FinanceGlassCard className="space-y-4 xl:col-span-2" padding="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("finance.datev.title")}
          </h3>
          <FinanceBadge tone="warning">
            {t("finance.datev.notConnected")}
          </FinanceBadge>
        </div>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("finance.datev.intro")}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXPORT_FORMATS.map((format) => {
            const title = t(`finance.datev.actions.${format}.title`);
            return (
              <button
                key={format}
                type="button"
                onClick={() => {
                  setUnavailableTitle(title);
                  setNoticeKey("exportUnavailable");
                }}
                className="min-h-[5.5rem] rounded-2xl border p-4 text-start transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
                  background: "rgba(255,255,255,0.03)",
                  outlineColor: "var(--agx-accent, #22d3ee)",
                }}
                aria-label={t("finance.datev.exportUnavailableAria", {
                  title,
                })}
              >
                <p
                  className="font-medium"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {title}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {t(`finance.datev.actions.${format}.description`)}
                </p>
              </button>
            );
          })}
        </div>
        <p
          className="text-xs"
          role="status"
          aria-live="polite"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {notice}
        </p>
      </FinanceGlassCard>

      <FinanceGlassCard className="xl:col-span-3" padding="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("finance.datev.historyTitle")}
          </h3>
          <FinanceButton onClick={() => setNoticeKey("refreshUnavailable")}>
            {t("finance.datev.refresh")}
          </FinanceButton>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full border-collapse text-start text-sm">
            <thead>
              <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {HISTORY_COLUMNS.map((h) => (
                  <th
                    key={h}
                    className="border-b px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                    }}
                  >
                    {t(`finance.datev.columns.${h}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} style={{ color: "var(--agx-text, #f8fafc)" }}>
                  <td
                    className="border-b px-3 py-3"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))",
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    className="border-b px-3 py-3 uppercase"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))",
                    }}
                  >
                    {row.format}
                  </td>
                  <td
                    className="border-b px-3 py-3"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))",
                    }}
                  >
                    {row.period}
                  </td>
                  <td
                    className="border-b px-3 py-3 tabular-nums"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))",
                    }}
                  >
                    {formatDate(row.createdAt)}
                  </td>
                  <td
                    className="border-b px-3 py-3"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))",
                    }}
                  >
                    <FinanceBadge tone={exportTone(row.status)}>
                      {t(exportStatusLabel(row.status))}
                    </FinanceBadge>
                  </td>
                  <td
                    className="border-b px-3 py-3"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))",
                    }}
                  >
                    <FinanceBadge
                      tone={row.steuerberaterReady ? "accent" : "warning"}
                    >
                      {row.steuerberaterReady
                        ? t("finance.datev.steuerberaterSample")
                        : t("finance.datev.steuerberaterPending")}
                    </FinanceBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FinanceGlassCard>
    </div>
  );
}
