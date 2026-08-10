"use client";

import { useState, type JSX } from "react";
import type { DatevExportRecord, ExportFormat } from "../../lib/finance";
import { exportStatusLabel, formatDate } from "../../lib/finance";
import { FinanceBadge, FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

const EXPORT_ACTIONS: {
  readonly format: ExportFormat;
  readonly title: string;
  readonly description: string;
}[] = [
  {
    format: "datev",
    title: "DATEV Export",
    description: "Buchungsstapel package for Steuerberater workflows.",
  },
  {
    format: "csv",
    title: "CSV Export",
    description: "Ledger-ready CSV for spreadsheets and imports.",
  },
  {
    format: "pdf",
    title: "PDF Export",
    description: "Document pack for review and archival.",
  },
  {
    format: "xml",
    title: "XML Export",
    description: "Structured tax XML for filing pipelines.",
  },
];

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
  const [notice, setNotice] = useState(
    "Export adapters are not connected — no files will be generated.",
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <FinanceGlassCard className="space-y-4 xl:col-span-2" padding="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            DATEV Integration
          </h3>
          <FinanceBadge tone="warning">Not connected</FinanceBadge>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Sample export history below is illustrative. Credentials and file
          generation are not wired in this build.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXPORT_ACTIONS.map((action) => (
            <button
              key={action.format}
              type="button"
              onClick={() =>
                setNotice(
                  `${action.title} unavailable — DATEV / file export is not connected.`,
                )
              }
              className="min-h-[5.5rem] rounded-2xl border p-4 text-left transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
                background: "rgba(255,255,255,0.03)",
                outlineColor: "var(--agx-accent, #22d3ee)",
              }}
              aria-label={`${action.title} — unavailable`}
            >
              <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {action.title}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {action.description}
              </p>
            </button>
          ))}
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
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Export History (sample)
          </h3>
          <FinanceButton
            onClick={() =>
              setNotice(
                "Refresh unavailable — export history is static sample data.",
              )
            }
          >
            Refresh
          </FinanceButton>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full border-collapse text-left text-sm">
            <thead>
              <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {["Export", "Format", "Period", "Created", "Status", "Steuerberater"].map((h) => (
                  <th
                    key={h}
                    className="border-b px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} style={{ color: "var(--agx-text, #f8fafc)" }}>
                  <td
                    className="border-b px-3 py-3"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                  >
                    {row.label}
                  </td>
                  <td
                    className="border-b px-3 py-3 uppercase"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                  >
                    {row.format}
                  </td>
                  <td
                    className="border-b px-3 py-3"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                  >
                    {row.period}
                  </td>
                  <td
                    className="border-b px-3 py-3 tabular-nums"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                  >
                    {formatDate(row.createdAt)}
                  </td>
                  <td
                    className="border-b px-3 py-3"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                  >
                    <FinanceBadge tone={exportTone(row.status)}>
                      {exportStatusLabel(row.status)}
                    </FinanceBadge>
                  </td>
                  <td
                    className="border-b px-3 py-3"
                    style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
                  >
                    <FinanceBadge tone={row.steuerberaterReady ? "accent" : "warning"}>
                      {row.steuerberaterReady ? "Sample" : "Pending"}
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
