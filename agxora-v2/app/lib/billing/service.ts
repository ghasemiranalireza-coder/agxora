/**
 * Commercial billing service. Organization identity comes from the caller,
 * which must already have taken it from the server session.
 */

import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { getAppOrigin } from "@/app/lib/email/config";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { authorizeCheckout, checkoutUrls, decideCancellation, decideCheckoutStart } from "./checkoutPolicy";
import { isBillingInterval, isPlanCode, type BillingInterval, type PlanCode } from "./catalog";
import { countGovernedExecutions, countSeats } from "./enforce";
import { commitProviderEvent, normalizeStripeEvent, type BillingUnitOfWork, type SubscriptionRecord } from "./providerEvent";
import { exportableSubscription, publicCatalog, toPublicSubscription } from "./publicView";
import { isMissingBillingSchema } from "./schemaGuard";
import {
  cancelStripeSubscriptionAtPeriodEnd,
  changeStripeSubscriptionPrice,
  createStripeCheckoutSession,
  createStripeCustomer,
  retrieveStripeSubscription,
} from "./stripeApi";
import { priceIdFor, readStripeConfig } from "./stripeConfig";
import { verifyStripeSignature } from "./stripeSignature";
import type { SubscriptionStatus } from "./subscriptionState";

function misconfigured(): PersistenceError {
  return new PersistenceError("misconfigured", "Stripe billing is not configured on this server.");
}

async function subscriptionFor(organizationId: string) {
  try {
    return await prisma.commercialSubscription.findUnique({ where: { organizationId } });
  } catch (error) {
    if (isMissingBillingSchema(error)) return null;
    throw error;
  }
}

function asRecord(row: NonNullable<Awaited<ReturnType<typeof subscriptionFor>>>): SubscriptionRecord | null {
  if (!isPlanCode(row.planCode) || !isBillingInterval(row.interval)) return null;
  return {
    organizationId: row.organizationId,
    planCode: row.planCode,
    status: row.status,
    currency: "EUR",
    interval: row.interval,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    provider: "stripe",
    providerCustomerId: row.providerCustomerId,
    providerSubscriptionId: row.providerSubscriptionId,
    providerEventCreatedAt: row.providerEventCreatedAt,
  };
}

export async function getBillingView(actor: Actor, now = new Date()) {
  const config = readStripeConfig();
  const row = await subscriptionFor(actor.organizationId);
  const record = row ? asRecord(row) : null;
  const seatsUsed = await countSeats(actor.organizationId);
  const executionsUsed = record
    ? await countGovernedExecutions({
        organizationId: actor.organizationId,
        periodStart: record.currentPeriodStart,
        periodEnd: record.currentPeriodEnd,
      })
    : 0;
  return {
    ok: true as const,
    configured: config.checkoutConfigured,
    vatNotice: "zzgl. gesetzlicher MwSt.",
    catalog: publicCatalog(),
    seatsUsed,
    subscription: record
      ? toPublicSubscription({
          planCode: record.planCode,
          status: record.status,
          interval: record.interval,
          currentPeriodStart: record.currentPeriodStart,
          currentPeriodEnd: record.currentPeriodEnd,
          cancelAtPeriodEnd: record.cancelAtPeriodEnd,
          seatsUsed,
          executionsUsed,
          now,
        })
      : null,
  };
}

