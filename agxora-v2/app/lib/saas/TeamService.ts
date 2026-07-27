/**
 * TeamService — invitations, role assignment, remove member, transfer ownership.
 * Local persistence; swap for remote team API later.
 */

import {
  asMembershipId,
  type MembershipRole,
  type Organization,
  type OrganizationId,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
} from "../organization/types";
import { localOrganizationApi } from "../organization/api/organizationApi";
import {
  asInvitationId,
  createInvitationId,
  type TeamInvitation,
} from "./invitation";
import { createTrialSubscription, type Subscription } from "./subscription";

const TEAM_STORAGE_KEY = "agxora.saas.team.v1";

interface TeamStore {
  readonly invitations: TeamInvitation[];
  readonly subscriptions: Subscription[];
  readonly directory: Array<{
    userId: UserId;
    email: string;
    displayName: string;
    organizationId: OrganizationId;
  }>;
}

function emptyStore(): TeamStore {
  return { invitations: [], subscriptions: [], directory: [] };
}

function readStore(): TeamStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as TeamStore;
    return {
      invitations: Array.isArray(parsed.invitations) ? parsed.invitations : [],
      subscriptions: Array.isArray(parsed.subscriptions)
        ? parsed.subscriptions
        : [],
      directory: Array.isArray(parsed.directory) ? parsed.directory : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: TeamStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function createToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `tok_${crypto.randomUUID()}`;
  }
  return `tok_${Date.now().toString(36)}`;
}

export class TeamService {
  ensureSubscription(organizationId: OrganizationId): Subscription {
    const store = readStore();
    const existing = store.subscriptions.find(
      (item) => item.organizationId === organizationId,
    );
    if (existing) return existing;
    const subscription = createTrialSubscription(organizationId);
    writeStore({
      ...store,
      subscriptions: [...store.subscriptions, subscription],
    });
    return subscription;
  }

  registerMemberDirectory(input: {
    userId: UserId;
    email: string;
    displayName: string;
    organizationId: OrganizationId;
  }): void {
    const store = readStore();
    const others = store.directory.filter(
      (item) =>
        !(
          item.userId === input.userId &&
          item.organizationId === input.organizationId
        ),
    );
    writeStore({
      ...store,
      directory: [...others, input],
    });
  }

  listDirectory(organizationId: OrganizationId) {
    return readStore().directory.filter(
      (item) => item.organizationId === organizationId,
    );
  }

  async listMembers(
    organizationId: OrganizationId,
  ): Promise<readonly WorkspaceMembership[]> {
    return localOrganizationApi.listMembershipsForOrganization(organizationId);
  }

