/**
 * Canonical provider identity vocabulary.
 *
 * Persistence (Prisma IntegrationProvider) and social credentials keep their
 * legacy values so production Gmail/YouTube rows continue to work.
 * Never rename Prisma enum values in this phase.
 */

export const CANONICAL_PROVIDER_IDS = [
  "gmail",
  "microsoft365",
  "youtube",
  "linkedin",
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "google_calendar",
  "google_workspace",
  "google_drive",
  "dropbox",
  "onedrive",
  "hubspot",
  "salesforce",
  "slack",
  "discord",
  "zapier",
  "make",
  "github",
  "gitlab",
  "custom",
  "amazon_seller",
  "shopify",
  "ebay",
  "alibaba",
] as const;

export type CanonicalProviderId = (typeof CANONICAL_PROVIDER_IDS)[number];

/** Prisma `IntegrationProvider` values that already exist in production. */
export const PERSISTENCE_PROVIDER_IDS = [
  "email_gmail",
  "email_microsoft",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
] as const;

export type PersistenceProviderId = (typeof PERSISTENCE_PROVIDER_IDS)[number];

/** Org-scoped social credential platforms (Prisma `SocialPlatform`). */
export const SOCIAL_CREDENTIAL_PLATFORMS = ["gmail", "youtube"] as const;
export type SocialCredentialPlatform =
  (typeof SOCIAL_CREDENTIAL_PLATFORMS)[number];

/**
 * Aliases that must resolve to one canonical id.
 * Includes Prisma enum values, connector catalog ids, and module catalog slugs.
 */
const PROVIDER_ALIASES: Readonly<Record<string, CanonicalProviderId>> = {
  gmail: "gmail",
  email_gmail: "gmail",
  google_gmail: "gmail",
  microsoft365: "microsoft365",
  email_microsoft: "microsoft365",
  m365: "microsoft365",
  outlook: "microsoft365",
  microsoft: "microsoft365",
  youtube: "youtube",
  linkedin: "linkedin",
  instagram: "instagram",
  facebook: "facebook",
  facebook_pages: "facebook",
  "facebook-pages": "facebook",
  tiktok: "tiktok",
  x: "x",
  twitter: "x",
  google_calendar: "google_calendar",
  "google-calendar": "google_calendar",
  gcal: "google_calendar",
  google_workspace: "google_workspace",
  "google-workspace": "google_workspace",
  workspace: "google_workspace",
  google_drive: "google_drive",
  "google-drive": "google_drive",
  gdrive: "google_drive",
  dropbox: "dropbox",
  onedrive: "onedrive",
  hubspot: "hubspot",
  salesforce: "salesforce",
  slack: "slack",
  discord: "discord",
  zapier: "zapier",
  make: "make",
  github: "github",
  gitlab: "gitlab",
  custom: "custom",
  custom_connector: "custom",
  "custom-connector": "custom",
  amazon_seller: "amazon_seller",
  amazon: "amazon_seller",
  "amazon-seller": "amazon_seller",
  shopify: "shopify",
  ebay: "ebay",
  alibaba: "alibaba",
};

const CANONICAL_TO_PERSISTENCE: Readonly<
  Partial<Record<CanonicalProviderId, PersistenceProviderId>>
> = {
  gmail: "email_gmail",
  microsoft365: "email_microsoft",
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
  youtube: "youtube",
  linkedin: "linkedin",
  x: "x",
};

const CANONICAL_TO_SOCIAL_CREDENTIAL: Readonly<
  Partial<Record<CanonicalProviderId, SocialCredentialPlatform>>
> = {
  gmail: "gmail",
  youtube: "youtube",
};

export function isCanonicalProviderId(
  value: unknown,
): value is CanonicalProviderId {
  return (
    typeof value === "string" &&
    (CANONICAL_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

export function isPersistenceProviderId(
  value: unknown,
): value is PersistenceProviderId {
  return (
    typeof value === "string" &&
    (PERSISTENCE_PROVIDER_IDS as readonly string[]).includes(value)
  );
}

export function toCanonicalProviderId(
  value: string,
): CanonicalProviderId | null {
  return PROVIDER_ALIASES[value] ?? null;
}

export function toPersistenceProviderId(
  value: string,
): PersistenceProviderId | null {
  const canonical = toCanonicalProviderId(value);
  if (!canonical) return null;
  return CANONICAL_TO_PERSISTENCE[canonical] ?? null;
}

export function socialCredentialPlatformFor(
  value: string,
): SocialCredentialPlatform | null {
  const canonical = toCanonicalProviderId(value);
  if (!canonical) return null;
  return CANONICAL_TO_SOCIAL_CREDENTIAL[canonical] ?? null;
}

/**
 * Provider id used in `/api/v1/integrations/[provider]/...`.
 * Gmail stays `email_gmail` so production OAuth callback paths remain valid.
 */
export function routeProviderId(value: string): PersistenceProviderId | null {
  return toPersistenceProviderId(value);
}

export function knownProviderAlias(value: string): boolean {
  return value in PROVIDER_ALIASES;
}
