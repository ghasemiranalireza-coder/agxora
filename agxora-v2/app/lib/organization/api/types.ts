/**
 * Future API contracts for the Organization foundation.
 * Implementations may target REST, tRPC, GraphQL, or RPC —
 * the domain service depends only on this port.
 */

import type {
  CreateOrganizationInput,
  CreateWorkspaceInput,
  Organization,
  OrganizationId,
  UpdateOrganizationInput,
  UserId,
  Workspace,
  WorkspaceId,
  WorkspaceMembership,
} from "../types";

export interface OrganizationApiPort {
  readonly createOrganization: (
    input: CreateOrganizationInput,
    ownerUserId: UserId,
  ) => Promise<{ organization: Organization; workspace: Workspace }>;

  readonly getOrganization: (
    organizationId: OrganizationId,
  ) => Promise<Organization | null>;

  readonly updateOrganization: (
    input: UpdateOrganizationInput,
  ) => Promise<Organization>;

  readonly listWorkspacesForUser: (
    userId: UserId,
  ) => Promise<readonly Workspace[]>;

  readonly getWorkspace: (
    workspaceId: WorkspaceId,
  ) => Promise<Workspace | null>;

  readonly createWorkspace: (
    input: CreateWorkspaceInput,
  ) => Promise<Workspace>;

  readonly listMembershipsForUser: (
    userId: UserId,
  ) => Promise<readonly WorkspaceMembership[]>;

  readonly listMembershipsForOrganization: (
    organizationId: OrganizationId,
  ) => Promise<readonly WorkspaceMembership[]>;

  readonly upsertMembership: (
    membership: WorkspaceMembership,
  ) => Promise<WorkspaceMembership>;

  readonly revokeMembership: (
    membershipId: string,
  ) => Promise<void>;
}

export class OrganizationApiNotConfiguredError extends Error {
  constructor(method: string) {
    super(
      `Organization API is not configured yet (missing implementation for ${method}).`,
    );
    this.name = "OrganizationApiNotConfiguredError";
  }
}
