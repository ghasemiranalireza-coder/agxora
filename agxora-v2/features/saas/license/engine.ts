/**
 * License engine — trial / active / expired / cancelled / suspended / lifetime.
 */

import { getCommercialPlan } from "../plans";
import { saasCommercialStore } from "../store";
import type {
  CommercialPlanId,
  LicenseRecord,
  LicenseStatus,
} from "../types";

export function ensureLicense(
  organizationId: string,
  planId: CommercialPlanId = "starter",
): LicenseRecord {
  return saasCommercialStore.ensureOrganization(organizationId, planId);
}

export function getLicense(organizationId: string): LicenseRecord | null {
  return saasCommercialStore.getLicense(organizationId);
}

export function evaluateLicenseStatus(license: LicenseRecord): LicenseStatus {
  if (license.lifetime || license.status === "lifetime") return "lifetime";
  if (license.status === "cancelled" || license.status === "suspended") {
    return license.status;
  }
  const now = Date.now();
  if (license.status === "trial" && license.trialEndsAt) {
    if (new Date(license.trialEndsAt).getTime() < now) return "expired";
    return "trial";
  }
  if (license.renewsAt && new Date(license.renewsAt).getTime() < now) {
    return "expired";
  }
  if (license.status === "active" || license.status === "trial") {
    return license.status;
  }
  return license.status;
}

export function activateLicense(
  organizationId: string,
  planId: CommercialPlanId,
  actorUserId?: string,
): LicenseRecord {
  const plan = getCommercialPlan(planId);
  const renews = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const license = saasCommercialStore.updateLicense(organizationId, {
    planId,
    status: "active",
    seats: plan.limits.users,
    renewsAt: renews,
    trialEndsAt: undefined,
    cancelledAt: undefined,
    suspendedAt: undefined,
    lifetime: false,
  });
  saasCommercialStore.logAudit({
    action: "license.activated",
    organizationId,
    actorUserId,
    metadata: { planId },
  });
  return license;
}

export function changePlan(
  organizationId: string,
  planId: CommercialPlanId,
  direction: "upgrade" | "downgrade",
  actorUserId?: string,
): LicenseRecord {
  const plan = getCommercialPlan(planId);
  const license = saasCommercialStore.updateLicense(organizationId, {
    planId,
    seats: plan.limits.users,
    status: "active",
  });
  saasCommercialStore.logAudit({
    action: "license.plan_changed",
    organizationId,
    actorUserId,
    metadata: { planId, direction },
  });
  saasCommercialStore.logAudit({
    action: direction === "upgrade" ? "portal.upgrade" : "portal.downgrade",
    organizationId,
    actorUserId,
    metadata: { planId },
  });
  return license;
}

export function cancelLicense(
  organizationId: string,
  actorUserId?: string,
): LicenseRecord {
  const license = saasCommercialStore.updateLicense(organizationId, {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  });
  saasCommercialStore.logAudit({
    action: "license.cancelled",
    organizationId,
    actorUserId,
  });
  saasCommercialStore.logAudit({
    action: "portal.cancel",
    organizationId,
    actorUserId,
  });
  return license;
}

/** Extend renewsAt by one billing period (mock — payment provider later). */
export function renewLicense(
  organizationId: string,
  actorUserId?: string,
  intervalDays = 30,
): LicenseRecord {
  const current = ensureLicense(organizationId);
  const base = current.renewsAt
    ? Math.max(Date.now(), new Date(current.renewsAt).getTime())
    : Date.now();
  const renewsAt = new Date(base + intervalDays * 24 * 60 * 60 * 1000).toISOString();
  const license = saasCommercialStore.updateLicense(organizationId, {
    status: "active",
    renewsAt,
    cancelledAt: undefined,
    suspendedAt: undefined,
  });
  saasCommercialStore.logAudit({
    action: "license.renewed",
    organizationId,
    actorUserId,
    metadata: { renewsAt },
  });
  saasCommercialStore.logAudit({
    action: "portal.renew",
    organizationId,
    actorUserId,
    metadata: { renewsAt },
  });
  return license;
}

export function suspendLicense(
  organizationId: string,
  actorUserId?: string,
): LicenseRecord {
  const license = saasCommercialStore.updateLicense(organizationId, {
    status: "suspended",
    suspendedAt: new Date().toISOString(),
  });
  saasCommercialStore.logAudit({
    action: "license.suspended",
    organizationId,
    actorUserId,
  });
  return license;
}

export function grantLifetimeLicense(
  organizationId: string,
  planId: CommercialPlanId = "enterprise",
  actorUserId?: string,
): LicenseRecord {
  const license = saasCommercialStore.updateLicense(organizationId, {
    planId,
    status: "lifetime",
    lifetime: true,
    renewsAt: undefined,
  });
  saasCommercialStore.logAudit({
    action: "license.activated",
    organizationId,
    actorUserId,
    metadata: { planId, lifetime: "true" },
  });
  return license;
}

export function isLicenseEntitled(license: LicenseRecord | null): boolean {
  if (!license) return false;
  const status = evaluateLicenseStatus(license);
  return (
    status === "active" ||
    status === "trial" ||
    status === "lifetime"
  );
}
