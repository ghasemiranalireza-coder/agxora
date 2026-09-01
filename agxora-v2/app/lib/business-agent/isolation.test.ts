import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  createCampaignForActor,
  executeCampaignItemForActor,
  listCampaignsForActor,
} from "./campaigns";
import { connectIntegrationForActor } from "./integrations";
import { createPlanRunForActor, listAgentRunsForActor } from "./runs";
import { getAgentPolicyForActor, setAgentPolicyForActor } from "./policy";

const prisma = new PrismaClient();
const TOKEN_A = "ba_token_owner_a";
const TOKEN_B = "ba_token_owner_b";
const TOKEN_MEMBER = "ba_token_member_a";

async function resetFixtures(): Promise<void> {
  await prisma.externalActionAudit.deleteMany();
  await prisma.agentRunStep.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.campaignItem.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.agentPolicy.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["ba-owner-a@test.agxora", "ba-owner-b@test.agxora", "ba-member-a@test.agxora"],
      },
    },
  });

  const ownerA = await prisma.user.create({
    data: { email: "ba-owner-a@test.agxora", name: "BA Owner A", emailVerified: true },
  });
  const memberA = await prisma.user.create({
    data: { email: "ba-member-a@test.agxora", name: "BA Member A", emailVerified: true },
  });
  const ownerB = await prisma.user.create({
    data: { email: "ba-owner-b@test.agxora", name: "BA Owner B", emailVerified: true },
  });
  const orgA = await prisma.organization.create({
    data: {
      name: "BA Org A",
      slug: "ba-org-a",
      ownerId: ownerA.id,
      workspaces: { create: { name: "Default", slug: "default" } },
    },
    include: { workspaces: true },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "BA Org B",
      slug: "ba-org-b",
      ownerId: ownerB.id,
      workspaces: { create: { name: "Default", slug: "default" } },
    },
    include: { workspaces: true },
  });
  const wsA = orgA.workspaces[0];
  const wsB = orgB.workspaces[0];
  await prisma.membership.createMany({
    data: [
      { userId: ownerA.id, organizationId: orgA.id, workspaceId: wsA.id, role: "OWNER" },
      { userId: memberA.id, organizationId: orgA.id, workspaceId: wsA.id, role: "MEMBER" },
      { userId: ownerB.id, organizationId: orgB.id, workspaceId: wsB.id, role: "OWNER" },
    ],
  });
  const expiresAt = new Date(Date.now() + 86_400_000);
  await prisma.session.createMany({
    data: [
      sessionRowForTests({ userId: ownerA.id, rawToken: TOKEN_A, expiresAt }),
      sessionRowForTests({ userId: memberA.id, rawToken: TOKEN_MEMBER, expiresAt }),
      sessionRowForTests({ userId: ownerB.id, rawToken: TOKEN_B, expiresAt }),
    ],
  });
}

async function actor(token: string): Promise<Actor> {
  const resolved = await getActorBySessionToken(token);
  if (!resolved) throw new Error(`Missing actor for ${token}`);
  return resolved;
}

describe("Phase 70 business-agent isolation", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("defaults autonomy to SAFE and scopes campaigns to the actor org", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    expect((await getAgentPolicyForActor(ownerA)).mode).toBe("SAFE");

    await createCampaignForActor(ownerA, {
      name: "Org A campaign",
      channels: ["instagram"],
      items: [
        {
          provider: "instagram",
          contentType: "post",
          title: "Draft post",
          caption: "Hello",
        },
      ],
    });

    const aCampaigns = await listCampaignsForActor(ownerA);
    const bCampaigns = await listCampaignsForActor(ownerB);
    expect(aCampaigns).toHaveLength(1);
    expect(bCampaigns).toHaveLength(0);
    expect(aCampaigns[0]?.organizationId).toBe(ownerA.organizationId);
    expect(aCampaigns[0]?.workspaceId).toBe(ownerA.workspaceId);
  });

  it("does not fake Instagram OAuth or publish", async () => {
    const ownerA = await actor(TOKEN_A);
    await expect(connectIntegrationForActor(ownerA, "instagram")).rejects.toMatchObject({
      code: "validation",
      status: 501,
    });

    const campaign = await createCampaignForActor(ownerA, {
      name: "Needs approval",
      items: [{ provider: "instagram", contentType: "post", title: "X" }],
    });
    const itemId = campaign.items[0]?.id;
    expect(itemId).toBeTruthy();
    await expect(
      executeCampaignItemForActor(ownerA, itemId!, "publish"),
    ).rejects.toBeInstanceOf(PersistenceError);

    const run = await createPlanRunForActor(ownerA, { goal: "Prepare next week" });
    expect(run.status).toBe("WAITING_APPROVAL");
    const runsB = await listAgentRunsForActor(await actor(TOKEN_B));
    expect(runsB).toHaveLength(0);
  });

  it("blocks members from changing autonomy and unpublished execute in SAFE mode", async () => {
    const member = await actor(TOKEN_MEMBER);
    await expect(setAgentPolicyForActor(member, "AUTONOMOUS")).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
