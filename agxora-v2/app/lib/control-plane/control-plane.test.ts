/**
 * Phase 44 — Organization & Workspace Control Plane security tests.
 * Uses dedicated agxora_test database (see .env.test).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken, getActorForWorkspace } from "@/app/lib/tenancy/actor";
import { canControl } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { hashOpaqueToken } from "@/app/lib/auth/server/tokens";
import { registerWithPassword } from "@/app/lib/auth/server/service";
import {
  forceMemoryEmailFailure,
  listMemoryEmailOutbox,
  memoryEmailProvider,
  noneEmailProvider,
  resetMemoryEmailOutbox,
  setEmailProviderForTests,
} from "@/app/lib/email";
import { GET as getCurrentOrganizationRoute } from "@/app/api/v1/organizations/current/route";
import { GET as listWorkspacesRoute } from "@/app/api/v1/workspaces/route";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  acceptInvitation,
  archiveWorkspace,
  cancelOwnershipTransfer,
  changeMemberRole,
  confirmOwnershipTransfer,
  createInvitation,
  createWorkspace,
  getCurrentOrganization,
  getPendingOwnershipTransfer,
  getWorkspaceForActor,
  initiateOwnershipTransfer,
  listInvitations,
  listMembers,
  listWorkspacesForActor,
  previewInvitation,
  previewOwnershipTransfer,
  removeMember,
  revokeInvitation,
  switchWorkspaceForActor,
  updateCurrentOrganization,
  updateWorkspace,
} from "./service";

const prisma = new PrismaClient();

const TOKEN_OWNER_A = "cp_token_owner_a";
const TOKEN_ADMIN_A = "cp_token_admin_a";
const TOKEN_MEMBER_A = "cp_token_member_a";
const TOKEN_OWNER_B = "cp_token_owner_b";

async function wipe(): Promise<void> {
  await prisma.customer.deleteMany();
  await prisma.controlPlaneAuditEvent.deleteMany();
  await prisma.ownershipTransfer.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
}

async function seed(): Promise<{
  ownerAId: string;
  adminAId: string;
  memberAId: string;
  ownerBId: string;
  orgAId: string;
  orgBId: string;
  wsAId: string;
  wsBId: string;
}> {
  const ownerA = await prisma.user.create({
    data: { email: "owner-a@cp.test", name: "Owner A", emailVerified: true },
  });
  const adminA = await prisma.user.create({
    data: { email: "admin-a@cp.test", name: "Admin A", emailVerified: true },
  });
  const memberA = await prisma.user.create({
    data: { email: "member-a@cp.test", name: "Member A", emailVerified: true },
  });
  const ownerB = await prisma.user.create({
    data: { email: "owner-b@cp.test", name: "Owner B", emailVerified: true },
  });

  const orgA = await prisma.organization.create({
    data: {
      name: "Org A",
      slug: "org-a-cp",
      ownerId: ownerA.id,
      workspaces: { create: { name: "Alpha", slug: "alpha" } },
    },
    include: { workspaces: true },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "Org B",
      slug: "org-b-cp",
      ownerId: ownerB.id,
      workspaces: { create: { name: "Beta", slug: "beta" } },
    },
    include: { workspaces: true },
  });

  const wsA = orgA.workspaces[0];
  const wsB = orgB.workspaces[0];

  await prisma.membership.createMany({
    data: [
      {
        userId: ownerA.id,
        organizationId: orgA.id,
        workspaceId: wsA.id,
        role: "OWNER",
      },
      {
        userId: adminA.id,
        organizationId: orgA.id,
        workspaceId: wsA.id,
        role: "ADMIN",
      },
      {
        userId: memberA.id,
        organizationId: orgA.id,
        workspaceId: wsA.id,
        role: "MEMBER",
      },
      {
        userId: ownerB.id,
        organizationId: orgB.id,
        workspaceId: wsB.id,
        role: "OWNER",
      },
    ],
  });

  const expiresAt = new Date(Date.now() + 86_400_000);
  await prisma.session.createMany({
    data: [
      { userId: ownerA.id, token: TOKEN_OWNER_A, expiresAt, activeWorkspaceId: wsA.id },
      { userId: adminA.id, token: TOKEN_ADMIN_A, expiresAt, activeWorkspaceId: wsA.id },
      { userId: memberA.id, token: TOKEN_MEMBER_A, expiresAt, activeWorkspaceId: wsA.id },
      { userId: ownerB.id, token: TOKEN_OWNER_B, expiresAt, activeWorkspaceId: wsB.id },
    ],
  });

  return {
    ownerAId: ownerA.id,
    adminAId: adminA.id,
    memberAId: memberA.id,
    ownerBId: ownerB.id,
    orgAId: orgA.id,
    orgBId: orgB.id,
    wsAId: wsA.id,
    wsBId: wsB.id,
  };
}

async function actor(token: string): Promise<Actor> {
  const resolved = await getActorBySessionToken(token);
  if (!resolved) throw new Error(`Missing actor for ${token}`);
  return resolved;
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  setEmailProviderForTests(null);
  resetMemoryEmailOutbox();
  await wipe();
  await seed();
});

afterAll(async () => {
  setEmailProviderForTests(null);
  resetMemoryEmailOutbox();
  await wipe();
  await prisma.$disconnect();
});

describe("Phase 44 auth gate", () => {
  it("unauthenticated API access returns 401", async () => {
    const orgRes = await getCurrentOrganizationRoute();
    expect(orgRes.status).toBe(401);
    const orgBody = (await orgRes.json()) as { code: string };
    expect(orgBody.code).toBe("unauthorized");

    const wsRes = await listWorkspacesRoute();
    expect(wsRes.status).toBe(401);

    const mapped = jsonError(new PersistenceError("unauthorized", "Authentication required"));
    expect(mapped.status).toBe(401);
  });

  it("rejects unknown session tokens", async () => {
    await expect(getActorBySessionToken("missing_token")).resolves.toBeNull();
  });
});

describe("Phase 44 authorization policy", () => {
  it("centralizes OWNER / ADMIN / MEMBER control-plane permissions", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    const member = await actor(TOKEN_MEMBER_A);

    expect(canControl(owner, "workspace.create")).toBe(true);
    expect(canControl(owner, "workspace.archive")).toBe(true);
    expect(canControl(owner, "ownership.transfer.initiate")).toBe(true);
    expect(canControl(admin, "organization.update")).toBe(true);
    expect(canControl(admin, "workspace.create")).toBe(false);
    expect(canControl(admin, "workspace.archive")).toBe(false);
    expect(canControl(admin, "ownership.transfer.initiate")).toBe(false);
    expect(canControl(member, "organization.update")).toBe(false);
    expect(canControl(member, "member.invite")).toBe(false);
    expect(canControl(member, "member.remove")).toBe(false);
    expect(canControl(member, "workspace.switch")).toBe(true);
    expect(canControl(member, "ownership.transfer.initiate")).toBe(false);
  });
});

describe("Phase 44 organization", () => {
  it("reads current organization with owner, member, and workspace counts", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const org = await getCurrentOrganization(owner);
    expect(org.name).toBe("Org A");
    expect(org.slug).toBe("org-a-cp");
    expect(org.ownerEmail).toBe("owner-a@cp.test");
    expect(org.memberCount).toBe(3);
    expect(org.workspaceCount).toBe(1);
    expect(org.viewerRole).toBe("OWNER");
  });

  it("lets ADMIN update organization name but not slug", async () => {
    const admin = await actor(TOKEN_ADMIN_A);
    const updated = await updateCurrentOrganization(admin, { name: "Org A Prime" });
    expect(updated.name).toBe("Org A Prime");
    await expect(
      updateCurrentOrganization(admin, { slug: "hijacked" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("lets OWNER update slug and ignores forged organizationId / ownerId", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const updated = await updateCurrentOrganization(owner, {
      name: "Alpha Org",
      slug: "alpha-org",
      organizationId: "00000000-0000-4000-8000-000000000099",
      ownerId: "00000000-0000-4000-8000-000000000098",
    } as { name: string; slug: string });
    expect(updated.slug).toBe("alpha-org");
    expect(updated.id).toBe(owner.organizationId);
    expect(updated.ownerId).toBe(owner.userId);
  });

  it("blocks MEMBER from updating organization", async () => {
    const member = await actor(TOKEN_MEMBER_A);
    await expect(
      updateCurrentOrganization(member, { name: "Hacked" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("Phase 44 workspaces", () => {
  it("lists only workspaces the actor belongs to", async () => {
    const ownerA = await actor(TOKEN_OWNER_A);
    const ownerB = await actor(TOKEN_OWNER_B);
    const listA = await listWorkspacesForActor(ownerA);
    const listB = await listWorkspacesForActor(ownerB);
    expect(listA.map((w) => w.id)).toEqual([ownerA.workspaceId]);
    expect(listB.map((w) => w.id)).toEqual([ownerB.workspaceId]);
    expect(listA[0]?.id).not.toBe(listB[0]?.id);
  });

  it("lets MEMBER list own workspace and forbids another workspace", async () => {
    const member = await actor(TOKEN_MEMBER_A);
    const ownerB = await actor(TOKEN_OWNER_B);
    const own = await getWorkspaceForActor(member, member.workspaceId);
    expect(own.id).toBe(member.workspaceId);
    await expect(getWorkspaceForActor(member, ownerB.workspaceId)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(getActorForWorkspace(TOKEN_MEMBER_A, ownerB.workspaceId)).resolves.toBeNull();
  });

  it("lets OWNER create a workspace and becomes OWNER of it", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const created = await createWorkspace(owner, { name: "Studio" });
    expect(created.role).toBe("OWNER");
    expect(created.organizationId).toBe(owner.organizationId);
    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: owner.userId, workspaceId: created.id } },
    });
    expect(membership?.role).toBe("OWNER");
  });

  it("blocks ADMIN and MEMBER from creating workspaces", async () => {
    const admin = await actor(TOKEN_ADMIN_A);
    const member = await actor(TOKEN_MEMBER_A);
    await expect(createWorkspace(admin, { name: "Nope" })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(createWorkspace(member, { name: "Nope" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("lets OWNER/ADMIN rename and blocks MEMBER", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    const member = await actor(TOKEN_MEMBER_A);
    expect((await updateWorkspace(owner, { name: "Alpha Renamed" })).name).toBe("Alpha Renamed");
    expect((await updateWorkspace(admin, { name: "Alpha Admin" })).name).toBe("Alpha Admin");
    await expect(updateWorkspace(member, { name: "Hacked" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("archives a workspace and blocks switching into it", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const second = await createWorkspace(owner, { name: "Second" });
    const archived = await archiveWorkspace(owner);
    expect(archived.archivedAt).toBeTruthy();
    await expect(switchWorkspaceForActor(owner, owner.workspaceId)).rejects.toMatchObject({
      code: "forbidden",
    });
    const switched = await switchWorkspaceForActor(owner, second.id);
    expect(switched.workspaceId).toBe(second.id);
  });

  it("cannot archive the last active workspace", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    await expect(archiveWorkspace(owner)).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects forged workspace switching across tenants", async () => {
    const ownerA = await actor(TOKEN_OWNER_A);
    const ownerB = await actor(TOKEN_OWNER_B);
    await expect(switchWorkspaceForActor(ownerA, ownerB.workspaceId)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("Phase 44 members", () => {
  it("lists members of the actor workspace only", async () => {
    const ownerA = await actor(TOKEN_OWNER_A);
    const ownerB = await actor(TOKEN_OWNER_B);
    const membersA = await listMembers(ownerA);
    const membersB = await listMembers(ownerB);
    expect(membersA.map((m) => m.email).sort()).toEqual([
      "admin-a@cp.test",
      "member-a@cp.test",
      "owner-a@cp.test",
    ]);
    expect(membersB.map((m) => m.email)).toEqual(["owner-b@cp.test"]);
  });

  it("lets OWNER remove MEMBER and ADMIN remove MEMBER", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    const extra = await prisma.user.create({
      data: { email: "extra@cp.test", name: "Extra", emailVerified: true },
    });
    await prisma.membership.create({
      data: {
        userId: extra.id,
        organizationId: owner.organizationId,
        workspaceId: owner.workspaceId,
        role: "MEMBER",
      },
    });
    await removeMember(owner, extra.id);
    const afterOwner = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: extra.id, workspaceId: owner.workspaceId } },
    });
    expect(afterOwner?.status).toBe("REVOKED");

    await prisma.membership.update({
      where: { id: afterOwner!.id },
      data: { status: "ACTIVE" },
    });
    await removeMember(admin, extra.id);
    const afterAdmin = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: extra.id, workspaceId: owner.workspaceId } },
    });
    expect(afterAdmin?.status).toBe("REVOKED");
  });

  it("blocks ADMIN from modifying OWNER", async () => {
    const admin = await actor(TOKEN_ADMIN_A);
    const owner = await actor(TOKEN_OWNER_A);
    await expect(removeMember(admin, owner.userId)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(changeMemberRole(admin, owner.userId, "MEMBER")).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("blocks MEMBER from managing members", async () => {
    const member = await actor(TOKEN_MEMBER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    await expect(removeMember(member, admin.userId)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(changeMemberRole(member, admin.userId, "MEMBER")).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("rejects forged role=OWNER from MEMBER and ADMIN", async () => {
    const member = await actor(TOKEN_MEMBER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    await expect(changeMemberRole(member, admin.userId, "OWNER")).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(changeMemberRole(admin, member.userId, "OWNER")).rejects.toMatchObject({
      code: "forbidden",
    });
    const stillMember = await prisma.membership.findFirst({
      where: { userId: member.userId, workspaceId: member.workspaceId },
    });
    expect(stillMember?.role).toBe("MEMBER");
  });

  it("prevents OWNER from removing themselves", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    await expect(removeMember(owner, owner.userId)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("Phase 44 invitations", () => {
  it("lets OWNER invite ADMIN/MEMBER and hashes the token", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const { invitation, token } = await createInvitation(owner, {
      email: "new@cp.test",
      role: "MEMBER",
      organizationId: "forged-org",
      workspaceId: "forged-ws",
      invitedBy: "forged-user",
    } as { email: string; role: string });

    expect(invitation.organizationId).toBe(owner.organizationId);
    expect(invitation.workspaceId).toBe(owner.workspaceId);
    expect(invitation.invitedById).toBe(owner.userId);
    expect(token.length).toBeGreaterThan(20);

    const stored = await prisma.invitation.findUnique({ where: { id: invitation.id } });
    expect(stored?.tokenHash).toBe(hashOpaqueToken(token));
    expect(stored?.tokenHash).not.toBe(token);
    expect(JSON.stringify(stored)).not.toContain(token);

    const audit = await prisma.controlPlaneAuditEvent.findFirst({
      where: { action: "member_invited", invitationId: invitation.id },
    });
    expect(audit).toBeTruthy();
    expect(JSON.stringify(audit)).not.toContain(token);
  });

  it("lets ADMIN invite MEMBER but not OWNER or ADMIN", async () => {
    const admin = await actor(TOKEN_ADMIN_A);
    const invited = await createInvitation(admin, {
      email: "peer@cp.test",
      role: "MEMBER",
    });
    expect(invited.invitation.role).toBe("MEMBER");
    await expect(createInvitation(admin, { email: "boss@cp.test", role: "OWNER" })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(createInvitation(admin, { email: "peer-admin@cp.test", role: "ADMIN" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("blocks MEMBER from inviting", async () => {
    const member = await actor(TOKEN_MEMBER_A);
    await expect(
      createInvitation(member, { email: "x@cp.test", role: "MEMBER" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(listInvitations(member)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects expired, revoked, and reused invitations", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const { token, invitation } = await createInvitation(owner, {
      email: "expire@cp.test",
      role: "MEMBER",
    });

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const preview = await previewInvitation(token);
    expect(preview.status).toBe("expired");

    const invitee = await registerWithPassword({
      email: "expire@cp.test",
      password: "SecurePass1!",
      displayName: "Expire User",
    });
    const inviteeActor = await actor(invitee.rawSessionToken);
    await expect(acceptInvitation(inviteeActor, token)).rejects.toMatchObject({
      code: "forbidden",
    });

    const second = await createInvitation(owner, {
      email: "revoke@cp.test",
      role: "MEMBER",
    });
    await revokeInvitation(owner, second.invitation.id);
    const revokedPreview = await previewInvitation(second.token);
    expect(revokedPreview.status).toBe("revoked");
    const revokeUser = await registerWithPassword({
      email: "revoke@cp.test",
      password: "SecurePass1!",
      displayName: "Revoke User",
    });
    await expect(acceptInvitation(await actor(revokeUser.rawSessionToken), second.token)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("rejects wrong authenticated email and does not attach membership", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const { token } = await createInvitation(owner, {
      email: "invitee@cp.test",
      role: "MEMBER",
    });
    await expect(acceptInvitation(owner, token)).rejects.toMatchObject({ code: "forbidden" });
    const membership = await prisma.membership.findFirst({
      where: { userId: owner.userId, workspaceId: owner.workspaceId, role: "MEMBER" },
    });
    expect(membership).toBeNull();
  });

  it("accepts a valid invitation transactionally and cannot replay the token", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const { token, invitation } = await createInvitation(owner, {
      email: "join@cp.test",
      role: "ADMIN",
    });
    const registered = await registerWithPassword({
      email: "join@cp.test",
      password: "SecurePass1!",
      displayName: "Join User",
    });
    const invitee = await actor(registered.rawSessionToken);
    const result = await acceptInvitation(invitee, token);
    expect(result.workspaceId).toBe(owner.workspaceId);
    expect(result.role).toBe("ADMIN");

    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: invitee.userId, workspaceId: owner.workspaceId },
      },
    });
    expect(membership?.status).toBe("ACTIVE");
    expect(membership?.role).toBe("ADMIN");
    expect(membership?.organizationId).toBe(owner.organizationId);

    const stored = await prisma.invitation.findUnique({ where: { id: invitation.id } });
    expect(stored?.acceptedAt).toBeTruthy();

    await expect(acceptInvitation(invitee, token)).rejects.toMatchObject({ code: "conflict" });

    const audit = await prisma.controlPlaneAuditEvent.findFirst({
      where: { action: "invitation_accepted", invitationId: invitation.id },
    });
    expect(audit?.actorUserId).toBe(invitee.userId);
  });

  it("isolates invitations across organizations", async () => {
    const ownerA = await actor(TOKEN_OWNER_A);
    const ownerB = await actor(TOKEN_OWNER_B);
    const created = await createInvitation(ownerA, {
      email: "iso@cp.test",
      role: "MEMBER",
    });
    const listB = await listInvitations(ownerB);
    expect(listB.some((row) => row.id === created.invitation.id)).toBe(false);
    await expect(revokeInvitation(ownerB, created.invitation.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("Phase 45: queues invitation email on successful handoff and keeps accept flow", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    const owner = await actor(TOKEN_OWNER_A);
    const created = await createInvitation(owner, {
      email: "queued-invite@cp.test",
      role: "MEMBER",
    });
    expect(created.delivery).toBe("queued");
    expect(listMemoryEmailOutbox()).toHaveLength(1);
    expect(listMemoryEmailOutbox()[0]?.kind).toBe("invitation");

    const invitee = await registerWithPassword({
      email: "queued-invite@cp.test",
      password: "SecurePass1!",
      displayName: "Queued Invitee",
    });
    const inviteeActor = await actor(invitee.rawSessionToken);
    const accepted = await acceptInvitation(inviteeActor, created.token);
    expect(accepted.workspaceId).toBe(owner.workspaceId);
  });

  it("Phase 45: does not report queued when invitation handoff fails", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    forceMemoryEmailFailure("webhook down");
    const owner = await actor(TOKEN_OWNER_A);
    const created = await createInvitation(owner, {
      email: "fail-invite@cp.test",
      role: "MEMBER",
    });
    expect(created.delivery).toBe("not_configured");
    expect(listMemoryEmailOutbox()).toHaveLength(0);
    expect(created.token).toBeTruthy();
    const preview = await previewInvitation(created.token);
    expect(preview.status).toBe("pending");
  });
});

describe("Phase 44 tenancy isolation", () => {
  it("blocks cross-tenant organization, workspace, membership, and invitation access", async () => {
    const ownerA = await actor(TOKEN_OWNER_A);
    const ownerB = await actor(TOKEN_OWNER_B);

    expect(ownerA.organizationId).not.toBe(ownerB.organizationId);
    expect(ownerA.workspaceId).not.toBe(ownerB.workspaceId);
    expect(ownerA.membershipId).not.toBe(ownerB.membershipId);

    await expect(getActorForWorkspace(TOKEN_OWNER_A, ownerB.workspaceId)).resolves.toBeNull();
    await expect(getWorkspaceForActor(ownerA, ownerB.workspaceId)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(switchWorkspaceForActor(ownerA, ownerB.workspaceId)).rejects.toMatchObject({
      code: "forbidden",
    });

    const membersA = await listMembers(ownerA);
    const membersB = await listMembers(ownerB);
    expect(membersA.some((row) => row.userId === ownerB.userId)).toBe(false);
    expect(membersB.some((row) => row.userId === ownerA.userId)).toBe(false);
  });
});

describe("Phase 45-B controlled ownership transfer", () => {
  it("lets OWNER initiate transfer to an eligible member without changing ownership yet", async () => {
    setEmailProviderForTests(memoryEmailProvider);
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);

    const { transfer, token, delivery } = await initiateOwnershipTransfer(owner, {
      targetUserId: admin.userId,
    });

    expect(delivery).toBe("queued");
    expect(transfer.status).toBe("pending");
    expect(transfer.toUserId).toBe(admin.userId);
    expect(token).toBeTruthy();
    expect(JSON.stringify(transfer)).not.toContain(token);

    const org = await getCurrentOrganization(owner);
    expect(org.ownerId).toBe(owner.userId);
    expect(owner.role).toBe("OWNER");

    const members = await listMembers(owner);
    expect(members.find((m) => m.userId === owner.userId)?.role).toBe("OWNER");
    expect(members.find((m) => m.userId === admin.userId)?.role).toBe("ADMIN");

    const stored = await prisma.ownershipTransfer.findUnique({
      where: { id: transfer.id },
    });
    expect(stored?.tokenHash).toBe(hashOpaqueToken(token));
    expect(stored?.tokenHash).not.toBe(token);

    const outbox = listMemoryEmailOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.kind).toBe("ownership_transfer");
    expect(outbox[0]?.to).toBe("admin-a@cp.test");
    expect(outbox[0]?.text).toContain(token);

    const audits = await prisma.controlPlaneAuditEvent.findMany({
      where: { action: "ownership_transfer_initiated" },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(audits)).not.toContain(token);
  });

  it("rejects non-owner initiation, self-transfer, and ineligible targets", async () => {
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    const member = await actor(TOKEN_MEMBER_A);
    const ownerB = await actor(TOKEN_OWNER_B);

    await expect(
      initiateOwnershipTransfer(admin, { targetUserId: member.userId }),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      initiateOwnershipTransfer(owner, { targetUserId: owner.userId }),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      initiateOwnershipTransfer(owner, { targetUserId: ownerB.userId }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("completes transfer on valid confirmation and demotes previous owner to ADMIN", async () => {
    setEmailProviderForTests(noneEmailProvider);
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);

    const { token } = await initiateOwnershipTransfer(owner, {
      targetUserId: admin.userId,
    });

    const pending = await getPendingOwnershipTransfer(owner);
    expect(pending?.status).toBe("pending");

    const result = await confirmOwnershipTransfer(admin, token);
    expect(result.newOwnerId).toBe(admin.userId);
    expect(result.previousOwnerId).toBe(owner.userId);

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: owner.organizationId },
    });
    expect(org.ownerId).toBe(admin.userId);

    const memberships = await prisma.membership.findMany({
      where: { workspaceId: owner.workspaceId, status: "ACTIVE" },
    });
    expect(memberships.find((m) => m.userId === admin.userId)?.role).toBe("OWNER");
    expect(memberships.find((m) => m.userId === owner.userId)?.role).toBe("ADMIN");

    const completed = await prisma.controlPlaneAuditEvent.findMany({
      where: { action: "ownership_transfer_completed" },
    });
    expect(completed.length).toBeGreaterThanOrEqual(1);

    // Replay rejected
    await expect(confirmOwnershipTransfer(admin, token)).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("rejects expired and unauthorized confirmations", async () => {
    setEmailProviderForTests(noneEmailProvider);
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    const member = await actor(TOKEN_MEMBER_A);

    const { token, transfer } = await initiateOwnershipTransfer(owner, {
      targetUserId: admin.userId,
    });

    await expect(confirmOwnershipTransfer(member, token)).rejects.toMatchObject({
      code: "forbidden",
    });

    await prisma.ownershipTransfer.update({
      where: { id: transfer.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await expect(confirmOwnershipTransfer(admin, token)).rejects.toMatchObject({
      code: "forbidden",
    });

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: owner.organizationId },
    });
    expect(org.ownerId).toBe(owner.userId);
  });

  it("allows cancel and keeps OWNER grants blocked via role change", async () => {
    setEmailProviderForTests(noneEmailProvider);
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    const member = await actor(TOKEN_MEMBER_A);

    const { transfer } = await initiateOwnershipTransfer(owner, {
      targetUserId: admin.userId,
    });
    const cancelled = await cancelOwnershipTransfer(owner, transfer.id);
    expect(cancelled.status).toBe("cancelled");
    expect(await getPendingOwnershipTransfer(owner)).toBeNull();

    await expect(changeMemberRole(owner, member.userId, "OWNER")).rejects.toMatchObject({
      code: "forbidden",
      message: expect.stringContaining("controlled ownership transfer"),
    });
  });

  it("previews transfer without leaking token hash", async () => {
    setEmailProviderForTests(noneEmailProvider);
    const owner = await actor(TOKEN_OWNER_A);
    const admin = await actor(TOKEN_ADMIN_A);
    const { token } = await initiateOwnershipTransfer(owner, {
      targetUserId: admin.userId,
    });
    const preview = await previewOwnershipTransfer(token);
    expect(preview.status).toBe("pending");
    expect(preview.toUserEmail).toBe("admin-a@cp.test");
    expect(JSON.stringify(preview)).not.toContain(token);
    expect(JSON.stringify(preview)).not.toContain(hashOpaqueToken(token));
  });
});
