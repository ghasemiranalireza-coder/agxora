/**
 * Injectable CRM bridge provider — mirrors website/social adapter pattern.
 * Default uses the existing CRM directory service (local or remote).
 */

import {
  crmDirectoryService,
  emptyContactDraft,
  emptyCustomerDraft,
  emptyNoteDraft,
  type CrmContactDraft,
  type CrmContactRecord,
  type CrmCustomerDraft,
  type CrmCustomerRecord,
  type CrmNoteDraft,
  type CrmNoteRecord,
} from "@/app/lib/crm/directory";

export interface CrmBridgeProvider {
  readonly available: boolean;
  listCustomers(organizationId: string): Promise<readonly CrmCustomerRecord[]>;
  getCustomer(customerId: string): Promise<CrmCustomerRecord | null>;
  createCustomer(
    organizationId: string,
    draft: CrmCustomerDraft,
  ): Promise<CrmCustomerRecord>;
  listContacts(customerId: string): Promise<readonly CrmContactRecord[]>;
  createContact(
    organizationId: string,
    customerId: string,
    draft: CrmContactDraft,
  ): Promise<CrmContactRecord>;
  createNote(
    organizationId: string,
    customerId: string,
    draft: CrmNoteDraft,
  ): Promise<CrmNoteRecord>;
}

function unavailableError(action: string): Error {
  const error = new Error(`crm_${action}_unavailable`);
  error.name = "CrmBridgeUnavailableError";
  return error;
}

export function createUnavailableCrmBridge(): CrmBridgeProvider {
  return {
    available: false,
    async listCustomers() {
      throw unavailableError("list");
    },
    async getCustomer() {
      throw unavailableError("get");
    },
    async createCustomer() {
      throw unavailableError("create");
    },
    async listContacts() {
      throw unavailableError("list_contacts");
    },
    async createContact() {
      throw unavailableError("create_contact");
    },
    async createNote() {
      throw unavailableError("create_note");
    },
  };
}

export function createDirectoryCrmBridge(): CrmBridgeProvider {
  return {
    available: true,
    listCustomers(organizationId) {
      return crmDirectoryService.list(organizationId);
    },
    getCustomer(customerId) {
      return crmDirectoryService.getById(customerId);
    },
    createCustomer(organizationId, draft) {
      return crmDirectoryService.createFromDraft(draft, organizationId);
    },
    listContacts(customerId) {
      return crmDirectoryService.listContacts(customerId);
    },
    createContact(organizationId, customerId, draft) {
      return crmDirectoryService.createContactFromDraft(
        draft,
        customerId,
        organizationId,
      );
    },
    createNote(organizationId, customerId, draft) {
      return crmDirectoryService.createNoteFromDraft(
        draft,
        customerId,
        organizationId,
      );
    },
  };
}

/** In-memory provider for isolated Agent OS tests (no LocalStorage / network). */
export function createMemoryCrmBridge(): CrmBridgeProvider {
  const customers: CrmCustomerRecord[] = [];
  const contacts: CrmContactRecord[] = [];
  const notes: CrmNoteRecord[] = [];
  let seq = 0;
  const nextId = (prefix: string) => {
    seq += 1;
    return `${prefix}_mem_${seq}`;
  };
  const now = () => new Date().toISOString();

  return {
    available: true,
    async listCustomers(organizationId) {
      return customers.filter((row) => row.organizationId === organizationId);
    },
    async getCustomer(customerId) {
      return customers.find((row) => row.id === customerId) ?? null;
    },
    async createCustomer(organizationId, draft) {
      const stamp = now();
      const row: CrmCustomerRecord = {
        id: nextId("crm"),
        organizationId,
        companyName: draft.companyName,
        contactName: draft.contactName,
        email: draft.email,
        phone: draft.phone,
        website: draft.website,
        industry: draft.industry,
        country: draft.country,
        city: draft.city,
        address: draft.address,
        taxNumber: draft.taxNumber,
        status: draft.status,
        owner: draft.owner,
        tags: [],
        createdAt: stamp,
        updatedAt: stamp,
      };
      customers.unshift(row);
      return row;
    },
    async listContacts(customerId) {
      return contacts.filter((row) => row.customerId === customerId);
    },
    async createContact(organizationId, customerId, draft) {
      const stamp = now();
      const row: CrmContactRecord = {
        id: nextId("cct"),
        customerId,
        organizationId,
        name: draft.name,
        role: draft.role,
        email: draft.email,
        phone: draft.phone,
        mobile: draft.mobile,
        notes: draft.notes,
        createdAt: stamp,
        updatedAt: stamp,
      };
      contacts.unshift(row);
      return row;
    },
    async createNote(organizationId, customerId, draft) {
      const stamp = now();
      const row: CrmNoteRecord = {
        id: nextId("cnote"),
        customerId,
        organizationId,
        title: draft.title,
        body: draft.body,
        author: draft.author,
        createdAt: stamp,
        updatedAt: stamp,
      };
      notes.unshift(row);
      return row;
    },
  };
}

let provider: CrmBridgeProvider = createDirectoryCrmBridge();

export function getCrmBridgeProvider(): CrmBridgeProvider {
  return provider;
}

export function setCrmBridgeProvider(next: CrmBridgeProvider): void {
  provider = next;
}

export function resetCrmBridgeProvider(): void {
  provider = createDirectoryCrmBridge();
}

export {
  emptyContactDraft,
  emptyCustomerDraft,
  emptyNoteDraft,
};
