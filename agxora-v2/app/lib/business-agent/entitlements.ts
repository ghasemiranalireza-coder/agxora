/**
 * Marketplace plan-access abstraction.
 * This is not billing. It does not activate a Premium plan.
 * A future billing adapter can replace the resolver without changing capability checks.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";

export type MarketplaceEntitlementId = "marketplace";

export type PlanAccessDecision = {
  readonly entitled: boolean;
  readonly entitlement: MarketplaceEntitlementId;
  readonly source: "denied_default" | "test" | "environment";
};

let testOverride: boolean | null = null;

export function setMarketplaceEntitlementForTests(value: boolean | null): void {
  testOverride = value;
}

function envFlagEnabled(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function entitledOrgIds(): ReadonlySet<string> {
  const raw = process.env.AGXORA_MARKETPLACE_ENTITLED_ORG_IDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/**
 * Plan Access (A): does this organization's plan allow Marketplace?
 * Production default is deny until a real billing adapter grants access.
 */
export function hasMarketplacePlanAccess(organizationId: string): PlanAccessDecision {
  if (testOverride !== null) {
    return {
      entitled: testOverride,
      entitlement: "marketplace",
      source: "test",
    };
  }

  const allowlisted = entitledOrgIds();
  if (allowlisted.size > 0) {
    return {
      entitled: allowlisted.has(organizationId),
      entitlement: "marketplace",
      source: "environment",
    };
  }

  if (envFlagEnabled(process.env.AGXORA_MARKETPLACE_ENTITLEMENT)) {
    return {
      entitled: true,
      entitlement: "marketplace",
      source: "environment",
    };
  }

  return {
    entitled: false,
    entitlement: "marketplace",
    source: "denied_default",
  };
}

export function assertMarketplacePlanAccess(organizationId: string): void {
  const decision = hasMarketplacePlanAccess(organizationId);
  if (!decision.entitled) {
    throw new PersistenceError(
      "forbidden",
      "Amazon Seller is part of AGXORA Premium Marketplace. This workspace does not have Marketplace access yet.",
      { details: [{ field: "marketplace", message: "plan_required" }] },
    );
  }
}
