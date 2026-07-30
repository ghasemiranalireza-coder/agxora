"use client";

import { useMemo, useState, type JSX } from "react";
import type { CrmDocument, DocumentKind } from "../../lib/crm";
import { documentKindLabel, formatDate } from "../../lib/crm";
import { DataTable, FilterSelect, SearchField } from "../ui";
import type { DataTableColumn } from "../ui";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

const COLUMNS: readonly DataTableColumn<CrmDocument>[] = [
  {
    key: "type",
    header: "Type",
    render: (doc) => <CrmBadge tone="accent">{documentKindLabel(doc.kind)}</CrmBadge>,
  },
  {
    key: "title",
    header: "Title",
    render: (doc) => <span className="font-medium">{doc.title}</span>,
  },
  { key: "customer", header: "Customer", render: (doc) => doc.customerName },
  {
    key: "status",
    header: "Status",
    render: (doc) => (
      <span className="capitalize">{doc.status.replaceAll("_", " ")}</span>
    ),
  },
  {
    key: "updated",
    header: "Updated",
    render: (doc) => <span className="tabular-nums">{formatDate(doc.updatedAt)}</span>,
  },
];

export function DocumentsModule({
  documents,
}: {
  readonly documents: readonly CrmDocument[];
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DocumentKind | "all">("all");
  const [page, setPage] = useState(1);

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

  return (
    <CrmGlassCard padding="p-5">
      <DataTable
        columns={COLUMNS}
        rows={filtered}
        rowKey={(doc) => doc.id}
        minWidth={720}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        emptyTitle="No documents"
        emptyDescription="No documents match this search."
        toolbar={
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <SearchField
              label="AI Search"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Quotes, contracts, invoices, Lieferschein…"
            />
            <FilterSelect
              label="Document type"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as DocumentKind | "all");
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              <option value="quote">Quotes</option>
              <option value="contract">Contracts</option>
              <option value="invoice">Invoices</option>
              <option value="lieferschein">Lieferschein</option>
              <option value="purchase_order">Purchase Orders</option>
              <option value="receipt">Receipts</option>
            </FilterSelect>
          </div>
        }
      />
    </CrmGlassCard>
  );
}
