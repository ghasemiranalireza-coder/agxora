/**
 * A commercial capability is usable only when the plan allows it and the
 * capability registry says LIVE. Future marketing IDs may be entitled on
 * Business and Professional and still stay unusable while the registry is FUTURE.
 *
 * Organizations with no CommercialSubscription keep the current production
 * behavior for live CRM, finance, and the communication workforce. A subscription
 * row is what turns plan limits on. PAST_DUE and EXPIRED fail closed for
 * governed capabilities. Human CRM and human finance stay reachable so the
 * customer can open billing and existing records. That access rule is explicit
 * and tested. It is not a grace period for governed execution.
 */

import type { CapabilityAvailabilityStatus } from "@/features/agents/capabilities/registry";
import { getCapability } from "@/features/agents/capabilities/registry";
import {
  FUTURE_MARKETING_CAPABILITIES,
  GOVERNED_COMMERCIAL_CAPABILITIES,
  isPlanCode,
  planAllows,
  type CommercialCapabilityId,
  type PlanCode,
} from "./catalog";

export type RegistryAvailability = CapabilityAvailabilityStatus | "UNKNOWN";

export type PaidAccess = "legacy" | "paid" | "unpaid";

const GOVERNED = new Set<string>(GOVERNED_COMMERCIAL_CAPABILITIES);
const MARKETING = new Set<string>(FUTURE_MARKETING_CAPABILITIES);

/** Agent OS capability → commercial entitlement required once a subscription exists. */
export const AGENT_CAPABILITY_ENTITLEMENT: Readonly<Record<string, CommercialCapabilityId>> = {
  CRM_LOAD_CUSTOMER: "CRM_FOLLOW_UP",
  CRM_PREPARE_NOTE: "CRM_FOLLOW_UP",
  CRM_CREATE_NOTE: "CRM_FOLLOW_UP",
  CRM_VERIFY_NOTE: "CRM_FOLLOW_UP",
  COMMUNICATION_LOAD_CUSTOMER: "GOVERNED_EMAIL",
  COMMUNICATION_PREPARE_EMAIL: "GOVERNED_EMAIL",
  COMMUNICATION_SEND_EMAIL: "GOVERNED_EMAIL",
  COMMUNICATION_VERIFY_EMAIL: "GOVERNED_EMAIL",
};

export function isCommercialCapabilityId(value: string): value is CommercialCapabilityId {
  return (
    GOVERNED.has(value) ||
    MARKETING.has(value) ||
    value === "CRM" ||
    value === "CRM_CUSTOMERS" ||
    value === "CRM_CONTACTS" ||
    value === "CRM_NOTES" ||
    value === "CRM_ACTIVITY" ||
    value === "FINANCE_HUMAN" ||
    value === "DATA_EXPORT" ||
    value === "SUPPORT" ||
    value === "RECOVERY"
  );
}

export function registryStatusFor(capabilityId: string): RegistryAvailability {
  if (isCommercialCapabilityId(capabilityId) && MARKETING.has(capabilityId)) {
    return getCapability(capabilityId)?.availability.status ?? "FUTURE";
  }
  const agent = getCapability(capabilityId);
  if (agent) return agent.availability.status;
  if (isCommercialCapabilityId(capabilityId) && !MARKETING.has(capabilityId) && !GOVERNED.has(capabilityId)) {
    return "LIVE";
  }
  if (GOVERNED.has(capabilityId)) return "LIVE";
  return "UNKNOWN";
}

export function isCustomerCapabilityUsable(input: {
  readonly planCode: PlanCode | null;
  readonly capabilityId: string;
  readonly registryStatus: RegistryAvailability;
  readonly access: PaidAccess;
}): boolean {
  if (input.registryStatus !== "LIVE") return false;
  if (input.access === "legacy") {
    return !MARKETING.has(input.capabilityId);
  }
  if (input.access !== "paid" || !input.planCode) return false;
  const commercial = commercialIdFor(input.capabilityId);
  if (!commercial) return false;
  return planAllows(input.planCode, commercial);
}

export function canUseCapability(input: {
  readonly planCode: PlanCode | null;
  readonly capabilityId: string;
  readonly access: PaidAccess;
}): boolean {
  return isCustomerCapabilityUsable({
    ...input,
    registryStatus: registryStatusFor(input.capabilityId),
  });
}

export function commercialIdFor(capabilityId: string): CommercialCapabilityId | null {
  if (isCommercialCapabilityId(capabilityId)) return capabilityId;
  return AGENT_CAPABILITY_ENTITLEMENT[capabilityId] ?? null;
}

export function planCodeOrNull(value: string | null | undefined): PlanCode | null {
  return value && isPlanCode(value) ? value : null;
}