  invite(input: {
    organizationId: OrganizationId;
    workspaceId: WorkspaceId;
    email: string;
    role: MembershipRole;
    invitedBy: UserId;
  }): TeamInvitation {
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Valid email required");
    if (input.role === "owner") {
      throw new Error("Cannot invite as owner — transfer ownership instead");
    }

    const now = new Date();
    const invitation: TeamInvitation = {
      id: createInvitationId(),
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      invitedBy: input.invitedBy,
      token: createToken(),
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const store = readStore();
    writeStore({
      ...store,
      invitations: [
        ...store.invitations.filter(
          (item) =>
            !(
              item.email === email &&
              item.organizationId === input.organizationId &&
              item.status === "pending"
            ),
        ),
        invitation,
      ],
    });
    return invitation;
  }

  listInvitations(organizationId: OrganizationId): readonly TeamInvitation[] {
    return readStore().invitations.filter(
      (item) => item.organizationId === organizationId,
    );
  }

  revokeInvitation(invitationId: string): void {
    const store = readStore();
    writeStore({
      ...store,
      invitations: store.invitations.map((item) =>
        item.id === invitationId
          ? { ...item, status: "revoked" as const }
          : item,
      ),
    });
  }

  async acceptInvitation(input: {
    token: string;
    userId: UserId;
  }): Promise<WorkspaceMembership> {
    const store = readStore();
    const invitation = store.invitations.find(
      (item) => item.token === input.token && item.status === "pending",
    );
    if (!invitation) throw new Error("Invitation not found");
    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      throw new Error("Invitation expired");
    }

    const membership: WorkspaceMembership = {
      id: asMembershipId(
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `mem_${crypto.randomUUID()}`
          : `mem_${Date.now().toString(36)}`,
      ),
      userId: input.userId,
      workspaceId: invitation.workspaceId,
      organizationId: invitation.organizationId,
      role: invitation.role,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await localOrganizationApi.upsertMembership(membership);

    writeStore({
      ...store,
      invitations: store.invitations.map((item) =>
        item.id === invitation.id
          ? {
              ...item,
              status: "accepted" as const,
              acceptedAt: new Date().toISOString(),
            }
          : item,
      ),
    });

    return membership;
  }

  async assignRole(input: {
    organizationId: OrganizationId;
    membershipId: string;
    role: MembershipRole;
    actorUserId: UserId;
  }): Promise<WorkspaceMembership> {
    if (input.role === "owner") {
      throw new Error("Use transferOwnership to grant owner");
    }
    const members = await localOrganizationApi.listMembershipsForOrganization(
      input.organizationId,
    );
    const existing = members.find((item) => item.id === input.membershipId);
    if (!existing) throw new Error("Membership not found");
    void input.actorUserId;
    return localOrganizationApi.upsertMembership({
      ...existing,
      role: input.role,
      updatedAt: new Date().toISOString(),
    });
  }

  async removeMember(input: {
    organizationId: OrganizationId;
    membershipId: string;
    actorUserId: UserId;
  }): Promise<void> {
    const members = await localOrganizationApi.listMembershipsForOrganization(
      input.organizationId,
    );
    const existing = members.find((item) => item.id === input.membershipId);
    if (!existing) throw new Error("Membership not found");
    if (existing.role === "owner") {
      throw new Error("Cannot remove the owner — transfer ownership first");
    }
    void input.actorUserId;
    await localOrganizationApi.revokeMembership(input.membershipId);
  }

  async transferOwnership(input: {
    organization: Organization;
    toUserId: UserId;
    actorUserId: UserId;
  }): Promise<Organization> {
    if (input.organization.ownerId !== input.actorUserId) {
      throw new Error("Only the current owner can transfer ownership");
    }
    if (input.toUserId === input.actorUserId) {
      throw new Error("Already the owner");
    }

    const members = await localOrganizationApi.listMembershipsForOrganization(
      input.organization.id,
    );
    const currentOwner = members.find(
      (item) => item.userId === input.actorUserId && item.role === "owner",
    );
    const nextOwner = members.find((item) => item.userId === input.toUserId);
    if (currentOwner) {
      await localOrganizationApi.upsertMembership({
        ...currentOwner,
        role: "admin",
        updatedAt: new Date().toISOString(),
      });
    }
    if (nextOwner) {
      await localOrganizationApi.upsertMembership({
        ...nextOwner,
        role: "owner",
        updatedAt: new Date().toISOString(),
      });
    }

    const updated = await localOrganizationApi.updateOrganization({
      organizationId: input.organization.id,
      patch: {},
    });

    const ownershipKey = "agxora.saas.ownership.v1";
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(ownershipKey);
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        map[input.organization.id] = input.toUserId;
        window.localStorage.setItem(ownershipKey, JSON.stringify(map));
      } catch {
        // ignore
      }
    }

    return {
      ...updated,
      ownerId: input.toUserId,
    };
  }
}

export const teamService = new TeamService();

export function resolveOrganizationOwnerId(
  organization: Organization,
): UserId {
  if (typeof window === "undefined") return organization.ownerId;
  try {
    const raw = window.localStorage.getItem("agxora.saas.ownership.v1");
    if (!raw) return organization.ownerId;
    const map = JSON.parse(raw) as Record<string, string>;
    return (map[organization.id] as UserId) ?? organization.ownerId;
  } catch {
    return organization.ownerId;
  }
}

export { asInvitationId };
