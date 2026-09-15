"use client";

import {
  readServerSessionToken,
} from "../../../lib/crm/directory/remoteAdapter";
import type {
  BillDeliveryNotesInput,
  BillingPreviewView,
  DeliveryNoteDraft,
  DeliveryNoteListFilter,
  DeliveryNoteView,
  FinanceOverviewView,
  InvoiceListFilter,
  InvoiceView,
} from "../../../lib/finance/core/types";

async function financeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readServerSessionToken();
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
    headers.set("x-agxora-session-token", token);
  }
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  const payload = (await response.json()) as T & {
    ok?: boolean;
    message?: string;
  };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || `Finance request failed (${response.status})`);
  }
  return payload;
}

export async function fetchFinanceOverview(): Promise<FinanceOverviewView> {
  const data = await financeFetch<{ overview: FinanceOverviewView }>(
    "/api/v1/finance/overview",
  );
  return data.overview;
}

export async function fetchDeliveryNotes(
  filter: DeliveryNoteListFilter = {},
): Promise<DeliveryNoteView[]> {
  const params = new URLSearchParams();
  if (filter.customerId) params.set("customerId", filter.customerId);
  if (filter.status && filter.status !== "all") params.set("status", filter.status);
  if (filter.query) params.set("q", filter.query);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);
  const qs = params.toString();
  const data = await financeFetch<{ items: DeliveryNoteView[] }>(
    `/api/v1/finance/delivery-notes${qs ? `?${qs}` : ""}`,
  );
  return data.items;
}

export async function fetchDeliveryNote(id: string): Promise<DeliveryNoteView> {
  const data = await financeFetch<{ deliveryNote: DeliveryNoteView }>(
    `/api/v1/finance/delivery-notes/${encodeURIComponent(id)}`,
  );
  return data.deliveryNote;
}

export async function createDeliveryNote(
  draft: DeliveryNoteDraft,
): Promise<DeliveryNoteView> {
  const data = await financeFetch<{ deliveryNote: DeliveryNoteView }>(
    "/api/v1/finance/delivery-notes",
    { method: "POST", body: JSON.stringify({ draft }) },
  );
  return data.deliveryNote;
}

export async function updateDeliveryNote(
  id: string,
  draft: DeliveryNoteDraft,
): Promise<DeliveryNoteView> {
  const data = await financeFetch<{ deliveryNote: DeliveryNoteView }>(
    `/api/v1/finance/delivery-notes/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ draft }) },
  );
  return data.deliveryNote;
}

export async function deleteDeliveryNoteItem(
  deliveryNoteId: string,
  itemId: string,
): Promise<DeliveryNoteView> {
  const data = await financeFetch<{ deliveryNote: DeliveryNoteView }>(
    `/api/v1/finance/delivery-notes/${encodeURIComponent(deliveryNoteId)}/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
  return data.deliveryNote;
}

export async function fetchInvoices(
  filter: InvoiceListFilter = {},
): Promise<InvoiceView[]> {
  const params = new URLSearchParams();
  if (filter.customerId) params.set("customerId", filter.customerId);
  if (filter.status && filter.status !== "all") params.set("status", filter.status);
  if (filter.query) params.set("q", filter.query);
  const qs = params.toString();
  const data = await financeFetch<{ items: InvoiceView[] }>(
    `/api/v1/finance/invoices${qs ? `?${qs}` : ""}`,
  );
  return data.items;
}

export async function fetchInvoice(id: string): Promise<InvoiceView> {
  const data = await financeFetch<{ invoice: InvoiceView }>(
    `/api/v1/finance/invoices/${encodeURIComponent(id)}`,
  );
  return data.invoice;
}

export async function previewBilling(
  input: BillDeliveryNotesInput,
): Promise<BillingPreviewView> {
  const data = await financeFetch<{ preview: BillingPreviewView }>(
    "/api/v1/finance/invoices/preview",
    { method: "POST", body: JSON.stringify(input) },
  );
  return data.preview;
}

export async function billDeliveryNotes(
  input: BillDeliveryNotesInput,
  idempotencyKey: string,
): Promise<InvoiceView> {
  const data = await financeFetch<{ invoice: InvoiceView }>(
    "/api/v1/finance/invoices/bill",
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ ...input, idempotencyKey }),
    },
  );
  return data.invoice;
}

export async function updateInvoiceStatus(
  id: string,
  status: string,
): Promise<InvoiceView> {
  const data = await financeFetch<{ invoice: InvoiceView }>(
    `/api/v1/finance/invoices/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  return data.invoice;
}

export type FinanceCustomerOption = {
  readonly id: string;
  readonly companyName: string;
};

export async function fetchFinanceCustomers(): Promise<FinanceCustomerOption[]> {
  const data = await financeFetch<{ items: FinanceCustomerOption[] }>(
    "/api/v1/crm/customers",
  );
  return data.items.map((item) => ({ id: item.id, companyName: item.companyName }));
}
