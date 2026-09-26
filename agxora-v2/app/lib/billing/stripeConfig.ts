/**
 * Server-only Stripe test/live configuration.
 * Required Vercel server variables, never committed and never sent to the browser:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - STRIPE_PRICE_AGXORA_BASE_MONTH
 * - STRIPE_PRICE_AGXORA_BASE_YEAR
 * - STRIPE_PRICE_AGXORA_BUSINESS_MONTH
 * - STRIPE_PRICE_AGXORA_BUSINESS_YEAR
 * - STRIPE_PRICE_AGXORA_PROFESSIONAL_MONTH
 * - STRIPE_PRICE_AGXORA_PROFESSIONAL_YEAR
 * Phase 21 verification uses Stripe test keys only.
 */

import "server-only";

import type { BillingInterval, PlanCode } from "./catalog";
import type { PriceLookup } from "./providerEvent";

export const STRIPE_SECRET_ENV = "STRIPE_SECRET_KEY";
export const STRIPE_WEBHOOK_ENV = "STRIPE_WEBHOOK_SECRET";

export const STRIPE_PRICE_ENV: Readonly<Record<PlanCode, Readonly<Record<BillingInterval, string>>>> = {
  agxora_base: {
    month: "STRIPE_PRICE_AGXORA_BASE_MONTH",
    year: "STRIPE_PRICE_AGXORA_BASE_YEAR",
  },
  agxora_business: {
    month: "STRIPE_PRICE_AGXORA_BUSINESS_MONTH",
    year: "STRIPE_PRICE_AGXORA_BUSINESS_YEAR",
  },
  agxora_professional: {
    month: "STRIPE_PRICE_AGXORA_PROFESSIONAL_MONTH",
    year: "STRIPE_PRICE_AGXORA_PROFESSIONAL_YEAR",
  },
};

function readEnv(env: NodeJS.ProcessEnv, name: string): string | null {
  const value = env[name]?.trim() ?? "";
  return value.length > 0 ? value : null;
}

export interface StripeRuntimeConfig {
  readonly secretKey: string | null;
  readonly webhookSecret: string | null;
  readonly prices: readonly PriceLookup[];
  readonly checkoutConfigured: boolean;
  readonly webhookConfigured: boolean;
}

export function readStripeConfig(env: NodeJS.ProcessEnv = process.env): StripeRuntimeConfig {
  const prices: PriceLookup[] = [];
  for (const [planCode, intervals] of Object.entries(STRIPE_PRICE_ENV) as [PlanCode, Readonly<Record<BillingInterval, string>>][]) {
    for (const interval of ["month", "year"] as const) {
      const priceId = readEnv(env, intervals[interval]);
      if (priceId) prices.push({ priceId, planCode, interval });
    }
  }
  const secretKey = readEnv(env, STRIPE_SECRET_ENV);
  const webhookSecret = readEnv(env, STRIPE_WEBHOOK_ENV);
  return {
    secretKey,
    webhookSecret,
    prices,
    checkoutConfigured: Boolean(secretKey) && prices.length === 6,
    webhookConfigured: Boolean(secretKey && webhookSecret),
  };
}

export function priceIdFor(
  config: StripeRuntimeConfig,
  planCode: PlanCode,
  interval: BillingInterval,
): string | null {
  return config.prices.find((price) => price.planCode === planCode && price.interval === interval)?.priceId ?? null;
}
