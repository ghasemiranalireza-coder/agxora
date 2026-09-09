/**
 * AGXORA product structure. This is not billing.
 * Plan Access for Premium Marketplace is resolved separately in entitlements.ts.
 */

export const PRODUCT_PACKAGE_IDS = ["core", "social", "premium"] as const;
export type ProductPackageId = (typeof PRODUCT_PACKAGE_IDS)[number];

export type ProductFeatureStatus = "available" | "not_implemented";

export type ProductFeature = {
  readonly id: string;
  readonly label: string;
  readonly status: ProductFeatureStatus;
};

export type ProductPackage = {
  readonly id: ProductPackageId;
  readonly label: string;
  readonly features: readonly ProductFeature[];
};

export const PRODUCT_STRUCTURE: readonly ProductPackage[] = [
  {
    id: "core",
    label: "Core",
    features: [
      { id: "ai_business_agent", label: "AI Business Agent", status: "available" },
      { id: "gmail", label: "Gmail", status: "available" },
      { id: "basic_business_tools", label: "Basic Business Tools", status: "available" },
    ],
  },
  {
    id: "social",
    label: "Social",
    features: [
      { id: "linkedin", label: "LinkedIn", status: "not_implemented" },
      { id: "youtube", label: "YouTube", status: "available" },
      { id: "instagram", label: "Instagram", status: "not_implemented" },
      { id: "tiktok", label: "TikTok", status: "not_implemented" },
      { id: "x", label: "X", status: "not_implemented" },
      { id: "facebook", label: "Facebook", status: "not_implemented" },
    ],
  },
  {
    id: "premium",
    label: "Premium",
    features: [
      {
        id: "marketplace",
        label: "Marketplace & E-Commerce",
        status: "available",
      },
      { id: "advanced_analytics", label: "Advanced Analytics", status: "not_implemented" },
      {
        id: "advanced_ai_automation",
        label: "Advanced AI Automation",
        status: "not_implemented",
      },
      {
        id: "advanced_business_agents",
        label: "Advanced Business Agents",
        status: "not_implemented",
      },
    ],
  },
];

const CORE_PROVIDERS = new Set(["email_gmail", "email_microsoft"]);
const PREMIUM_PROVIDERS = new Set(["amazon_seller", "alibaba", "ebay", "shopify"]);

export function productPackageForProvider(provider: string): ProductPackageId {
  if (CORE_PROVIDERS.has(provider)) return "core";
  if (PREMIUM_PROVIDERS.has(provider)) return "premium";
  return "social";
}

export function amazonSellerConnectedInWorkspace(input: {
  readonly credentialLive: boolean;
  readonly workspaceStatus: string | null;
}): boolean {
  return input.credentialLive && input.workspaceStatus === "connected";
}

export function canStartOfficialConnect(input: {
  readonly implementationStatus: "oauth_ready" | "not_implemented";
  readonly connected: boolean;
  readonly planAccess: boolean;
}): boolean {
  return (
    input.implementationStatus === "oauth_ready" &&
    !input.connected &&
    input.planAccess
  );
}
