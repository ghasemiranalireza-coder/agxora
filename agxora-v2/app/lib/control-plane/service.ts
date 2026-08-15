/**
 * Phase 44 — Organization & Workspace Control Plane.
 * All mutations are server-side; client IDs/roles are never authority.
 */

import "server-only";

import { Prisma, type MembershipRole } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  assertCanGrantRole,
  assertCanManageTarget,
  assertControl,
  validationError,
} from "@/app/lib/tenancy/authorize";
import type { Actor } from "@/app/lib/tenancy/types";
import { switchActiveWorkspace } from "@/app/lib/auth/server/service";
import { createOpaqueToken, hashOpaqueToken } from "@/app/lib/auth/server/tokens";
import {
  buildInvitationEmail,
  buildOwnershipTransferEmail,
  deliverEmail,
  type EmailDeliveryStatus,
} from "@/app/lib/email";
import { recordControlAudit } from "./audit";
import type {
  InvitationPreview,
  InvitationView,
  MemberView,
  OrganizationView,
  OwnershipTransferPreview,
  OwnershipTransferView,
  WorkspaceView,
} from "./types";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Confirmation window for ownership transfer (48h). */
const OWNERSHIP_TRANSFER_TTL_MS = 48 * 60 * 60 * 1000;
const ROLES: readonly MembershipRole[] = ["OWNER", "ADMIN", "MEMBER"];

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace"
  );
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@") || !normalized.includes(".")) {
    validationError("A valid email is required", [
      { field: "email", message: "A valid email is required" },
    ]);
  }
  return normalized;
}

function parseRole(raw: unknown): MembershipRole {
  if (typeof raw !== "string" || !ROLES.includes(raw as MembershipRole)) {
    validationError("Invalid role");
  }
  return raw as MembershipRole;
}

function requireName(name: unknown, field: string): string {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    validationError(`${field} is required (1–80 characters)`, [
      { field, message: `${field} is required (1–80 characters)` },
    ]);
  }
  return name.trim();
}

function toOrgView(input: {
  org: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    owner: { name: string; email: string };
  };
  memberCount: number;
  workspaceCount: number;
  viewerRole: MembershipRole;
}): OrganizationView {
  return {
    id: input.org.id,
    name: input.org.name,
    slug: input.org.slug,
    ownerId: input.org.ownerId,
    ownerName: input.org.owner.name,
    ownerEmail: input.org.owner.email,
    memberCount: input.memberCount,
    workspaceCount: input.workspaceCount,
    viewerRole: input.viewerRole,
    createdAt: input.org.createdAt.toISOString(),
    updatedAt: input.org.updatedAt.toISOString(),
  };
}

function toWorkspaceView(
  workspace: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { memberships: number };
  },
  role: MembershipRole,
  activeWorkspaceId: string,
): WorkspaceView {
  return {
    id: workspace.id,
    organizationId: workspace.organizationId,
    name: workspace.name,
    slug: workspace.slug,
    archivedAt: workspace.archivedAt?.toISOString() ?? null,
    isActive: workspace.id === activeWorkspaceId,
    role,
    memberCount: workspace._count?.memberships ?? 0,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

function toMemberView(row: {
  id: string;
  userId: string;
  role: MembershipRole;
  status: string;
  createdAt: Date;
  user: { email: string; name: string };
}): MemberView {
  return {
    userId: row.userId,
    membershipId: row.id,
    email: row.user.email,
    name: row.user.name,
    role: row.role,
    status: row.status,
    joinedAt: row.createdAt.toISOString(),
  };
}

function toInvitationView(row: {
  id: string;
  workspaceId: string;
  organizationId: string;
  invitedEmail: string;
  role: MembershipRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  invitedById: string;
  createdAt: Date;
}): InvitationView {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    organizationId: row.organizationId,
    invitedEmail: row.invitedEmail,
    role: row.role,
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    invitedById: row.invitedById,
    createdAt: row.createdAt.toISOString(),
  };
}

function invitationStatus(row: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): InvitationPreview["status"] {
  if (row.acceptedAt) return "accepted";
  if (row.revokedAt) return "revoked";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "pending";
}

export async function getCurrentOrganization(actor: Actor): Promise<OrganizationView> {
  assertControl(actor, "organization.read", {
    organizationId: actor.organizationId,
  });

  const org = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
    include: { owner: true },
  });
  if (!org) throw new PersistenceError("not_found", "Organization not found");

  const [memberCount, workspaceCount] = await Promise.all([
    prisma.membership.count({
      where: { organizationId: org.id, status: "ACTIVE" },
    }),
    prisma.workspace.count({
      where: { organizationId: org.id, archivedAt: null },
    }),
  ]);

  return toOrgView({ org, memberCount, workspaceCount, viewerRole: actor.role });
}

