/**
 * Selected-plan handoff. The query carries a catalog code, never a price.
 * Checkout still resolves the Stripe price on the server from the catalog.
 */

import {
  isBillingInterval,
  isPlanCode,
  type BillingInterval,
  type PlanCode,
} from "./catalog";

const ALIASES = {
  base: "agxora_base",
  business: "agxora_business",
  professional: "agxora_professional",
} as const;

export type PublicPlanAlias = keyof typeof ALIASES;

const PLAN_BY_CODE = new Map<PlanCode, PublicPlanAlias>([
  ["agxora_base", "base"],
  ["agxora_business", "business"],
  ["agxora_professional", "professional"],
]);

export function publicPlanAlias(code: PlanCode): PublicPlanAlias {
  return PLAN_BY_CODE.get(code) ?? "business";
}

/** Accepts a public alias or a catalog code. Rejects prices, amounts, and unknown plans. */
export function resolveSelectedPlan(value: unknown): PlanCode | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  if (!token || token.includes("price_") || /^\d+$/.test(token)) return null;
  if (token in ALIASES) return ALIASES[token as PublicPlanAlias];
  return isPlanCode(token) ? token : null;
}

export function resolveSelectedInterval(value: unknown): BillingInterval | null {
  if (typeof value !== "string") return null;
  const token = value.trim().toLowerCase();
  return isBillingInterval(token) ? token : null;
}

export function registerHref(code: PlanCode, interval: BillingInterval = "month"): string {
  return `/register?plan=${publicPlanAlias(code)}&interval=${interval}`;
}

export function checkoutSettingsHref(code: PlanCode, interval: BillingInterval = "month"): string {
  return `/dashboard/settings?plan=${code}&interval=${interval}#billing`;
}
