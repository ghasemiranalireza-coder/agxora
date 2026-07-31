import type { OptimisticUpdate } from "../types";
import type { RepositoryQuery } from "../repositories";
import { repositories, type RepositoryRegistry } from "../repositories";
import { recordActivity } from "../activity";
import { auditLog } from "../audit";

abstract class BaseService<T extends { readonly id: string }> {
  constructor(
    protected readonly repo: {
      list(query?: RepositoryQuery): Promise<import("../types").Paginated<T>>;
      getById(id: string): Promise<T | null>;
      create(input: Omit<T, "id" | "createdAt" | "updatedAt"> & Partial<Pick<T, "id">>): Promise<T>;
      update(id: string, patch: Partial<T>): Promise<T>;
      delete(id: string): Promise<void>;
    },
  ) {}

  list(query?: RepositoryQuery) {
    return this.repo.list(query);
  }

  getById(id: string) {
    return this.repo.getById(id);
  }

  /**
   * Optimistic update architecture — apply local next state, then commit/rollback.
   */
  createOptimisticUpdate(
    previous: T | null,
    next: T,
    commit: () => Promise<void>,
  ): OptimisticUpdate<T> {
    return {
      id: next.id,
      previous,
      next,
      commit,
      rollback: () => {
        /* UI stores restore previous — architecture hook */
      },
    };
  }
}

export class CustomerService extends BaseService<import("../types").Customer> {
  async createCustomer(
    input: Omit<import("../types").Customer, "id" | "createdAt" | "updatedAt">,
  ) {
    const customer = await this.repo.create(input);
    const label = customer.companyName || customer.name || customer.email;
    recordActivity({
      kind: "customer_created",
      title: "Customer Created",
      detail: label,
      entityId: customer.id,
      organizationId: customer.organizationId,
      href: "/dashboard/customers",
    });
    auditLog({
      action: "customer.create",
      resource: "customer",
      resourceId: customer.id,
      organizationId: customer.organizationId,
    });
    return customer;
  }

  async updateCustomer(
    id: string,
    patch: Partial<import("../types").Customer>,
  ) {
    const customer = await this.repo.update(id, patch);
    const label = customer.companyName || customer.name || customer.email;
    recordActivity({
      kind: "customer_updated",
      title: "Customer Updated",
      detail: label,
      entityId: customer.id,
      organizationId: customer.organizationId,
      href: "/dashboard/customers",
    });
    return customer;
  }

  async deleteCustomer(id: string) {
    const existing = await this.repo.getById(id);
    await this.repo.delete(id);
    if (existing) {
      const label = existing.companyName || existing.name || existing.email;
      recordActivity({
        kind: "customer_deleted",
        title: "Customer Deleted",
        detail: label,
        entityId: existing.id,
        organizationId: existing.organizationId,
        href: "/dashboard/customers",
      });
    }
  }
}

export class ProjectService extends BaseService<import("../types").Project> {
  async updateProject(id: string, patch: Partial<import("../types").Project>) {
    const project = await this.repo.update(id, patch);
    recordActivity({
      kind: "project_updated",
      title: "Project Updated",
      detail: project.name,
      entityId: project.id,
      organizationId: project.organizationId,
      href: "/dashboard/projects",
    });
    return project;
  }
}

export class FinanceService extends BaseService<import("../types").Invoice> {
  async markPaid(id: string) {
    const invoice = await this.repo.update(id, { status: "paid" });
    recordActivity({
      kind: "invoice_paid",
      title: "Invoice Paid",
      detail: invoice.number,
      entityId: invoice.id,
      organizationId: invoice.organizationId,
      href: "/dashboard/finance",
    });
    auditLog({
      action: "invoice.paid",
      resource: "invoice",
      resourceId: invoice.id,
      organizationId: invoice.organizationId,
    });
    return invoice;
  }
}

export class DocumentService extends BaseService<import("../types").Document> {
  async uploadDocument(
    input: Omit<import("../types").Document, "id" | "createdAt" | "updatedAt">,
  ) {
    const document = await this.repo.create(input);
    recordActivity({
      kind: "document_uploaded",
      title: "Document Uploaded",
      detail: document.name,
      entityId: document.id,
      organizationId: document.organizationId,
      href: "/dashboard/documents",
    });
    return document;
  }
}

export class WorkflowService extends BaseService<import("../types").Workflow> {
  constructor(
    workflows = repositories.workflows,
    private readonly runs = repositories.automationRuns,
  ) {
    super(workflows);
  }

  async executeWorkflow(workflowId: string, organizationId: string, trigger: string) {
    const workflow = await this.repo.getById(workflowId);
    if (!workflow) throw new Error("Workflow not found");
    const run = await this.runs.create({
      organizationId,
      workflowId,
      workflowName: workflow.name,
      status: "success",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      trigger,
    });
    recordActivity({
      kind: "workflow_executed",
      title: "Workflow Executed",
      detail: workflow.name,
      entityId: run.id,
      organizationId,
      href: "/dashboard/automation",
    });
    return run;
  }
}

export class NotificationService extends BaseService<import("../types").Notification> {
  async push(
    input: Omit<import("../types").Notification, "id" | "createdAt" | "updatedAt" | "read"> & {
      readonly read?: boolean;
    },
  ) {
    return this.repo.create({ ...input, read: input.read ?? false });
  }
}

export class OrganizationServiceFacade {
  constructor(private readonly registry: RepositoryRegistry = repositories) {}

  users() {
    return this.registry.users;
  }

  teamMembers() {
    return this.registry.teamMembers;
  }
}

export function createBackendServices(registry: RepositoryRegistry = repositories) {
  return {
    customers: new CustomerService(registry.customers),
    projects: new ProjectService(registry.projects),
    finance: new FinanceService(registry.invoices),
    documents: new DocumentService(registry.documents),
    workflows: new WorkflowService(registry.workflows, registry.automationRuns),
    notifications: new NotificationService(registry.notifications),
    organization: new OrganizationServiceFacade(registry),
  };
}

export const backendServices = createBackendServices();
