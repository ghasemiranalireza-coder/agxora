/**
 * Organization profile validation — pure, side-effect free.
 * Ready for onboarding forms and API boundary checks.
 */

import { INDUSTRY_CATEGORIES, ORGANIZATION_SIZES, ORGANIZATION_TYPES } from "./constants";
import type {
  AiPreferences,
  BrandColors,
  CreateOrganizationInput,
  OrganizationDraft,
  OrganizationProfile,
  OrganizationType,
  OrganizationSize,
  IndustryCategory,
} from "./types";

export type ValidationIssueCode =
  | "required"
  | "too_short"
  | "too_long"
  | "invalid_format"
  | "invalid_enum"
  | "invalid_url"
  | "invalid_color";

export interface ValidationIssue {
  readonly field: string;
  readonly code: ValidationIssueCode;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

function issue(
  field: string,
  code: ValidationIssueCode,
  message: string,
): ValidationIssue {
  return { field, code, message };
}

const ISO_CURRENCY = /^[A-Z]{3}$/;
const BCP47_LANG = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;
const IANA_TZ = /^[A-Za-z0-9_+\-/]+$/;
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isOrganizationType(value: unknown): value is OrganizationType {
  return (
    typeof value === "string" &&
    (ORGANIZATION_TYPES as readonly string[]).includes(value)
  );
}

function isOrganizationSize(value: unknown): value is OrganizationSize {
  return (
    typeof value === "string" &&
    (ORGANIZATION_SIZES as readonly string[]).includes(value)
  );
}

function isIndustryCategory(value: unknown): value is IndustryCategory {
  return (
    typeof value === "string" &&
    (INDUSTRY_CATEGORIES as readonly string[]).includes(value)
  );
}

function validateUrl(field: string, value: string | undefined, issues: ValidationIssue[]): void {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      issues.push(issue(field, "invalid_url", `${field} must be http(s)`));
    }
  } catch {
    issues.push(issue(field, "invalid_url", `${field} must be a valid URL`));
  }
}

function validateBrandColors(
  colors: BrandColors | undefined,
  issues: ValidationIssue[],
): void {
  if (!colors) return;
  (["primary", "secondary", "accent"] as const).forEach((key) => {
    const value = colors[key];
    if (value && !HEX_COLOR.test(value)) {
      issues.push(
        issue(`brandColors.${key}`, "invalid_color", `${key} must be a hex color`),
      );
    }
  });
}

function validateAiPreferences(
  prefs: AiPreferences | undefined,
  issues: ValidationIssue[],
): void {
  if (!prefs) {
    issues.push(issue("aiPreferences", "required", "AI preferences are required"));
    return;
  }
  if (!BCP47_LANG.test(prefs.preferredLanguage)) {
    issues.push(
      issue(
        "aiPreferences.preferredLanguage",
        "invalid_format",
        "preferredLanguage must be a BCP 47 tag",
      ),
    );
  }
  if (!["formal", "neutral", "friendly", "concise"].includes(prefs.tone)) {
    issues.push(
      issue("aiPreferences.tone", "invalid_enum", "tone is invalid"),
    );
  }
}

/**
 * Validates a complete organization profile for create/update.
 */
export function validateOrganizationProfile(
  profile: OrganizationProfile,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  const name = profile.name?.trim() ?? "";
  if (!name) {
    issues.push(issue("name", "required", "Organization name is required"));
  } else if (name.length < 2) {
    issues.push(issue("name", "too_short", "Name must be at least 2 characters"));
  } else if (name.length > 120) {
    issues.push(issue("name", "too_long", "Name must be at most 120 characters"));
  }

  if (!isOrganizationType(profile.type)) {
    issues.push(issue("type", "invalid_enum", "Organization type is invalid"));
  }

  if (!isIndustryCategory(profile.industry)) {
    issues.push(issue("industry", "invalid_enum", "Industry is invalid"));
  }

  if (!profile.country?.trim()) {
    issues.push(issue("country", "required", "Country is required"));
  } else if (profile.country.trim().length > 80) {
    issues.push(issue("country", "too_long", "Country is too long"));
  }

  if (profile.city && profile.city.length > 80) {
    issues.push(issue("city", "too_long", "City is too long"));
  }

  if (!BCP47_LANG.test(profile.language)) {
    issues.push(issue("language", "invalid_format", "Language must be a BCP 47 tag"));
  }

  if (!ISO_CURRENCY.test(profile.currency)) {
    issues.push(issue("currency", "invalid_format", "Currency must be ISO 4217"));
  }

  if (!IANA_TZ.test(profile.timezone)) {
    issues.push(issue("timezone", "invalid_format", "Timezone must be IANA"));
  }

  validateUrl("website", profile.website, issues);
  validateUrl("logoUrl", profile.logoUrl, issues);

  if (profile.mission && profile.mission.length > 2000) {
    issues.push(issue("mission", "too_long", "Mission is too long"));
  }
  if (profile.vision && profile.vision.length > 2000) {
    issues.push(issue("vision", "too_long", "Vision is too long"));
  }

  if (profile.primaryGoals.length > 20) {
    issues.push(issue("primaryGoals", "too_long", "At most 20 primary goals"));
  }
  profile.primaryGoals.forEach((goal, index) => {
    if (!goal.trim()) {
      issues.push(
        issue(`primaryGoals[${index}]`, "required", "Goal cannot be empty"),
      );
    } else if (goal.length > 200) {
      issues.push(
        issue(`primaryGoals[${index}]`, "too_long", "Goal is too long"),
      );
    }
  });

  if (!isOrganizationSize(profile.size)) {
    issues.push(issue("size", "invalid_enum", "Organization size is invalid"));
  }

  if (profile.departments.length > 50) {
    issues.push(issue("departments", "too_long", "At most 50 departments"));
  }

  validateAiPreferences(profile.aiPreferences, issues);
  validateBrandColors(profile.brandColors, issues);

  return { valid: issues.length === 0, issues };
}

/**
 * Soft validation for progressive onboarding drafts.
 * Only checks fields that are present.
 */
export function validateOrganizationDraft(
  draft: OrganizationDraft,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (draft.name !== undefined) {
    const name = draft.name.trim();
    if (!name) {
      issues.push(issue("name", "required", "Organization name is required"));
    } else if (name.length < 2) {
      issues.push(issue("name", "too_short", "Name must be at least 2 characters"));
    }
  }

  if (draft.type !== undefined && !isOrganizationType(draft.type)) {
    issues.push(issue("type", "invalid_enum", "Organization type is invalid"));
  }

  if (draft.industry !== undefined && !isIndustryCategory(draft.industry)) {
    issues.push(issue("industry", "invalid_enum", "Industry is invalid"));
  }

  if (draft.currency !== undefined && !ISO_CURRENCY.test(draft.currency)) {
    issues.push(issue("currency", "invalid_format", "Currency must be ISO 4217"));
  }

  if (draft.language !== undefined && !BCP47_LANG.test(draft.language)) {
    issues.push(issue("language", "invalid_format", "Language must be a BCP 47 tag"));
  }

  if (draft.timezone !== undefined && !IANA_TZ.test(draft.timezone)) {
    issues.push(issue("timezone", "invalid_format", "Timezone must be IANA"));
  }

  validateUrl("website", draft.website, issues);
  validateUrl("logoUrl", draft.logoUrl, issues);
  validateBrandColors(draft.brandColors, issues);

  return { valid: issues.length === 0, issues };
}

export function assertValidCreateInput(
  input: CreateOrganizationInput,
): ValidationResult {
  return validateOrganizationProfile(input.profile);
}