export async function updateCurrentOrganization(
  actor: Actor,
  input: { readonly name?: unknown; readonly slug?: unknown },
): Promise<OrganizationView> {
  assertControl(actor, "organization.update", {
    organizationId: actor.organizationId,
  });

  const data: { name?: string; slug?: string } = {};
  if (input.name !== undefined) {
    data.name = requireName(input.name, "name");
  }
  if (input.slug !== undefined) {
    if (actor.role !== "OWNER") {
      throw new PersistenceError("forbidden", "Only OWNER can change the organization slug");
    }
    const slug = slugify(String(input.slug));
    if (!slug) validationError("Invalid slug");
    data.slug = slug;
  }
  if (!data.name && !data.slug) {
    validationError("No organization fields to update");
  }

  try {
    await prisma.organization.update({
      where: { id: actor.organizationId },
      data,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new PersistenceError("conflict", "Organization slug is already in use");
    }
    throw error;
  }

  await recordControlAudit({
    actor,
    action: "organization_updated",
    metadata: { fields: Object.keys(data).join(",") },
  });

  return getCurrentOrganization(actor);
}

export async function listWorkspacesForActor(actor: Actor): Promise<WorkspaceView[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId: actor.userId, status: "ACTIVE" },
    include: {
      workspace: { include: { _count: { select: { memberships: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships
    .filter((m) => !m.workspace.archivedAt)
    .map((m) => toWorkspaceView(m.workspace, m.role, actor.workspaceId));
}

export async function getWorkspaceForActor(
  actor: Actor,
  workspaceId: string,
): Promise<WorkspaceView> {
  assertControl(actor, "workspace.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  if (actor.workspaceId !== workspaceId) {
    throw new PersistenceError("forbidden", "No membership for requested workspace");
  }
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, archivedAt: null },
    include: { _count: { select: { memberships: true } } },
  });
  if (!workspace) throw new PersistenceError("not_found", "Workspace not found");
  return toWorkspaceView(workspace, actor.role, actor.workspaceId);
}

export async function createWorkspace(
  actor: Actor,
  input: { readonly name?: unknown },
): Promise<WorkspaceView> {
  assertControl(actor, "workspace.create", {
    organizationId: actor.organizationId,
  });
  const name = requireName(input.name, "name");
  const baseSlug = slugify(name);

  const workspace = await prisma.$transaction(async (tx) => {
    let slug = baseSlug;
    let n = 0;
    while (
      await tx.workspace.findFirst({
        where: { organizationId: actor.organizationId, slug },
      })
    ) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }

    const created = await tx.workspace.create({
      data: {
        organizationId: actor.organizationId,
        name,
        slug,
      },
    });

    await tx.membership.create({
      data: {
        userId: actor.userId,
        organizationId: actor.organizationId,
        workspaceId: created.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    return created;
  });

  await recordControlAudit({
    actor,
    action: "workspace_created",
    workspaceId: workspace.id,
    metadata: { name },
  });

  return {
    id: workspace.id,
    organizationId: workspace.organizationId,
    name: workspace.name,
    slug: workspace.slug,
    archivedAt: null,
    isActive: false,
    role: "OWNER",
    memberCount: 1,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export async function updateWorkspace(
  actor: Actor,
  input: { readonly name?: unknown },
): Promise<WorkspaceView> {
  assertControl(actor, "workspace.update", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const name = requireName(input.name, "name");
  const workspace = await prisma.workspace.update({
    where: { id: actor.workspaceId },
    data: { name },
    include: { _count: { select: { memberships: true } } },
  });
  await recordControlAudit({
    actor,
    action: "workspace_updated",
    metadata: { name },
  });
  return toWorkspaceView(workspace, actor.role, actor.workspaceId);
}

export async function archiveWorkspace(actor: Actor): Promise<WorkspaceView> {
  assertControl(actor, "workspace.archive", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });

  const activeCount = await prisma.workspace.count({
    where: { organizationId: actor.organizationId, archivedAt: null },
  });
  if (activeCount <= 1) {
    throw new PersistenceError("conflict", "Cannot archive the last active workspace");
  }

  const workspace = await prisma.workspace.update({
    where: { id: actor.workspaceId },
    data: { archivedAt: new Date() },
    include: { _count: { select: { memberships: true } } },
  });

  await recordControlAudit({
    actor,
    action: "workspace_archived",
  });

  return toWorkspaceView(workspace, actor.role, actor.workspaceId);
}

export async function switchWorkspaceForActor(
  actor: Actor,
  workspaceId: string,
): Promise<{ organizationId: string; workspaceId: string; role: string }> {
  const result = await switchActiveWorkspace(actor.sessionToken, workspaceId);
  await recordControlAudit({
    actor,
    action: "workspace_switched",
    workspaceId: result.workspaceId,
  });
  return result;
}

export async function listMembers(actor: Actor): Promise<MemberView[]> {
  assertControl(actor, "member.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const rows = await prisma.membership.findMany({
    where: { workspaceId: actor.workspaceId, status: "ACTIVE" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMemberView);
}

export async function changeMemberRole(
  actor: Actor,
  targetUserId: string,
  rawRole: unknown,
): Promise<MemberView> {
  if (targetUserId === actor.userId) {
    throw new PersistenceError("forbidden", "Cannot change your own role");
  }
  const nextRole = parseRole(rawRole);
  const target = await prisma.membership.findFirst({
    where: {
      workspaceId: actor.workspaceId,
      userId: targetUserId,
      status: "ACTIVE",
    },
    include: { user: true },
  });
  if (!target) throw new PersistenceError("not_found", "Member not found");

  assertControl(actor, "member.role.change", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  assertCanManageTarget(actor, target.role, "member.role.change");
  assertCanGrantRole(actor, nextRole);

  const updated = await prisma.membership.update({
    where: { id: target.id },
    data: { role: nextRole },
    include: { user: true },
  });

  await recordControlAudit({
    actor,
    action: "member_role_changed",
    targetUserId,
    metadata: { from: target.role, to: nextRole },
  });

  return toMemberView(updated);
}

export async function removeMember(actor: Actor, targetUserId: string): Promise<void> {
  if (targetUserId === actor.userId) {
    throw new PersistenceError("forbidden", "Cannot remove yourself");
  }
  const target = await prisma.membership.findFirst({
    where: {
      workspaceId: actor.workspaceId,
      userId: targetUserId,
      status: "ACTIVE",
    },
  });
  if (!target) throw new PersistenceError("not_found", "Member not found");

  assertControl(actor, "member.remove", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  assertCanManageTarget(actor, target.role, "member.remove");

  await prisma.membership.update({
    where: { id: target.id },
    data: { status: "REVOKED" },
  });

  await recordControlAudit({
    actor,
    action: "member_removed",
    targetUserId,
    metadata: { role: target.role },
  });
}

export async function listInvitations(actor: Actor): Promise<InvitationView[]> {
  assertControl(actor, "invitation.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const rows = await prisma.invitation.findMany({
    where: { workspaceId: actor.workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toInvitationView);
}

export async function createInvitation(
  actor: Actor,
  input: { readonly email?: unknown; readonly role?: unknown },
): Promise<{
  invitation: InvitationView;
  token: string;
  delivery: EmailDeliveryStatus;
}> {
  assertControl(actor, "member.invite", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const email = normalizeEmail(String(input.email ?? ""));
  const role = parseRole(input.role ?? "MEMBER");
  assertCanGrantRole(actor, role);

  const existingMember = await prisma.membership.findFirst({
    where: {
      workspaceId: actor.workspaceId,
      status: "ACTIVE",
      user: { email },
    },
  });
  if (existingMember) {
    throw new PersistenceError("conflict", "User is already a member of this workspace");
  }

  const pending = await prisma.invitation.findFirst({
    where: {
      workspaceId: actor.workspaceId,
      invitedEmail: email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) {
    throw new PersistenceError("conflict", "A pending invitation already exists for this email");
  }

  const [workspace, organization, inviter] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: actor.workspaceId } }),
    prisma.organization.findUnique({ where: { id: actor.organizationId } }),
    prisma.user.findUnique({ where: { id: actor.userId } }),
  ]);
  if (!workspace || !organization) {
    throw new PersistenceError("not_found", "Workspace or organization not found");
  }

  const rawToken = createOpaqueToken(32);
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      invitedEmail: email,
      role,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedById: actor.userId,
    },
  });

  await recordControlAudit({
    actor,
    action: "member_invited",
    invitationId: invitation.id,
    metadata: { email, role },
  });

  const { delivery } = await deliverEmail(
    buildInvitationEmail({
      to: email,
      organizationName: organization.name,
      workspaceName: workspace.name,
      role,
      rawToken,
      inviterName: inviter?.name,
    }),
  );

  return {
    invitation: toInvitationView(invitation),
    token: rawToken,
    delivery,
  };
}

export async function revokeInvitation(actor: Actor, invitationId: string): Promise<InvitationView> {
  assertControl(actor, "invitation.revoke", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, workspaceId: actor.workspaceId },
  });
  if (!invitation) throw new PersistenceError("not_found", "Invitation not found");
  if (invitation.acceptedAt) {
    throw new PersistenceError("conflict", "Invitation already accepted");
  }
  if (invitation.revokedAt) {
    throw new PersistenceError("conflict", "Invitation already revoked");
  }
  if (actor.role === "ADMIN" && invitation.role !== "MEMBER") {
    throw new PersistenceError("forbidden", "ADMIN can only revoke MEMBER invitations");
  }

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: { revokedAt: new Date() },
  });

  await recordControlAudit({
    actor,
    action: "invitation_revoked",
    invitationId: invitation.id,
    metadata: { email: invitation.invitedEmail },
  });

  return toInvitationView(updated);
}

async function loadInvitationByRawToken(rawToken: string) {
  const token = rawToken.trim();
  if (!token) validationError("Invitation token is required");
  return prisma.invitation.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { workspace: true, organization: true },
  });
}

