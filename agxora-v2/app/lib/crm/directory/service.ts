import { recordActivity } from "../../backend/activity";
import { auditLog } from "../../backend/audit";
import { crmDirectoryRepository } from "./repository";
import type {
  CrmContactDraft,
  CrmCustomerDraft,
  CrmCustomerId,
  CrmCustomerRecord,
  CrmDocumentRecord,
  CrmNoteDraft,
} from "./types";
import {
  validateContactDraft,
  validateCustomerDraft,
  validateNoteDraft,
  type CrmContactFieldError,
  type CrmFieldError,
  type CrmNoteFieldError,
} from "./validation";

const HREF = "/dashboard/crm";

export class CrmValidationError extends Error {
  readonly errors: readonly CrmFieldError[];
  constructor(errors: readonly CrmFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "CrmValidationError";
    this.errors = errors;
  }
}

export class CrmContactValidationError extends Error {
  readonly errors: readonly CrmContactFieldError[];
  constructor(errors: readonly CrmContactFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "CrmContactValidationError";
    this.errors = errors;
  }
}

export class CrmNoteValidationError extends Error {
  readonly errors: readonly CrmNoteFieldError[];
  constructor(errors: readonly CrmNoteFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "CrmNoteValidationError";
    this.errors = errors;
  }
}

export class CrmDirectoryService {
  constructor(private readonly repo = crmDirectoryRepository) {}

  list(organizationId?: string) {
    return this.repo.listCustomers(organizationId);
  }

  getById(id: CrmCustomerId) {
    return this.repo.getCustomer(id);
  }

  subscribe(listener: () => void) {
    return this.repo.subscribe(listener);
  }

  getDatabase() {
    return this.repo.getDatabase();
  }

  async createFromDraft(draft: CrmCustomerDraft, organizationId: string) {
    const existing = await this.repo.listCustomers(organizationId);
    const result = validateCustomerDraft(draft, { existing });
    if (!result.ok) throw new CrmValidationError(result.errors);
    const customer = await this.repo.createCustomer({
      organizationId,
      ...result.value,
    });
    recordActivity({
      kind: "customer_created",
      title: "CRM Customer Created",
      detail: customer.companyName,
      entityId: customer.id,
      organizationId,
      href: `${HREF}/${customer.id}`,
    });
    auditLog({
      action: "crm.customer.create",
      resource: "crm_customer",
      resourceId: customer.id,
      organizationId,
    });
    return customer;
  }

  async updateFromDraft(id: CrmCustomerId, draft: CrmCustomerDraft) {
    const existingCustomer = await this.repo.getCustomer(id);
    if (!existingCustomer) throw new Error(`Customer not found: ${id}`);
    const existing = await this.repo.listCustomers(
      existingCustomer.organizationId,
    );
    const result = validateCustomerDraft(draft, {
      existing,
      excludeId: id,
    });
    if (!result.ok) throw new CrmValidationError(result.errors);
    const customer = await this.repo.updateCustomer(id, result.value);
    recordActivity({
      kind: "customer_updated",
      title: "CRM Customer Updated",
      detail: customer.companyName,
      entityId: customer.id,
      organizationId: customer.organizationId,
      href: `${HREF}/${customer.id}`,
    });
    auditLog({
      action: "crm.customer.update",
      resource: "crm_customer",
      resourceId: customer.id,
      organizationId: customer.organizationId,
    });
    return customer;
  }

  async deleteCustomer(id: CrmCustomerId): Promise<CrmCustomerRecord | null> {
    const existing = await this.repo.getCustomer(id);
    if (!existing) return null;
    await this.repo.deleteCustomer(id);
    recordActivity({
      kind: "customer_deleted",
      title: "CRM Customer Deleted",
      detail: existing.companyName,
      entityId: existing.id,
      organizationId: existing.organizationId,
      href: HREF,
    });
    auditLog({
      action: "crm.customer.delete",
      resource: "crm_customer",
      resourceId: existing.id,
      organizationId: existing.organizationId,
    });
    return existing;
  }

  listContacts(customerId: CrmCustomerId) {
    return this.repo.listContacts(customerId);
  }

  async createContactFromDraft(
    draft: CrmContactDraft,
    customerId: CrmCustomerId,
    organizationId: string,
  ) {
    const result = validateContactDraft(draft);
    if (!result.ok) throw new CrmContactValidationError(result.errors);
    return this.repo.createContact({
      customerId,
      organizationId,
      ...result.value,
    });
  }

  async updateContactFromDraft(id: string, draft: CrmContactDraft) {
    const result = validateContactDraft(draft);
    if (!result.ok) throw new CrmContactValidationError(result.errors);
    return this.repo.updateContact(id, result.value);
  }

  deleteContact(id: string) {
    return this.repo.deleteContact(id);
  }

  listNotes(customerId: CrmCustomerId) {
    return this.repo.listNotes(customerId);
  }

  async createNoteFromDraft(
    draft: CrmNoteDraft,
    customerId: CrmCustomerId,
    organizationId: string,
  ) {
    const result = validateNoteDraft(draft);
    if (!result.ok) throw new CrmNoteValidationError(result.errors);
    return this.repo.createNote({
      customerId,
      organizationId,
      ...result.value,
    });
  }

  async updateNoteFromDraft(id: string, draft: CrmNoteDraft) {
    const result = validateNoteDraft(draft);
    if (!result.ok) throw new CrmNoteValidationError(result.errors);
    return this.repo.updateNote(id, result.value);
  }

  deleteNote(id: string) {
    return this.repo.deleteNote(id);
  }

  listDocuments(customerId: CrmCustomerId) {
    return this.repo.listDocuments(customerId);
  }

  async attachDocument(
    customerId: CrmCustomerId,
    organizationId: string,
    file: File,
    uploadedBy: string,
  ): Promise<CrmDocumentRecord> {
    return this.repo.createDocument({
      customerId,
      organizationId,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedBy: uploadedBy.trim() || "System",
    });
  }

  deleteDocument(id: string) {
    return this.repo.deleteDocument(id);
  }

  listActivities(customerId: CrmCustomerId) {
    return this.repo.listActivities(customerId);
  }
}

export const crmDirectoryService = new CrmDirectoryService();
