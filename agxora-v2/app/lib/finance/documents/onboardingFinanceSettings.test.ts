import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  applyOnboardingFinanceSettingsForActor,
  getDocumentSettingsForActor,
  patchDocumentSettingsForActor,
} from "@/app/lib/finance/persistence";

const prisma = new PrismaClient();

const TOKEN_A = "test_token_onboarding_finance_owner_a";
const TOKEN_B = "test_token_onboarding_finance_owner_b";
const TOKEN_MEMBER = "test_token_onboarding_finance_member_a";

async function resetFixtures(): Promise<void> {
  await prisma.financeDocumentSettings.deleteMany();
  await prisma.financeDocumentLogo.deleteMany();
  await prisma.controlPlaneAuditEvent.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const ownerA = await prisma.user.create({
    data: { email: "onboard-fin-owner-a@test.agxora", name: "Owner A", emailVerified: true },
  });
  const memberA = await prisma.user.create({
    data: { email: "onboard-fin-member-a@test.agxora", name: "Member A", emailVerified: true },
  });
  const ownerB = await prisma.user.create({
    data: { email: "onboard-fin-owner-b@test.agxora", name: "Owner B", emailVerified: true },
  });

  const orgA = await prisma.organization.create({
    data: {
      name: "Onboarding Finance Org A",
      slug: "onboarding-finance-org-a",
      ownerId: ownerA.id,
      workspaces: { create: { name: "Default", slug: "default" } },
    },
    include: { workspaces: true },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "Onboarding Finance Org B",
      slug: "onboarding-finance-org-b",
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
      sessionRowForTests({ userId: ownerA.id, rawToken: TOKEN_A, expiresAt, activeWorkspaceId: wsA.id }),
      sessionRowForTests({ userId: memberA.id, rawToken: TOKEN_MEMBER, expiresAt, activeWorkspaceId: wsA.id }),
      sessionRowForTests({ userId: ownerB.id, rawToken: TOKEN_B, expiresAt, activeWorkspaceId: wsB.id }),
    ],
  });
}

async function actor(token: string): Promise<Actor> {
  const resolved = await getActorBySessionToken(token);
  if (!resolved) throw new Error(`Missing actor for ${token}`);
  return resolved;
}

describe("onboarding → FinanceDocumentSettings write-through", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("writes supported onboarding company data to FinanceDocumentSettings for a new customer", async () => {
    const owner = await actor(TOKEN_A);
    const saved = await applyOnboardingFinanceSettingsForActor(owner, {
      companyName: "Nordlicht Handel GmbH",
      street: "Speicherstadt",
      houseNumber: "12",
      postalCode: "20457",
      city: "Hamburg",
      country: "Deutschland",
      vatId: "DE813312217",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
    });

    expect(saved.persisted).toBe(true);
    expect(saved.organizationId).toBe(owner.organizationId);
    expect(saved.workspaceId).toBe(owner.workspaceId);
    expect(saved.branding.companyName).toBe("Nordlicht Handel GmbH");
    expect(saved.branding.street).toBe("Speicherstadt 12");
    expect(saved.branding.postalCode).toBe("20457");
    expect(saved.branding.city).toBe("Hamburg");
    expect(saved.branding.country).toBe("Deutschland");
    expect(saved.branding.vatId).toBe("DE813312217");
    expect(saved.branding.iban).toBe("DE89370400440532013000");
    expect(saved.branding.bic).toBe("COBADEFFXXX");
    expect(saved.invoiceTemplate).toBe("CLASSIC");
  });

  it("preserves existing FinanceDocumentSettings when onboarding omits optional fields", async () => {
    const owner = await actor(TOKEN_A);
    await patchDocumentSettingsForActor(owner, {
      companyName: "Existing GmbH",
      street: "Hafen 1",
      postalCode: "20095",
      city: "Hamburg",
      country: "Deutschland",
      vatId: "DE111111111",
      iban: "DE44500105175407324931",
      bic: "INGDDEFFXXX",
      invoiceTemplate: "MODERN",
    });

    const merged = await applyOnboardingFinanceSettingsForActor(owner, {
      companyName: "Updated GmbH",
      country: "Germany",
      vatId: "  ",
      iban: "",
      bic: null,
      street: "",
    });

    expect(merged.branding.companyName).toBe("Updated GmbH");
    expect(merged.branding.country).toBe("Germany");
    expect(merged.branding.street).toBe("Hafen 1");
    expect(merged.branding.postalCode).toBe("20095");
    expect(merged.branding.city).toBe("Hamburg");
    expect(merged.branding.vatId).toBe("DE111111111");
    expect(merged.branding.iban).toBe("DE44500105175407324931");
    expect(merged.branding.bic).toBe("INGDDEFFXXX");
    expect(merged.invoiceTemplate).toBe("MODERN");
  });

  it("does not break onboarding when VAT and IBAN are absent", async () => {
    const owner = await actor(TOKEN_A);
    const saved = await applyOnboardingFinanceSettingsForActor(owner, {
      companyName: "No Tax GmbH",
      country: "Deutschland",
    });
    expect(saved.persisted).toBe(true);
    expect(saved.branding.companyName).toBe("No Tax GmbH");
    expect(saved.branding.vatId).toBe("");
    expect(saved.branding.iban).toBe("");
    expect(saved.branding.bic).toBe("");
  });

  it("does not create a settings row when onboarding has no supported finance values", async () => {
    const owner = await actor(TOKEN_A);
    const settings = await applyOnboardingFinanceSettingsForActor(owner, {
      vatId: "",
      iban: "  ",
    });
    expect(settings.persisted).toBe(false);
    expect(settings.branding.companyName).toBe("Onboarding Finance Org A");
  });

  it("keeps tenant isolation: onboarding for org A cannot change org B settings", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    await applyOnboardingFinanceSettingsForActor(ownerA, {
      companyName: "Tenant A GmbH",
      country: "Deutschland",
      iban: "DE89370400440532013000",
    });

    const other = await getDocumentSettingsForActor(ownerB);
    expect(other.persisted).toBe(false);
    expect(other.branding.companyName).toBe("Onboarding Finance Org B");
    expect(other.branding.iban).toBe("");
  });

  it("rejects MEMBER onboarding writes to finance document settings", async () => {
    const member = await actor(TOKEN_MEMBER);
    await expect(
      applyOnboardingFinanceSettingsForActor(member, {
        companyName: "Should Fail GmbH",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
