/**
 * Department — universal structural unit under a Business / Organization.
 */

import type { BusinessId } from "./Business";
import type { OrganizationId } from "./types";

export type DepartmentId = string & { readonly __brand: "DepartmentId" };

export function asDepartmentId(value: string): DepartmentId {
  return value as DepartmentId;
}

export type DepartmentStatus = "active" | "archived";

export interface Department {
  readonly id: DepartmentId;
  readonly organizationId: OrganizationId;
  readonly businessId?: BusinessId;
  readonly name: string;
  readonly code?: string;
  readonly parentDepartmentId?: DepartmentId;
  readonly status: DepartmentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateDepartmentInput {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly businessId?: BusinessId;
  readonly code?: string;
  readonly parentDepartmentId?: DepartmentId;
}

export function createDepartment(
  input: CreateDepartmentInput,
  id: DepartmentId = asDepartmentId(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `dept_${crypto.randomUUID()}`
      : `dept_${Date.now().toString(36)}`,
  ),
): Department {
  const now = new Date().toISOString();
  return {
    id,
    organizationId: input.organizationId,
    businessId: input.businessId,
    name: input.name.trim(),
    code: input.code,
    parentDepartmentId: input.parentDepartmentId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}
