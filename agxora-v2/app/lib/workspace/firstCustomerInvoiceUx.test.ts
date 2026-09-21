import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PersistenceError } from "../tenancy/errors";
import { validateDeliveryNoteDraft } from "../finance/core/validation";
import { HIDDEN_PRIMARY_NAV_HREFS, PRIMARY_NAV_ITEMS } from "./firstCustomerSurface";
import {
  FIRST_CUSTOMER_DELIVERY_NOTES_HREF,
  FIRST_CUSTOMER_INVOICES_HREF,
  createInvoiceHrefForCustomer,
  firstInvoiceDraftIssue,
  firstInvoiceDraftIssueMessageKey,
  invoiceDetailHref,
  invoiceStatusMessageKey,
  invoicesHrefForCustomer,
  isInvoiceMarkedPaid,
  isKnownInvoiceStatus,
  parseFinanceCustomerId,
  parseFinanceCustomerIdFromSearch,
  parseFinanceInvoiceStatus,
} from "./firstCustomerInvoiceUx";
import { QUICK_ACTIONS } from "./search-index";

const ROOT = path.resolve(__dirname, "../../..");
const CUSTOMER_ID = "2f1c9a7e-4b3d-4a91-9c2e-7d8f0b1a2c3d";
const INVOICE_ID = "8a4e2b11-6c70-45d2-a9f1-0c3d5e7f9a21";

