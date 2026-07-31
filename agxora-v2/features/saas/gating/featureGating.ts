/**
 * Feature gating — modules enabled by subscription plan.
 */

import { getCommercialPlan, planHasFeature } from "../plans";
import {
  ensureLicense,
  evaluateLicenseStatus,
  isLicenseEntitled,
} from "../license";
import type { CommercialPlanId, SaasModuleFeatureKey } from "../types";
import { setFeatureFlag } from "@/app/lib/backend/config/featureFlags";

const MODULE_FLAG_PREFIX = "saas.module.";

export function featureFlagKey(feature: SaasModuleFeatureKey): string {
  return `${MODULE_FLAG_PREFIX}${feature}`;
}

export function canAccessFeature(
  organizationId: string | null | undefined,
  feature: SaasModuleFeatureKey,
): boolean {
  if (!organizationId) return false;
  const license = ensureLicense(organizationId);
  if (!isLicenseEntitled(license)) return false;
  return planHasFeature(license.planId, feature);
}

export function listEnabledFeatures(
  organizationId: string,
): readonly SaasModuleFeatureKey[] {
  const license = ensureLicense(organizationId);
  if (!isLicenseEntitled(license)) return [];
  return getCommercialPlan(license.planId).features;
}

/** Sync plan features into runtime feature flags for UI consumers. */
export function syncPlanFeatureFlags(
  organizationId: string,
  allFeatures: readonly SaasModuleFeatureKey[],
): void {
  const license = ensureLicense(organizationId);
  const entitled = isLicenseEntitled(license);
  for (const feature of allFeatures) {
    const enabled = entitled && planHasFeature(license.planId, feature);
    setFeatureFlag(featureFlagKey(feature), enabled);
  }
  setFeatureFlag(
    "saas.license.active",
    entitled && evaluateLicenseStatus(license) !== "expired",
  );
  setFeatureFlag(`saas.plan.${license.planId}`, true);
}

export function getPlanIdForOrg(organizationId: string): CommercialPlanId {
  return ensureLicense(organizationId).planId;
}
