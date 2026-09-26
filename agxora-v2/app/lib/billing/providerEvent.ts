/**
 * Normalize a Stripe event into a safe billing command and reduce it onto
 * one organization subscription. The reducer never reads browser storage and
 * never treats a browser return as payment.
 */

import {
  getCommercialPlan,
  isBillingInterval,
  isPlanCode,
  type BillingInterval,
  type PlanCode,
} from "./catalog";
import type { SubscriptionStatus } from "./subscriptionState";

export interface SubscriptionRecord {
  readonly organizationId: string;
  readonly planCode: PlanCode;
  readonly status: SubscriptionStatus;
  readonly currency: "EUR";
  readonly interval: BillingInterval;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
  readonly provider: "stripe";
  readonly providerCustomerId: string;
  readonly providerSubscriptionId: string;
  readonly providerEventCreatedAt: Date;
}

export type ProviderEventKind =
  | "checkout_completed"
  | "subscription_upsert"
  | "payment_failed"
  | "subscription_deleted"
  | "ignored";

export interface NormalizedProviderEvent {
  readonly provider: "stripe";
  readonly providerEventId: string;
  readonly eventType: string;
  readonly eventCreatedAt: Date;
  readonly organizationId: string | null;
  readonly customerId: string | null;
  readonly subscriptionId: string | null;
  readonly planCode: PlanCode | null;
  readonly interval: BillingInterval | null;
  readonly stripeStatus: string | null;
  readonly cancelAtPeriodEnd: boolean | null;
  readonly periodStart: Date | null;
  readonly periodEnd: Date | null;
  readonly kind: ProviderEventKind;
  readonly safePayload: {
    readonly type: string;
    readonly objectId: string | null;
    readonly customerId: string | null;
    readonly subscriptionId: string | null;
  };
}

export interface PriceLookup {
  readonly priceId: string;
  readonly planCode: PlanCode;
  readonly interval: BillingInterval;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unixDate(value: unknown): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000);
}

function metadataPlan(metadata: Record<string, unknown> | null, prices: readonly PriceLookup[], priceId: string | null): {
  readonly planCode: PlanCode | null;
  readonly interval: BillingInterval | null;
  readonly mismatch: boolean;
} {
  const fromPrice = priceId ? prices.find((price) => price.priceId === priceId) : undefined;
  const codeRaw = metadata ? asString(metadata.planCode) : null;
  const intervalRaw = metadata ? asString(metadata.interval) : null;
  const code = codeRaw && isPlanCode(codeRaw) ? codeRaw : null;
  const interval = intervalRaw && isBillingInterval(intervalRaw) ? intervalRaw : null;
  if (fromPrice && code && (fromPrice.planCode !== code || (interval && fromPrice.interval !== interval))) {
    return { planCode: null, interval: null, mismatch: true };
  }
  return {
    planCode: code ?? fromPrice?.planCode ?? null,
    interval: interval ?? fromPrice?.interval ?? null,
    mismatch: false,
  };
}

function priceIdOf(object: Record<string, unknown>): string | null {
  const items = asRecord(object.items);
  const data = items && Array.isArray(items.data) ? items.data : [];
  const first = asRecord(data[0]);
  const price = first ? asRecord(first.price) : null;
  return asString(price?.id) ?? asString(first?.price);
}

function periodOf(object: Record<string, unknown>): { start: Date | null; end: Date | null } {
  const directStart = unixDate(object.current_period_start);
  const directEnd = unixDate(object.current_period_end);
  if (directStart && directEnd) return { start: directStart, end: directEnd };
  const items = asRecord(object.items);
  const data = items && Array.isArray(items.data) ? items.data : [];
  const first = asRecord(data[0]);
  return {
    start: directStart ?? (first ? unixDate(first.current_period_start) : null),
    end: directEnd ?? (first ? unixDate(first.current_period_end) : null),
  };
}

