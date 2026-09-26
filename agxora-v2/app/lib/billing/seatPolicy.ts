/**
 * Seats are distinct active organization members. A second workspace for the
 * same user is not another seat. Organizations without a subscription are not
 * capped, so existing production teams stay valid.
 */

import { getCommercialPlan, type PlanCode } from "./catalog";
import { hasPaidAccess, type SubscriptionStatus } from "./subscriptionState";

export function decideSeat(input: {
  readonly organizationId: string;
  readonly subscription: {
    readonly organizationId: string;
    readonly planCode: PlanCode;
    readonly status: SubscriptionStatus;
    readonly currentPeriodEnd: Date;
    readonly cancelAtPeriodEnd: boolean;
  } | null;
  readonly activeUserIds: readonly string[];
  readonly userId: string;
  readonly now: Date;
}): { readonly allow: boolean; readonly reason: string; readonly limit: number | null } {
  if (input.subscription && input.subscription.organizationId !== input.organizationId) {
    return { allow: false, reason: "tenant_mismatch", limit: null };
  }
  if (input.activeUserIds.includes(input.userId)) {
    return { allow: true, reason: "existing_member", limit: input.subscription ? getCommercialPlan(input.subscription.planCode).seats : null };
  }
  if (!input.subscription) return { allow: true, reason: "no_subscription_legacy", limit: null };
  if (!hasPaidAccess(input.subscription, input.now)) {
    return { allow: false, reason: "payment_required", limit: getCommercialPlan(input.subscription.planCode).seats };
  }
  const limit = getCommercialPlan(input.subscription.planCode).seats;
  if (input.activeUserIds.length >= limit) return { allow: false, reason: "seat_limit", limit };
  return { allow: true, reason: "within_limit", limit };
}
