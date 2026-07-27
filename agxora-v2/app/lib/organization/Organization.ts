/**
 * Organization entity helpers — universal business OS foundation.
 * Complements the existing Organization profile/session types.
 */

import type {
  IndustryCategory,
  Organization,
  OrganizationId,
  OrganizationSize,
  OrganizationType,
} from "./types";
import { asOrganizationId } from "./types";

export type { Organization, OrganizationId };

export interface OrganizationIdentity {
  readonly id: OrganizationId;
  readonly legalName: string;
  readonly displayName: string;
  readonly type: OrganizationType;
  readonly industry: IndustryCategory;
  readonly size: OrganizationSize;
  readonly country: string;
  readonly status: Organization["status"];
}

export function toOrganizationIdentity(
  organization: Organization,
): OrganizationIdentity {
  return {
    id: organization.id,
    legalName: organization.name,
    displayName: organization.name,
    type: organization.type,
    industry: organization.industry,
    size: organization.size,
    country: organization.country,
    status: organization.status,
  };
}

export function createOrganizationId(value: string): OrganizationId {
  return asOrganizationId(value);
}
