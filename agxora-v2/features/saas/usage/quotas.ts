/**
 * Usage tracking + quota architecture.
 */

import { getCommercialPlan } from "../plans";
import { ensureLicense } from "../license";
import { saasCommercialStore } from "../store";
import type {
  PlanLimits,
  QuotaCheckResult,
  UsageMetricKey,
  UsageSnapshot,
} from "../types";

const METRIC_TO_LIMIT: Record<UsageMetricKey, keyof PlanLimits> = {
  ai_requests: "aiRequestsPerMonth",
  projects: "projects",
  customers: "customers",
  documents: "documents",
  storage_mb: "storageMb",
  users: "users",
  api_requests: "apiRequestsPerMonth",
};

export function trackUsage(
  organizationId: string,
  metric: UsageMetricKey,
  delta = 1,
): UsageSnapshot {
  ensureLicense(organizationId);
  return saasCommercialStore.recordUsage(organizationId, metric, delta);
}

export function getUsage(organizationId: string): UsageSnapshot {
  ensureLicense(organizationId);
  return saasCommercialStore.getUsage(organizationId);
}

export function checkQuota(
  organizationId: string,
  metric: UsageMetricKey,
): QuotaCheckResult {
  const license = ensureLicense(organizationId);
  const plan = getCommercialPlan(license.planId);
  const usage = getUsage(organizationId);
  const limit = plan.limits[METRIC_TO_LIMIT[metric]];
  const used = usage.metrics[metric];
  const remaining = Math.max(0, limit - used);
  const exceeded = used >= limit;
  const softWarning = !exceeded && used / Math.max(limit, 1) >= 0.8;
  return { metric, used, limit, remaining, exceeded, softWarning };
}

export function checkAllQuotas(
  organizationId: string,
): readonly QuotaCheckResult[] {
  const metrics = Object.keys(METRIC_TO_LIMIT) as UsageMetricKey[];
  return metrics.map((metric) => checkQuota(organizationId, metric));
}

/** Future enforcement hook — currently advisory only. */
export function assertQuota(
  organizationId: string,
  metric: UsageMetricKey,
): QuotaCheckResult {
  const result = checkQuota(organizationId, metric);
  if (result.exceeded) {
    // Architecture: throw or soft-block when enforcement is enabled.
  }
  return result;
}
