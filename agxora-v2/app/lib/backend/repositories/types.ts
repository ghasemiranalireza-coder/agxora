import type { EntityId, Paginated } from "../types";

export interface RepositoryQuery {
  readonly organizationId?: EntityId;
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
}

export interface CrudRepository<T extends { readonly id: EntityId }> {
  list(query?: RepositoryQuery): Promise<Paginated<T>>;
  getById(id: EntityId): Promise<T | null>;
  create(input: Omit<T, "id" | "createdAt" | "updatedAt"> & Partial<Pick<T, "id">>): Promise<T>;
  update(id: EntityId, patch: Partial<T>): Promise<T>;
  delete(id: EntityId): Promise<void>;
}

export type CustomerRepository = CrudRepository<import("../types").Customer>;
export type ProjectRepository = CrudRepository<import("../types").Project>;
export type InvoiceRepository = CrudRepository<import("../types").Invoice>;
export type DocumentRepository = CrudRepository<import("../types").Document>;
export type UserRepository = CrudRepository<import("../types").User>;
export type WorkflowRepository = CrudRepository<import("../types").Workflow>;
export type AutomationRunRepository = CrudRepository<import("../types").AutomationRun>;
export type TeamMemberRepository = CrudRepository<import("../types").TeamMember>;
export type NotificationRepository = CrudRepository<import("../types").Notification>;
export type ActivityRepository = CrudRepository<import("../types").Activity>;
