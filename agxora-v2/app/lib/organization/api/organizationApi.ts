/**
 * Local / in-memory Organization API adapter.
 *
 * Used until a remote backend exists. Swap this for a network client
 * without changing OrganizationService or React consumers.
 */

import { slugifyWorkspaceName } from "../constants";
import type {
  CreateWorkspaceInput,
  MembershipId,
  Organization,
  OrganizationId,
  UpdateOrganizationInput,
  UserId,
  Workspace,
  WorkspaceId,
  WorkspaceMembership,
} from "../types";
import {
  asMembershipId,
  asOrganizationId,
  asWorkspaceId,
} from "../types";
import {
  OrganizationApiNotConfiguredError,
  type OrganizationApiPort,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

interface MemoryDb {
  organizations: Map<OrganizationId, Organization>;
  workspaces: Map<WorkspaceId, Workspace>;
  memberships: Map<MembershipId, WorkspaceMembership>;
}

function createMemoryDb(): MemoryDb {
  return {
    organizations: new Map(),
    workspaces: new Map(),
    memberships: new Map(),
  };
}

/** Singleton memory DB for the browser session / local adapter. */
const memoryDb: MemoryDb = createMemoryDb();

export function createLocalOrganizationApi(
  db: MemoryDb = memoryDb,
): OrganizationApiPort {
  return {
    async createOrganization(input, ownerUserId) {
      const timestamp = nowIso();
      const organizationId = asOrganizationId(createId("org"));
      const workspaceId = asWorkspaceId(createId("ws"));
      const membershipId = asMembershipId(createId("mem"));

      const organization: Organization = {
        ...input.profile,
        id: organizationId,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const workspaceName = input.workspaceName?.trim() || input.profile.name;
      const workspace: Workspace = {
        id: workspaceId,
        organizationId,
        name: workspaceName,
        slug: slugifyWorkspaceName(workspaceName),
        status: "active",
        isolationKey: `iso_${organizationId}_${workspaceId}`,
        settings: {
          defaultLanguage: input.profile.language,
          defaultCurrency: input.profile.currency,
          defaultTimezone: input.profile.timezone,
          enabledModules: [],
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const membership: WorkspaceMembership = {
        id: membershipId,
        userId: ownerUserId,
        workspaceId,
        organizationId,
        role: "owner",
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      db.organizations.set(organizationId, organization);
      db.workspaces.set(workspaceId, workspace);
      db.memberships.set(membershipId, membership);

      return { organization, workspace };
    },

    async getOrganization(organizationId) {
      return db.organizations.get(organizationId) ?? null;
    },

    async updateOrganization(input: UpdateOrganizationInput) {
      const existing = db.organizations.get(input.organizationId);
      if (!existing) {
        throw new OrganizationApiNotConfiguredError("updateOrganization:not_found");
      }
      const updated: Organization = {
        ...existing,
        ...input.patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: nowIso(),
        status: existing.status,
        aiPreferences: {
          ...existing.aiPreferences,
          ...(input.patch.aiPreferences ?? {}),
        },
        primaryGoals: input.patch.primaryGoals ?? existing.primaryGoals,
        departments: input.patch.departments ?? existing.departments,
      };
      db.organizations.set(existing.id, updated);
      return updated;
    },

    async listWorkspacesForUser(userId: UserId) {
      const workspaceIds = new Set(
        [...db.memberships.values()]
          .filter((m) => m.userId === userId && m.status === "active")
          .map((m) => m.workspaceId),
      );
      return [...db.workspaces.values()].filter((ws) =>
        workspaceIds.has(ws.id),
      );
    },

    async getWorkspace(workspaceId) {
      return db.workspaces.get(workspaceId) ?? null;
    },

    async createWorkspace(input: CreateWorkspaceInput) {
      const org = db.organizations.get(input.organizationId);
      if (!org) {
        throw new OrganizationApiNotConfiguredError("createWorkspace:org_not_found");
      }
      const timestamp = nowIso();
      const workspaceId = asWorkspaceId(createId("ws"));
      const workspace: Workspace = {
        id: workspaceId,
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug ?? slugifyWorkspaceName(input.name),
        status: "active",
        isolationKey: `iso_${input.organizationId}_${workspaceId}`,
        settings: {
          defaultLanguage: org.language,
          defaultCurrency: org.currency,
          defaultTimezone: org.timezone,
          enabledModules: [],
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.workspaces.set(workspaceId, workspace);
      return workspace;
    },

    async listMembershipsForUser(userId) {
      return [...db.memberships.values()].filter((m) => m.userId === userId);
    },
  };
}

/** Default adapter used by OrganizationService until a remote API exists. */
export const localOrganizationApi = createLocalOrganizationApi();
