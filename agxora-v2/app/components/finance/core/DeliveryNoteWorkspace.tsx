"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { formatCurrency, formatDisplayDate, useLocale } from "../../../lib/i18n";
import type {
  BillingPreviewView,
  DeliveryNoteDraft,
  DeliveryNoteStatus,
  DeliveryNoteView,
  FinanceLineDraft,
} from "../../../lib/finance/core/types";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  FilterSelect,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
  SearchField,
} from "../../ui";
import { FinanceShell } from "./FinanceShell";
import { IssuedDeliveryNoteDocument } from "../documents/IssuedDocument";
import {
  billDeliveryNotes,
  createDeliveryNote,
  deleteDeliveryNoteItem,
  fetchDeliveryNote,
  fetchDeliveryNotes,
  fetchFinanceCustomers,
  previewBilling,
  updateDeliveryNote,
  type FinanceCustomerOption,
} from "./financeApi";
import {
  ConfirmDeleteItemDialog,
  DeliveryNoteItemActions,
  ItemDraftDialog,
  lineViewToDraft,
} from "./DeliveryNoteItemActions";

function money(value: string, currency: string): string {
  return formatCurrency(Number(value), undefined, currency);
}

function statusTone(status: DeliveryNoteStatus): "default" | "positive" | "warning" | "accent" {
  if (status === "OPEN") return "accent";
  if (status === "ABGERECHNET") return "positive";
  if (status === "CANCELLED") return "warning";
  return "default";
}

const EMPTY_LINE: FinanceLineDraft = {
  description: "",
  quantity: "1",
  unit: "Stk",
  unitPriceNet: "0.00",
  taxRate: "19.00",
};

