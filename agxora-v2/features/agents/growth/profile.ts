import type { BusinessProfile } from "@/app/lib/business/BusinessProfile";
import { createGrowthId, nowIso } from "./ids";
import type {
  BrandTone,
  GrowthBusinessProfile,
  GrowthProfileDraft,
  SocialPlatformId,
} from "./types";
import { DEFAULT_PLATFORMS } from "./types";

const TONES: readonly BrandTone[] = [
  "professional",
  "friendly",
  "luxury",
  "minimal",
  "corporate",
  "creative",
];

function asTone(value: unknown): BrandTone | undefined {
  return typeof value === "string" && TONES.includes(value as BrandTone)
    ? (value as BrandTone)
    : undefined;
}

export function seedGrowthDraftFromBusinessProfile(
  business?: BusinessProfile | null,
): GrowthProfileDraft {
  if (!business) return {};
  return {
    companyName: business.companyName,
    businessType: business.businessType,
    industry: business.recognition.industry,
    services: business.recognition.services,
    products: business.recognition.products,
    primaryLanguage: business.language,
    country: business.country,
    websiteGoal: business.goals[0],
    socialGoals: business.goals.slice(0, 3),
  };
}

export function createGrowthProfile(input: {
  readonly organizationId: string;
  readonly draft?: GrowthProfileDraft;
  readonly existing?: GrowthBusinessProfile;
  readonly seededFromOrgId?: string;
}): GrowthBusinessProfile {
  const draft = input.draft ?? {};
  const existing = input.existing;
  const now = nowIso();
  const brandTone =
    asTone(draft.brandTone) ?? existing?.brandTone ?? existing?.brand.tone ?? "professional";
  const keywords = draft.brandKeywords ?? existing?.brandKeywords ?? [];
  const platforms: readonly SocialPlatformId[] =
    draft.preferredPlatforms ??
    existing?.preferredPlatforms ??
    DEFAULT_PLATFORMS;

  return {
    id: existing?.id ?? createGrowthId("gprofile"),
    organizationId: input.organizationId,
    companyName: draft.companyName ?? existing?.companyName ?? "",
    businessType: draft.businessType ?? existing?.businessType,
    industry: draft.industry ?? existing?.industry,
    description: draft.description ?? existing?.description,
    services: draft.services ?? existing?.services ?? [],
    products: draft.products ?? existing?.products ?? [],
    targetAudience: draft.targetAudience ?? existing?.targetAudience,
    uniqueSellingProposition:
      draft.uniqueSellingProposition ?? existing?.uniqueSellingProposition,
    brandTone,
    brandKeywords: keywords,
    websiteGoal: draft.websiteGoal ?? existing?.websiteGoal,
    socialGoals: draft.socialGoals ?? existing?.socialGoals ?? [],
    preferredPlatforms: platforms,
    primaryLanguage: draft.primaryLanguage ?? existing?.primaryLanguage,
    country: draft.country ?? existing?.country,
    contactInformation: draft.contactInformation ?? existing?.contactInformation,
    businessHours: draft.businessHours ?? existing?.businessHours,
    visualPreferences: draft.visualPreferences ?? existing?.visualPreferences,
    brand: {
      tone: brandTone,
      keywords,
      visualPreferences:
        draft.visualPreferences ?? existing?.visualPreferences ?? existing?.brand.visualPreferences,
      primaryLanguage:
        draft.primaryLanguage ?? existing?.primaryLanguage ?? existing?.brand.primaryLanguage,
    },
    goals: existing?.goals ?? [],
    sourceBusinessProfileOrgId:
      input.seededFromOrgId ?? existing?.sourceBusinessProfileOrgId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