export async function previewInvitation(rawToken: string): Promise<InvitationPreview> {
  const invitation = await loadInvitationByRawToken(rawToken);
  if (!invitation) throw new PersistenceError("not_found", "Invitation not found");
  return {
    invitedEmail: invitation.invitedEmail,
    role: invitation.role,
    workspaceName: invitation.workspace.name,
    organizationName: invitation.organization.name,
    expiresAt: invitation.expiresAt.toISOString(),
    status: invitationStatus(invitation),
  };
}

export async function acceptInvitation(
  actor: Actor,
  rawToken: string,
): Promise<{ workspaceId: string; organizationId: string; role: MembershipRole }> {
  const invitation = await loadInvitationByRawToken(rawToken);
  if (!invitation) throw new PersistenceError("not_found", "Invitation not found");

  const status = invitationStatus(invitation);
  if (status === "expired") {
    throw new PersistenceError("forbidden", "Invitation has expired");
  }
  if (status === "revoked") {
    throw new PersistenceError("forbidden", "Invitation has been revoked");
  }
  if (status === "accepted") {
    throw new PersistenceError("conflict", "Invitation has already been accepted");
  }
  if (invitation.workspace.archivedAt) {
    throw new PersistenceError("forbidden", "Workspace is archived");
  }
  if (actor.email.trim().toLowerCase() !== invitation.invitedEmail) {
    throw new PersistenceError(
      "forbidden",
      "Invitation email does not match the authenticated account",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.invitation.findUnique({ where: { id: invitation.id } });
    if (!locked || locked.acceptedAt || locked.revokedAt) {
      throw new PersistenceError("conflict", "Invitation has already been accepted");
    }
    if (locked.expiresAt.getTime() <= Date.now()) {
      throw new PersistenceError("forbidden", "Invitation has expired");
    }

    const existing = await tx.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: actor.userId,
          workspaceId: invitation.workspaceId,
        },
      },
    });
    if (existing && existing.status === "ACTIVE") {
      throw new PersistenceError("conflict", "User is already a member of this workspace");
    }

    if (existing) {
      await tx.membership.update({
        where: { id: existing.id },
        data: {
          role: invitation.role,
          status: "ACTIVE",
          organizationId: invitation.organizationId,
        },
      });
    } else {
      await tx.membership.create({
        data: {
          userId: actor.userId,
          organizationId: invitation.organizationId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
          status: "ACTIVE",
        },
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      workspaceId: invitation.workspaceId,
      organizationId: invitation.organizationId,
      role: invitation.role,
    };
  });

  await recordControlAudit({
    actor: {
      ...actor,
      organizationId: result.organizationId,
      workspaceId: result.workspaceId,
    },
    action: "invitation_accepted",
    workspaceId: result.workspaceId,
    invitationId: invitation.id,
    metadata: { role: result.role },
  });

  await switchActiveWorkspace(actor.sessionToken, result.workspaceId).catch(() => undefined);

  return result;
}

