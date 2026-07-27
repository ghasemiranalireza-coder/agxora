/**
 * AGXORA Universal Organization Foundation — domain types.
 *
 * Industry-agnostic. Every future module (CRM, Finance, AI, Automation…)
 * must compose on these contracts. Do not specialize for a vertical.
 */

/* ------------------------------------------------------------------ */
/* Identifiers                                                         */
/* ------------------------------------------------------------------ */

/** Opaque branded string IDs — ready for UUID / ULID backends. */
export type OrganizationId = string & { readonly __brand: "OrganizationId" };
export type WorkspaceId = string & { readonly __brand: "WorkspaceId" };
export type UserId = string & { readonly __brand: "UserId" };
export type MembershipId = string & { readonly __brand: "MembershipId" };

export function asOrganizationId(value: string): OrganizationId {
  return value as OrganizationId;
}

export function asWorkspaceId(value: string): WorkspaceId {
  return value as WorkspaceId;
}

export function asUserId(value: string): UserId {
  return value as UserId;
}

export function asMembershipId(value: string): MembershipId {
  return value as MembershipId;
}

/* ------------------------------------------------------------------ */
/* Organization taxonomy (universal)                                   */
/* ------------------------------------------------------------------ */

/** Organization form — not industry-specific. */
export type OrganizationType =
  | "freelancer"
  | "startup"
  | "small_business"
  | "medium_business"
  | "enterprise"
  | "government"
  | "university"
  | "ngo"
  | "nonprofit"
  | "holding"
  | "international"
  | "other";

/** Relative size bands — universal across countries. */
export type OrganizationSize =
  | "solo"
  | "2_10"
  | "11_50"
  | "51_200"
  | "201_1000"
  | "1000_plus"
  | "unspecified";

/**
 * Broad industry categories. Prefer open strings for specificity;
 * this enum covers common top-level buckets only.
 */
export type IndustryCategory =
  | "technology"
  | "professional_services"
  | "retail"
  | "hospitality"
  | "healthcare"
  | "education"
  | "finance"
  | "manufacturing"
  | "logistics"
  | "media"
  | "energy"
  | "real_estate"
  | "public_sector"
  | "nonprofit"
  | "other"
  | "unspecified";

/* ------------------------------------------------------------------ */
/* Branding & preferences                                              */
/* ------------------------------------------------------------------ */

export interface BrandColors {
  readonly primary?: string;
  readonly secondary?: string;
  readonly accent?: string;
}

export interface AiPreferences {
  /** ISO language the org prefers for AI responses. */
  readonly preferredLanguage: string;
  /** Tone guidance for future agents — not an agent itself. */
  readonly tone: "formal" | "neutral" | "friendly" | "concise";
  /** Whether AI may use org knowledge when available. */
  readonly useOrganizationKnowledge: boolean;
  /** Whether AI may propose automation suggestions. */
  readonly allowAutomationSuggestions: boolean;
}

export const DEFAULT_AI_PREFERENCES: AiPreferences = {
  preferredLanguage: "en",
  tone: "neutral",
  useOrganizationKnowledge: true,
  allowAutomationSuggestions: true,
};

/* ------------------------------------------------------------------ */
/* Organization profile                                                */
/* ------------------------------------------------------------------ */

export interface OrganizationProfile {
  readonly name: string;
  readonly type: OrganizationType;
  readonly industry: IndustryCategory;
  /** Free-form industry label when category is too coarse. */
  readonly industryLabel?: string;
  readonly country: string;
  readonly city?: string;
  /** BCP 47 language tag, e.g. "en", "de", "ar". */
  readonly language: string;
  /** ISO 4217 currency code. */
  readonly currency: string;
  /** IANA timezone, e.g. "Europe/Berlin". */
  readonly timezone: string;
  readonly website?: string;
  readonly logoUrl?: string;
  readonly mission?: string;
  readonly vision?: string;
  readonly primaryGoals: readonly string[];
  readonly size: OrganizationSize;
  readonly departments: readonly string[];
  readonly aiPreferences: AiPreferences;
  readonly brandColors?: BrandColors;
}

