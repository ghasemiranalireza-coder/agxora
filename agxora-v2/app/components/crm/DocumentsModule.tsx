"use client";

import { useMemo, useState, type JSX } from "react";
import type { CrmDocument, DocumentKind } from "../../lib/crm";
import { documentKindLabel, documentStatusLabel, formatDate } from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { DataTable, FilterSelect, SearchField } from "../ui";
import type { DataTableColumn } from "../ui";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

const DOCUMENT_KINDS: readonly DocumentKind[] = [
  "quote",
  "contract",
  "invoice",
  "lieferschein",
  "purchase_order",
  "receipt",
];

export function DocumentsModule({
  documents,
}: {
  readonly documents: readonly CrmDocument[];
}): JSX.Element {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DocumentKind | "all">("all");
  const [page, setPage] = useState(1);

  const columns: readonly DataTableColumn<CrmDocument>[] = useMemo(
    () => [
      {
        key: "type",
        header: t("crm.documentsModule.columns.type"),
        render: (doc) => (
          <CrmBadge tone="accent">{t(documentKindLabel(doc.kind))}</CrmBadge>
        ),
      },
      {
        key: "title",
        header: t("crm.documentsModule.columns.title"),
        render: (doc) => <span className="font-medium">{doc.title}</span>,
      },
      {
        key: "customer",
        header: t("crm.documentsModule.columns.customer"),
        render: (doc) => doc.customerName,
      },
      {
        key: "status",
        header: t("crm.documentsModule.columns.status"),
        render: (doc) => {
          const statusKey = documentStatusLabel(doc.status);
          const statusLabel = t(statusKey);
          return (
            <span className="capitalize">
              {statusLabel.startsWith("crm.documentStatus.")
                ? doc.status.replaceAll("_", " ")
                : statusLabel}
            </span>
          );
        },
      },
      {
        key: "updated",
        header: t("crm.documentsModule.columns.updated"),
        render: (doc) => (
          <span className="tabular-nums">{formatDate(doc.updatedAt)}</span>
        ),
      },
    ],
    [t],
  );

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
        columns={columns}
        rows={filtered}
        rowKey={(doc) => doc.id}
        minWidth={720}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        emptyTitle={t("crm.documentsModule.emptyTitle")}
        emptyDescription={t("crm.documentsModule.emptyDescription")}
        toolbar={
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <SearchField
              label={t("crm.documentsModule.searchLabel")}
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder={t("crm.documentsModule.searchPlaceholder")}
            />
            <FilterSelect
              label={t("crm.documentsModule.typeLabel")}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as DocumentKind | "all");
                setPage(1);
              }}
            >
              <option value="all">{t("crm.documentsModule.allTypes")}</option>
              {DOCUMENT_KINDS.map((docKind) => (
                <option key={docKind} value={docKind}>
                  {t(`crm.documentsModule.kinds.${docKind}`)}
                </option>
              ))}
            </FilterSelect>
          </div>
        }
      />
    </CrmGlassCard>
  );
}