export async function listControlAudit(
  actor: Actor,
): Promise<
  readonly {
    readonly id: string;
    readonly action: string;
    readonly actorUserId: string;
    readonly targetUserId: string | null;
    readonly createdAt: string;
  }[]
> {
  assertControl(actor, "member.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });
  const rows = await prisma.controlPlaneAuditEvent.findMany({
    where: { workspaceId: actor.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorUserId: row.actorUserId,
    targetUserId: row.targetUserId,
    createdAt: row.createdAt.toISOString(),
  }));
}

function ownershipTransferStatus(row: {
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  expiresAt: Date;
}): OwnershipTransferView["status"] {
  if (row.confirmedAt) return "confirmed";
  if (row.cancelledAt) return "cancelled";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "pending";
}

function toOwnershipTransferView(row: {
  id: string;
  organizationId: string;
  workspaceId: string;
  fromUserId: string;
  toUserId: string;
  expiresAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  fromUser: { name: string; email: string };
  toUser: { name: string; email: string };
}): OwnershipTransferView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    fromUserId: row.fromUserId,
    fromUserName: row.fromUser.name,
    fromUserEmail: row.fromUser.email,
    toUserId: row.toUserId,
    toUserName: row.toUser.name,
    toUserEmail: row.toUser.email,
    expiresAt: row.expiresAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    status: ownershipTransferStatus(row),
  };
}

