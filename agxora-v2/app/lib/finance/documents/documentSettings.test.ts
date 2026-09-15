import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { sessionRowForTests } from "@/app/lib/auth/server/sessionTestFixtures";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { canFinance } from "@/app/lib/tenancy/authorize";
import { createCustomerForActor } from "@/app/lib/crm/persistence/customerService";
import type { Actor } from "@/app/lib/tenancy/types";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory/types";
import {
  billDeliveryNotesForActor,
  createDeliveryNoteForActor,
  getDocumentSettingsForActor,
  getFinanceLogoBytesForActor,
  getInvoiceForActor,
  patchDocumentSettingsForActor,
  removeFinanceLogoForActor,
  uploadFinanceLogoForActor,
} from "@/app/lib/finance/persistence";

const prisma = new PrismaClient();

const TOKEN_A = "test_token_finance_docs_owner_a";
const TOKEN_B = "test_token_finance_docs_owner_b";
const TOKEN_MEMBER = "test_token_finance_docs_member_a";

const PNG_1x1 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

function customerDraft(email: string, companyName: string): CrmCustomerDraft {
  return {
    companyName,
    contactName: "Finance Contact",
    email,
    phone: "+49 40 1",
    website: "https://finance-test.example",
    industry: "Trade",
    country: "DE",
    city: "Hamburg",
    address: "Hafen 1",
    taxNumber: "DE999",
    status: "active",
    owner: "Owner",
    tags: "",
  };
}