export interface Organization extends OrganizationProfile {
  readonly id: OrganizationId;
  /** URL-safe unique slug for multi-tenant routing. */
  readonly slug: string;
  /** Owning principal — transferrable via team service. */
  readonly ownerId: UserId;
  /** Subscription reference — billing adapters plug in later. */
  readonly subscriptionId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Soft delete / archival — ready for multi-tenant backends. */
  readonly status: "active" | "suspended" | "archived";
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

/**
 * A Workspace is the operational home of an organization.
 * Future modules mount here. Isolation is architectural — one org
 * may eventually own many workspaces; UI for that is out of scope.
 */
export type WorkspaceStatus = "active" | "provisioning" | "archived";

export interface WorkspaceSettings {
  readonly defaultLanguage: string;
  readonly defaultCurrency: string;
  readonly defaultTimezone: string;
  /** Feature flags for future modules — empty until enabled. */
  readonly enabledModules: readonly WorkspaceModuleKey[];
}

/**
 * Reserved module keys. None are implemented in this phase —
 * the registry exists so future plugins can register without
 * rewriting the foundation.
 */
export type WorkspaceModuleKey =
  | "crm"
  | "projects"
  | "documents"
  | "automation"
  | "analytics"
  | "finance"
  | "ai"
  | "workflows"
  | "knowledge"
  | "marketplace"
  | "integrations"
  | "settings"
  | "customers"
  | "invoices"
  | "memory"
  | "dashboard";

export interface Workspace {
  readonly id: WorkspaceId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly slug: string;
  readonly status: WorkspaceStatus;
  /**
   * Isolation key for future row-level / tenant scoping.
   * Never expose raw org data across isolation keys.
   */
  readonly isolationKey: string;
  readonly settings: WorkspaceSettings;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Membership / multi-workspace readiness                              */
/* ------------------------------------------------------------------ */

export type MembershipRole =
  | "owner"
  | "admin"
  | "manager"
  | "employee"
  | "member"
  | "viewer"
  | "guest";

export type MembershipStatus = "active" | "invited" | "revoked";

/**
 * Links a user to a workspace. Multi-workspace UI is not built yet;
 * this model enables it without architectural change later.
 */
export interface WorkspaceMembership {
  readonly id: MembershipId;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly organizationId: OrganizationId;
  readonly role: MembershipRole;
  readonly status: MembershipStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* AI foundation context (no agents)                                   */
/* ------------------------------------------------------------------ */

/**
 * Compact, serializable context future AI systems can consume so they
 * understand the organization without re-asking identity questions.
 */
export interface OrganizationAiContext {
  readonly organizationId: OrganizationId;
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly type: OrganizationType;
  readonly industry: IndustryCategory;
  readonly industryLabel?: string;
  readonly country: string;
  readonly language: string;
  readonly currency: string;
  readonly timezone: string;
  readonly size: OrganizationSize;
  readonly mission?: string;
  readonly vision?: string;
  readonly primaryGoals: readonly string[];
  readonly departments: readonly string[];
  readonly aiPreferences: AiPreferences;
  readonly generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Draft / onboarding inputs                                           */
/* ------------------------------------------------------------------ */

/** Partial profile used during universal onboarding. */
export type OrganizationDraft = Partial<OrganizationProfile> & {
  readonly name?: string;
};

export interface CreateOrganizationInput {
  readonly profile: OrganizationProfile;
  /** Optional first workspace name; defaults to org name. */
  readonly workspaceName?: string;
}

export interface UpdateOrganizationInput {
  readonly organizationId: OrganizationId;
  readonly patch: Partial<OrganizationProfile>;
}

export interface CreateWorkspaceInput {
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly slug?: string;
}

/* ------------------------------------------------------------------ */
/* Runtime session state                                               */
/* ------------------------------------------------------------------ */

export interface OrganizationSession {
  readonly organization: Organization | null;
  readonly workspace: Workspace | null;
  /** All workspaces the current principal can access (multi-ws ready). */
  readonly accessibleWorkspaces: readonly Workspace[];
  readonly memberships: readonly WorkspaceMembership[];
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly error: string | null;
  readonly hydrated: boolean;
}
