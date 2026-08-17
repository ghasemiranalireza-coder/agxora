/**
 * Phase 50 — CRM Activity persistence security and emission tests.
 * Uses dedicated agxora_test database (see .env.test).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import { can } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  getActivityForActor,
  listActivitiesForActor,
} from "@/app/lib/crm/persistence/activityService";
import {
  createContactForActor,
  deleteContactForActor,
  updateContactForActor,
} from "@/app/lib/crm/persistence/contactService";
import {
  createCustomerForActor,
  deleteCustomerForActor,
  updateCustomerForActor,
} from "@/app/lib/crm/persistence/customerService";
import {
  createDocumentForActor,
  deleteDocumentForActor,
} from "@/app/lib/crm/persistence/documentService";
import {
  createNoteForActor,
  deleteNoteForActor,
  updateNoteForActor,
} from "@/app/lib/crm/persistence/noteService";
import type {
  CrmContactDraft,
  CrmCustomerDraft,
  CrmDocumentDraft,
  CrmNoteDraft,
} from "@/app/lib/crm/directory/types";
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

function contactDraft(partial?: Partial<CrmContactDraft>): CrmContactDraft {
  return {
    name: "Jane Doe",
    role: "Buyer",
    email: "jane@acme-test.example",
    phone: "",
    mobile: "",
    notes: "",
    ...partial,
  };
}

function noteDraft(partial?: Partial<CrmNoteDraft>): CrmNoteDraft {
  return {
    title: "Discovery call",
    body: "Discussed roadmap.",
    author: "Owner A",
    ...partial,
  };
}

function documentDraft(partial?: Partial<CrmDocumentDraft>): CrmDocumentDraft {
  return {
    name: "proposal.pdf",
    mimeType: "application/pdf",
    size: 1024,
    uploadedBy: "Owner A",
    ...partial,
  };
}

async function resetFixtures(): Promise<void> {
  await prisma.customerActivity.deleteMany();
  await prisma.customerDocument.deleteMany();
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

describe("Phase 50 CRM Activity persistence", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("OWNER can list and get activities", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const listed = await listActivitiesForActor(owner, customer.id);
    expect(listed.some((row) => row.kind === "customer_created")).toBe(true);
    const activity = listed.find((row) => row.kind === "customer_created")!;
    expect(activity.title).toBe("Customer Created");
    expect(activity.detail).toBe(customer.companyName);
    expect(activity.actor).toBe("Owner");

    const fetched = await getActivityForActor(owner, activity.id);
    expect(fetched.kind).toBe("customer_created");
  });

  it("ADMIN and MEMBER can read activities", async () => {
    const owner = await actor(TOKEN_OWNER);
    const admin = await actor(TOKEN_ADMIN);
    const member = await actor(TOKEN_MEMBER);
    expect(can(admin, "customer.read")).toBe(true);
    expect(can(member, "customer.read")).toBe(true);

    const customer = await createCustomerForActor(owner, customerDraft());
    const adminList = await listActivitiesForActor(admin, customer.id);
    const memberList = await listActivitiesForActor(member, customer.id);
    expect(adminList.length).toBeGreaterThan(0);
    expect(memberList.length).toBeGreaterThan(0);
  });

  it("denies cross-organization activity access", async () => {
    const ownerA = await actor(TOKEN_OWNER);
    const ownerB = await actor(TOKEN_OWNER_B);
    const customer = await createCustomerForActor(ownerA, customerDraft());
    const listed = await listActivitiesForActor(ownerA, customer.id);
    const activity = listed[0]!;

    await expect(listActivitiesForActor(ownerB, customer.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(getActivityForActor(ownerB, activity.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("denies cross-workspace activity access within the same organization", async () => {
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
        email: "other-ws-activity@acme-test.example",
      },
    });
    const foreignActivity = await prisma.customerActivity.create({
      data: {
        organizationId: owner.organizationId,
        workspaceId: wsOther!.id,
        customerId: foreignCustomer.id,
        kind: "contact_added",
        title: "Contact Added",
        detail: "Foreign",
        actor: "System",
      },
    });

    await expect(
      getActivityForActor(owner, foreignActivity.id),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      listActivitiesForActor(owner, foreignCustomer.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps activities isolated per customer", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customerA = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer A" }),
    );
    const customerB = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer B" }),
    );
    const listA = await listActivitiesForActor(owner, customerA.id);
    expect(listA.every((row) => row.customerId === customerA.id)).toBe(true);
    const listB = await listActivitiesForActor(owner, customerB.id);
    expect(listB.some((row) => row.customerId === customerA.id)).toBe(false);
  });

  it("rejects invalid customer and activity IDs", async () => {
    const owner = await actor(TOKEN_OWNER);
    const missingCustomer = "00000000-0000-4000-8000-000000000099";
    const missingActivity = "00000000-0000-4000-8000-000000000088";
    await expect(listActivitiesForActor(owner, missingCustomer)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(getActivityForActor(owner, missingActivity)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("cascades activity deletion when parent customer is deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const listed = await listActivitiesForActor(owner, customer.id);
    const activityId = listed[0]!.id;
    await deleteCustomerForActor(owner, customer.id);
    await expect(getActivityForActor(owner, activityId)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(await prisma.customerActivity.findUnique({ where: { id: activityId } })).toBeNull();
  });

  it("does not emit customer_deleted when customer is deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    await deleteCustomerForActor(owner, customer.id);
    const rows = await prisma.customerActivity.findMany({
      where: { customerId: customer.id },
    });
    expect(rows.some((row) => row.kind === "customer_deleted")).toBe(false);
  });
});

describe("Phase 50 CRM Activity emission", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("emits customer_created and customer_updated with local semantics", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Emit Co", owner: "Emit Owner" }),
    );
    let rows = await listActivitiesForActor(owner, customer.id);
    const created = rows.find((row) => row.kind === "customer_created")!;
    expect(created.title).toBe("Customer Created");
    expect(created.detail).toBe("Emit Co");
    expect(created.actor).toBe("Emit Owner");

    await updateCustomerForActor(
      owner,
      customer.id,
      customerDraft({ companyName: "Emit Co Updated", owner: "Emit Owner" }),
    );
    rows = await listActivitiesForActor(owner, customer.id);
    const updated = rows.find((row) => row.kind === "customer_updated")!;
    expect(updated.detail).toBe("Emit Co Updated");
    expect(updated.actor).toBe("Emit Owner");
  });

  it("emits contact_added, contact_updated, and contact_deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const contact = await createContactForActor(
      owner,
      customer.id,
      contactDraft({ name: "Contact One" }),
    );
    let rows = await listActivitiesForActor(owner, customer.id);
    expect(rows.some((row) => row.kind === "contact_added" && row.detail === "Contact One")).toBe(
      true,
    );
    expect(rows.find((row) => row.kind === "contact_added")?.actor).toBe("System");

    await updateContactForActor(
      owner,
      contact.id,
      contactDraft({ name: "Contact Updated" }),
    );
    rows = await listActivitiesForActor(owner, customer.id);
    expect(rows.some((row) => row.kind === "contact_updated" && row.detail === "Contact Updated")).toBe(
      true,
    );

    await deleteContactForActor(owner, contact.id);
    rows = await listActivitiesForActor(owner, customer.id);
    expect(rows.some((row) => row.kind === "contact_deleted" && row.detail === "Contact Updated")).toBe(
      true,
    );
  });

  it("emits note_added, note_updated, and note_deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const note = await createNoteForActor(
      owner,
      customer.id,
      noteDraft({ title: "Note One", author: "Note Author" }),
    );
    let rows = await listActivitiesForActor(owner, customer.id);
    expect(rows.some((row) => row.kind === "note_added" && row.detail === "Note One")).toBe(true);
    expect(rows.find((row) => row.kind === "note_added")?.actor).toBe("Note Author");

    await updateNoteForActor(
      owner,
      note.id,
      noteDraft({ title: "Note Updated", body: "Body", author: "Note Author" }),
    );
    rows = await listActivitiesForActor(owner, customer.id);
    expect(rows.some((row) => row.kind === "note_updated" && row.detail === "Note Updated")).toBe(
      true,
    );

    await deleteNoteForActor(owner, note.id);
    rows = await listActivitiesForActor(owner, customer.id);
    expect(rows.some((row) => row.kind === "note_deleted" && row.detail === "Note Updated")).toBe(
      true,
    );
  });

  it("emits document_added and document_deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const document = await createDocumentForActor(
      owner,
      customer.id,
      documentDraft({ name: "spec.pdf", uploadedBy: "Uploader" }),
    );
    let rows = await listActivitiesForActor(owner, customer.id);
    expect(rows.some((row) => row.kind === "document_added" && row.detail === "spec.pdf")).toBe(true);
    expect(rows.find((row) => row.kind === "document_added")?.actor).toBe("Uploader");

    await deleteDocumentForActor(owner, document.id);
    rows = await listActivitiesForActor(owner, customer.id);
    const deleted = rows.find((row) => row.kind === "document_deleted")!;
    expect(deleted.detail).toBe("spec.pdf");
    expect(deleted.actor).toBe("System");
  });

  it("MEMBER can emit activities through authorized create/update mutations", async () => {
    const owner = await actor(TOKEN_OWNER);
    const member = await actor(TOKEN_MEMBER);
    const customer = await createCustomerForActor(owner, customerDraft());
    await createContactForActor(member, customer.id, contactDraft({ name: "Member Contact" }));
    const rows = await listActivitiesForActor(member, customer.id);
    expect(rows.some((row) => row.kind === "contact_added" && row.detail === "Member Contact")).toBe(
      true,
    );
  });

  it("MEMBER delete on parent entity still forbidden", async () => {
    const owner = await actor(TOKEN_OWNER);
    const member = await actor(TOKEN_MEMBER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const contact = await createContactForActor(
      member,
      customer.id,
      contactDraft({ name: "Protected Contact" }),
    );
    await expect(deleteContactForActor(member, contact.id)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    const rows = await listActivitiesForActor(member, customer.id);
    expect(rows.some((row) => row.kind === "contact_added")).toBe(true);
  });
});