/**
 * Phase 45-B — initiate controlled ownership transfer.
 * Does NOT change Organization.ownerId or membership roles until confirmation.
 */
export async function initiateOwnershipTransfer(
  actor: Actor,
  input: { readonly targetUserId?: unknown },
): Promise<{
  transfer: OwnershipTransferView;
  token: string;
  delivery: EmailDeliveryStatus;
}> {
  assertControl(actor, "ownership.transfer.initiate", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });

  if (actor.role !== "OWNER") {
    throw new PersistenceError("forbidden", "Only OWNER can initiate ownership transfer");
  }

  const targetUserId =
    typeof input.targetUserId === "string" ? input.targetUserId.trim() : "";
  if (!targetUserId) {
    validationError("targetUserId is required", [
      { field: "targetUserId", message: "targetUserId is required" },
    ]);
  }
  if (targetUserId === actor.userId) {
    throw new PersistenceError("forbidden", "Cannot transfer ownership to yourself");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
  });
  if (!organization) {
    throw new PersistenceError("not_found", "Organization not found");
  }
  if (organization.ownerId !== actor.userId) {
    throw new PersistenceError(
      "forbidden",
      "Only the organization owner can initiate ownership transfer",
    );
  }

  const targetMembership = await prisma.membership.findFirst({
    where: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      userId: targetUserId,
      status: "ACTIVE",
    },
    include: { user: true },
  });
  if (!targetMembership) {
    throw new PersistenceError(
      "validation",
      "Target must be an active member of this workspace",
      { status: 422 },
    );
  }
  if (targetMembership.role === "OWNER") {
    throw new PersistenceError("conflict", "Target is already the workspace OWNER");
  }

  const pending = await prisma.ownershipTransfer.findFirst({
    where: {
      organizationId: actor.organizationId,
      confirmedAt: null,
      cancelledAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) {
    throw new PersistenceError(
      "conflict",
      "A pending ownership transfer already exists for this organization",
    );
  }

  const [workspace, fromUser] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: actor.workspaceId } }),
    prisma.user.findUnique({ where: { id: actor.userId } }),
  ]);
  if (!workspace || !fromUser) {
    throw new PersistenceError("not_found", "Workspace or owner not found");
  }

  const rawToken = createOpaqueToken(32);
  const transfer = await prisma.ownershipTransfer.create({
    data: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      fromUserId: actor.userId,
      toUserId: targetUserId,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(Date.now() + OWNERSHIP_TRANSFER_TTL_MS),
    },
    include: { fromUser: true, toUser: true },
  });

  await recordControlAudit({
    actor,
    action: "ownership_transfer_initiated",
    workspaceId: actor.workspaceId,
    targetUserId,
    metadata: {
      transferId: transfer.id,
      toEmail: targetMembership.user.email,
      previousRole: targetMembership.role,
    },
  });

  const { delivery } = await deliverEmail(
    buildOwnershipTransferEmail({
      to: targetMembership.user.email,
      organizationName: organization.name,
      workspaceName: workspace.name,
      fromUserName: fromUser.name,
      rawToken,
    }),
  );

  return {
    transfer: toOwnershipTransferView(transfer),
    token: rawToken,
    delivery,
  };
}

