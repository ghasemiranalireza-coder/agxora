/**
 * Server-authoritative AGXORA commercial catalog.
 * Prices are net EUR cents. This module is the commercial authority.
 * Customer-facing tax wording is fixed: "zzgl. gesetzlicher MwSt."
 */

export const VAT_NOTICE = "zzgl. gesetzlicher MwSt.";
export const COMMERCIAL_CURRENCY = "EUR" as const;
export const COMMERCIAL_PROVIDER = "stripe" as const;

export const PLAN_CODES = ["agxora_base", "agxora_business", "agxora_professional"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const COMMERCIAL_CAPABILITIES = [
  "CRM",
  "CRM_CUSTOMERS",
  "CRM_CONTACTS",
  "CRM_NOTES",
  "CRM_ACTIVITY",
  "FINANCE_HUMAN",
  "DATA_EXPORT",
  "SUPPORT",
  "RECOVERY",
  "CUSTOMER_COMMUNICATION_WORKFORCE",
  "CRM_FOLLOW_UP",
  "GOVERNED_EMAIL",
  "APPROVAL",
  "IDEMPOTENCY",
  "VERIFICATION",
  "EVIDENCE",
  "BUSINESS_MEMORY",
  "MARKETING_WORKFORCE",
  "MARKETING_CAMPAIGN",
  "MARKETING_CONTENT_PLAN",
  "MARKETING_IMAGE_CREATION",
  "MARKETING_VIDEO_CREATION",
  "MARKETING_AD_CREATIVE",
  "SOCIAL_CONTENT",
  "SOCIAL_PUBLISH",
  "MARKETING_AUTOMATION",
  "MARKETING_MEASUREMENT",
  "MARKETING_OPTIMIZATION",
] as const;

export type CommercialCapabilityId = (typeof COMMERCIAL_CAPABILITIES)[number];

/** Capabilities that require an active paid subscription when a subscription row exists. */
export const GOVERNED_COMMERCIAL_CAPABILITIES = [
  "CUSTOMER_COMMUNICATION_WORKFORCE",
  "CRM_FOLLOW_UP",
  "GOVERNED_EMAIL",
  "APPROVAL",
  "IDEMPOTENCY",
  "VERIFICATION",
  "EVIDENCE",
  "BUSINESS_MEMORY",
] as const satisfies readonly CommercialCapabilityId[];

export const FUTURE_MARKETING_CAPABILITIES = [
  "MARKETING_WORKFORCE",
  "MARKETING_CAMPAIGN",
  "MARKETING_CONTENT_PLAN",
  "MARKETING_IMAGE_CREATION",
  "MARKETING_VIDEO_CREATION",
  "MARKETING_AD_CREATIVE",
  "SOCIAL_CONTENT",
  "SOCIAL_PUBLISH",
  "MARKETING_AUTOMATION",
  "MARKETING_MEASUREMENT",
  "MARKETING_OPTIMIZATION",
] as const satisfies readonly CommercialCapabilityId[];

const BASE_CAPABILITIES = [
  "CRM",
  "CRM_CUSTOMERS",
  "CRM_CONTACTS",
  "CRM_NOTES",
  "CRM_ACTIVITY",
  "FINANCE_HUMAN",
  "DATA_EXPORT",
  "SUPPORT",
  "RECOVERY",
] as const satisfies readonly CommercialCapabilityId[];

const BUSINESS_CAPABILITIES = [
  ...BASE_CAPABILITIES,
  ...GOVERNED_COMMERCIAL_CAPABILITIES,
  ...FUTURE_MARKETING_CAPABILITIES,
] as const satisfies readonly CommercialCapabilityId[];

export interface CommercialPlanDefinition {
  readonly code: PlanCode;
  readonly name: string;
  readonly description: string;
  readonly currency: typeof COMMERCIAL_CURRENCY;
  readonly monthlyCents: number;
  readonly yearlyCents: number;
  readonly seats: number;
  /** Governed executions allowed per billing period. Base is zero. */
  readonly governedExecutionsPerMonth: number;
  readonly capabilities: readonly CommercialCapabilityId[];
  readonly recommended: boolean;
  readonly features: readonly string[];
}

export const COMMERCIAL_PLANS: readonly CommercialPlanDefinition[] = [
  {
    code: "agxora_base",
    name: "AGXORA Base",
    description: "CRM, human finance, export, support, and recovery.",
    currency: "EUR",
    monthlyCents: 1999,
    yearlyCents: 19990,
    seats: 2,
    governedExecutionsPerMonth: 0,
    capabilities: BASE_CAPABILITIES,
    recommended: false,
    features: [
      "CRM, customers, contacts, notes, and activity",
      "Human finance, delivery notes, invoices, and VAT",
      "Data export, support, and recovery",
      "2 seats",
      "No governed executions",
    ],
  },
  {
    code: "agxora_business",
    name: "AGXORA Business",
    description: "Base, plus the live Customer Communication Workforce.",
    currency: "EUR",
    monthlyCents: 7900,
    yearlyCents: 79000,
    seats: 5,
    governedExecutionsPerMonth: 300,
    capabilities: BUSINESS_CAPABILITIES,
    recommended: true,
    features: [
      "Everything in Base",
      "Customer Communication Workforce",
      "Governed CRM follow-up and governed email",
      "Approval, idempotency, verification, evidence, and business memory",
      "5 seats",
      "300 governed executions per month",
    ],
  },
  {
    code: "agxora_professional",
    name: "AGXORA Professional",
    description: "The Business capabilities with a higher seat and execution allowance.",
    currency: "EUR",
    monthlyCents: 14900,
    yearlyCents: 149000,
    seats: 15,
    governedExecutionsPerMonth: 1500,
    capabilities: BUSINESS_CAPABILITIES,
    recommended: false,
    features: [
      "Everything in Business",
      "15 seats",
      "1,500 governed executions per month",
    ],
  },
];

const byCode = new Map(COMMERCIAL_PLANS.map((plan) => [plan.code, plan]));

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === "string" && byCode.has(value as PlanCode);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

export function getCommercialPlan(code: PlanCode): CommercialPlanDefinition {
  const plan = byCode.get(code);
  if (!plan) throw new Error(`Unknown commercial plan: ${code}`);
  return plan;
}

export function priceCents(plan: CommercialPlanDefinition, interval: BillingInterval): number {
  return interval === "year" ? plan.yearlyCents : plan.monthlyCents;
}

/** Net amount label. Whole euros drop the decimal portion. */
export function formatNetEur(cents: number): string {
  const raw = (cents / 100).toFixed(2);
  const amount = raw.endsWith(".00") ? raw.slice(0, -3) : raw;
  return `${amount} EUR`;
}

export function planAllows(planCode: PlanCode, capabilityId: CommercialCapabilityId): boolean {
  return getCommercialPlan(planCode).capabilities.includes(capabilityId);
}
