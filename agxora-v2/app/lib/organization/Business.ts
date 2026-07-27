/**
 * Business unit within an organization — industry-agnostic.
 * Hotels, factories, clinics, agencies all map to Business.
 */

import type { OrganizationId } from "./types";

export type BusinessId = string & { readonly __brand: "BusinessId" };

export function asBusinessId(value: string): BusinessId {
  return value as BusinessId;
}

export type BusinessStatus = "active" | "paused" | "archived";

export interface Business {
  readonly id: BusinessId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly code?: string;
  readonly description?: string;
  /** Free-form vertical label — never hard-coded into core logic. */
  readonly verticalLabel?: string;
  readonly status: BusinessStatus;
  readonly timezone?: string;
  readonly currency?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateBusinessInput {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly code?: string;
  readonly description?: string;
  readonly verticalLabel?: string;
  readonly timezone?: string;
  readonly currency?: string;
}

export function createBusiness(
  input: CreateBusinessInput,
  id: BusinessId = asBusinessId(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `biz_${crypto.randomUUID()}`
      : `biz_${Date.now().toString(36)}`,
  ),
): Business {
  const now = new Date().toISOString();
  return {
    id,
    organizationId: input.organizationId,
    name: input.name.trim(),
    code: input.code,
    description: input.description,
    verticalLabel: input.verticalLabel,
    status: "active",
    timezone: input.timezone,
    currency: input.currency,
    createdAt: now,
    updatedAt: now,
  };
}
