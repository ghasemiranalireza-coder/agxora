/**
 * Checkout authorization. The organization always comes from the server session.
 * A success URL is not payment proof.
 */

import { isBillingInterval, isPlanCode, type BillingInterval, type PlanCode } from "./catalog";
import { hasPaidAccess, type SubscriptionStatus } from "./subscriptionState";

export interface CheckoutBody {
  readonly planCode?: unknown;
  readonly billingInterval?: unknown;
  readonly organizationId?: unknown;
  readonly successUrl?: unknown;
  readonly returnUrl?: unknown;
}

export function authorizeCheckout(input: {
  readonly authenticated: boolean;
  readonly sessionOrganizationId: string | null;
  readonly body: CheckoutBody;
}):
  | {
      readonly ok: true;
      readonly organizationId: string;
      readonly planCode: PlanCode;
      readonly billingInterval: BillingInterval;
    }
  | { readonly ok: false; readonly status: number; readonly code: string; readonly message: string } {
  if (!input.authenticated || !input.sessionOrganizationId) {
    return { ok: false, status: 401, code: "unauthorized", message: "Authentication required." };
  }
  if (!isPlanCode(input.body.planCode)) {
    return { ok: false, status: 400, code: "validation", message: "Unknown plan." };
  }
  if (!isBillingInterval(input.body.billingInterval)) {
    return { ok: false, status: 400, code: "validation", message: "Unknown billing interval." };
  }
  return {
    ok: true,
    organizationId: input.sessionOrganizationId,
    planCode: input.body.planCode,
    billingInterval: input.body.billingInterval,
  };
}

export function checkoutUrls(origin: string): { readonly successUrl: string; readonly cancelUrl: string } {
  const base = origin.replace(/\/$/, "");
  return {
    successUrl: `${base}/dashboard/settings?billing=return#billing`,
    cancelUrl: `${base}/dashboard/settings?billing=cancel#billing`,
  };
}

export function decideCheckoutStart(input: {
  readonly requestedPlan: PlanCode;
  readonly requestedInterval: BillingInterval;
  readonly subscription: {
    readonly planCode: PlanCode;
    readonly interval: BillingInterval;
    readonly status: SubscriptionStatus;
    readonly currentPeriodEnd: Date;
    readonly cancelAtPeriodEnd: boolean;
  } | null;
  readonly openCheckoutAgeMs: number | null;
  readonly now: Date;
}):
  | { readonly action: "create" }
  | { readonly action: "plan_change" }
  | { readonly action: "reject"; readonly status: number; readonly message: string } {
  if (input.subscription && hasPaidAccess(input.subscription, input.now)) {
    if (input.subscription.planCode === input.requestedPlan && input.subscription.interval === input.requestedInterval) {
      return { action: "reject", status: 409, message: "This organization already has that subscription." };
    }
    return { action: "plan_change" };
  }
  if (input.openCheckoutAgeMs != null && input.openCheckoutAgeMs < 30 * 60 * 1000) {
    return { action: "reject", status: 409, message: "A checkout is already open for this organization." };
  }
  return { action: "create" };
}

export function decideCancellation(input: {
  readonly subscription: {
    readonly status: SubscriptionStatus;
    readonly currentPeriodEnd: Date;
    readonly cancelAtPeriodEnd: boolean;
  } | null;
  readonly now: Date;
}):
  | { readonly action: "none" }
  | { readonly action: "already" }
  | { readonly action: "cancel" } {
  if (!input.subscription) return { action: "none" };
  if (!hasPaidAccess(input.subscription, input.now) && input.subscription.status !== "PAST_DUE") return { action: "none" };
  if (input.subscription.cancelAtPeriodEnd) return { action: "already" };
  return { action: "cancel" };
}