export function normalizeStripeEvent(
  payload: unknown,
  prices: readonly PriceLookup[] = [],
  expandedSubscription?: unknown,
): NormalizedProviderEvent | null {
  const event = asRecord(payload);
  if (!event) return null;
  const id = asString(event.id);
  const type = asString(event.type);
  const created = unixDate(event.created);
  if (!id || !type || !created) return null;
  const data = asRecord(event.data);
  const object = asRecord(data?.object) ?? {};
  const objectId = asString(object.id);
  const metadata = asRecord(object.metadata);
  const emptySafe = {
    type,
    objectId,
    customerId: asString(object.customer),
    subscriptionId: asString(object.subscription) ?? (type.startsWith("customer.subscription") ? objectId : null),
  };

  if (type === "checkout.session.completed") {
    const subscription = asRecord(expandedSubscription);
    const source = subscription ?? {};
    const subMetadata = asRecord(source.metadata) ?? metadata;
    const plan = metadataPlan(subMetadata ?? metadata, prices, priceIdOf(source));
    const period = periodOf(source);
    const paymentStatus = asString(object.payment_status);
    const paid = paymentStatus === "paid" || paymentStatus === "no_payment_required";
    return {
      provider: "stripe",
      providerEventId: id,
      eventType: type,
      eventCreatedAt: created,
      organizationId: asString(object.client_reference_id) ?? asString(metadata?.organizationId),
      customerId: asString(object.customer) ?? asString(source.customer),
      subscriptionId: asString(object.subscription) ?? asString(source.id),
      planCode: plan.mismatch ? null : plan.planCode,
      interval: plan.mismatch ? null : plan.interval,
      stripeStatus: paid ? asString(source.status) : "unpaid",
      cancelAtPeriodEnd: typeof source.cancel_at_period_end === "boolean" ? source.cancel_at_period_end : false,
      periodStart: period.start,
      periodEnd: period.end,
      kind: paid && !plan.mismatch ? "checkout_completed" : "ignored",
      safePayload: emptySafe,
    };
  }

  if (type === "invoice.payment_failed") {
    return {
      provider: "stripe",
      providerEventId: id,
      eventType: type,
      eventCreatedAt: created,
      organizationId: asString(metadata?.organizationId),
      customerId: asString(object.customer),
      subscriptionId: asString(object.subscription),
      planCode: null,
      interval: null,
      stripeStatus: "past_due",
      cancelAtPeriodEnd: null,
      periodStart: null,
      periodEnd: null,
      kind: "payment_failed",
      safePayload: emptySafe,
    };
  }

  if (type === "customer.subscription.deleted" || type === "customer.subscription.updated" || type === "customer.subscription.created") {
    const plan = metadataPlan(metadata, prices, priceIdOf(object));
    const period = periodOf(object);
    return {
      provider: "stripe",
      providerEventId: id,
      eventType: type,
      eventCreatedAt: created,
      organizationId: asString(metadata?.organizationId),
      customerId: asString(object.customer),
      subscriptionId: objectId,
      planCode: plan.mismatch ? null : plan.planCode,
      interval: plan.mismatch ? null : plan.interval,
      stripeStatus: asString(object.status),
      cancelAtPeriodEnd: object.cancel_at_period_end === true,
      periodStart: period.start,
      periodEnd: period.end,
      kind: plan.mismatch ? "ignored" : type === "customer.subscription.deleted" ? "subscription_deleted" : "subscription_upsert",
      safePayload: emptySafe,
    };
  }

  return {
    provider: "stripe",
    providerEventId: id,
    eventType: type,
    eventCreatedAt: created,
    organizationId: null,
    customerId: null,
    subscriptionId: null,
    planCode: null,
    interval: null,
    stripeStatus: null,
    cancelAtPeriodEnd: null,
    periodStart: null,
    periodEnd: null,
    kind: "ignored",
    safePayload: { type, objectId, customerId: null, subscriptionId: null },
  };
}

export type ReduceOutcome =
  | "duplicate"
  | "applied"
  | "stale"
  | "unmapped"
  | "tenant_mismatch"
  | "ignored";

export interface ReduceResult {
  readonly outcome: ReduceOutcome;
  readonly subscription: SubscriptionRecord | null;
  readonly eventStatus: "PROCESSED" | "IGNORED" | "FAILED";
  readonly organizationId: string | null;
}

function mapStripeStatus(status: string | null, periodEnd: Date, cancelAtPeriodEnd: boolean, now: Date): SubscriptionStatus | null {
  if (status === "trialing" || status === "incomplete") return null;
  if (status === "incomplete_expired") return "EXPIRED";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "canceled") {
    return now.getTime() >= periodEnd.getTime() ? "EXPIRED" : "CANCELED";
  }
  if (status === "active") {
    if (now.getTime() >= periodEnd.getTime()) return "EXPIRED";
    return cancelAtPeriodEnd ? "ACTIVE" : "ACTIVE";
  }
  return null;
}

