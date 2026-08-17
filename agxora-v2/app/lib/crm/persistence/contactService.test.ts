/**
 * Phase 47 — CRM Contact persistence security tests.
 * Uses dedicated agxora_test database (see .env.test).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import { can } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  createContactForActor,
  deleteContactForActor,
  getContactForActor,
  listContactsForActor,
  updateContactForActor,
} from "@/app/lib/crm/persistence/contactService";
import {
  createCustomerForActor,
  deleteCustomerForActor,
} from "@/app/lib/crm/persistence/customerService";
import type { CrmContactDraft, CrmCustomerDraft } from "@/app/lib/crm/directory/types";
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
    name: "Sam Contact",
    role: "CTO",
    email: "sam@acme-test.example",
    phone: "+49 40 111111",
    mobile: "+49 170 222222",
    notes: "Primary technical contact",
    ...partial,
  };
}

async function resetFixtures(): Promise<void> {
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

describe("Phase 47 CRM Contact persistence", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("OWNER can create, read, update, and delete contacts", async () => {
    const owner = await actor(TOKEN_OWNER);
    expect(can(owner, "customer.create")).toBe(true);
    expect(can(owner, "customer.delete")).toBe(true);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createContactForActor(
      owner,
      customer.id,
      contactDraft({ name: "Owner Contact" }),
    );
    expect(created.customerId).toBe(customer.id);
    expect(created.organizationId).toBe(owner.organizationId);
    expect(created.name).toBe("Owner Contact");

    const listed = await listContactsForActor(owner, customer.id);
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    const fetched = await getContactForActor(owner, created.id);
    expect(fetched.email).toBe("sam@acme-test.example");

    const updated = await updateContactForActor(
      owner,
      created.id,
      contactDraft({ name: "Updated Contact", email: "updated@acme-test.example" }),
    );
    expect(updated.name).toBe("Updated Contact");
    expect((await getContactForActor(owner, created.id)).name).toBe("Updated Contact");

    await deleteContactForActor(owner, created.id);
    await expect(getContactForActor(owner, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("ADMIN can create, update, and delete contacts", async () => {
    const owner = await actor(TOKEN_OWNER);
    const admin = await actor(TOKEN_ADMIN);
    expect(admin.role).toBe("ADMIN");
    expect(can(admin, "customer.delete")).toBe(true);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createContactForActor(
      admin,
      customer.id,
      contactDraft({ name: "Admin Contact" }),
    );
    const updated = await updateContactForActor(
      admin,
      created.id,
      contactDraft({ name: "Admin Updated" }),
    );
    expect(updated.name).toBe("Admin Updated");
    await deleteContactForActor(admin, created.id);
    await expect(getContactForActor(admin, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("MEMBER can create and update but not delete contacts", async () => {
    const owner = await actor(TOKEN_OWNER);
    const member = await actor(TOKEN_MEMBER);
    expect(can(member, "customer.create")).toBe(true);
    expect(can(member, "customer.update")).toBe(true);
    expect(can(member, "customer.delete")).toBe(false);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createContactForActor(
      member,
      customer.id,
      contactDraft({ name: "Member Contact" }),
    );
    const updated = await updateContactForActor(
      member,
      created.id,
      contactDraft({ name: "Member Updated" }),
    );
    expect(updated.name).toBe("Member Updated");

    await expect(deleteContactForActor(member, created.id)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    await expect(deleteContactForActor(member, created.id)).rejects.toMatchObject({
      code: "forbidden",
    });
    const stillThere = await getContactForActor(owner, created.id);
    expect(stillThere.id).toBe(created.id);
  });

  it("denies cross-organization contact access", async () => {
    const ownerA = await actor(TOKEN_OWNER);
    const ownerB = await actor(TOKEN_OWNER_B);
    const customer = await createCustomerForActor(ownerA, customerDraft());
    const contact = await createContactForActor(ownerA, customer.id, contactDraft());

    await expect(getContactForActor(ownerB, contact.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      listContactsForActor(ownerB, customer.id),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      updateContactForActor(ownerB, contact.id, contactDraft({ name: "Hacked" })),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteContactForActor(ownerB, contact.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("denies cross-workspace contact access within the same organization", async () => {
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
        email: "other-ws@acme-test.example",
      },
    });
    const foreignContact = await prisma.contact.create({
      data: {
        organizationId: owner.organizationId,
        workspaceId: wsOther!.id,
        customerId: foreignCustomer.id,
        name: "Foreign Contact",
        email: "foreign@acme-test.example",
      },
    });

    await expect(getContactForActor(owner, foreignContact.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      listContactsForActor(owner, foreignCustomer.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps contacts isolated per customer (ownership validation)", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customerA = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer A" }),
    );
    const customerB = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer B" }),
    );
    const contactA = await createContactForActor(
      owner,
      customerA.id,
      contactDraft({ name: "Only On A" }),
    );

    const listB = await listContactsForActor(owner, customerB.id);
    expect(listB.some((row) => row.id === contactA.id)).toBe(false);

    const listA = await listContactsForActor(owner, customerA.id);
    expect(listA.some((row) => row.id === contactA.id)).toBe(true);
  });

  it("rejects invalid customer id for contact create/list", async () => {
    const owner = await actor(TOKEN_OWNER);
    const missing = "00000000-0000-4000-8000-000000000099";
    await expect(
      createContactForActor(owner, missing, contactDraft()),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(listContactsForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects invalid contact id", async () => {
    const owner = await actor(TOKEN_OWNER);
    const missing = "00000000-0000-4000-8000-000000000088";
    await expect(getContactForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      updateContactForActor(owner, missing, contactDraft()),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(deleteContactForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects invalid contact draft input", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    await expect(
      createContactForActor(
        owner,
        customer.id,
        contactDraft({ name: "", email: "not-an-email" }),
      ),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("cascades contact deletion when parent customer is deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const contact = await createContactForActor(owner, customer.id, contactDraft());
    await deleteCustomerForActor(owner, customer.id);
    await expect(getContactForActor(owner, contact.id)).rejects.toMatchObject({
      code: "not_found",
    });
    const dbRow = await prisma.contact.findUnique({ where: { id: contact.id } });
    expect(dbRow).toBeNull();
  });
});
