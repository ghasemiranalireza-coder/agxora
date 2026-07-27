/**
 * Employee — person employed by an organization / business.
 * Universal HR-ready model; not industry-specific.
 */

import type { BusinessId } from "./Business";
import type { DepartmentId } from "./Department";
import type { OrganizationId, UserId } from "./types";

export type EmployeeId = string & { readonly __brand: "EmployeeId" };

export function asEmployeeId(value: string): EmployeeId {
  return value as EmployeeId;
}

export type EmployeeStatus = "active" | "on_leave" | "terminated" | "invited";

export interface Employee {
  readonly id: EmployeeId;
  readonly organizationId: OrganizationId;
  readonly businessId?: BusinessId;
  readonly departmentId?: DepartmentId;
  readonly userId?: UserId;
  readonly firstName: string;
  readonly lastName: string;
  readonly email?: string;
  readonly title?: string;
  readonly status: EmployeeStatus;
  readonly hiredAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateEmployeeInput {
  readonly organizationId: OrganizationId;
  readonly firstName: string;
  readonly lastName: string;
  readonly businessId?: BusinessId;
  readonly departmentId?: DepartmentId;
  readonly userId?: UserId;
  readonly email?: string;
  readonly title?: string;
  readonly hiredAt?: string;
}

export function createEmployee(
  input: CreateEmployeeInput,
  id: EmployeeId = asEmployeeId(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `emp_${crypto.randomUUID()}`
      : `emp_${Date.now().toString(36)}`,
  ),
): Employee {
  const now = new Date().toISOString();
  return {
    id,
    organizationId: input.organizationId,
    businessId: input.businessId,
    departmentId: input.departmentId,
    userId: input.userId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email?.trim().toLowerCase(),
    title: input.title,
    status: "active",
    hiredAt: input.hiredAt,
    createdAt: now,
    updatedAt: now,
  };
}

export function employeeDisplayName(employee: Employee): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}