export function DeliveryNoteWorkspace({
  detailId,
}: {
  readonly detailId?: string;
}): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<DeliveryNoteView[]>([]);
  const [customers, setCustomers] = useState<FinanceCustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DeliveryNoteStatus | "all">("all");
  const [customerId, setCustomerId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [preview, setPreview] = useState<BillingPreviewView | null>(null);
  const [billBusy, setBillBusy] = useState(false);
  const [detail, setDetail] = useState<DeliveryNoteView | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [draftDeleteIndex, setDraftDeleteIndex] = useState<number | null>(null);
  const [itemBusy, setItemBusy] = useState(false);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [draft, setDraft] = useState<DeliveryNoteDraft>({
    customerId: "",
    date: new Date().toISOString().slice(0, 10),
    orderNumber: "",
    notes: "",
    items: [EMPTY_LINE],
  });

  const load = useCallback(async () => {
    try {
      const [notes, customerRows] = await Promise.all([
        fetchDeliveryNotes({
          query,
          status,
          customerId: customerId === "all" ? undefined : customerId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        fetchFinanceCustomers(),
      ]);
      setRows(notes);
      setCustomers(customerRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [customerId, dateFrom, dateTo, query, status, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [notes, customerRows] = await Promise.all([
          fetchDeliveryNotes({
            query,
            status,
            customerId: customerId === "all" ? undefined : customerId,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }),
          fetchFinanceCustomers(),
        ]);
        if (cancelled) return;
        setRows(notes);
        setCustomers(customerRows);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("finance.core.errors.load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, dateFrom, dateTo, query, status, t]);

  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    void (async () => {
      try {
        const note = await fetchDeliveryNote(detailId);
        if (!cancelled) setDetail(note);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("finance.core.errors.load"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId, t]);

  const eligibleIds = useMemo(
    () => rows.filter((row) => row.status === "OPEN").map((row) => row.id),
    [rows],
  );
  const selectedOpen = selected.filter((id) => eligibleIds.includes(id));
  const canBill = selectedOpen.length > 0;

  async function openPreview(input: {
    mode: "selected" | "all_open" | "date_range";
    ids?: readonly string[];
  }): Promise<void> {
    try {
      const data = await previewBilling({
        mode: input.mode,
        deliveryNoteIds: input.ids,
        customerId: customerId === "all" ? undefined : customerId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setPreview(data);
      setIdempotencyKey(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `bill-${Date.now()}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.preview"));
    }
  }

  async function confirmBill(): Promise<void> {
    if (!preview) return;
    setBillBusy(true);
    try {
      const invoice = await billDeliveryNotes(
        {
          mode: "selected",
          deliveryNoteIds: preview.deliveryNotes.map((row) => row.id),
        },
        idempotencyKey,
      );
      setPreview(null);
      setSelected([]);
      router.push(`/dashboard/finance/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.bill"));
    } finally {
      setBillBusy(false);
    }
  }

  async function saveDraft(): Promise<void> {
    try {
      await createDeliveryNote(draft);
      setFormOpen(false);
      setDraft({
        customerId: customers[0]?.id ?? "",
        date: new Date().toISOString().slice(0, 10),
        orderNumber: "",
        notes: "",
        items: [EMPTY_LINE],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.save"));
    }
  }

  const detailEditable =
    detail != null && detail.status !== "ABGERECHNET" && detail.status !== "CANCELLED";

  function draftFromDetail(note: DeliveryNoteView): DeliveryNoteDraft {
    return {
      customerId: note.customerId,
      date: note.date,
      orderNumber: note.orderNumber,
      notes: note.notes,
      status: note.status,
      items: note.items.map((item) => lineViewToDraft(item)),
    };
  }

  async function saveDetailDraft(next: DeliveryNoteDraft): Promise<boolean> {
    if (!detail) return false;
    setItemBusy(true);
    try {
      const updated = await updateDeliveryNote(detail.id, next);
      setDetail(updated);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.save"));
      return false;
    } finally {
      setItemBusy(false);
    }
  }

  async function confirmDeletePersistedItem(): Promise<void> {
    if (!detail || !pendingDeleteItemId) return;
    setItemBusy(true);
    try {
      const updated = await deleteDeliveryNoteItem(detail.id, pendingDeleteItemId);
      setDetail(updated);
      setPendingDeleteItemId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finance.core.errors.deleteItem"));
    } finally {
      setItemBusy(false);
    }
  }

  return (
    <FinanceShell titleKey="finance.core.delivery.title" subtitleKey="finance.core.delivery.subtitle">
      <div className="agx-finance-actions">
        <Button
          variant="primary"
          onClick={() => {
            setDraft((current) => ({
              ...current,
              customerId: current.customerId || customers[0]?.id || "",
            }));
            setFormOpen(true);
          }}
        >
          {t("finance.core.actions.createDeliveryNote")}
        </Button>
        <Button
          variant="primary"
          disabled={!canBill}
          onClick={() => void openPreview({ mode: "selected", ids: selectedOpen })}
        >
          {t("finance.core.actions.billSelected")}
        </Button>
        <Button
          disabled={customerId === "all"}
          onClick={() => void openPreview({ mode: "all_open" })}
        >
          {t("finance.core.actions.billAllOpen")}
        </Button>
        <Button
          disabled={!dateFrom && !dateTo}
          onClick={() => void openPreview({ mode: "date_range" })}
        >
          {t("finance.core.actions.billDateRange")}
        </Button>
      </div>

      <div className="agx-finance-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t("finance.core.filters.search")}
          label={t("finance.core.filters.search")}
        />
        <FilterSelect
          label={t("finance.core.filters.status")}
          value={status}
          onChange={(event) => setStatus(event.target.value as DeliveryNoteStatus | "all")}
        >
          <option value="all">{t("finance.core.filters.allStatuses")}</option>
          <option value="OPEN">{t("finance.core.status.OPEN")}</option>
          <option value="ABGERECHNET">{t("finance.core.status.ABGERECHNET")}</option>
          <option value="DRAFT">{t("finance.core.status.DRAFT")}</option>
          <option value="CANCELLED">{t("finance.core.status.CANCELLED")}</option>
        </FilterSelect>
        <FilterSelect
          label={t("finance.core.filters.customer")}
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        >
          <option value="all">{t("finance.core.filters.allCustomers")}</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.companyName}
            </option>
          ))}
        </FilterSelect>
        <FormField label={t("finance.core.filters.dateFrom")}>
          <FormInput type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </FormField>
        <FormField label={t("finance.core.filters.dateTo")}>
          <FormInput type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </FormField>
      </div>

      {error ? <ErrorState title={t("finance.core.errors.load")} description={error} /> : null}

      {loading ? (
        <Card padding="18px">{t("finance.core.loading")}</Card>
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("finance.core.empty.deliveryTitle")}
          description={t("finance.core.empty.deliveryBody")}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "select",
              header: t("finance.core.table.select"),
              render: (row) => (
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  disabled={row.status !== "OPEN"}
                  aria-label={t("finance.core.table.selectRow", { number: row.number })}
                  onChange={(event) => {
                    event.stopPropagation();
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, row.id]
                        : current.filter((id) => id !== row.id),
                    );
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              ),
            },
            {
              key: "number",
              header: t("finance.core.table.deliveryNumber"),
              render: (row) => row.number,
            },
            {
              key: "date",
              header: t("finance.core.table.date"),
              render: (row) => formatDisplayDate(row.date),
            },
            {
              key: "customer",
              header: t("finance.core.table.customer"),
              render: (row) => row.customerCompanyName,
            },
            {
              key: "order",
              header: t("finance.core.table.order"),
              render: (row) => row.orderNumber || "—",
            },
            {
              key: "net",
              header: t("finance.core.table.net"),
              align: "end",
              render: (row) => money(row.netTotal, row.currency),
            },
            {
              key: "status",
              header: t("finance.core.table.status"),
              render: (row) => <Badge tone={statusTone(row.status)}>{t(`finance.core.status.${row.status}`)}</Badge>,
            },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/dashboard/finance/delivery-notes/${row.id}`)}
        />
      )}

      {detail && detailId ? (
        <Card className="space-y-3" padding="18px">
          <h2 className="text-lg font-semibold">{detail.number}</h2>
          <p>{detail.customerCompanyName}</p>
          <p>{t("finance.core.table.order")}: {detail.orderNumber || "—"}</p>
          <p>
            {t("finance.core.totals.net")}: {money(detail.netTotal, detail.currency)} ·{" "}
            {t("finance.core.totals.tax")}: {money(detail.taxTotal, detail.currency)} ·{" "}
            {t("finance.core.totals.gross")}: {money(detail.grossTotal, detail.currency)}
          </p>
          {detail.invoiceId ? (
            <p>
              {t("finance.core.delivery.billedAs")}{" "}
              <Link href={`/dashboard/finance/invoices/${detail.invoiceId}`}>{detail.invoiceNumber}</Link>
            </p>
          ) : null}
          <div className="agx-finance-item-table-wrap">
            <table className="agx-finance-item-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("finance.core.form.description")}</th>
                  <th>{t("finance.core.form.quantity")}</th>
                  <th>{t("finance.core.form.unit")}</th>
                  <th>{t("finance.core.table.net")}</th>
                  {detailEditable ? <th>{t("finance.core.items.actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.position}</td>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{money(item.lineTotalNet, detail.currency)}</td>
                    {detailEditable ? (
                      <td>
                        <DeliveryNoteItemActions
                          disableDelete={detail.items.length <= 1}
                          onEdit={() => setEditingItemId(item.id)}
                          onDelete={() => setPendingDeleteItemId(item.id)}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detailEditable ? (
            <Button onClick={() => setAddingItem(true)} disabled={itemBusy}>
              {t("finance.core.items.add")}
            </Button>
          ) : null}
          <IssuedDeliveryNoteDocument note={detail} />
        </Card>
      ) : null}

      <Dialog
        open={formOpen}
        title={t("finance.core.actions.createDeliveryNote")}
        onClose={() => setFormOpen(false)}
        wide
        footer={
          <div className="agx-finance-actions">
            <Button onClick={() => setFormOpen(false)}>{t("finance.core.actions.cancel")}</Button>
            <Button variant="primary" onClick={() => void saveDraft()}>
              {t("finance.core.actions.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <FormField label={t("finance.core.filters.customer")} required>
            <FormSelect
              value={draft.customerId}
              onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value }))}
            >
              <option value="">{t("finance.core.filters.chooseCustomer")}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.companyName}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label={t("finance.core.table.date")}>
            <FormInput
              type="date"
              value={draft.date ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            />
          </FormField>
          <FormField label={t("finance.core.table.order")}>
            <FormInput
              value={draft.orderNumber ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, orderNumber: event.target.value }))}
            />
          </FormField>
          <FormField label={t("finance.core.table.notes")}>
            <FormTextArea
              value={draft.notes ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
          </FormField>
          {draft.items.map((item, index) => (
            <div key={`line-${index}`} className="agx-finance-line-grid">
              <FormInput
                placeholder={t("finance.core.form.description")}
                value={item.description}
                onChange={(event) => {
                  const items = [...draft.items];
                  items[index] = { ...item, description: event.target.value };
                  setDraft((current) => ({ ...current, items }));
                }}
              />
              <FormInput
                placeholder={t("finance.core.form.quantity")}
                value={item.quantity}
                onChange={(event) => {
                  const items = [...draft.items];
                  items[index] = { ...item, quantity: event.target.value };
                  setDraft((current) => ({ ...current, items }));
                }}
              />
              <FormInput
                placeholder={t("finance.core.form.unit")}
                value={item.unit ?? "Stk"}
                onChange={(event) => {
                  const items = [...draft.items];
                  items[index] = { ...item, unit: event.target.value };
                  setDraft((current) => ({ ...current, items }));
                }}
              />
              <FormInput
                placeholder={t("finance.core.form.unitPrice")}
                value={item.unitPriceNet}
                onChange={(event) => {
                  const items = [...draft.items];
                  items[index] = { ...item, unitPriceNet: event.target.value };
                  setDraft((current) => ({ ...current, items }));
                }}
              />
              <FormInput
                placeholder={t("finance.core.form.taxRate")}
                value={item.taxRate ?? "19.00"}
                onChange={(event) => {
                  const items = [...draft.items];
                  items[index] = { ...item, taxRate: event.target.value };
                  setDraft((current) => ({ ...current, items }));
                }}
              />
              <DeliveryNoteItemActions
                disableDelete={draft.items.length <= 1}
                onDelete={() => setDraftDeleteIndex(index)}
              />
            </div>
          ))}
          <Button
            onClick={() =>
              setDraft((current) => ({ ...current, items: [...current.items, { ...EMPTY_LINE }] }))
            }
          >
            {t("finance.core.items.add")}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(preview)}
        title={t("finance.core.bill.previewTitle")}
        onClose={() => (billBusy ? undefined : setPreview(null))}
        dismissible={!billBusy}
        footer={
          <div className="agx-finance-actions">
            <Button disabled={billBusy} onClick={() => setPreview(null)}>
              {t("finance.core.actions.cancel")}
            </Button>
            <Button variant="primary" disabled={billBusy} onClick={() => void confirmBill()}>
              {t("finance.core.actions.confirmBill")}
            </Button>
          </div>
        }
      >
        {preview ? (
          <div className="space-y-2 text-sm">
            <p>
              {t("finance.core.table.customer")}: {preview.customerCompanyName}
            </p>
            <p>
              {t("finance.core.bill.count")}: {preview.deliveryNoteCount}
            </p>
            <ul>
              {preview.deliveryNotes.map((note) => (
                <li key={note.id}>
                  {note.number} · {money(note.netTotal, preview.currency)}
                </li>
              ))}
            </ul>
            <p>
              {t("finance.core.totals.net")}: {money(preview.netTotal, preview.currency)}
            </p>
            <p>
              {t("finance.core.totals.tax")}: {money(preview.taxTotal, preview.currency)}
            </p>
            <p>
              {t("finance.core.totals.gross")}: {money(preview.grossTotal, preview.currency)}
            </p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDeleteItemDialog
        open={draftDeleteIndex !== null}
        onClose={() => setDraftDeleteIndex(null)}
        onConfirm={() => {
          if (draftDeleteIndex === null) return;
          setDraft((current) => {
            if (current.items.length <= 1) return current;
            return {
              ...current,
              items: current.items.filter((_, index) => index !== draftDeleteIndex),
            };
          });
          setDraftDeleteIndex(null);
        }}
      />

      <ConfirmDeleteItemDialog
        open={pendingDeleteItemId !== null}
        busy={itemBusy}
        onClose={() => setPendingDeleteItemId(null)}
        onConfirm={() => void confirmDeletePersistedItem()}
      />

      {detail && editingItemId ? (
        <ItemDraftDialog
          key={editingItemId}
          open
          title={t("finance.core.items.editTitle")}
          value={lineViewToDraft(detail.items.find((item) => item.id === editingItemId) ?? detail.items[0])}
          busy={itemBusy}
          onClose={() => setEditingItemId(null)}
          onSave={(next) => {
            const base = draftFromDetail(detail);
            void saveDetailDraft({
              ...base,
              items: detail.items.map((item) => (item.id === editingItemId ? next : lineViewToDraft(item))),
            }).then((ok) => {
              if (ok) setEditingItemId(null);
            });
          }}
        />
      ) : null}

      {detail && addingItem ? (
        <ItemDraftDialog
          key="add-item"
          open
          title={t("finance.core.items.add")}
          value={EMPTY_LINE}
          busy={itemBusy}
          onClose={() => setAddingItem(false)}
          onSave={(next) => {
            const base = draftFromDetail(detail);
            void saveDetailDraft({
              ...base,
              items: [...base.items, next],
            }).then((ok) => {
              if (ok) setAddingItem(false);
            });
          }}
        />
      ) : null}
    </FinanceShell>
  );
}
