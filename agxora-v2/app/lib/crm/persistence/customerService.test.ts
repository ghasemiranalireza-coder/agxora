/**
 * Phase 42.1 — tenancy + CRM persistence security tests.
 * Uses dedicated agxora_test database (see .env.test).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { can } from "@/app/lib/tenancy/authorize";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  createCustomerForActor,
  deleteCustomerForActor,
  getCustomerForActor,
  listCustomersForActor,
  updateCustomerForActor,
} from "@/app/lib/crm/persistence/customerService";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory/types";
import type { Actor } from "@/app/lib/tenancy/types";

const prisma = new PrismaClient();

const TOKEN_A = "test_token_owner_a";
const TOKEN_B = "test_token_owner_b";
const TOKEN_MEMBER = "test_token_member_a";

function draft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return {
    companyName: "Acme Robotics",
    contactName: "Alex Rivera",
    email: `alex.${Date.now()}@acme-test.example`,
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

async function resetFixtures(): Promise<void> {
  await prisma.customer.deleteMany();
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
      workspaces: { create: { name: "Default", slug: "default" } },
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
      { userId: ownerA.id, token: TOKEN_A, expiresAt },
      { userId: memberA.id, token: TOKEN_MEMBER, expiresAt },
      { userId: ownerB.id, token: TOKEN_B, expiresAt },
    ],
  });
}

async function actor(token: string): Promise<Actor> {
  const resolved = await getActorBySessionToken(token);
  if (!resolved) throw new Error(`Missing actor for ${token}`);
  return resolved;
}

describe("Phase 42.1 tenancy + CRM persistence", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resolves OWNER / ADMIN / MEMBER actors from sessions", async () => {
    const owner = await actor(TOKEN_A);
    const member = await actor(TOKEN_MEMBER);
    expect(owner.role).toBe("OWNER");
    expect(member.role).toBe("MEMBER");
    expect(owner.workspaceId).toBe(member.workspaceId);
    expect(can(owner, "customer.delete")).toBe(true);
    expect(can(member, "customer.delete")).toBe(false);
    expect(can(member, "customer.create")).toBe(true);
  });

  it("creates and lists customers within authorized workspace", async () => {
    const owner = await actor(TOKEN_A);
    const created = await createCustomerForActor(owner, draft());
    expect(created.organizationId).toBe(owner.organizationId);
    const listed = await listCustomersForActor(owner);
    expect(listed.some((row) => row.id === created.id)).toBe(true);
    const fetched = await getCustomerForActor(owner, created.id);
    expect(fetched.email).toBe(created.email);
  });

  it("updates customer and persists across reload queries", async () => {
    const owner = await actor(TOKEN_A);
    const created = await createCustomerForActor(
      owner,
      draft({ companyName: "Before Update" }),
    );
    const updated = await updateCustomerForActor(
      owner,
      created.id,
      draft({
        companyName: "After Update",
        email: created.email,
        contactName: created.contactName,
      }),
    );
    expect(updated.companyName).toBe("After Update");
    const again = await getCustomerForActor(owner, created.id);
    expect(again.companyName).toBe("After Update");
  });

  it("deletes customer for OWNER and hides from list", async () => {
    const owner = await actor(TOKEN_A);
    const created = await createCustomerForActor(owner, draft());
    await deleteCustomerForActor(owner, created.id);
    await expect(getCustomerForActor(owner, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("blocks MEMBER from deleting customers", async () => {
    const owner = await actor(TOKEN_A);
    const member = await actor(TOKEN_MEMBER);
    const created = await createCustomerForActor(owner, draft());
    await expect(deleteCustomerForActor(member, created.id)).rejects.toBeInstanceOf(
      PersistenceError,
    );
    await expect(deleteCustomerForActor(member, created.id)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("prevents User B from reading User A customer", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    const created = await createCustomerForActor(ownerA, draft());
    await expect(getCustomerForActor(ownerB, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
    const listB = await listCustomersForActor(ownerB);
    expect(listB.some((row) => row.id === created.id)).toBe(false);
  });

  it("prevents User B from updating User A customer", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    const created = await createCustomerForActor(ownerA, draft());
    await expect(
      updateCustomerForActor(
        ownerB,
        created.id,
        draft({ companyName: "Hacked", email: created.email }),
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("prevents User B from deleting User A customer", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    const created = await createCustomerForActor(ownerA, draft());
    await expect(deleteCustomerForActor(ownerB, created.id)).rejects.toMatchObject({
      code: "not_found",
    });
    const stillThere = await getCustomerForActor(ownerA, created.id);
    expect(stillThere.id).toBe(created.id);
  });

  it("rejects invalid customer input", async () => {
    const owner = await actor(TOKEN_A);
    await expect(
      createCustomerForActor(
        owner,
        draft({ companyName: "", email: "not-an-email" }),
      ),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("rejects unknown customer id for authorized actor", async () => {
    const owner = await actor(TOKEN_A);
    await expect(
      getCustomerForActor(owner, "00000000-0000-4000-8000-000000000099"),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects unauthenticated session tokens", async () => {
    await expect(getActorBySessionToken("missing_token")).resolves.toBeNull();
  });

  it("enforces organization isolation across seeded workspaces", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    expect(ownerA.organizationId).not.toBe(ownerB.organizationId);
    expect(ownerA.workspaceId).not.toBe(ownerB.workspaceId);
    await createCustomerForActor(ownerA, draft({ email: "a@iso.example" }));
    await createCustomerForActor(ownerB, draft({ email: "b@iso.example" }));
    expect((await listCustomersForActor(ownerA)).length).toBe(1);
    expect((await listCustomersForActor(ownerB)).length).toBe(1);
  });
});
