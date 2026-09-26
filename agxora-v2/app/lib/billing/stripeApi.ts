/**
 * Stripe REST calls. Responses are not returned to the browser.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";

interface StripeObject {
  readonly id?: string;
  readonly url?: string | null;
  readonly customer?: string | { id?: string };
  readonly status?: string;
  readonly cancel_at_period_end?: boolean;
  readonly current_period_start?: number;
  readonly current_period_end?: number;
  readonly metadata?: Record<string, string>;
  readonly items?: { data?: ReadonlyArray<{ id?: string; price?: { id?: string }; current_period_start?: number; current_period_end?: number }> };
  readonly error?: { code?: string };
}

async function stripeRequest(
  secretKey: string,
  method: "GET" | "POST",
  path: string,
  params?: Readonly<Record<string, string>>,
  idempotencyKey?: string,
): Promise<StripeObject> {
  const headers: Record<string, string> = { Authorization: `Bearer ${secretKey}` };
  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    body = new URLSearchParams(params ?? {}).toString();
  }
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers, body });
  const payload = (await response.json().catch(() => null)) as StripeObject | null;
  if (!response.ok || !payload) {
    console.error("[agxora.billing] stripe request failed", {
      path,
      status: response.status,
      code: payload?.error?.code ?? "unknown",
    });
    throw new PersistenceError("persistence", "The payment provider could not complete the request.");
  }
  return payload;
}

export async function createStripeCustomer(input: {
  readonly secretKey: string;
  readonly organizationId: string;
  readonly email: string;
  readonly name: string;
}): Promise<string> {
  const created = await stripeRequest(
    input.secretKey,
    "POST",
    "customers",
    {
      email: input.email,
      name: input.name,
      "metadata[organizationId]": input.organizationId,
    },
    `agxora-customer-${input.organizationId}`,
  );
  if (!created.id) throw new PersistenceError("persistence", "The payment provider did not return a customer.");
  return created.id;
}

export async function createStripeCheckoutSession(input: {
  readonly secretKey: string;
  readonly organizationId: string;
  readonly customerId: string;
  readonly priceId: string;
  readonly planCode: string;
  readonly interval: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
}): Promise<{ readonly id: string; readonly url: string }> {
  const created = await stripeRequest(
    input.secretKey,
    "POST",
    "checkout/sessions",
    {
      mode: "subscription",
      customer: input.customerId,
      client_reference_id: input.organizationId,
      "line_items[0][price]": input.priceId,
      "line_items[0][quantity]": "1",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      "metadata[organizationId]": input.organizationId,
      "metadata[planCode]": input.planCode,
      "metadata[interval]": input.interval,
      "subscription_data[metadata][organizationId]": input.organizationId,
      "subscription_data[metadata][planCode]": input.planCode,
      "subscription_data[metadata][interval]": input.interval,
    },
    `agxora-checkout-${input.organizationId}-${input.planCode}-${input.interval}`,
  );
  if (!created.id || !created.url) {
    throw new PersistenceError("persistence", "The payment provider did not return a checkout session.");
  }
  return { id: created.id, url: created.url };
}

export async function retrieveStripeSubscription(secretKey: string, subscriptionId: string): Promise<StripeObject> {
  return stripeRequest(secretKey, "GET", `subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function cancelStripeSubscriptionAtPeriodEnd(secretKey: string, subscriptionId: string): Promise<void> {
  await stripeRequest(secretKey, "POST", `subscriptions/${encodeURIComponent(subscriptionId)}`, {
    cancel_at_period_end: "true",
  });
}

export async function changeStripeSubscriptionPrice(input: {
  readonly secretKey: string;
  readonly subscriptionId: string;
  readonly priceId: string;
  readonly planCode: string;
  readonly interval: string;
  readonly organizationId: string;
}): Promise<void> {
  const current = await retrieveStripeSubscription(input.secretKey, input.subscriptionId);
  const itemId = current.items?.data?.[0]?.id;
  if (!itemId) throw new PersistenceError("persistence", "The payment provider subscription has no price item.");
  await stripeRequest(input.secretKey, "POST", `subscriptions/${encodeURIComponent(input.subscriptionId)}`, {
    "items[0][id]": itemId,
    "items[0][price]": input.priceId,
    proration_behavior: "none",
    "metadata[organizationId]": input.organizationId,
    "metadata[planCode]": input.planCode,
    "metadata[interval]": input.interval,
  });
}
