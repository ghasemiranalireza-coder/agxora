/**
 * Customer repository — local persistence today, SQL/API tomorrow.
 * UI never talks to storage directly.
 */

import type {
  CustomerCreateInput,
  CustomerId,
  CustomerRecord,
  CustomerUpdateInput,
} from "./types";

const STORAGE_KEY = "agxora-customers-v1";

type Listener = () => void;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): CustomerId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cus_${crypto.randomUUID()}`;
  }
  return `cus_${Date.now().toString(36)}`;
}

function readAll(): CustomerRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomerRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: readonly CustomerRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Quota / private mode — keep in-memory only for this session.
  }
}

let cache: CustomerRecord[] | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function ensureCache(): CustomerRecord[] {
  if (cache === null) {
    cache = typeof window === "undefined" ? [] : readAll();
  }
  return cache;
}

export interface CustomerRepository {
  list(organizationId?: string): Promise<readonly CustomerRecord[]>;
  getById(id: CustomerId): Promise<CustomerRecord | null>;
  create(input: CustomerCreateInput): Promise<CustomerRecord>;
  update(id: CustomerId, patch: CustomerUpdateInput): Promise<CustomerRecord>;
  delete(id: CustomerId): Promise<void>;
  subscribe(listener: Listener): () => void;
  /** Test / reset helper */
  replaceAll(rows: readonly CustomerRecord[]): void;
}

export const customerRepository: CustomerRepository = {
  async list(organizationId?: string) {
    const rows = ensureCache();
    if (!organizationId) return [...rows];
    return rows.filter((row) => row.organizationId === organizationId);
  },

  async getById(id) {
    return ensureCache().find((row) => row.id === id) ?? null;
  },

  async create(input) {
    const stamp = nowIso();
    const row: CustomerRecord = {
      id: createId(),
      organizationId: input.organizationId,
      companyName: input.companyName,
      contactPerson: input.contactPerson,
      email: input.email,
      phone: input.phone,
      mobile: input.mobile,
      street: input.street,
      postalCode: input.postalCode,
      city: input.city,
      country: input.country,
      taxNumber: input.taxNumber,
      vatId: input.vatId,
      notes: input.notes,
      status: input.status,
      tags: input.tags ?? [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    const next = [row, ...ensureCache()];
    cache = next;
    writeAll(next);
    emit();
    return row;
  },

  async update(id, patch) {
    const rows = ensureCache();
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`Customer not found: ${id}`);
    const existing = rows[index];
    const updated: CustomerRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      organizationId: existing.organizationId,
      tags: patch.tags ?? existing.tags,
      updatedAt: nowIso(),
    };
    const next = [...rows];
    next[index] = updated;
    cache = next;
    writeAll(next);
    emit();
    return updated;
  },

  async delete(id) {
    const next = ensureCache().filter((row) => row.id !== id);
    cache = next;
    writeAll(next);
    emit();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  replaceAll(rows) {
    cache = [...rows];
    writeAll(cache);
    emit();
  },
};
