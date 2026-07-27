/**
 * OrganizationService — domain orchestration layer.
 *
 * React hooks call this service; the service talks to an OrganizationApiPort.
 * Swap the API adapter for a remote backend without touching UI or hooks.
 */

import { createEmptyOrganizationProfile } from "./constants";
import { localOrganizationApi } from "./api/organizationApi";
import type { OrganizationApiPort } from "./api/types";
import { buildOrganizationAiContext } from "./ai/organizationAiContext";
import {
  asUserId,
  type CreateOrganizationInput,
  type CreateWorkspaceInput,
  type Organization,
  type OrganizationAiContext,
  type OrganizationDraft,
  type OrganizationId,
  type OrganizationProfile,
  type OrganizationSession,
  type UpdateOrganizationInput,
  type UserId,
  type Workspace,
  type WorkspaceId,
  type WorkspaceMembership,
} from "./types";
import {
  assertValidCreateInput,
  validateOrganizationDraft,
  validateOrganizationProfile,
  type ValidationResult,
} from "./validation";

export interface OrganizationServiceDeps {
  readonly api: OrganizationApiPort;
  /** Temporary anonymous principal until auth lands. */
  readonly resolveCurrentUserId: () => UserId;
}

const defaultDeps: OrganizationServiceDeps = {
  api: localOrganizationApi,
  resolveCurrentUserId: () => asUserId("user_local_anonymous"),
};

export class OrganizationService {
  private readonly api: OrganizationApiPort;
  private resolveCurrentUserId: () => UserId;

  constructor(deps: Partial<OrganizationServiceDeps> = {}) {
    this.api = deps.api ?? defaultDeps.api;
    this.resolveCurrentUserId =
      deps.resolveCurrentUserId ?? defaultDeps.resolveCurrentUserId;
  }

  setCurrentUserResolver(resolver: () => UserId): void {
    this.resolveCurrentUserId = resolver;
  }

  createDraft(partial: OrganizationDraft = {}): OrganizationProfile {
    return {
      ...createEmptyOrganizationProfile(),
      ...partial,
      primaryGoals: partial.primaryGoals ?? [],
      departments: partial.departments ?? [],
      aiPreferences: {
        ...createEmptyOrganizationProfile().aiPreferences,
        ...(partial.aiPreferences ?? {}),
      },
    };
  }

  validateDraft(draft: OrganizationDraft): ValidationResult {
    return validateOrganizationDraft(draft);
  }

  validateProfile(profile: OrganizationProfile): ValidationResult {
    return validateOrganizationProfile(profile);
  }

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<{ organization: Organization; workspace: Workspace }> {
    const validation = assertValidCreateInput(input);
    if (!validation.valid) {
      throw new OrganizationValidationError(validation);
    }
    return this.api.createOrganization(input, this.resolveCurrentUserId());
  }

  async getOrganization(
    organizationId: OrganizationId,
  ): Promise<Organization | null> {
    return this.api.getOrganization(organizationId);
  }

  async updateOrganization(
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    const existing = await this.api.getOrganization(input.organizationId);
    if (!existing) {
      throw new Error(`Organization not found: ${input.organizationId}`);
    }
    const nextProfile: OrganizationProfile = {
      name: input.patch.name ?? existing.name,
      type: input.patch.type ?? existing.type,
      industry: input.patch.industry ?? existing.industry,
      industryLabel: input.patch.industryLabel ?? existing.industryLabel,
      country: input.patch.country ?? existing.country,
      city: input.patch.city ?? existing.city,
      language: input.patch.language ?? existing.language,
      currency: input.patch.currency ?? existing.currency,
      timezone: input.patch.timezone ?? existing.timezone,
      website: input.patch.website ?? existing.website,
      logoUrl: input.patch.logoUrl ?? existing.logoUrl,
      mission: input.patch.mission ?? existing.mission,
      vision: input.patch.vision ?? existing.vision,
      primaryGoals: input.patch.primaryGoals ?? existing.primaryGoals,
      size: input.patch.size ?? existing.size,
      departments: input.patch.departments ?? existing.departments,
      aiPreferences: {
        ...existing.aiPreferences,
        ...(input.patch.aiPreferences ?? {}),
      },
      brandColors: input.patch.brandColors ?? existing.brandColors,
    };
    const validation = validateOrganizationProfile(nextProfile);
    if (!validation.valid) {
      throw new OrganizationValidationError(validation);
    }
    return this.api.updateOrganization({
      organizationId: input.organizationId,
      patch: nextProfile,
    });
  }

  async listAccessibleWorkspaces(): Promise<readonly Workspace[]> {
    return this.api.listWorkspacesForUser(this.resolveCurrentUserId());
  }

  async listMemberships(): Promise<readonly WorkspaceMembership[]> {
    return this.api.listMembershipsForUser(this.resolveCurrentUserId());
  }

  async getWorkspace(workspaceId: WorkspaceId): Promise<Workspace | null> {
    return this.api.getWorkspace(workspaceId);
  }

  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    if (!input.name.trim()) {
      throw new Error("Workspace name is required");
    }
    return this.api.createWorkspace(input);
  }

  /**
   * Builds the AI foundation context from the active org + workspace.
   * No agents are invoked — this is structured memory for future AI.
   */
  buildAiContext(
    organization: Organization,
    workspace: Workspace,
  ): OrganizationAiContext {
    return buildOrganizationAiContext(organization, workspace);
  }

  async loadSession(
    preferredWorkspaceId?: WorkspaceId,
  ): Promise<OrganizationSession> {
    const userId = this.resolveCurrentUserId();
    const [memberships, workspaces] = await Promise.all([
      this.api.listMembershipsForUser(userId),
      this.api.listWorkspacesForUser(userId),
    ]);

    if (workspaces.length === 0) {
      return {
        organization: null,
        workspace: null,
        accessibleWorkspaces: [],
        memberships,
        status: "ready",
        error: null,
        hydrated: true,
      };
    }

    const workspace =
      (preferredWorkspaceId
        ? workspaces.find((ws) => ws.id === preferredWorkspaceId)
        : undefined) ?? workspaces[0];

    const organization = await this.api.getOrganization(
      workspace.organizationId,
    );

    return {
      organization,
      workspace,
      accessibleWorkspaces: workspaces,
      memberships,
      status: "ready",
      error: null,
      hydrated: true,
    };
  }
}

export class OrganizationValidationError extends Error {
  readonly validation: ValidationResult;

  constructor(validation: ValidationResult) {
    super(
      validation.issues.map((i) => `${i.field}: ${i.message}`).join("; ") ||
        "Organization validation failed",
    );
    this.name = "OrganizationValidationError";
    this.validation = validation;
  }
}

/** App-wide default service instance (local adapter). */
export const organizationService = new OrganizationService();