export async function startCheckout(
  actor: Actor,
  body: {
    readonly planCode?: unknown;
    readonly billingInterval?: unknown;
    readonly organizationId?: unknown;
    readonly successUrl?: unknown;
  },
  now = new Date(),
) {
  const authorized = authorizeCheckout({
    authenticated: true,
    sessionOrganizationId: actor.organizationId,
    body,
  });
  if (!authorized.ok) {
    throw new PersistenceError(authorized.status === 401 ? "unauthorized" : "validation", authorized.message, {
      status: authorized.status,
    });
  }
  const config = readStripeConfig();
  if (!config.checkoutConfigured || !config.secretKey) throw misconfigured();
  const priceId = priceIdFor(config, authorized.planCode, authorized.billingInterval);
  if (!priceId) throw misconfigured();

  const row = await subscriptionFor(actor.organizationId);
  const record = row ? asRecord(row) : null;
  const open = await prisma.commercialCheckout.findFirst({
    where: { organizationId: actor.organizationId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  const decision = decideCheckoutStart({
    requestedPlan: authorized.planCode,
    requestedInterval: authorized.billingInterval,
    subscription: record,
    openCheckoutAgeMs: open ? now.getTime() - open.createdAt.getTime() : null,
    now,
  });
  if (decision.action === "reject") {
    throw new PersistenceError("conflict", decision.message);
  }
  if (decision.action === "plan_change") {
    if (!record) throw new PersistenceError("conflict", "No subscription to change.");
    await changeStripeSubscriptionPrice({
      secretKey: config.secretKey,
      subscriptionId: record.providerSubscriptionId,
      priceId,
      planCode: authorized.planCode,
      interval: authorized.billingInterval,
      organizationId: actor.organizationId,
    });
    return { ok: true as const, mode: "plan_change" as const, subscription: await getBillingView(actor, now) };
  }

  const existingCustomer =
    record?.providerCustomerId ??
    (
      await prisma.commercialCheckout.findFirst({
        where: { organizationId: actor.organizationId },
        orderBy: { createdAt: "desc" },
        select: { providerCustomerId: true },
      })
    )?.providerCustomerId ??
    null;
  const customerId =
    existingCustomer ??
    (await createStripeCustomer({
      secretKey: config.secretKey,
      organizationId: actor.organizationId,
      email: actor.email,
      name: actor.name,
    }));
  const urls = checkoutUrls(getAppOrigin());
  const session = await createStripeCheckoutSession({
    secretKey: config.secretKey,
    organizationId: actor.organizationId,
    customerId,
    priceId,
    planCode: authorized.planCode,
    interval: authorized.billingInterval,
    successUrl: urls.successUrl,
    cancelUrl: urls.cancelUrl,
  });
  await prisma.$transaction(async (tx) => {
    await tx.commercialCheckout.updateMany({
      where: { organizationId: actor.organizationId, status: "OPEN" },
      data: { status: "EXPIRED" },
    });
    await tx.commercialCheckout.create({
      data: {
        organizationId: actor.organizationId,
        planCode: authorized.planCode,
        interval: authorized.billingInterval,
        provider: "stripe",
        providerSessionId: session.id,
        providerCustomerId: customerId,
        status: "OPEN",
      },
    });
  });
  return { ok: true as const, mode: "checkout" as const, url: session.url };
}

export async function cancelSubscription(actor: Actor, now = new Date()) {
  const row = await subscriptionFor(actor.organizationId);
  const record = row ? asRecord(row) : null;
  const decision = decideCancellation({ subscription: record, now });
  if (decision.action === "none" || !row || !record) {
    throw new PersistenceError("not_found", "No commercial subscription to cancel.");
  }
  if (decision.action === "cancel") {
    const config = readStripeConfig();
    if (!config.secretKey) throw misconfigured();
    await cancelStripeSubscriptionAtPeriodEnd(config.secretKey, record.providerSubscriptionId);
    await prisma.commercialSubscription.update({
      where: { organizationId: actor.organizationId },
      data: { cancelAtPeriodEnd: true },
    });
  }
  const view = await getBillingView(actor, now);
  return {
    ok: true as const,
    status: view.subscription?.status ?? row.status,
    currentPeriodEnd: view.subscription?.currentPeriodEnd ?? row.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: true,
    displayStatus: view.subscription?.displayStatus ?? "Canceled at period end",
  };
}

export async function loadExportableSubscription(organizationId: string) {
  const row = await subscriptionFor(organizationId);
  if (!row) return null;
  return exportableSubscription(row);
}

function workFrom(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): BillingUnitOfWork {
  return {
    async findEvent(provider, providerEventId) {
      const existing = await tx.commercialBillingEvent.findUnique({
        where: { provider_providerEventId: { provider, providerEventId } },
        select: { id: true },
      });
      return Boolean(existing);
    },
    async findSubscriptionByOrganization(organizationId) {
      const row = await tx.commercialSubscription.findUnique({ where: { organizationId } });
      return row ? asRecord(row) : null;
    },
    async findOrganizationByProvider(customerId, subscriptionId) {
      if (subscriptionId) {
        const bySubscription = await tx.commercialSubscription.findUnique({
          where: { provider_providerSubscriptionId: { provider: "stripe", providerSubscriptionId: subscriptionId } },
          select: { organizationId: true },
        });
        if (bySubscription) return bySubscription.organizationId;
      }
      if (customerId) {
        const byCustomer = await tx.commercialSubscription.findUnique({
          where: { provider_providerCustomerId: { provider: "stripe", providerCustomerId: customerId } },
          select: { organizationId: true },
        });
        if (byCustomer) return byCustomer.organizationId;
        const checkout = await tx.commercialCheckout.findFirst({
          where: { providerCustomerId: customerId },
          select: { organizationId: true },
        });
        if (checkout) return checkout.organizationId;
      }
      return null;
    },
    async insertEvent(event) {
      await tx.commercialBillingEvent.create({
        data: {
          provider: event.provider,
          providerEventId: event.providerEventId,
          organizationId: event.organizationId,
          eventType: event.eventType,
          eventCreatedAt: event.eventCreatedAt,
          processedAt: event.processedAt,
          status: event.status,
          safePayload: event.safePayload,
        },
      });
    },
    async saveSubscription(subscription) {
      await tx.commercialSubscription.upsert({
        where: { organizationId: subscription.organizationId },
        create: subscription,
        update: {
          planCode: subscription.planCode,
          status: subscription.status,
          currency: subscription.currency,
          interval: subscription.interval,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          provider: subscription.provider,
          providerCustomerId: subscription.providerCustomerId,
          providerSubscriptionId: subscription.providerSubscriptionId,
          providerEventCreatedAt: subscription.providerEventCreatedAt,
        },
      });
    },
  };
}

export async function processStripeWebhook(rawBody: string, signature: string | null, now = new Date()) {
  if (rawBody.length > 1_000_000) {
    throw new PersistenceError("validation", "Webhook payload is too large.");
  }
  const config = readStripeConfig();
  if (!config.webhookConfigured || !config.webhookSecret || !config.secretKey) throw misconfigured();
  const verified = verifyStripeSignature({
    payload: rawBody,
    header: signature,
    secret: config.webhookSecret,
    now,
  });
  if (!verified.ok) {
    throw new PersistenceError("forbidden", "Invalid Stripe signature.", { status: 400 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    throw new PersistenceError("validation", "Invalid webhook payload.");
  }
  const preview = normalizeStripeEvent(payload, config.prices);
  if (!preview) throw new PersistenceError("validation", "Invalid webhook payload.");
  let expanded: unknown;
  if (preview.eventType === "checkout.session.completed" && preview.subscriptionId && preview.kind !== "ignored") {
    expanded = await retrieveStripeSubscription(config.secretKey, preview.subscriptionId);
  }
  const event = normalizeStripeEvent(payload, config.prices, expanded) ?? preview;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reduced = await commitProviderEvent(workFrom(tx), event, now);
      if (event.eventType === "checkout.session.completed" && event.safePayload.objectId && reduced.outcome === "applied") {
        await tx.commercialCheckout.updateMany({
          where: { providerSessionId: event.safePayload.objectId },
          data: { status: "COMPLETED" },
        });
      }
      return reduced;
    });
    return { ok: true as const, received: true as const, duplicate: result.outcome === "duplicate" };
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    console.error("[agxora.billing] webhook persistence failed");
    throw new PersistenceError("persistence", "Webhook could not be stored.");
  }
}

export type { PlanCode, BillingInterval, SubscriptionStatus };
