/**
 * Public marketing plans — Starter · Professional · Enterprise.
 * Business remains in the commercial catalog for portal upgrades.
 */

import type { BillingInterval, CommercialPlan, CommercialPlanId } from "../types";
import { getCommercialPlan } from "./catalog";

export type PricingCtaKind = "start_free" | "book_demo" | "contact_sales";

export interface PricingPlanView {
  readonly id: CommercialPlanId;
  readonly name: string;
  readonly description: string;
  readonly recommended: boolean;
  readonly priceMonthlyUsd: number | null;
  readonly priceYearlyUsd: number | null;
  readonly features: readonly string[];
  readonly cta: {
    readonly kind: PricingCtaKind;
    readonly label: string;
    readonly href: string;
  };
}

const MARKETING_ORDER: readonly CommercialPlanId[] = [
  "starter",
  "professional",
  "enterprise",
];

const FEATURE_COPY: Readonly<Record<CommercialPlanId, readonly string[]>> = {
  starter: [
    "CRM & customer pipeline",
    "Projects and documents",
    "Governed AI assistant",
    "Up to 5 seats",
    "Email support",
  ],
  professional: [
    "Everything in Starter",
    "Finance & analytics modules",
    "API access",
    "Up to 25 seats",
    "Priority support inbox",
  ],
  business: [
    "Everything in Professional",
    "Automation & audit export",
    "Up to 100 seats",
    "Priority support",
  ],
  enterprise: [
    "Everything in Professional",
    "SSO and custom branding",
    "Dedicated success partnership",
    "Custom limits and SLA",
    "Volume commercial terms",
  ],
};

const CTA_BY_PLAN: Readonly<
  Record<CommercialPlanId, PricingPlanView["cta"]>
> = {
  starter: {
    kind: "start_free",
    label: "Start Free",
    href: "/register",
  },
  professional: {
    kind: "start_free",
    label: "Start Free",
    href: "/register",
  },
  business: {
    kind: "book_demo",
    label: "Book Demo",
    href: "/demo",
  },
  enterprise: {
    kind: "contact_sales",
    label: "Contact Sales",
    href: "/contact-sales",
  },
};

export function listMarketingPlans(): readonly PricingPlanView[] {
  return MARKETING_ORDER.map((id) => {
    const plan = getCommercialPlan(id);
    return toPricingView(plan);
  });
}

function toPricingView(plan: CommercialPlan): PricingPlanView {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    recommended: Boolean(plan.highlighted),
    priceMonthlyUsd: plan.priceMonthlyUsd,
    priceYearlyUsd: plan.priceYearlyUsd,
    features: FEATURE_COPY[plan.id],
    cta: CTA_BY_PLAN[plan.id],
  };
}

export function formatPlanPrice(
  plan: PricingPlanView,
  interval: BillingInterval,
): { readonly label: string; readonly suffix: string } {
  if (plan.priceMonthlyUsd == null || plan.priceYearlyUsd == null) {
    return { label: "Custom", suffix: "talk to sales" };
  }
  if (interval === "yearly") {
    const monthlyEquivalent = Math.round(plan.priceYearlyUsd / 12);
    return { label: `$${monthlyEquivalent}`, suffix: "/mo billed yearly" };
  }
  return { label: `$${plan.priceMonthlyUsd}`, suffix: "/mo" };
}

export function yearlySavingsPercent(plan: PricingPlanView): number | null {
  if (plan.priceMonthlyUsd == null || plan.priceYearlyUsd == null) return null;
  const full = plan.priceMonthlyUsd * 12;
  if (full <= 0) return null;
  return Math.round(((full - plan.priceYearlyUsd) / full) * 100);
}