async function resetFixtures(): Promise<void> {
  await prisma.financeDocumentSettings.deleteMany();
  await prisma.financeDocumentLogo.deleteMany();
  await prisma.financeIdempotencyKey.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.deliveryNote.deleteMany();
  await prisma.financeNumberSequence.deleteMany();
  await prisma.customerActivity.deleteMany();
  await prisma.customerDocument.deleteMany();
  await prisma.note.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.controlPlaneAuditEvent.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const ownerA = await prisma.user.create({
    data: { email: "fin-docs-owner-a@test.agxora", name: "Owner A", emailVerified: true },
  });
  const memberA = await prisma.user.create({
    data: { email: "fin-docs-member-a@test.agxora", name: "Member A", emailVerified: true },
  });
  const ownerB = await prisma.user.create({
    data: { email: "fin-docs-owner-b@test.agxora", name: "Owner B", emailVerified: true },
  });

  const orgA = await prisma.organization.create({
    data: {
      name: "Finance Docs Org A",
      slug: "finance-docs-org-a",
      ownerId: ownerA.id,
      workspaces: {
        create: [
          { name: "Default", slug: "default" },
          { name: "Second", slug: "second" },
        ],
      },
    },
    include: { workspaces: true },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "Finance Docs Org B",
      slug: "finance-docs-org-b",
      ownerId: ownerB.id,
      workspaces: { create: { name: "Default", slug: "default" } },
    },
    include: { workspaces: true },
  });

  const wsA = orgA.workspaces.find((row) => row.slug === "default")!;
  const wsA2 = orgA.workspaces.find((row) => row.slug === "second")!;
  const wsB = orgB.workspaces[0];

  await prisma.membership.createMany({
    data: [
      { userId: ownerA.id, organizationId: orgA.id, workspaceId: wsA.id, role: "OWNER" },
      { userId: memberA.id, organizationId: orgA.id, workspaceId: wsA.id, role: "MEMBER" },
      { userId: ownerA.id, organizationId: orgA.id, workspaceId: wsA2.id, role: "OWNER" },
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

describe("finance document settings", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns CLASSIC defaults without requiring a persisted row", async () => {
    const owner = await actor(TOKEN_A);
    const settings = await getDocumentSettingsForActor(owner);
    expect(settings.persisted).toBe(false);
    expect(settings.invoiceTemplate).toBe("CLASSIC");
    expect(settings.deliveryNoteTemplate).toBe("CLASSIC");
    expect(settings.branding.companyName).toBe("Finance Docs Org A");
    expect(settings.workspaceId).toBe(owner.workspaceId);
  });

  it("lets OWNER patch templates and branding for the active workspace only", async () => {
    const owner = await actor(TOKEN_A);
    const saved = await patchDocumentSettingsForActor(owner, {
      invoiceTemplate: "MODERN",
      deliveryNoteTemplate: "COMPACT",
      companyName: "Nordlicht Handel GmbH",
      street: "Speicherstadt 12",
      postalCode: "20457",
      city: "Hamburg",
      country: "Deutschland",
      vatId: "DE813312217",
      iban: "DE89370400440532013000",
      primaryColor: "#112233",
      secondaryColor: "#C4A35A",
    });
    expect(saved.persisted).toBe(true);
    expect(saved.invoiceTemplate).toBe("MODERN");
    expect(saved.deliveryNoteTemplate).toBe("COMPACT");
    expect(saved.branding.companyName).toBe("Nordlicht Handel GmbH");
    expect(saved.branding.primaryColor).toBe("#112233");

    const ownerB = await actor(TOKEN_B);
    const other = await getDocumentSettingsForActor(ownerB);
    expect(other.branding.companyName).toBe("Finance Docs Org B");
    expect(other.invoiceTemplate).toBe("CLASSIC");
    expect(other.persisted).toBe(false);
  });

  it("rejects invalid template and color input server-side", async () => {
    const owner = await actor(TOKEN_A);
    await expect(
      patchDocumentSettingsForActor(owner, { invoiceTemplate: "FANCY" as never }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      patchDocumentSettingsForActor(owner, { primaryColor: "navy" }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      patchDocumentSettingsForActor(owner, { qrPosition: "TOP" as never }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("allows MEMBER to read settings but not update branding or logos", async () => {
    const member = await actor(TOKEN_MEMBER);
    expect(canFinance(member, "finance.read")).toBe(true);
    expect(canFinance(member, "finance.document_settings")).toBe(false);
    const readable = await getDocumentSettingsForActor(member);
    expect(readable.invoiceTemplate).toBe("CLASSIC");
    await expect(
      patchDocumentSettingsForActor(member, { invoiceTemplate: "MODERN" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      uploadFinanceLogoForActor(member, { bytes: PNG_1x1, fileName: "logo.png", claimedType: "image/png" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(removeFinanceLogoForActor(member)).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      patchDocumentSettingsForActor(member, { qrEnabled: false }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("isolates logos between workspaces and tenants", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    const uploaded = await uploadFinanceLogoForActor(ownerA, {
      bytes: PNG_1x1,
      fileName: "brand.png",
      claimedType: "image/png",
    });
    const logoId = uploaded.branding.logoId;
    expect(logoId).toBeTruthy();
    const bytes = await getFinanceLogoBytesForActor(ownerA, logoId!);
    expect(bytes.mimeType).toBe("image/png");
    expect(bytes.bytes.byteLength).toBe(PNG_1x1.byteLength);
    await expect(getFinanceLogoBytesForActor(ownerB, logoId!)).rejects.toMatchObject({
      code: "not_found",
    });

    const ws2 = await prisma.workspace.findFirst({
      where: { organizationId: ownerA.organizationId, slug: "second" },
    });
    if (!ws2) throw new Error("missing second workspace");
    await prisma.session.updateMany({
      where: { tokenHash: (await prisma.session.findFirst({ where: { userId: ownerA.userId } }))!.tokenHash },
      data: { activeWorkspaceId: ws2.id },
    });
    const ownerA2 = await actor(TOKEN_A);
    await expect(getFinanceLogoBytesForActor(ownerA2, logoId!)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("rejects unsafe logo payloads", async () => {
    const owner = await actor(TOKEN_A);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await expect(
      uploadFinanceLogoForActor(owner, { bytes: svg, fileName: "x.svg", claimedType: "image/svg+xml" }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("freezes invoice snapshots so later branding edits do not rewrite issued documents", async () => {
    const owner = await actor(TOKEN_A);
    await patchDocumentSettingsForActor(owner, {
      invoiceTemplate: "PROFESSIONAL",
      deliveryNoteTemplate: "MODERN",
      companyName: "Nordlicht Handel GmbH",
      primaryColor: "#1B365D",
    });
    const customer = await createCustomerForActor(owner, customerDraft("snap@fin.test", "Hanseatische Handels GmbH"));
    const note = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      items: [{ description: "Widget", quantity: "1", unitPriceNet: "10.00", taxRate: "19.00" }],
    });
    expect(note.documentSnapshot?.template).toBe("MODERN");
    expect(note.documentSnapshot?.branding.companyName).toBe("Nordlicht Handel GmbH");

    const billed = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "docs-snapshot-bill",
    });
    expect(billed.invoice.documentSnapshot?.template).toBe("PROFESSIONAL");
    expect(billed.invoice.documentSnapshot?.branding.companyName).toBe("Nordlicht Handel GmbH");
    const frozenAt = billed.invoice.documentSnapshot?.frozenAt;

    await patchDocumentSettingsForActor(owner, {
      invoiceTemplate: "COMPACT",
      companyName: "Changed GmbH",
      primaryColor: "#FF0000",
    });

    const reloaded = await getInvoiceForActor(owner, billed.invoice.id);
    expect(reloaded.documentSnapshot?.template).toBe("PROFESSIONAL");
    expect(reloaded.documentSnapshot?.branding.companyName).toBe("Nordlicht Handel GmbH");
    expect(reloaded.documentSnapshot?.branding.primaryColor).toBe("#1B365D");
    expect(reloaded.documentSnapshot?.frozenAt).toBe(frozenAt);

    const ownerB = await actor(TOKEN_B);
    await expect(getInvoiceForActor(ownerB, billed.invoice.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("returns QR defaults without a persisted settings row", async () => {
    const owner = await actor(TOKEN_A);
    const settings = await getDocumentSettingsForActor(owner);
    expect(settings.qr.enabled).toBe(true);
    expect(settings.qr.position).toBe("BOTTOM_RIGHT");
    expect(settings.qr.includeAmount).toBe(true);
    expect(settings.qr.includeInvoiceNumber).toBe(true);
    expect(settings.qr.includeCustomerName).toBe(false);
  });

  it("lets OWNER patch QR settings for the active workspace only", async () => {
    const owner = await actor(TOKEN_A);
    const saved = await patchDocumentSettingsForActor(owner, {
      qrEnabled: true,
      qrPosition: "BOTTOM_LEFT",
      qrIncludeAmount: false,
      qrIncludeInvoiceNumber: true,
      qrIncludeCustomerName: true,
      qrRemittanceText: "Rechnung",
      iban: "DE89370400440532013000",
    });
    expect(saved.qr.position).toBe("BOTTOM_LEFT");
    expect(saved.qr.includeAmount).toBe(false);
    expect(saved.qr.remittanceText).toBe("Rechnung");
    const ownerB = await actor(TOKEN_B);
    const other = await getDocumentSettingsForActor(ownerB);
    expect(other.qr.position).toBe("BOTTOM_RIGHT");
    expect(other.persisted).toBe(false);
  });

  it("freezes invoice QR payment data so later IBAN edits do not rewrite issued documents", async () => {
    const owner = await actor(TOKEN_A);
    await patchDocumentSettingsForActor(owner, {
      companyName: "Nordlicht Handel GmbH",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      qrEnabled: true,
      qrIncludeAmount: true,
      qrIncludeInvoiceNumber: true,
    });
    const customer = await createCustomerForActor(owner, customerDraft("qr@fin.test", "Hanseatische Handels GmbH"));
    const note = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      items: [{ description: "Widget", quantity: "1", unitPriceNet: "10.00", taxRate: "19.00" }],
    });
    const billed = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "docs-qr-freeze",
    });
    const frozenPayload = billed.invoice.documentSnapshot?.payment?.epcPayload;
    expect(frozenPayload).toContain("BCD\n002\n1\nSCT");
    expect(frozenPayload).toContain("DE89370400440532013000");
    expect(billed.invoice.documentSnapshot?.payment?.iban).toBe("DE89370400440532013000");

    await patchDocumentSettingsForActor(owner, {
      iban: "DE44500105175407324931",
      companyName: "Changed GmbH",
    });

    const reloaded = await getInvoiceForActor(owner, billed.invoice.id);
    expect(reloaded.documentSnapshot?.payment?.iban).toBe("DE89370400440532013000");
    expect(reloaded.documentSnapshot?.payment?.epcPayload).toBe(frozenPayload);
    expect(reloaded.documentSnapshot?.payment?.epcPayload).not.toContain("DE44500105175407324931");
    expect(reloaded.documentSnapshot?.branding.iban).toBe("DE89370400440532013000");
  });

  it("still bills invoices when IBAN is missing and does not attach a broken QR payload", async () => {
    const owner = await actor(TOKEN_A);
    await patchDocumentSettingsForActor(owner, {
      companyName: "Nordlicht Handel GmbH",
      iban: "",
      qrEnabled: true,
    });
    const customer = await createCustomerForActor(owner, customerDraft("noiban@fin.test", "No Iban GmbH"));
    const note = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      items: [{ description: "Widget", quantity: "1", unitPriceNet: "10.00", taxRate: "19.00" }],
    });
    const billed = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "docs-qr-missing-iban",
    });
    expect(billed.invoice.id).toBeTruthy();
    expect(billed.invoice.documentSnapshot?.payment?.epcPayload).toBeNull();
    expect(billed.invoice.documentSnapshot?.payment?.missing).toContain("missing_iban");
  });
});