export async function getPendingOwnershipTransfer(
  actor: Actor,
): Promise<OwnershipTransferView | null> {
  assertControl(actor, "ownership.transfer.read", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });

  const row = await prisma.ownershipTransfer.findFirst({
    where: {
      organizationId: actor.organizationId,
      confirmedAt: null,
      cancelledAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { fromUser: true, toUser: true },
    orderBy: { createdAt: "desc" },
  });
  return row ? toOwnershipTransferView(row) : null;
}

export async function cancelOwnershipTransfer(
  actor: Actor,
  transferId?: string,
): Promise<OwnershipTransferView> {
  assertControl(actor, "ownership.transfer.cancel", {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
  });

  const row = await prisma.ownershipTransfer.findFirst({
    where: {
      organizationId: actor.organizationId,
      ...(transferId ? { id: transferId } : {}),
      confirmedAt: null,
      cancelledAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { fromUser: true, toUser: true },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    throw new PersistenceError("not_found", "No pending ownership transfer found");
  }
  if (row.fromUserId !== actor.userId) {
    throw new PersistenceError("forbidden", "Only the initiating owner can cancel");
  }

  const updated = await prisma.ownershipTransfer.update({
    where: { id: row.id },
    data: { cancelledAt: new Date() },
    include: { fromUser: true, toUser: true },
  });

  await recordControlAudit({
    actor,
    action: "ownership_transfer_cancelled",
    workspaceId: row.workspaceId,
    targetUserId: row.toUserId,
    metadata: { transferId: row.id },
  });

  return toOwnershipTransferView(updated);
}

async function loadOwnershipTransferByRawToken(rawToken: string) {
  if (!rawToken || rawToken.length < 16) return null;
  return prisma.ownershipTransfer.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
    include: {
      fromUser: true,
      toUser: true,
      organization: true,
      workspace: true,
    },
  });
}

export async function previewOwnershipTransfer(
  rawToken: string,
): Promise<OwnershipTransferPreview> {
  const transfer = await loadOwnershipTransferByRawToken(rawToken);
  if (!transfer) {
    throw new PersistenceError("not_found", "Ownership transfer not found");
  }
  return {
    organizationName: transfer.organization.name,
    workspaceName: transfer.workspace.name,
    fromUserName: transfer.fromUser.name,
    fromUserEmail: transfer.fromUser.email,
    toUserName: transfer.toUser.name,
    toUserEmail: transfer.toUser.email,
    expiresAt: transfer.expiresAt.toISOString(),
    status: ownershipTransferStatus(transfer),
  };
}

/**
 * Confirm ownership transfer atomically.
 * Caller must be authenticated as the transfer target.
 */
