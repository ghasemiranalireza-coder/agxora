/**
 * What counts as a governed execution
 *
 * A governed execution consumes the billing-period allowance when an
 * AgentGovernedExecution row for the same organization:
 * - was created at or after currentPeriodStart and before currentPeriodEnd
 * - has status COMPLETED, RESERVED, EXECUTING, or AMBIGUOUS
 *
 * FAILED does not count. A request rejected before a row is reserved does not
 * count. Replaying an existing idempotency key does not consume another slot.
 * RESERVED and EXECUTING count so concurrent reservations cannot pass the cap.
 * The subscription row is locked in the same database transaction as the insert.
 *
 * Base allows 0. Organizations with no subscription row keep the previous
 * production behavior and are not capped.
 */

import type { CapabilityAvailabilityStatus } from "@/features/agents/capabilities/registry";
import { getCommercialPlan, type PlanCode } from "./catalog";
import { commercialIdFor, isCustomerCapabilityUsable, type PaidAccess } from "./entitlements";
import { hasPaidAccess, type SubscriptionStatus } from "./subscriptionState";

export const GOVERNED_EXECUTION_COUNT_STATUSES = ["COMPLETED", "RESERVED", "EXECUTING", "AMBIGUOUS"] as const;
export type CountedExecutionStatus = (typeof GOVERNED_EXECUTION_COUNT_STATUSES)[number];

export function countsTowardGovernedExecution(status: string): boolean {
  return (GOVERNED_EXECUTION_COUNT_STATUSES as readonly string[]).includes(status);
}

export function governedExecutionWhere(input: {
  readonly organizationId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
}) {
  return {
    organizationId: input.organizationId,
    createdAt: { gte: input.periodStart, lt: input.periodEnd },
    status: { in: [...GOVERNED_EXECUTION_COUNT_STATUSES] },
  };
}

export interface ExecutionSubscription {
  readonly organizationId: string;
  readonly planCode: PlanCode;
  readonly status: SubscriptionStatus;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
}

export function paidAccessFor(
  subscription: ExecutionSubscription | null,
  now: Date,
): PaidAccess {
  if (!subscription) return "legacy";
  return hasPaidAccess(subscription, now) ? "paid" : "unpaid";
}

export function decideGovernedExecution(input: {
  readonly organizationId: string;
  readonly subscription: ExecutionSubscription | null;
  readonly capabilityId: string;
  readonly registryStatus: CapabilityAvailabilityStatus | "UNKNOWN";
  readonly counted: number;
  readonly now: Date;
  readonly replaying: boolean;
}): { readonly allow: boolean; readonly reason: string } {
  if (input.subscription && input.subscription.organizationId !== input.organizationId) {
    return { allow: false, reason: "tenant_mismatch" };
  }
  if (input.replaying) return { allow: true, reason: "replay" };
  const access = paidAccessFor(input.subscription, input.now);
  const commercial = commercialIdFor(input.capabilityId);
  if (!commercial) return { allow: false, reason: "unknown_capability" };
  const usable = isCustomerCapabilityUsable({
    planCode: input.subscription?.planCode ?? null,
    capabilityId: commercial,
    registryStatus: input.registryStatus,
    access,
  });
  if (!usable) {
    if (input.registryStatus !== "LIVE") return { allow: false, reason: "capability_not_live" };
    if (access === "unpaid") return { allow: false, reason: "payment_required" };
    return { allow: false, reason: "plan_denied" };
  }
  if (!input.subscription) return { allow: true, reason: "no_subscription_legacy" };
  const limit = getCommercialPlan(input.subscription.planCode).governedExecutionsPerMonth;
  if (input.counted >= limit) return { allow: false, reason: "execution_limit" };
  return { allow: true, reason: "within_limit" };
}
