"use client";

import { useMemo, useState, type JSX } from "react";
import type { CrmDocument, DocumentKind } from "../../lib/crm";
import { documentKindLabel, formatDate } from "../../lib/crm";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

export function DocumentsModule({
  documents,
}: {
  readonly documents: readonly CrmDocument[];
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DocumentKind | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (kind !== "all" && doc.kind !== kind) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.customerName.toLowerCase().includes(q) ||
        doc.kind.includes(q)
      );
    });
  }, [documents, query, kind]);

  const inputStyle = {
    borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
    background: "rgba(255,255,255,0.04)",
    color: "var(--agx-text, #f8fafc)",
  } as const;

  return (
    <CrmGlassCard padding="p-5">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          AI Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quotes, contracts, invoices, Lieferschein…"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </label>
        <label className="block space-y-1.5 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Document type
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DocumentKind | "all")}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="all">All types</option>
            <option value="quote">Quotes</option>
            <option value="contract">Contracts</option>
            <option value="invoice">Invoices</option>
            <option value="lieferschein">Lieferschein</option>
            <option value="purchase_order">Purchase Orders</option>
            <option value="receipt">Receipts</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {["Type", "Title", "Customer", "Status", "Updated"].map((h) => (
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
            {filtered.map((doc) => (
              <tr key={doc.id} style={{ color: "var(--agx-text, #f8fafc)" }}>
                <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                  <CrmBadge tone="accent">{documentKindLabel(doc.kind)}</CrmBadge>
                </td>
                <td className="border-b px-3 py-3 font-medium" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                  {doc.title}
                </td>
                <td className="border-b px-3 py-3" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                  {doc.customerName}
                </td>
                <td className="border-b px-3 py-3 capitalize" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                  {doc.status.replaceAll("_", " ")}
                </td>
                <td className="border-b px-3 py-3 tabular-nums" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}>
                  {formatDate(doc.updatedAt)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  No documents match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </CrmGlassCard>
  );
}
