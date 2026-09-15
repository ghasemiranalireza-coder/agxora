import type {
  FinanceBrandingView,
  FinanceCustomerBlock,
  FinanceDocumentKind,
  FinancePaymentQrSnapshot,
} from "../../../lib/finance/documents/types";

export type FinanceDocumentLine = {
  readonly description: string;
  readonly quantity: string;
  readonly unit: string;
  readonly unitPriceNet: string;
  readonly taxRate: string;
  readonly lineTotalNet: string;
};

export type FinanceDocumentModel = {
  readonly kind: FinanceDocumentKind;
  readonly number: string;
  readonly date: string;
  readonly dueDate?: string;
  readonly orderNumber?: string;
  readonly notes?: string;
  readonly currency: string;
  readonly netTotal: string;
  readonly taxTotal: string;
  readonly grossTotal: string;
  readonly branding: FinanceBrandingView;
  readonly customer: FinanceCustomerBlock;
  readonly items: readonly FinanceDocumentLine[];
  readonly payment?: FinancePaymentQrSnapshot | null;
};

export const SAMPLE_BRANDING: FinanceBrandingView = {
  companyName: "Nordlicht Handel GmbH",
  street: "Speicherstadt 12",
  postalCode: "20457",
  city: "Hamburg",
  country: "Deutschland",
  phone: "+49 40 3000 120",
  email: "finance@nordlicht.example",
  website: "www.nordlicht.example",
  vatId: "DE813312217",
  taxNumber: "41/123/45678",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  commercialRegister: "HRB 123456, Amtsgericht Hamburg",
  managingDirector: "Clara Nordlicht",
  primaryColor: "#1B365D",
  secondaryColor: "#C4A35A",
  logoId: null,
};

export const SAMPLE_CUSTOMER: FinanceCustomerBlock = {
  companyName: "Hanseatische Handels GmbH",
  address: "Elbchaussee 210",
  city: "Hamburg",
  country: "Deutschland",
  taxNumber: "DE999111222",
};

export function sampleInvoice(
  branding: FinanceBrandingView,
  payment?: FinancePaymentQrSnapshot | null,
): FinanceDocumentModel {
  return {
    kind: "INVOICE",
    number: "RE-2026-000001",
    date: "2026-09-15",
    dueDate: "2026-09-29",
    orderNumber: "AUF-2026-001",
    currency: "EUR",
    netTotal: "2715.00",
    taxTotal: "505.05",
    grossTotal: "3220.05",
    branding,
    customer: SAMPLE_CUSTOMER,
    payment: payment ?? undefined,
    items: [
      {
        description: "Industriepumpe",
        quantity: "2",
        unit: "Stk",
        unitPriceNet: "1250.50",
        taxRate: "19.00",
        lineTotalNet: "2501.00",
      },
      {
        description: "Dichtungssatz",
        quantity: "10",
        unit: "Stk",
        unitPriceNet: "12.40",
        taxRate: "19.00",
        lineTotalNet: "124.00",
      },
      {
        description: "Inbetriebnahme",
        quantity: "1",
        unit: "Std",
        unitPriceNet: "90.00",
        taxRate: "19.00",
        lineTotalNet: "90.00",
      },
    ],
  };
}

export function sampleDeliveryNote(branding: FinanceBrandingView): FinanceDocumentModel {
  return {
    kind: "DELIVERY_NOTE",
    number: "LS-2026-000001",
    date: "2026-09-15",
    orderNumber: "AUF-2026-001",
    currency: "EUR",
    netTotal: "2501.00",
    taxTotal: "475.19",
    grossTotal: "2976.19",
    branding,
    customer: SAMPLE_CUSTOMER,
    items: [
      {
        description: "Industriepumpe",
        quantity: "2",
        unit: "Stk",
        unitPriceNet: "1250.50",
        taxRate: "19.00",
        lineTotalNet: "2501.00",
      },
    ],
  };
}
