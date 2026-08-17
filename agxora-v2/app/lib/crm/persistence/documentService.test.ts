/**
 * Phase 49 — CRM Document metadata persistence security tests.
 * Uses dedicated agxora_test database (see .env.test).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import { can } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  createDocumentForActor,
  deleteDocumentForActor,
  getDocumentForActor,
  listDocumentsForActor,
} from "@/app/lib/crm/persistence/documentService";
import {
  createCustomerForActor,
  deleteCustomerForActor,
} from "@/app/lib/crm/persistence/customerService";
import type {
  CrmCustomerDraft,
  CrmDocumentDraft,
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

describe("Phase 49 CRM Document metadata persistence", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("OWNER can create, read, and delete document metadata", async () => {
    const owner = await actor(TOKEN_OWNER);
    expect(can(owner, "customer.create")).toBe(true);
    expect(can(owner, "customer.delete")).toBe(true);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createDocumentForActor(
      owner,
      customer.id,
      documentDraft({ name: "Owner Doc.pdf" }),
    );
    expect(created.customerId).toBe(customer.id);
    expect(created.organizationId).toBe(owner.organizationId);
    expect(created.name).toBe("Owner Doc.pdf");
    expect(created.size).toBe(1024);

    const listed = await listDocumentsForActor(owner, customer.id);
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    const fetched = await getDocumentForActor(owner, created.id);
    expect(fetched.mimeType).toBe("application/pdf");

    await deleteDocumentForActor(owner, created.id);
    await expect(getDocumentForActor(owner, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("ADMIN can create and delete document metadata", async () => {
    const owner = await actor(TOKEN_OWNER);
    const admin = await actor(TOKEN_ADMIN);
    expect(admin.role).toBe("ADMIN");
    expect(can(admin, "customer.delete")).toBe(true);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createDocumentForActor(
      admin,
      customer.id,
      documentDraft({ name: "Admin Doc.pdf", uploadedBy: "Admin A" }),
    );
    expect(created.uploadedBy).toBe("Admin A");
    await deleteDocumentForActor(admin, created.id);
    await expect(getDocumentForActor(admin, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("MEMBER can create but not delete document metadata", async () => {
    const owner = await actor(TOKEN_OWNER);
    const member = await actor(TOKEN_MEMBER);
    expect(can(member, "customer.create")).toBe(true);
    expect(can(member, "customer.delete")).toBe(false);

    const customer = await createCustomerForActor(owner, customerDraft());
    const created = await createDocumentForActor(
      member,
      customer.id,
      documentDraft({ name: "Member Doc.pdf", uploadedBy: "Member A" }),
    );
    expect(created.name).toBe("Member Doc.pdf");

    await expect(deleteDocumentForActor(member, created.id)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    await expect(deleteDocumentForActor(member, created.id)).rejects.toMatchObject({
      code: "forbidden",
    });
    const stillThere = await getDocumentForActor(owner, created.id);
    expect(stillThere.id).toBe(created.id);
  });

  it("denies cross-organization document access", async () => {
    const ownerA = await actor(TOKEN_OWNER);
    const ownerB = await actor(TOKEN_OWNER_B);
    const customer = await createCustomerForActor(ownerA, customerDraft());
    const document = await createDocumentForActor(
      ownerA,
      customer.id,
      documentDraft(),
    );

    await expect(getDocumentForActor(ownerB, document.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      listDocumentsForActor(ownerB, customer.id),
    ).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(deleteDocumentForActor(ownerB, document.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("denies cross-workspace document access within the same organization", async () => {
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
        email: "other-ws-docs@acme-test.example",
      },
    });
    const foreignDocument = await prisma.customerDocument.create({
      data: {
        organizationId: owner.organizationId,
        workspaceId: wsOther!.id,
        customerId: foreignCustomer.id,
        name: "Foreign Doc.pdf",
        mimeType: "application/pdf",
        size: 512,
        uploadedBy: "Other",
      },
    });

    await expect(
      getDocumentForActor(owner, foreignDocument.id),
    ).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(
      listDocumentsForActor(owner, foreignCustomer.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps documents isolated per customer (ownership validation)", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customerA = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer A" }),
    );
    const customerB = await createCustomerForActor(
      owner,
      customerDraft({ companyName: "Customer B" }),
    );
    const documentA = await createDocumentForActor(
      owner,
      customerA.id,
      documentDraft({ name: "Only On A.pdf" }),
    );

    const listB = await listDocumentsForActor(owner, customerB.id);
    expect(listB.some((row) => row.id === documentA.id)).toBe(false);

    const listA = await listDocumentsForActor(owner, customerA.id);
    expect(listA.some((row) => row.id === documentA.id)).toBe(true);
  });

  it("rejects invalid customer id for document create/list", async () => {
    const owner = await actor(TOKEN_OWNER);
    const missing = "00000000-0000-4000-8000-000000000099";
    await expect(
      createDocumentForActor(owner, missing, documentDraft()),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(listDocumentsForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects invalid document id", async () => {
    const owner = await actor(TOKEN_OWNER);
    const missing = "00000000-0000-4000-8000-000000000088";
    await expect(getDocumentForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(deleteDocumentForActor(owner, missing)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects invalid document draft input", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    await expect(
      createDocumentForActor(owner, customer.id, documentDraft({ name: "" })),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      createDocumentForActor(
        owner,
        customer.id,
        documentDraft({ size: Number.NaN }),
      ),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("cascades document deletion when parent customer is deleted", async () => {
    const owner = await actor(TOKEN_OWNER);
    const customer = await createCustomerForActor(owner, customerDraft());
    const document = await createDocumentForActor(
      owner,
      customer.id,
      documentDraft(),
    );
    await deleteCustomerForActor(owner, customer.id);
    await expect(getDocumentForActor(owner, document.id)).rejects.toMatchObject({
      code: "not_found",
    });
    const dbRow = await prisma.customerDocument.findUnique({
      where: { id: document.id },
    });
    expect(dbRow).toBeNull();
  });
});
