/**
 * Phase 48 — CRM Note persistence security tests.
 * Uses dedicated agxora_test database (see .env.test).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import { can } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  createNoteForActor,
  deleteNoteForActor,
  getNoteForActor,
  listNotesForActor,
  updateNoteForActor,
} from "@/app/lib/crm/persistence/noteService";
import {
  createCustomerForActor,
  deleteCustomerForActor,
} from "@/app/lib/crm/persistence/customerService";
import type { CrmCustomerDraft, CrmNoteDraft } from "@/app/lib/crm/directory/types";
import type { Actor } from "@/app/lib/tenancy/types";

const prisma = new PrismaClient();

const TOKEN_OWNER = "test_token_owner_a";
const TOKEN_ADMIN = "test_token_admin_a";
const TOKEN_MEMBER = "test_token_member_a";
const TOKEN_OWNER_B = "test_token_owner_b";

function customerDraft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return {
    companyName: "Acme Robotics",
    contactName: "Alex Rivera",
    email: `alex.${Date.now()}.${Math.random().toString(36).slice(2)}@acme-test.example`,
    phone: "+49 40 123456",
    website: "https://acme-test.example",
    industry: "Technology",
    country: "DE",
    city: "Berlin",
    address: "Teststrasse 1",
    taxNumber: "DE123",
    status: "lead",
    owner: "Owner",
    tags: "",
    ...partial,
  };
}

function noteDraft(partial?: Partial<CrmNoteDraft>): CrmNoteDraft {
  return {
    title: "Discovery call",
    body: "Discussed roadmap and pricing.",
    author: "Owner A",
    ...partial,
  };
}

async function resetFixtures(): Promise<void> {
  await prisma.note.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.controlPlaneAuditEvent.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.ownershipTransfer.deleteMany().catch(() => undefined);
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const ownerA = await prisma.user.create({
    data: {
      email: "owner-a@test.agxora",
      name: "Owner A",
      externalAuthId: "usr_test_a",
      emailVerified: true,
    },
  });
  const adminA = await prisma.user.create({
    data: {
      email: "admin-a@test.agxora",
      name: "Admin A",
      externalAuthId: "usr_test_admin_a",
      emailVerified: true,
    },
  });
  const memberA = await prisma.user.create({
    data: {
      email: "member-a@test.agxora",
      name: "Member A",
      externalAuthId: "usr_test_member_a",
      emailVerified: true,
    },
  });
  const ownerB = await prisma.user.create({
    data: {
      email: "owner-b@test.agxora",
      name: "Owner B",
      externalAuthId: "usr_test_b",
      emailVerified: true,
    },
  });

  const orgA = await prisma.organization.create({
    data: {
      name: "Org A",
      slug: "org-a-test",
      ownerId: ownerA.id,
      workspaces: {
        create: [
          { name: "Default", slug: "default" },
          { name: "Other", slug: "other" },
        ],
      },
    },
    include: { workspaces: true },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "Org B",
      slug: "org-b-test",
      ownerId: ownerB.id,
      workspaces: { create: { name: "Default", slug: "default" } },
    },
    include: { workspaces: true },
  });

  const wsA = orgA.workspaces.find((w) => w.slug === "default")!;
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
      sessionRowForTests({ userId: ownerA.id, rawToken: TOKEN_OWNER, expiresAt }),
      sessionRowForTests({ userId: adminA.id, rawToken: TOKEN_ADMIN, expiresAt }),
      sessionRowForTests({ userId: memberA.id, rawToken: TOKEN_MEMBER, expiresAt }),
      sessionRowForTests({ userId: ownerB.id, rawToken: TOKEN_OWNER_B, expiresAt }),
    ],
  });
}

async function actor(token: string): Promise<Actor> {
  const resolved = await getActorBySessionToken(token);
  if (!resolved) throw new Error(`Missing actor for ${token}`);
  return resolved;
}

describe("Phase 48 CRM Note persistence", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("OWNER can create, read, update, and delete notes", async () => {
    const owner = await actor(TOKEN_OWNER);
    expect(can(owner, "customer.create")).toBe(true);
    expect(can(owner, "customer.delete")).toBe(true);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createNoteForActor(
      owner,
      customer.id,
      noteDraft({ title: "Owner Note" }),
    );
    expect(created.customerId).toBe(customer.id);
    expect(created.organizationId).toBe(owner.organizationId);
    expect(created.title).toBe("Owner Note");

    const listed = await listNotesForActor(owner, customer.id);
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    const fetched = await getNoteForActor(owner, created.id);
    expect(fetched.body).toContain("roadmap");

    const updated = await updateNoteForActor(
      owner,
      created.id,
      noteDraft({ title: "Updated Note", body: "New body", author: "Owner A" }),
    );
    expect(updated.title).toBe("Updated Note");
    expect((await getNoteForActor(owner, created.id)).title).toBe("Updated Note");

    await deleteNoteForActor(owner, created.id);
    await expect(getNoteForActor(owner, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("ADMIN can create, update, and delete notes", async () => {
    const owner = await actor(TOKEN_OWNER);
    const admin = await actor(TOKEN_ADMIN);
    expect(admin.role).toBe("ADMIN");
    expect(can(admin, "customer.delete")).toBe(true);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createNoteForActor(
      admin,
      customer.id,
      noteDraft({ title: "Admin Note", author: "Admin A" }),
    );
    const updated = await updateNoteForActor(
      admin,
      created.id,
      noteDraft({ title: "Admin Updated", body: "Updated", author: "Admin A" }),
    );
    expect(updated.title).toBe("Admin Updated");
    await deleteNoteForActor(admin, created.id);
    await expect(getNoteForActor(admin, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("MEMBER can create and update but not delete notes", async () => {
    const owner = await actor(TOKEN_OWNER);
    const member = await actor(TOKEN_MEMBER);
    expect(can(member, "customer.create")).toBe(true);
    expect(can(member, "customer.update")).toBe(true);
    expect(can(member, "customer.delete")).toBe(false);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createNoteForActor(
      member,
      customer.id,
      noteDraft({ title: "Member Note", author: "Member A" }),
    );
    const updated = await updateNoteForActor(
      member,
      created.id,
      noteDraft({ title: "Member Updated", body: "Body", author: "Member A" }),
    );
    expect(updated.title).toBe("Member Updated");

    await expect(deleteNoteForActor(member, created.id)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    await expect(deleteNoteForActor(member, created.id)).rejects.toMatchObject({
      code: "forbidden",
    });
    const stillThere = await getNoteForActor(owner, created.id);
    expect(stillThere.id).toBe(created.id);
  });

  it("denies cross-organization note access", async () => {
    const ownerA = await actor(TOKEN_OWNER);
    const ownerB = await actor(TOKEN_OWNER_B);
    const customer = await createCustomerForActor(ownerA, customerDraft());
    const note = await createNoteForActor(ownerA, customer.id, noteDraft());

    await expect(getNoteForActor(ownerB, note.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(listNotesForActor(ownerB, customer.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      updateNoteForActor(ownerB, note.id, noteDraft({ title: "Hacked" })),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteNoteForActor(ownerB, note.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("denies cross-workspace note access within the same organization", async () => {
    const owner = await actor(TOKEN_OWNER);
    const wsOther = await prisma.workspace.findFirst({
      where: { organizationId: owner.organizationId, slug: "other" },
    });
    expect(wsOther).toBeTruthy();

    const foreignCustomer = await prisma.customer.create({
      data: {
        organizationId: owner.organizationId,
        workspaceId: wsOther!.id,
        companyName: "Other WS Co",
        contactName: "Other",
        email: "other-ws-notes@acme-test.example",
      },
    });
    const foreignNote = await prisma.note.create({
      data: {
        organizationId: owner.organizationId,
        workspaceId: wsOther!.id,
        customerId: foreignCustomer.id,
        title: "Foreign Note",
        body: "Should not be visible",
        author: "Other",
      },
    });

    await expect(getNoteForActor(owner, foreignNote.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      listNotesForActor(owner, foreignCustomer.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps notes isolated per customer (ownership validation)", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customerA = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer A" }),
    );
    const customerB = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer B" }),
    );
    const noteA = await createNoteForActor(
      owner,
      customerA.id,
      noteDraft({ title: "Only On A" }),
    );

    const listB = await listNotesForActor(owner, customerB.id);
    expect(listB.some((row) => row.id === noteA.id)).toBe(false);

    const listA = await listNotesForActor(owner, customerA.id);
    expect(listA.some((row) => row.id === noteA.id)).toBe(true);
  });

  it("rejects invalid customer id for note create/list", async () => {
    const owner = await actor(TOKEN_OWNER);
    const missing = "00000000-0000-4000-8000-000000000099";
    await expect(
      createNoteForActor(owner, missing, noteDraft()),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(listNotesForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects invalid note id", async () => {
    const owner = await actor(TOKEN_OWNER);
    const missing = "00000000-0000-4000-8000-000000000088";
    await expect(getNoteForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      updateNoteForActor(owner, missing, noteDraft()),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteNoteForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects invalid note draft input", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    await expect(
      createNoteForActor(owner, customer.id, noteDraft({ title: "", body: "" })),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("cascades note deletion when parent customer is deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const note = await createNoteForActor(owner, customer.id, noteDraft());
    await deleteCustomerForActor(owner, customer.id);
    await expect(getNoteForActor(owner, note.id)).rejects.toMatchObject({
      code: "not_found",
    });
    const dbRow = await prisma.note.findUnique({ where: { id: note.id } });
    expect(dbRow).toBeNull();
  });
});
