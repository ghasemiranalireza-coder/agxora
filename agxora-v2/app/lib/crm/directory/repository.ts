/**
 * Enterprise CRM repository — LocalStorage today, SQL/API tomorrow.
 */

import type {
  CrmActivityKind,
  CrmActivityRecord,
  CrmContactRecord,
  CrmCustomerId,
  CrmCustomerRecord,
  CrmDocumentRecord,
  CrmNoteRecord,
} from "./types";

export const CRM_STORAGE_KEY = "agxora-crm-enterprise-v1";
export const STORAGE_VERSION = 1;

type Listener = () => void;

export interface CrmDatabase {
  readonly version: number;
  readonly customers: CrmCustomerRecord[];
  readonly contacts: CrmContactRecord[];
  readonly notes: CrmNoteRecord[];
  readonly documents: CrmDocumentRecord[];
  readonly activities: CrmActivityRecord[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDb(): CrmDatabase {
  return {
    version: STORAGE_VERSION,
    customers: [],
    contacts: [],
    notes: [],
    documents: [],
    activities: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrate(raw: unknown): CrmDatabase {
  if (!isObject(raw)) return emptyDb();
  return {
    version: STORAGE_VERSION,
    customers: Array.isArray(raw.customers)
      ? [...(raw.customers as CrmCustomerRecord[])]
      : [],
    contacts: Array.isArray(raw.contacts)
      ? [...(raw.contacts as CrmContactRecord[])]
      : [],
    notes: Array.isArray(raw.notes) ? [...(raw.notes as CrmNoteRecord[])] : [],
    documents: Array.isArray(raw.documents)
      ? [...(raw.documents as CrmDocumentRecord[])]
      : [],
    activities: Array.isArray(raw.activities)
      ? [...(raw.activities as CrmActivityRecord[])]
      : [],
  };
}

function readDb(): CrmDatabase {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = window.localStorage.getItem(CRM_STORAGE_KEY);
    if (!raw) return emptyDb();
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return emptyDb();
  }
}

function writeDb(db: CrmDatabase): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Quota / private mode
  }
}

let cache: CrmDatabase | null = null;
const listeners = new Set<Listener>();
let writeQueued = false;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function ensureDb(): CrmDatabase {
  if (cache === null) {
    cache = typeof window === "undefined" ? emptyDb() : readDb();
  }
  return cache;
}

function flushWrite(): void {
  writeTimer = null;
  writeQueued = false;
  if (cache) writeDb(cache);
}

function persist(next: CrmDatabase, options?: { readonly sync?: boolean }): void {
  cache = next;
  emit();
  if (typeof window === "undefined") return;
  if (options?.sync) {
    if (writeTimer != null) clearTimeout(writeTimer);
    writeTimer = null;
    writeQueued = false;
    writeDb(next);
    return;
  }
  if (writeQueued) return;
  writeQueued = true;
  writeTimer = setTimeout(flushWrite, 0);
}

function pushActivity(
  db: CrmDatabase,
  input: {
    readonly customerId: CrmCustomerId;
    readonly organizationId: string;
    readonly kind: CrmActivityKind;
    readonly title: string;
    readonly detail: string;
    readonly actor?: string;
  },
): CrmDatabase {
  const row: CrmActivityRecord = {
    id: createId("cact"),
    customerId: input.customerId,
    organizationId: input.organizationId,
    kind: input.kind,
    title: input.title,
    detail: input.detail,
    actor: input.actor?.trim() || "System",
    createdAt: nowIso(),
  };
  return {
    ...db,
    activities: [row, ...db.activities].slice(0, 500),
  };
}

export const crmDirectoryRepository = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getDatabase(): CrmDatabase {
    return ensureDb();
  },

  async listCustomers(organizationId?: string) {
    const rows = ensureDb().customers;
    if (!organizationId) return [...rows];
    return rows.filter((row) => row.organizationId === organizationId);
  },

  async getCustomer(id: CrmCustomerId) {
    return ensureDb().customers.find((row) => row.id === id) ?? null;
  },

