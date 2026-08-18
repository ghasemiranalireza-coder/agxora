/**
 * Growth domain types — Agent OS overlay, not a replacement for Business OS.
 * Seed from app/lib/business/BusinessProfile when available.
 */

export type BrandTone =
  | "professional"
  | "friendly"
  | "luxury"
  | "minimal"
  | "corporate"
  | "creative";

export type SocialPlatformId =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube";

export type GrowthGoalKind = "website" | "social" | "brand" | "growth";

export interface ContactInformation {
  readonly email?: string;
  readonly phone?: string;
  readonly website?: string;
  readonly address?: string;
}

export interface BrandProfile {
  readonly tone: BrandTone;
  readonly keywords: readonly string[];
  readonly visualPreferences?: string;
  readonly primaryLanguage?: string;
}

export interface GrowthGoal {
  readonly id: string;
  readonly kind: GrowthGoalKind;
  readonly statement: string;
  readonly priority?: "low" | "medium" | "high";
}

export interface GrowthBusinessProfile {
  readonly id: string;
  readonly organizationId: string;
  readonly companyName: string;
  readonly businessType?: string;
  readonly industry?: string;
  readonly description?: string;
  readonly services: readonly string[];
  readonly products: readonly string[];
  readonly targetAudience?: string;
  readonly uniqueSellingProposition?: string;
  readonly brandTone?: BrandTone;
  readonly brandKeywords: readonly string[];
  readonly websiteGoal?: string;
  readonly socialGoals: readonly string[];
  readonly preferredPlatforms: readonly SocialPlatformId[];
  readonly primaryLanguage?: string;
  readonly country?: string;
  readonly contactInformation?: ContactInformation;
  readonly businessHours?: string;
  readonly visualPreferences?: string;
  readonly brand: BrandProfile;
  readonly goals: readonly GrowthGoal[];
  readonly sourceBusinessProfileOrgId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GrowthStrategy {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly summary: string;
  readonly websiteDirection: string;
  readonly socialDirection: string;
  readonly priorities: readonly string[];
  readonly recommendedPlatforms: readonly SocialPlatformId[];
  readonly createdAt: string;
}

export interface GrowthProfileDraft {
  readonly companyName?: string;
  readonly businessType?: string;
  readonly industry?: string;
  readonly description?: string;
  readonly services?: readonly string[];
  readonly products?: readonly string[];
  readonly targetAudience?: string;
  readonly uniqueSellingProposition?: string;
  readonly brandTone?: BrandTone;
  readonly brandKeywords?: readonly string[];
  readonly websiteGoal?: string;
  readonly socialGoals?: readonly string[];
  readonly preferredPlatforms?: readonly SocialPlatformId[];
  readonly primaryLanguage?: string;
  readonly country?: string;
  readonly contactInformation?: ContactInformation;
  readonly businessHours?: string;
  readonly visualPreferences?: string;
}

export const DEFAULT_PLATFORMS: readonly SocialPlatformId[] = [
  "instagram",
  "linkedin",
];

export const SOCIAL_PLATFORMS: readonly SocialPlatformId[] = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "youtube",
];
