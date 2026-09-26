/**
 * Customer-facing billing projection. No provider secrets, card data, or payloads.
 */

import {
  COMMERCIAL_PLANS,
  VAT_NOTICE,
  formatNetEur,
  getCommercialPlan,
  priceCents,
  type BillingInterval,
  type PlanCode,
} from "./catalog";
import { displayStatus, effectiveStatus, hasPaidAccess, type SubscriptionStatus } from "./subscriptionState";

export interface PublicSubscription {
  readonly planCode: PlanCode;
  readonly planName: string;
  readonly status: SubscriptionStatus;
  readonly displayStatus: ReturnType<typeof displayStatus>;
  readonly currency: "EUR";
  readonly interval: BillingInterval;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly seatLimit: number;
  readonly seatsUsed: number;
  readonly executionLimit: number;
  readonly executionsUsed: number;
  readonly priceLabel: string;
  readonly vatNotice: typeof VAT_NOTICE;
  readonly provider: "stripe";
  readonly paidAccess: boolean;
}

export function toPublicSubscription(input: {
  readonly planCode: PlanCode;
  readonly status: SubscriptionStatus;
  readonly interval: BillingInterval;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
  readonly seatsUsed: number;
  readonly executionsUsed: number;
  readonly now: Date;
}): PublicSubscription {
  const plan = getCommercialPlan(input.planCode);
  const clock = {
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  };
  return {
    planCode: input.planCode,
    planName: plan.name,
    status: effectiveStatus(clock, input.now),
    displayStatus: displayStatus(clock, input.now),
    currency: "EUR",
    interval: input.interval,
    currentPeriodStart: input.currentPeriodStart.toISOString(),
    currentPeriodEnd: input.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    seatLimit: plan.seats,
    seatsUsed: input.seatsUsed,
    executionLimit: plan.governedExecutionsPerMonth,
    executionsUsed: input.executionsUsed,
    priceLabel: formatNetEur(priceCents(plan, input.interval)),
    vatNotice: VAT_NOTICE,
    provider: "stripe",
    paidAccess: hasPaidAccess(clock, input.now),
  };
}

export function publicCatalog() {
  return COMMERCIAL_PLANS.map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    currency: plan.currency,
    monthly: formatNetEur(plan.monthlyCents),
    yearly: formatNetEur(plan.yearlyCents),
    seats: plan.seats,
    governedExecutionsPerMonth: plan.governedExecutionsPerMonth,
    features: plan.features,
    recommended: plan.recommended,
    vatNotice: VAT_NOTICE,
  }));
}

export function exportableSubscription(input: {
  readonly planCode: string;
  readonly status: string;
  readonly currency: string;
  readonly interval: string;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
  readonly providerCustomerId: string;
  readonly providerSubscriptionId: string;
}) {
  return {
    planCode: input.planCode,
    status: input.status,
    currency: input.currency,
    interval: input.interval,
    currentPeriodStart: input.currentPeriodStart.toISOString(),
    currentPeriodEnd: input.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    providerCustomerId: input.providerCustomerId,
    providerSubscriptionId: input.providerSubscriptionId,
  };
}
