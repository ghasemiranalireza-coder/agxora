import { recordActivity } from "../backend/activity";
import { auditLog } from "../backend/audit";
import { customerRepository } from "./repository";
import type {
  CustomerCreateInput,
  CustomerDraft,
  CustomerId,
  CustomerRecord,
  CustomerUpdateInput,
} from "./types";
import {
  validateCustomerDraft,
  type CustomerFieldError,
  type CustomerValidationResult,
} from "./validation";

const HREF = "/dashboard/customers";

export class CustomerValidationError extends Error {
  readonly errors: readonly CustomerFieldError[];

  constructor(errors: readonly CustomerFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "CustomerValidationError";
    this.errors = errors;
  }
}

export class CustomerCrmService {
  constructor(private readonly repo = customerRepository) {}

  list(organizationId?: string) {
    return this.repo.list(organizationId);
  }

  getById(id: CustomerId) {
    return this.repo.getById(id);
  }

  subscribe(listener: () => void) {
    return this.repo.subscribe(listener);
  }

  async validateDraft(
    draft: CustomerDraft,
    organizationId: string,
    excludeId?: string,
  ): Promise<CustomerValidationResult> {
    const existing = await this.repo.list(organizationId);
    return validateCustomerDraft(draft, { existing, excludeId });
  }

  async createFromDraft(
    draft: CustomerDraft,
    organizationId: string,
  ): Promise<CustomerRecord> {
    const result = await this.validateDraft(draft, organizationId);
    if (!result.ok) {
      throw new CustomerValidationError(result.errors);
    }
    const input: CustomerCreateInput = {
      organizationId,
      ...result.value,
    };
    const customer = await this.repo.create(input);
    recordActivity({
      kind: "customer_created",
      title: "Customer Created",
      detail: customer.companyName,
      entityId: customer.id,
      organizationId: customer.organizationId,
      href: HREF,
    });
    auditLog({
      action: "customer.create",
      resource: "customer",
      resourceId: customer.id,
      organizationId: customer.organizationId,
    });
    return customer;
  }

  async updateFromDraft(
    id: CustomerId,
    draft: CustomerDraft,
    organizationId: string,
  ): Promise<CustomerRecord> {
    const result = await this.validateDraft(draft, organizationId, id);
    if (!result.ok) {
      throw new CustomerValidationError(result.errors);
    }
    const patch: CustomerUpdateInput = { ...result.value };
    const customer = await this.repo.update(id, patch);
    recordActivity({
      kind: "customer_updated",
      title: "Customer Updated",
      detail: customer.companyName,
      entityId: customer.id,
      organizationId: customer.organizationId,
      href: HREF,
    });
    auditLog({
      action: "customer.update",
      resource: "customer",
      resourceId: customer.id,
      organizationId: customer.organizationId,
    });
    return customer;
  }

  async deleteCustomer(id: CustomerId): Promise<CustomerRecord | null> {
    const existing = await this.repo.getById(id);
    if (!existing) return null;
    await this.repo.delete(id);
    recordActivity({
      kind: "customer_deleted",
      title: "Customer Deleted",
      detail: existing.companyName,
      entityId: existing.id,
      organizationId: existing.organizationId,
      href: HREF,
    });
    auditLog({
      action: "customer.delete",
      resource: "customer",
      resourceId: existing.id,
      organizationId: existing.organizationId,
    });
    return existing;
  }
}

export const customerCrmService = new CustomerCrmService();
