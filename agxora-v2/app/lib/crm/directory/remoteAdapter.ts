/**
 * Browser CRM adapter — talks to /api/v1/crm/* with server session.
 */

"use client";

import type {
  CrmContactDraft,
  CrmContactRecord,
  CrmCustomerDraft,
  CrmCustomerId,
  CrmCustomerRecord,
  CrmDocumentDraft,
  CrmDocumentRecord,
  CrmNoteDraft,
  CrmNoteRecord,
} from "./types";

const SESSION_STORAGE_KEY = "agxora.server.session.token";

export function rememberServerSessionToken(token: string): void {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    // private mode
  }
}

export function readServerSessionToken(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearServerSessionToken(): void {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function crmFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // Prefer httpOnly cookie (credentials: include). Optional Bearer is for tests only.
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
    code?: string;
  };

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || `CRM request failed (${response.status})`);
  }
  return payload;
}

export async function remoteListCustomers(): Promise<CrmCustomerRecord[]> {
  const data = await crmFetch<{ items: CrmCustomerRecord[] }>(
    "/api/v1/crm/customers",
  );
  return [...(data.items ?? [])];
}

export async function remoteGetCustomer(
  id: CrmCustomerId,
): Promise<CrmCustomerRecord | null> {
  try {
    const data = await crmFetch<{ customer: CrmCustomerRecord }>(
      `/api/v1/crm/customers/${encodeURIComponent(id)}`,
    );
    return data.customer;
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}

export async function remoteCreateCustomer(
  draft: CrmCustomerDraft,
): Promise<CrmCustomerRecord> {
  const data = await crmFetch<{ customer: CrmCustomerRecord }>(
    "/api/v1/crm/customers",
    {
      method: "POST",
      body: JSON.stringify({ draft }),
    },
  );
  return data.customer;
}

export async function remoteUpdateCustomer(
  id: CrmCustomerId,
  draft: CrmCustomerDraft,
): Promise<CrmCustomerRecord> {
  const data = await crmFetch<{ customer: CrmCustomerRecord }>(
    `/api/v1/crm/customers/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ draft }),
    },
  );
  return data.customer;
}

export async function remoteDeleteCustomer(id: CrmCustomerId): Promise<void> {
  await crmFetch(`/api/v1/crm/customers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Phase 47 — Contacts (database mode). */

export async function remoteListContacts(
  customerId: CrmCustomerId,
): Promise<CrmContactRecord[]> {
  const data = await crmFetch<{ items: CrmContactRecord[] }>(
    `/api/v1/crm/customers/${encodeURIComponent(customerId)}/contacts`,
  );
  return [...(data.items ?? [])];
}

export async function remoteCreateContact(
  customerId: CrmCustomerId,
  draft: CrmContactDraft,
): Promise<CrmContactRecord> {
  const data = await crmFetch<{ contact: CrmContactRecord }>(
    `/api/v1/crm/customers/${encodeURIComponent(customerId)}/contacts`,
    {
      method: "POST",
      body: JSON.stringify({ draft }),
    },
  );
  return data.contact;
}

export async function remoteUpdateContact(
  id: string,
  draft: CrmContactDraft,
): Promise<CrmContactRecord> {
  const data = await crmFetch<{ contact: CrmContactRecord }>(
    `/api/v1/crm/contacts/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ draft }),
    },
  );
  return data.contact;
}

export async function remoteDeleteContact(id: string): Promise<void> {
  await crmFetch(`/api/v1/crm/contacts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Phase 48 — Notes (database mode). */

export async function remoteListNotes(
  customerId: CrmCustomerId,
): Promise<CrmNoteRecord[]> {
  const data = await crmFetch<{ items: CrmNoteRecord[] }>(
    `/api/v1/crm/customers/${encodeURIComponent(customerId)}/notes`,
  );
  return [...(data.items ?? [])];
}

export async function remoteCreateNote(
  customerId: CrmCustomerId,
  draft: CrmNoteDraft,
): Promise<CrmNoteRecord> {
  const data = await crmFetch<{ note: CrmNoteRecord }>(
    `/api/v1/crm/customers/${encodeURIComponent(customerId)}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ draft }),
    },
  );
  return data.note;
}

export async function remoteUpdateNote(
  id: string,
  draft: CrmNoteDraft,
): Promise<CrmNoteRecord> {
  const data = await crmFetch<{ note: CrmNoteRecord }>(
    `/api/v1/crm/notes/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ draft }),
    },
  );
  return data.note;
}

export async function remoteDeleteNote(id: string): Promise<void> {
  await crmFetch(`/api/v1/crm/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Phase 49 — Documents metadata (database mode). */

export async function remoteListDocuments(
  customerId: CrmCustomerId,
): Promise<CrmDocumentRecord[]> {
  const data = await crmFetch<{ items: CrmDocumentRecord[] }>(
    `/api/v1/crm/customers/${encodeURIComponent(customerId)}/documents`,
  );
  return [...(data.items ?? [])];
}

export async function remoteCreateDocument(
  customerId: CrmCustomerId,
  draft: CrmDocumentDraft,
): Promise<CrmDocumentRecord> {
  const data = await crmFetch<{ document: CrmDocumentRecord }>(
    `/api/v1/crm/customers/${encodeURIComponent(customerId)}/documents`,
    {
      method: "POST",
      body: JSON.stringify({ draft }),
    },
  );
  return data.document;
}

export async function remoteDeleteDocument(id: string): Promise<void> {
  await crmFetch(`/api/v1/crm/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