export async function confirmOwnershipTransfer(
  actor: Actor,
  rawToken: string,
): Promise<{
  organizationId: string;
  workspaceId: string;
  previousOwnerId: string;
  newOwnerId: string;
}> {
  const transfer = await loadOwnershipTransferByRawToken(rawToken);
  if (!transfer) {
    throw new PersistenceError("not_found", "Ownership transfer not found");
  }

  const status = ownershipTransferStatus(transfer);
  if (status === "expired") {
    throw new PersistenceError("forbidden", "Ownership transfer has expired");
  }
  if (status === "cancelled") {
    throw new PersistenceError("forbidden", "Ownership transfer was cancelled");
  }
  if (status === "confirmed") {
    throw new PersistenceError("conflict", "Ownership transfer has already been confirmed");
  }
  if (actor.userId !== transfer.toUserId) {
    throw new PersistenceError(
      "forbidden",
      "Only the designated recipient can confirm this ownership transfer",
    );
  }
  if (actor.email.trim().toLowerCase() !== transfer.toUser.email.trim().toLowerCase()) {
    throw new PersistenceError(
      "forbidden",
      "Authenticated account does not match the transfer recipient",
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.ownershipTransfer.findUnique({
        where: { id: transfer.id },
      });
      if (!locked || locked.confirmedAt || locked.cancelledAt) {
        throw new PersistenceError(
          "conflict",
          "Ownership transfer has already been confirmed",
        );
      }
      if (locked.expiresAt.getTime() <= Date.now()) {
        throw new PersistenceError("forbidden", "Ownership transfer has expired");
      }

      const org = await tx.organization.findUnique({
        where: { id: locked.organizationId },
      });
      if (!org) {
        throw new PersistenceError("not_found", "Organization not found");
      }
      if (org.ownerId !== locked.fromUserId) {
        throw new PersistenceError(
          "conflict",
          "Organization owner changed since the transfer was initiated",
        );
      }

      const fromMembership = await tx.membership.findFirst({
        where: {
          userId: locked.fromUserId,
          workspaceId: locked.workspaceId,
          status: "ACTIVE",
          role: "OWNER",
        },
      });
      const toMembership = await tx.membership.findFirst({
        where: {
          userId: locked.toUserId,
          workspaceId: locked.workspaceId,
          organizationId: locked.organizationId,
          status: "ACTIVE",
        },
      });
      if (!fromMembership || !toMembership) {
        throw new PersistenceError(
          "conflict",
          "Membership state is no longer valid for this transfer",
        );
      }
      if (toMembership.role === "OWNER") {
        throw new PersistenceError("conflict", "Target is already the workspace OWNER");
      }

      await tx.organization.update({
        where: { id: locked.organizationId },
        data: { ownerId: locked.toUserId },
      });
      await tx.membership.update({
        where: { id: fromMembership.id },
        data: { role: "ADMIN" },
      });
      await tx.membership.update({
        where: { id: toMembership.id },
        data: { role: "OWNER" },
      });
      await tx.ownershipTransfer.update({
        where: { id: locked.id },
        data: { confirmedAt: new Date() },
      });

      return {
        organizationId: locked.organizationId,
        workspaceId: locked.workspaceId,
        previousOwnerId: locked.fromUserId,
        newOwnerId: locked.toUserId,
      };
    });

    await recordControlAudit({
      actor: {
        ...actor,
        organizationId: result.organizationId,
        workspaceId: result.workspaceId,
        role: "OWNER",
      },
      action: "ownership_transfer_completed",
      workspaceId: result.workspaceId,
      targetUserId: result.previousOwnerId,
      metadata: {
        transferId: transfer.id,
        previousOwnerId: result.previousOwnerId,
        newOwnerId: result.newOwnerId,
        previousOwnerNewRole: "ADMIN",
      },
    });

    return result;
  } catch (error) {
    if (error instanceof PersistenceError) {
      await recordControlAudit({
        actor,
        action: "ownership_transfer_failed",
        workspaceId: transfer.workspaceId,
        targetUserId: transfer.toUserId,
        metadata: {
          transferId: transfer.id,
          reason: error.message.slice(0, 120),
        },
      }).catch(() => undefined);
    }
    throw error;
  }
}
