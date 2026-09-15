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
  deleteDeliveryNoteItemForActor,
  getDeliveryNoteForActor,
  getFinanceOverviewForActor,
  getInvoiceForActor,
  listDeliveryNotesForActor,
  listInvoicesForActor,
  previewBillingForActor,
  updateDeliveryNoteForActor,
  updateInvoiceStatusForActor,
} from "@/app/lib/finance/persistence";
import { handleFinanceTool } from "@/features/agents/finance/handlers";
import { getToolDefinition } from "@/features/agents/tools";

const prisma = new PrismaClient();

const TOKEN_A = "test_token_finance_owner_a";
const TOKEN_B = "test_token_finance_owner_b";
const TOKEN_MEMBER = "test_token_finance_member_a";

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

function line(partial?: Partial<{ description: string; quantity: string; unitPriceNet: string; taxRate: string }>) {
  return {
    description: partial?.description ?? "Widget",
    quantity: partial?.quantity ?? "1",
    unit: "Stk",
    unitPriceNet: partial?.unitPriceNet ?? "10.00",
    taxRate: partial?.taxRate ?? "19.00",
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
    data: { email: "fin-owner-a@test.agxora", name: "Owner A", emailVerified: true },
  });
  const memberA = await prisma.user.create({
    data: { email: "fin-member-a@test.agxora", name: "Member A", emailVerified: true },
  });
  const ownerB = await prisma.user.create({
    data: { email: "fin-owner-b@test.agxora", name: "Owner B", emailVerified: true },
  });

  const orgA = await prisma.organization.create({
    data: {
      name: "Finance Org A",
      slug: "finance-org-a",
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
      name: "Finance Org B",
      slug: "finance-org-b",
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

describe("Phase 80 finance Lieferschein → Rechnung", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates, updates, lists, and filters delivery notes", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("a@fin.test", "Alpha GmbH"));
    const created = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      orderNumber: "PO-1",
      items: [line({ unitPriceNet: "25.50", quantity: "2" })],
    });
    expect(created.number).toMatch(/^LS-\d{4}-\d{6}$/);
    expect(created.status).toBe("OPEN");
    expect(created.netTotal).toBe("51.00");
    expect(created.taxTotal).toBe("9.69");
    expect(created.grossTotal).toBe("60.69");

    const updated = await updateDeliveryNoteForActor(owner, created.id, {
      customerId: customer.id,
      orderNumber: "PO-2",
      items: [line({ quantity: "3", unitPriceNet: "10.00" })],
    });
    expect(updated.orderNumber).toBe("PO-2");
    expect(updated.netTotal).toBe("30.00");

    const listed = await listDeliveryNotesForActor(owner, { status: "OPEN", query: "LS-" });
    expect(listed.some((row) => row.id === created.id)).toBe(true);
    const fetched = await getDeliveryNoteForActor(owner, created.id);
    expect(fetched.orderNumber).toBe("PO-2");
  });

  it("bills one delivery note into a draft invoice", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("b@fin.test", "Beta GmbH"));
    const note = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      items: [line()],
    });
    const billed = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "bill-one-note-0001",
    });
    expect(billed.idempotentReplay).toBe(false);
    expect(billed.invoice.status).toBe("DRAFT");
    expect(billed.invoice.invoiceNumber).toMatch(/^RE-\d{4}-\d{6}$/);
    expect(billed.invoice.sourceDeliveryNotes).toHaveLength(1);
    expect(billed.invoice.sourceDeliveryNotes[0].id).toBe(note.id);
    const reloaded = await getDeliveryNoteForActor(owner, note.id);
    expect(reloaded.status).toBe("ABGERECHNET");
    expect(reloaded.invoiceId).toBe(billed.invoice.id);
  });

  it("bills multiple delivery notes into one invoice", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("c@fin.test", "Gamma GmbH"));
    const first = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      items: [line({ unitPriceNet: "10.00" })],
    });
    const second = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      items: [line({ unitPriceNet: "15.00", taxRate: "7.00" })],
    });
    const billed = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [second.id, first.id],
      idempotencyKey: "bill-multi-0001",
    });
    expect(billed.invoice.sourceDeliveryNotes).toHaveLength(2);
    expect(billed.invoice.items).toHaveLength(2);
    expect(billed.invoice.netTotal).toBe("25.00");
    expect(billed.invoice.taxTotal).toBe("2.95");
    expect(billed.invoice.grossTotal).toBe("27.95");
  });

  it("rejects mixed customers", async () => {
    const owner = await actor(TOKEN_A);
    const a = await createCustomerForActor(owner, customerDraft("d1@fin.test", "One GmbH"));
    const b = await createCustomerForActor(owner, customerDraft("d2@fin.test", "Two GmbH"));
    const noteA = await createDeliveryNoteForActor(owner, { customerId: a.id, items: [line()] });
    const noteB = await createDeliveryNoteForActor(owner, { customerId: b.id, items: [line()] });
    await expect(
      billDeliveryNotesForActor(owner, {
        deliveryNoteIds: [noteA.id, noteB.id],
        idempotencyKey: "mixed-customers",
      }),
    ).rejects.toMatchObject({
      code: "validation",
      message: expect.stringMatching(/same customer/i),
    });
    expect((await getDeliveryNoteForActor(owner, noteA.id)).status).toBe("OPEN");
    expect(await listInvoicesForActor(owner)).toHaveLength(0);
  });

  it("rejects already billed delivery notes", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("e@fin.test", "Echo GmbH"));
    const note = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "first-bill",
    });
    await expect(
      billDeliveryNotesForActor(owner, {
        deliveryNoteIds: [note.id],
        idempotencyKey: "second-bill",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("replays duplicate billing requests idempotently", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("f@fin.test", "Foxtrot GmbH"));
    const note = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    const first = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "same-key-repeat",
    });
    const second = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "same-key-repeat",
    });
    expect(second.idempotentReplay).toBe(true);
    expect(second.invoice.id).toBe(first.invoice.id);
    expect(await listInvoicesForActor(owner)).toHaveLength(1);
  });

  it("rolls back when a note is no longer open inside the transaction", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("g@fin.test", "Golf GmbH"));
    const open = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    const extra = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    await prisma.deliveryNote.update({
      where: { id: extra.id },
      data: { status: "CANCELLED" },
    });
    await expect(
      billDeliveryNotesForActor(owner, {
        deliveryNoteIds: [open.id, extra.id],
        idempotencyKey: "rollback-key",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
    expect((await getDeliveryNoteForActor(owner, open.id)).status).toBe("OPEN");
    expect(await listInvoicesForActor(owner)).toHaveLength(0);
  });

  it("isolates tenants and workspaces", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    const customerA = await createCustomerForActor(ownerA, customerDraft("h@fin.test", "Hotel GmbH"));
    const note = await createDeliveryNoteForActor(ownerA, { customerId: customerA.id, items: [line()] });
    await expect(getDeliveryNoteForActor(ownerB, note.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(
      billDeliveryNotesForActor(ownerB, {
        deliveryNoteIds: [note.id],
        idempotencyKey: "cross-tenant",
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    const ws2 = await prisma.workspace.findFirst({
      where: { organizationId: ownerA.organizationId, slug: "second" },
    });
    if (!ws2) throw new Error("missing second workspace");
    await prisma.session.updateMany({
      where: { tokenHash: (await prisma.session.findFirst({ where: { userId: ownerA.userId } }))!.tokenHash },
      data: { activeWorkspaceId: ws2.id },
    });
    const ownerA2 = await actor(TOKEN_A);
    expect(ownerA2.workspaceId).toBe(ws2.id);
    await expect(getDeliveryNoteForActor(ownerA2, note.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("does not leak customer or invoice ownership across actors", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    const customerA = await createCustomerForActor(ownerA, customerDraft("i@fin.test", "India GmbH"));
    await expect(
      createDeliveryNoteForActor(ownerB, { customerId: customerA.id, items: [line()] }),
    ).rejects.toMatchObject({ code: "not_found" });
    const note = await createDeliveryNoteForActor(ownerA, { customerId: customerA.id, items: [line()] });
    const billed = await billDeliveryNotesForActor(ownerA, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "own-invoice",
    });
    await expect(getInvoiceForActor(ownerB, billed.invoice.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("assigns unique invoice numbers per workspace", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("j@fin.test", "Juliet GmbH"));
    const n1 = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    const n2 = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    const i1 = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [n1.id],
      idempotencyKey: "invoice-num-1",
    });
    const i2 = await billDeliveryNotesForActor(owner, {
      deliveryNoteIds: [n2.id],
      idempotencyKey: "invoice-num-2",
    });
    expect(i1.invoice.invoiceNumber).not.toBe(i2.invoice.invoiceNumber);
  });

  it("returns honest empty overview counts", async () => {
    const owner = await actor(TOKEN_A);
    const overview = await getFinanceOverviewForActor(owner);
    expect(overview.openDeliveryNotes).toBe(0);
    expect(overview.openInvoices).toBe(0);
    expect(overview.totalDeliveryNotes).toBe(0);
    expect(overview.totalInvoices).toBe(0);
  });

  it("previews all-open billing for one customer without writing", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("k@fin.test", "Kilo GmbH"));
    const note = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    const preview = await previewBillingForActor(owner, {
      mode: "all_open",
      customerId: customer.id,
    });
    expect(preview.deliveryNoteCount).toBe(1);
    expect(preview.deliveryNotes[0].id).toBe(note.id);
    expect((await getDeliveryNoteForActor(owner, note.id)).status).toBe("OPEN");
    expect(await listInvoicesForActor(owner)).toHaveLength(0);
  });

  it("requires finance.status for invoice status changes", async () => {
    const owner = await actor(TOKEN_A);
    const member = await actor(TOKEN_MEMBER);
    expect(canFinance(member, "finance.bill")).toBe(true);
    expect(canFinance(member, "finance.status")).toBe(false);
    expect(canFinance(member, "finance.document_settings")).toBe(false);
    const customer = await createCustomerForActor(owner, customerDraft("l@fin.test", "Lima GmbH"));
    const note = await createDeliveryNoteForActor(member, { customerId: customer.id, items: [line()] });
    const billed = await billDeliveryNotesForActor(member, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "member-bill",
    });
    await expect(updateInvoiceStatusForActor(member, billed.invoice.id, "OPEN")).rejects.toMatchObject({
      code: "forbidden",
    });
    const opened = await updateInvoiceStatusForActor(owner, billed.invoice.id, "OPEN");
    expect(opened.status).toBe("OPEN");
  });

  it("keeps the agent finance tool on the approval-controlled API path", async () => {
    const def = getToolDefinition("finance");
    expect(def?.requiresApproval).toBe(true);
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("m@fin.test", "Mike GmbH"));
    const note = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    const result = await handleFinanceTool({
      organizationId: owner.organizationId,
      workspaceId: owner.workspaceId,
      agentInstanceId: "agent-finance",
      taskId: "task-finance",
      params: {
        action: "create_invoice_from_eligible_delivery_notes",
        deliveryNoteIds: [note.id],
      },
    });
    expect(result.ok).toBe(true);
    expect(result.approvalRequired).toBe(true);
    expect(result.output).toMatchObject({
      billed: false,
      endpoint: "/api/v1/finance/invoices/bill",
    });
    expect((await getDeliveryNoteForActor(owner, note.id)).status).toBe("OPEN");
    expect(await listInvoicesForActor(owner)).toHaveLength(0);
  });

  it("deletes one delivery note item without deleting the note", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("item-del@fin.test", "Item GmbH"));
    const note = await createDeliveryNoteForActor(owner, {
      customerId: customer.id,
      items: [line({ description: "Keep", unitPriceNet: "10.00" }), line({ description: "Drop", unitPriceNet: "5.00" })],
    });
    expect(note.items).toHaveLength(2);
    const drop = note.items.find((item) => item.description === "Drop");
    if (!drop) throw new Error("missing drop item");
    const updated = await deleteDeliveryNoteItemForActor(owner, note.id, drop.id);
    expect(updated.id).toBe(note.id);
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].description).toBe("Keep");
    expect(updated.items[0].position).toBe(1);
    expect(updated.netTotal).toBe("10.00");
    expect((await getDeliveryNoteForActor(owner, note.id)).items).toHaveLength(1);
  });

  it("rejects deleting the last delivery note item", async () => {
    const owner = await actor(TOKEN_A);
    const customer = await createCustomerForActor(owner, customerDraft("last-item@fin.test", "Last GmbH"));
    const note = await createDeliveryNoteForActor(owner, { customerId: customer.id, items: [line()] });
    await expect(deleteDeliveryNoteItemForActor(owner, note.id, note.items[0].id)).rejects.toMatchObject({
      code: "validation",
    });
    expect((await getDeliveryNoteForActor(owner, note.id)).items).toHaveLength(1);
  });

  it("rejects deleting items on billed notes and across tenants", async () => {
    const ownerA = await actor(TOKEN_A);
    const ownerB = await actor(TOKEN_B);
    const customer = await createCustomerForActor(ownerA, customerDraft("billed-item@fin.test", "Billed GmbH"));
    const note = await createDeliveryNoteForActor(ownerA, {
      customerId: customer.id,
      items: [line({ description: "A" }), line({ description: "B" })],
    });
    await expect(deleteDeliveryNoteItemForActor(ownerB, note.id, note.items[0].id)).rejects.toMatchObject({
      code: "not_found",
    });
    await billDeliveryNotesForActor(ownerA, {
      deliveryNoteIds: [note.id],
      idempotencyKey: "bill-then-delete-item",
    });
    await expect(deleteDeliveryNoteItemForActor(ownerA, note.id, note.items[0].id)).rejects.toMatchObject({
      code: "conflict",
    });
    expect((await getDeliveryNoteForActor(ownerA, note.id)).items).toHaveLength(2);
  });
});
