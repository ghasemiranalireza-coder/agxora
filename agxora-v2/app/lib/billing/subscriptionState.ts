/**
 * Commercial subscription state. There is no trial.
 * Browser redirects never produce a status.
 */

export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionClock {
  readonly status: SubscriptionStatus;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
}

/** Paid entitlement: ACTIVE, or canceled with the paid period still open. */
export function hasPaidAccess(subscription: SubscriptionClock, now: Date): boolean {
  if (now.getTime() >= subscription.currentPeriodEnd.getTime()) return false;
  if (subscription.status === "ACTIVE") return true;
  if (subscription.status === "CANCELED" && subscription.cancelAtPeriodEnd) return true;
  return false;
}

export function effectiveStatus(subscription: SubscriptionClock, now: Date): SubscriptionStatus {
  if (now.getTime() >= subscription.currentPeriodEnd.getTime()) return "EXPIRED";
  if (subscription.status === "PAST_DUE") return "PAST_DUE";
  if (subscription.status === "EXPIRED") return "EXPIRED";
  if (subscription.cancelAtPeriodEnd && (subscription.status === "ACTIVE" || subscription.status === "CANCELED")) {
    return "CANCELED";
  }
  return subscription.status;
}

export function displayStatus(subscription: SubscriptionClock, now: Date):
  | "Active"
  | "Past due"
  | "Canceled at period end"
  | "Expired" {
  const status = effectiveStatus(subscription, now);
  if (status === "PAST_DUE") return "Past due";
  if (status === "EXPIRED") return "Expired";
  if (subscription.cancelAtPeriodEnd && hasPaidAccess(subscription, now)) return "Canceled at period end";
  if (status === "CANCELED" && hasPaidAccess(subscription, now)) return "Canceled at period end";
  if (status === "ACTIVE") return "Active";
  return "Expired";
}

/** A checkout return query is presentation only. */
export function subscriptionFromBrowserReturn(query: Readonly<Record<string, unknown>>): null {
  void query;
  return null;
}