  async createCustomer(
    input: Omit<CrmCustomerRecord, "id" | "createdAt" | "updatedAt">,
  ) {
    const stamp = nowIso();
    const row: CrmCustomerRecord = {
      ...input,
      id: createId("crm"),
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    db = { ...db, customers: [row, ...db.customers] };
    db = pushActivity(db, {
      customerId: row.id,
      organizationId: row.organizationId,
      kind: "customer_created",
      title: "Customer Created",
      detail: row.companyName,
      actor: row.owner,
    });
    persist(db);
    return row;
  },

  async updateCustomer(
    id: CrmCustomerId,
    patch: Partial<
      Omit<CrmCustomerRecord, "id" | "organizationId" | "createdAt" | "updatedAt">
    >,
  ) {
    const db = ensureDb();
    const index = db.customers.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`Customer not found: ${id}`);
    const existing = db.customers[index];
    const updated: CrmCustomerRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      organizationId: existing.organizationId,
      tags: patch.tags ?? existing.tags,
      updatedAt: nowIso(),
    };
    const customers = [...db.customers];
    customers[index] = updated;
    let next = { ...db, customers };
    next = pushActivity(next, {
      customerId: updated.id,
      organizationId: updated.organizationId,
      kind: "customer_updated",
      title: "Customer Updated",
      detail: updated.companyName,
      actor: updated.owner,
    });
    persist(next);
    return updated;
  },

  async deleteCustomer(id: CrmCustomerId) {
    let db = ensureDb();
    db = {
      ...db,
      customers: db.customers.filter((row) => row.id !== id),
      contacts: db.contacts.filter((row) => row.customerId !== id),
      notes: db.notes.filter((row) => row.customerId !== id),
      documents: db.documents.filter((row) => row.customerId !== id),
      activities: db.activities.filter((row) => row.customerId !== id),
    };
    persist(db, { sync: true });
  },

  async listContacts(customerId: CrmCustomerId) {
    return ensureDb()
      .contacts.filter((row) => row.customerId === customerId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async createContact(
    input: Omit<CrmContactRecord, "id" | "createdAt" | "updatedAt">,
  ) {
    const stamp = nowIso();
    const row: CrmContactRecord = {
      ...input,
      id: createId("ccon"),
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    db = { ...db, contacts: [row, ...db.contacts] };
    db = pushActivity(db, {
      customerId: row.customerId,
      organizationId: row.organizationId,
      kind: "contact_added",
      title: "Contact Added",
      detail: row.name,
    });
    persist(db);
    return row;
  },

  async updateContact(
    id: string,
    patch: Partial<
      Omit<CrmContactRecord, "id" | "customerId" | "organizationId" | "createdAt" | "updatedAt">
    >,
  ) {
    const db = ensureDb();
    const index = db.contacts.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`Contact not found: ${id}`);
    const existing = db.contacts[index];
    const updated: CrmContactRecord = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };
    const contacts = [...db.contacts];
    contacts[index] = updated;
    let next = { ...db, contacts };
    next = pushActivity(next, {
      customerId: updated.customerId,
      organizationId: updated.organizationId,
      kind: "contact_updated",
      title: "Contact Updated",
      detail: updated.name,
    });
    persist(next);
    return updated;
  },

  async deleteContact(id: string) {
    let db = ensureDb();
    const existing = db.contacts.find((row) => row.id === id);
    if (!existing) return;
    db = { ...db, contacts: db.contacts.filter((row) => row.id !== id) };
    db = pushActivity(db, {
      customerId: existing.customerId,
      organizationId: existing.organizationId,
      kind: "contact_deleted",
      title: "Contact Deleted",
      detail: existing.name,
    });
    persist(db);
  },

  async listNotes(customerId: CrmCustomerId) {
    return ensureDb()
      .notes.filter((row) => row.customerId === customerId)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createNote(
    input: Omit<CrmNoteRecord, "id" | "createdAt" | "updatedAt">,
  ) {
    const stamp = nowIso();
    const row: CrmNoteRecord = {
      ...input,
      id: createId("cnote"),
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    db = { ...db, notes: [row, ...db.notes] };
    db = pushActivity(db, {
      customerId: row.customerId,
      organizationId: row.organizationId,
      kind: "note_added",
      title: "Note Added",
      detail: row.title,
      actor: row.author,
    });
    persist(db);
    return row;
  },

  async updateNote(
    id: string,
    patch: Partial<Pick<CrmNoteRecord, "title" | "body" | "author">>,
  ) {
    const db = ensureDb();
    const index = db.notes.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`Note not found: ${id}`);
    const existing = db.notes[index];
    const updated: CrmNoteRecord = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };
    const notes = [...db.notes];
    notes[index] = updated;
    let next = { ...db, notes };
    next = pushActivity(next, {
      customerId: updated.customerId,
      organizationId: updated.organizationId,
      kind: "note_updated",
      title: "Note Updated",
      detail: updated.title,
      actor: updated.author,
    });
    persist(next);
    return updated;
  },

  async deleteNote(id: string) {
    let db = ensureDb();
    const existing = db.notes.find((row) => row.id === id);
    if (!existing) return;
    db = { ...db, notes: db.notes.filter((row) => row.id !== id) };
    db = pushActivity(db, {
      customerId: existing.customerId,
      organizationId: existing.organizationId,
      kind: "note_deleted",
      title: "Note Deleted",
      detail: existing.title,
      actor: existing.author,
    });
    persist(db);
  },

  async listDocuments(customerId: CrmCustomerId) {
    return ensureDb()
      .documents.filter((row) => row.customerId === customerId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createDocument(
    input: Omit<CrmDocumentRecord, "id" | "createdAt" | "updatedAt">,
  ) {
    const stamp = nowIso();
    const row: CrmDocumentRecord = {
      ...input,
      id: createId("cdoc"),
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    db = { ...db, documents: [row, ...db.documents] };
    db = pushActivity(db, {
      customerId: row.customerId,
      organizationId: row.organizationId,
      kind: "document_added",
      title: "Document Added",
      detail: row.name,
      actor: row.uploadedBy,
    });
    persist(db);
    return row;
  },

  async deleteDocument(id: string) {
    let db = ensureDb();
    const existing = db.documents.find((row) => row.id === id);
    if (!existing) return;
    db = { ...db, documents: db.documents.filter((row) => row.id !== id) };
    db = pushActivity(db, {
      customerId: existing.customerId,
      organizationId: existing.organizationId,
      kind: "document_deleted",
      title: "Document Deleted",
      detail: existing.name,
    });
    persist(db);
  },

  async listActivities(customerId: CrmCustomerId) {
    return ensureDb()
      .activities.filter((row) => row.customerId === customerId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async recordProjectLinked(
    customerId: CrmCustomerId,
    organizationId: string,
    projectName: string,
    actor: string,
  ) {
    let db = ensureDb();
    db = pushActivity(db, {
      customerId,
      organizationId,
      kind: "project_linked",
      title: "Project Linked",
      detail: projectName,
      actor,
    });
    persist(db);
  },
};
