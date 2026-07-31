/**
 * SaaS subscription model — architecture ready for Stripe/Paddle later.
 * Commercial catalog lives in features/saas (Starter/Professional/Business/Enterprise).
 */

export type SubscriptionPlanId =
  | "free"
  | "starter"
  | "growth"
  | "professional"
  | "business"
  | "enterprise"
  | "custom";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "trial"
  | "expired"
  | "cancelled"
  | "suspended";

export interface Subscription {
  readonly id: string;
  readonly organizationId: string;
  readonly planId: SubscriptionPlanId;
  readonly status: SubscriptionStatus;
  readonly seats: number;
  readonly renewsAt?: string;
  readonly trialEndsAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlanId = "starter";

export function createTrialSubscription(organizationId: string): Subscription {
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    id: `sub_${organizationId}`,
    organizationId,
    planId: "starter",
    status: "trialing",
    seats: 5,
    trialEndsAt: trialEnds.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
