/**
 * Commercial plan catalog — Starter / Professional / Business / Enterprise.
 */

import type {
  CommercialPlan,
  CommercialPlanId,
  PlanLimits,
  SaasModuleFeatureKey,
} from "../types";

const STARTER_FEATURES: readonly SaasModuleFeatureKey[] = [
  "crm",
  "projects",
  "documents",
  "ai",
];

const PRO_FEATURES: readonly SaasModuleFeatureKey[] = [
  ...STARTER_FEATURES,
  "finance",
  "analytics",
  "api_access",
];

const BUSINESS_FEATURES: readonly SaasModuleFeatureKey[] = [
  ...PRO_FEATURES,
  "automation",
  "audit_export",
  "priority_support",
];

const ENTERPRISE_FEATURES: readonly SaasModuleFeatureKey[] = [
  ...BUSINESS_FEATURES,
  "sso",
  "custom_branding",
];

function limits(partial: PlanLimits): PlanLimits {
  return partial;
}

export const COMMERCIAL_PLANS: readonly CommercialPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For freelancers and small businesses.",
    priceMonthlyUsd: 19.99,
    priceYearlyUsd: 191.9,
    public: true,
    limits: limits({
      users: 5,
      projects: 20,
      customers: 200,
      documents: 500,
      storageMb: 5_000,
      aiRequestsPerMonth: 1_000,
      apiRequestsPerMonth: 5_000,
    }),
    features: STARTER_FEATURES,
  },
  {
    id: "professional",
    name: "Professional",
    description: "For advanced companies.",
    priceMonthlyUsd: 128,
    priceYearlyUsd: 1_228.8,
    public: true,
    limits: limits({
      users: 25,
      projects: 100,
      customers: 2_000,
      documents: 5_000,
      storageMb: 50_000,
      aiRequestsPerMonth: 10_000,
      apiRequestsPerMonth: 50_000,
    }),
    features: PRO_FEATURES,
  },
  {
    id: "business",
    name: "Business",
    description: "For growing teams.",
    priceMonthlyUsd: 49.99,
    priceYearlyUsd: 479.9,
    public: true,
    highlighted: true,
    limits: limits({
      users: 100,
      projects: 500,
      customers: 10_000,
      documents: 25_000,
      storageMb: 250_000,
      aiRequestsPerMonth: 50_000,
      apiRequestsPerMonth: 250_000,
    }),
    features: BUSINESS_FEATURES,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom pricing for unlimited scale.",
    priceMonthlyUsd: null,
    priceYearlyUsd: null,
    public: true,
    limits: limits({
      users: 1_000,
      projects: 10_000,
      customers: 100_000,
      documents: 250_000,
      storageMb: 2_000_000,
      aiRequestsPerMonth: 500_000,
      apiRequestsPerMonth: 2_000_000,
    }),
    features: ENTERPRISE_FEATURES,
  },
] as const;

export function getCommercialPlan(id: CommercialPlanId): CommercialPlan {
  const plan = COMMERCIAL_PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown commercial plan: ${id}`);
  return plan;
}

export function listPublicPlans(): readonly CommercialPlan[] {
  return COMMERCIAL_PLANS.filter((p) => p.public);
}

export function planHasFeature(
  planId: CommercialPlanId,
  feature: SaasModuleFeatureKey,
): boolean {
  return getCommercialPlan(planId).features.includes(feature);
}

/** Map legacy SaaS plan ids onto the commercial catalog. */
export function mapLegacyPlanId(legacy: string): CommercialPlanId {
  switch (legacy) {
    case "free":
    case "starter":
      return "starter";
    case "growth":
    case "professional":
      return "professional";
    case "business":
      return "business";
    case "enterprise":
    case "custom":
      return "enterprise";
    default:
      return "starter";
  }
}
