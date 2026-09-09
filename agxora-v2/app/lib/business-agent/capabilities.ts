/**
 * Effective marketplace capability = Plan Access + Provider Connection + Provider Permissions.
 * Never invent a connected or successful Amazon state.
 */

import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import {
  getAmazonLwaConfig,
  getAmazonSpApiEnvironment,
  isAmazonSellerEnabled,
  type AmazonSpApiEnvironment,
} from "@/app/lib/amazon/config";
import { permissionGranted } from "./authorize";
import { hasMarketplacePlanAccess } from "./entitlements";
import { listIntegrationsForActor } from "./integrations";
import { getMarketplaceCatalogEntry } from "./marketplace-catalog";
import { SAFE_PERMISSIONS } from "./catalog";

export type CapabilityMissingStep = {
  readonly code:
    | "plan_required"
    | "not_implemented"
    | "not_configured"
    | "not_connected"
    | "read_permission_required";
  readonly message: string;
};

export type AmazonCapability = {
  readonly provider: "amazon_seller";
  readonly tier: "premium";
  readonly planAccess: boolean;
  readonly connected: boolean;
  readonly canRead: boolean;
  readonly configured: boolean;
  readonly environment: AmazonSpApiEnvironment | "unconfigured";
  readonly canAnalyze: boolean;
  readonly missingSteps: readonly CapabilityMissingStep[];
};

function customerMissingSteps(input: {
  readonly planAccess: boolean;
  readonly implemented: boolean;
  readonly configured: boolean;
  readonly connected: boolean;
  readonly canRead: boolean;
}): readonly CapabilityMissingStep[] {
  const steps: CapabilityMissingStep[] = [];
  if (!input.planAccess) {
    steps.push({
      code: "plan_required",
      message:
        "Amazon Seller is part of AGXORA Premium Marketplace. This workspace does not have Marketplace access yet.",
    });
  }
  if (!input.implemented) {
    steps.push({
      code: "not_implemented",
      message: "This marketplace is not available in AGXORA yet.",
    });
  }
  if (!input.configured) {
    steps.push({
      code: "not_configured",
      message: "Amazon Seller is not available on this AGXORA environment yet.",
    });
  }
  if (!input.connected) {
    steps.push({
      code: "not_connected",
      message:
        "Connect Amazon Seller to continue. AGXORA will send you to Amazon to approve access, then bring you back.",
    });
  } else if (!input.canRead) {
    steps.push({
      code: "read_permission_required",
      message: "Amazon Seller is connected, but read access is turned off for this workspace.",
    });
  }
  return steps;
}

export function evaluateAmazonCapability(input: {
  readonly planAccess: boolean;
  readonly configured: boolean;
  readonly connected: boolean;
  readonly canRead: boolean;
  readonly environment: AmazonSpApiEnvironment | "unconfigured";
}): AmazonCapability {
  const missingSteps = customerMissingSteps({
    planAccess: input.planAccess,
    implemented: true,
    configured: input.configured,
    connected: input.connected,
    canRead: input.canRead,
  });
  return {
    provider: "amazon_seller",
    tier: "premium",
    planAccess: input.planAccess,
    connected: input.connected,
    canRead: input.canRead,
    configured: input.configured,
    environment: input.environment,
    canAnalyze: input.planAccess && input.configured && input.connected && input.canRead,
    missingSteps,
  };
}

export async function resolveAmazonCapabilityForActor(actor: Actor): Promise<AmazonCapability> {
  const plan = hasMarketplacePlanAccess(actor.organizationId);
  const configured = isAmazonSellerEnabled() && Boolean(getAmazonLwaConfig());
  const integrations = await listIntegrationsForActor(actor);
  const integration = integrations.find((row) => row.provider === "amazon_seller");
  const connected = Boolean(integration?.connected);
  const canRead = permissionGranted(integration?.permissions ?? SAFE_PERMISSIONS, "read");
  return evaluateAmazonCapability({
    planAccess: plan.entitled,
    configured,
    connected,
    canRead,
    environment: configured ? getAmazonSpApiEnvironment() : "unconfigured",
  });
}

export function marketplaceCustomerSummary(): string {
  return getMarketplaceCatalogEntry("amazon_seller").customerSummary;
}