export function reduceBillingEvent(input: {
  readonly event: NormalizedProviderEvent;
  readonly alreadyStored: boolean;
  readonly subscription: SubscriptionRecord | null;
  readonly mappedOrganizationId: string | null;
  readonly now: Date;
}): ReduceResult {
  if (input.alreadyStored) {
    return {
      outcome: "duplicate",
      subscription: input.subscription,
      eventStatus: "PROCESSED",
      organizationId: input.subscription?.organizationId ?? input.mappedOrganizationId,
    };
  }
  const declared = input.event.organizationId;
  const mapped = input.mappedOrganizationId;
  if (declared && mapped && declared !== mapped) {
    return { outcome: "tenant_mismatch", subscription: input.subscription, eventStatus: "FAILED", organizationId: null };
  }
  if (input.subscription && declared && input.subscription.organizationId !== declared) {
    return { outcome: "tenant_mismatch", subscription: input.subscription, eventStatus: "FAILED", organizationId: null };
  }
  const organizationId = declared ?? mapped ?? input.subscription?.organizationId ?? null;
  if (!organizationId) {
    return { outcome: "unmapped", subscription: input.subscription, eventStatus: "IGNORED", organizationId: null };
  }
  if (
    input.subscription &&
    input.event.eventCreatedAt.getTime() < input.subscription.providerEventCreatedAt.getTime()
  ) {
    return { outcome: "stale", subscription: input.subscription, eventStatus: "IGNORED", organizationId };
  }

  const unchanged = {
    subscription: input.subscription,
    organizationId,
  };

  if (input.event.kind === "ignored") {
    return { outcome: "ignored", eventStatus: "IGNORED", ...unchanged };
  }

  if (input.event.kind === "payment_failed") {
    if (!input.subscription) return { outcome: "ignored", eventStatus: "IGNORED", ...unchanged };
    return {
      outcome: "applied",
      eventStatus: "PROCESSED",
      organizationId,
      subscription: { ...input.subscription, status: "PAST_DUE", providerEventCreatedAt: input.event.eventCreatedAt },
    };
  }

  if (input.event.kind === "subscription_deleted") {
    if (!input.subscription && (!input.event.customerId || !input.event.subscriptionId)) {
      return { outcome: "ignored", eventStatus: "IGNORED", ...unchanged };
    }
    const periodEnd = input.event.periodEnd ?? input.subscription?.currentPeriodEnd ?? input.now;
    const base = input.subscription;
    if (!base && (!input.event.planCode || !input.event.interval || !input.event.customerId || !input.event.subscriptionId)) {
      return { outcome: "ignored", eventStatus: "IGNORED", ...unchanged };
    }
    const next: SubscriptionRecord = {
      organizationId,
      planCode: input.event.planCode ?? base!.planCode,
      status: "EXPIRED",
      currency: "EUR",
      interval: input.event.interval ?? base!.interval,
      currentPeriodStart: input.event.periodStart ?? base?.currentPeriodStart ?? input.now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      provider: "stripe",
      providerCustomerId: input.event.customerId ?? base!.providerCustomerId,
      providerSubscriptionId: input.event.subscriptionId ?? base!.providerSubscriptionId,
      providerEventCreatedAt: input.event.eventCreatedAt,
    };
    return { outcome: "applied", eventStatus: "PROCESSED", organizationId, subscription: next };
  }

  const periodStart = input.event.periodStart;
  const periodEnd = input.event.periodEnd;
  const planCode = input.event.planCode ?? input.subscription?.planCode ?? null;
  const interval = input.event.interval ?? input.subscription?.interval ?? null;
  if (!periodStart || !periodEnd || !planCode || !interval || !input.event.customerId || !input.event.subscriptionId) {
    return { outcome: "ignored", eventStatus: "IGNORED", ...unchanged };
  }
  getCommercialPlan(planCode);
  const cancelAtPeriodEnd = input.event.cancelAtPeriodEnd === true;
  const status = mapStripeStatus(input.event.stripeStatus, periodEnd, cancelAtPeriodEnd, input.now);
  if (!status) return { outcome: "ignored", eventStatus: "IGNORED", ...unchanged };
  const next: SubscriptionRecord = {
    organizationId,
    planCode,
    status,
    currency: "EUR",
    interval,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: status === "CANCELED" ? true : cancelAtPeriodEnd,
    provider: "stripe",
    providerCustomerId: input.event.customerId,
    providerSubscriptionId: input.event.subscriptionId,
    providerEventCreatedAt: input.event.eventCreatedAt,
  };
  return { outcome: "applied", eventStatus: "PROCESSED", organizationId, subscription: next };
}

export interface BillingUnitOfWork {
  findEvent(provider: string, providerEventId: string): Promise<boolean>;
  findSubscriptionByOrganization(organizationId: string): Promise<SubscriptionRecord | null>;
  findOrganizationByProvider(customerId: string | null, subscriptionId: string | null): Promise<string | null>;
  insertEvent(row: {
    readonly provider: "stripe";
    readonly providerEventId: string;
    readonly organizationId: string | null;
    readonly eventType: string;
    readonly eventCreatedAt: Date;
    readonly status: "PROCESSED" | "IGNORED" | "FAILED";
    readonly safePayload: NormalizedProviderEvent["safePayload"];
    readonly processedAt: Date;
  }): Promise<void>;
  saveSubscription(row: SubscriptionRecord): Promise<void>;
}

export async function commitProviderEvent(
  work: BillingUnitOfWork,
  event: NormalizedProviderEvent,
  now: Date,
): Promise<ReduceResult> {
  const alreadyStored = await work.findEvent(event.provider, event.providerEventId);
  const mappedOrganizationId = await work.findOrganizationByProvider(event.customerId, event.subscriptionId);
  const organizationId = event.organizationId ?? mappedOrganizationId;
  const subscription = organizationId ? await work.findSubscriptionByOrganization(organizationId) : null;
  const reduced = reduceBillingEvent({
    event,
    alreadyStored,
    subscription,
    mappedOrganizationId,
    now,
  });
  if (alreadyStored) return reduced;
  await work.insertEvent({
    provider: "stripe",
    providerEventId: event.providerEventId,
    organizationId: reduced.organizationId,
    eventType: event.eventType,
    eventCreatedAt: event.eventCreatedAt,
    status: reduced.eventStatus,
    safePayload: event.safePayload,
    processedAt: now,
  });
  if (reduced.outcome === "applied" && reduced.subscription) {
    await work.saveSubscription(reduced.subscription);
  }
  return reduced;
}
