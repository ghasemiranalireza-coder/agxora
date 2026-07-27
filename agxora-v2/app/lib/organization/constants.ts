/**
 * Universal Organization Foundation — constants and defaults.
 */

import {
  DEFAULT_AI_PREFERENCES,
  type OrganizationProfile,
  type OrganizationType,
  type OrganizationSize,
  type IndustryCategory,
  type WorkspaceModuleKey,
} from "./types";

export const ORGANIZATION_STORAGE_KEY = "agxora.organization.v1";
export const ORGANIZATION_SESSION_STORAGE_KEY = "agxora.organization.session.v1";

export const ORGANIZATION_TYPES: readonly OrganizationType[] = [
  "freelancer",
  "startup",
  "small_business",
  "medium_business",
  "enterprise",
  "government",
  "university",
  "ngo",
  "nonprofit",
  "holding",
  "international",
  "other",
] as const;

export const ORGANIZATION_SIZES: readonly OrganizationSize[] = [
  "solo",
  "2_10",
  "11_50",
  "51_200",
  "201_1000",
  "1000_plus",
  "unspecified",
] as const;

export const INDUSTRY_CATEGORIES: readonly IndustryCategory[] = [
  "technology",
  "professional_services",
  "retail",
  "hospitality",
  "healthcare",
  "education",
  "finance",
  "manufacturing",
  "logistics",
  "media",
  "energy",
  "real_estate",
  "public_sector",
  "nonprofit",
  "other",
  "unspecified",
] as const;

/** Reserved module registry — none enabled by default in Phase 3. */
export const WORKSPACE_MODULE_REGISTRY: readonly WorkspaceModuleKey[] = [
  "crm",
  "projects",
  "documents",
  "automation",
  "analytics",
  "finance",
  "ai",
  "workflows",
  "knowledge",
  "marketplace",
  "integrations",
  "settings",
] as const;

export function createEmptyOrganizationProfile(): OrganizationProfile {
  return {
    name: "",
    type: "other",
    industry: "unspecified",
    country: "",
    language: "en",
    currency: "USD",
    timezone: "UTC",
    primaryGoals: [],
    size: "unspecified",
    departments: [],
    aiPreferences: { ...DEFAULT_AI_PREFERENCES },
  };
}

export function slugifyWorkspaceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "workspace";
}