describe("first-customer invoice UX", () => {
  it("builds the real CRM customer → Finance delivery-note create path", () => {
    expect(createInvoiceHrefForCustomer(CUSTOMER_ID)).toBe(
      `/dashboard/finance/delivery-notes?customerId=${CUSTOMER_ID}&create=1`,
    );
    expect(invoicesHrefForCustomer(CUSTOMER_ID)).toBe(
      `/dashboard/finance/invoices?customerId=${CUSTOMER_ID}`,
    );
    expect(invoiceDetailHref(INVOICE_ID)).toBe(
      `/dashboard/finance/invoices/${INVOICE_ID}`,
    );
    expect(FIRST_CUSTOMER_DELIVERY_NOTES_HREF).toBe(
      "/dashboard/finance/delivery-notes",
    );
    expect(FIRST_CUSTOMER_INVOICES_HREF).toBe("/dashboard/finance/invoices");
  });

  it("uses only the real customerId and ignores tenant ids from the client", () => {
    const params = new URLSearchParams({
      customerId: CUSTOMER_ID,
      organizationId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
    });
    expect(parseFinanceCustomerIdFromSearch(params)).toBe(CUSTOMER_ID);
    expect(params.get("organizationId")).toBe("11111111-1111-4111-8111-111111111111");
    expect(parseFinanceCustomerIdFromSearch(params)).not.toBe(
      params.get("organizationId"),
    );
    expect(parseFinanceCustomerIdFromSearch(params)).not.toBe(
      params.get("workspaceId"),
    );
    expect(createInvoiceHrefForCustomer(CUSTOMER_ID)).not.toContain("organizationId");
    expect(createInvoiceHrefForCustomer(CUSTOMER_ID)).not.toContain("workspaceId");
    expect(
      parseFinanceCustomerIdFromSearch(
        new URLSearchParams({
          organizationId: "11111111-1111-4111-8111-111111111111",
          workspaceId: "22222222-2222-4222-8222-222222222222",
        }),
      ),
    ).toBeNull();
  });

  it("rejects missing or invalid customer ids", () => {
    expect(parseFinanceCustomerId("")).toBeNull();
    expect(parseFinanceCustomerId("cus_local_mock")).toBeNull();
    expect(parseFinanceCustomerId("not-a-uuid")).toBeNull();
    expect(createInvoiceHrefForCustomer("")).toBe(FIRST_CUSTOMER_DELIVERY_NOTES_HREF);
    expect(firstInvoiceDraftIssue({ customerId: "", items: [{ description: "Work" }] })).toBe(
      "missingCustomer",
    );
    expect(firstInvoiceDraftIssueMessageKey("missingCustomer")).toBe(
      "finance.core.errors.missingCustomer",
    );
    expect(() =>
      validateDeliveryNoteDraft({
        customerId: "",
        items: [{ description: "Work", quantity: "1", unitPriceNet: "10.00" }],
      }),
    ).toThrow(PersistenceError);
  });

  it("validates required line data before persistence", () => {
    expect(
      firstInvoiceDraftIssue({
        customerId: CUSTOMER_ID,
        items: [{ description: "", quantity: "1", unitPriceNet: "10" }],
      }),
    ).toBe("missingLine");
    expect(
      firstInvoiceDraftIssue({
        customerId: CUSTOMER_ID,
        items: [{ description: "Work", quantity: "-1", unitPriceNet: "10" }],
      }),
    ).toBe("invalidAmount");
    expect(
      firstInvoiceDraftIssue({
        customerId: CUSTOMER_ID,
        items: [{ description: "Work", quantity: "2", unitPriceNet: "40.00" }],
      }),
    ).toBeNull();
    expect(() =>
      validateDeliveryNoteDraft({
        customerId: CUSTOMER_ID,
        items: [{ description: "Work", quantity: "-1", unitPriceNet: "10.00" }],
      }),
    ).toThrow(/quantity and price must be >= 0/i);
  });

  it("does not invent sent or paid statuses", () => {
    expect(isKnownInvoiceStatus("SENT")).toBe(false);
    expect(isKnownInvoiceStatus("CREATED")).toBe(false);
    expect(isInvoiceMarkedPaid("OPEN")).toBe(false);
    expect(isInvoiceMarkedPaid("DRAFT")).toBe(false);
    expect(isInvoiceMarkedPaid("PAID")).toBe(true);
    expect(invoiceStatusMessageKey("PAID")).toBe("finance.core.invoiceStatus.PAID");
    expect(invoiceStatusMessageKey("SENT")).toBe("finance.core.invoice.unknownStatus");
    expect(parseFinanceInvoiceStatus("SENT")).toBeNull();
    expect(parseFinanceInvoiceStatus("OPEN")).toBe("OPEN");
  });

  it("wires the CRM create-invoice CTA to the real customerId", () => {
    const profile = readFileSync(
      path.join(ROOT, "app/components/crm/enterprise/CrmCustomerProfile.tsx"),
      "utf8",
    );
    const invoices = readFileSync(
      path.join(ROOT, "app/components/crm/enterprise/CrmCustomerInvoices.tsx"),
      "utf8",
    );
    expect(profile).toContain("createInvoiceHrefForCustomer(customer.id)");
    expect(profile).toContain("CrmCustomerInvoices");
    expect(invoices).toContain("fetchInvoices({ customerId })");
    expect(invoices).toContain("createInvoiceHrefForCustomer(customerId)");
    expect(invoices).toContain("invoiceDetailHref(invoice.id)");
    expect(invoices).not.toContain("localStorage");
  });

  it("scopes Finance workspaces by customerId and waits for persistence before success", () => {
    const delivery = readFileSync(
      path.join(ROOT, "app/components/finance/core/DeliveryNoteWorkspace.tsx"),
      "utf8",
    );
    const invoices = readFileSync(
      path.join(ROOT, "app/components/finance/core/InvoiceWorkspace.tsx"),
      "utf8",
    );
    expect(delivery).toContain("parseFinanceCustomerIdFromSearch");
    expect(delivery).toContain("firstInvoiceDraftIssue");
    expect(delivery).toContain("if (!saved?.id)");
    expect(delivery).toContain("if (!invoice?.id)");
    expect(delivery).toContain("router.push(`/dashboard/finance/invoices/${invoice.id}`)");
    expect(invoices).toContain("customerId: scopedCustomerId ?? undefined");
    expect(invoices).toContain("isInvoiceMarkedPaid");
    expect(invoices).not.toMatch(/sent/i);
  });

  it("keeps tenant ownership on the existing Finance billing path", () => {
    const billing = readFileSync(
      path.join(ROOT, "app/lib/finance/persistence/billingService.ts"),
      "utf8",
    );
    expect(billing).toContain(
      "where: { id: customerId, workspaceId: actor.workspaceId, organizationId: actor.organizationId }",
    );
    expect(billing).toContain("assertFinance(actor");
    expect(billing).not.toMatch(/organizationId:\s*input/);
  });

  it("does not change SEPA/EPC QR payload logic or document-settings SoT", () => {
    const qr = readFileSync(
      path.join(ROOT, "app/lib/finance/documents/epcQr.ts"),
      "utf8",
    );
    const snapshot = readFileSync(
      path.join(ROOT, "app/lib/finance/documents/snapshot.ts"),
      "utf8",
    );
    expect(qr).toContain("BCD");
    expect(qr).toContain("SCT");
    expect(snapshot).toContain("buildPaymentQrSnapshot");
    expect(snapshot).toContain("INVOICE");
    expect(
      QUICK_ACTIONS.find((item) => item.id === "action-create-invoice")?.href,
    ).toBe("/dashboard/finance/delivery-notes");
    expect(PRIMARY_NAV_ITEMS.some((item) => item.href === "/dashboard/finance")).toBe(
      true,
    );
    expect(HIDDEN_PRIMARY_NAV_HREFS).not.toContain("/dashboard/finance");
    expect(
      existsSync(path.join(ROOT, "prisma/schema.prisma")),
    ).toBe(true);
    const schema = readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("enum InvoiceStatus");
    expect(schema).toContain("model FinanceDocumentSettings");
  });
});
