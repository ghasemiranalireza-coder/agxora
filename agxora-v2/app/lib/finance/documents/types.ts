/**
 * Finance document templates & branding contracts.
 * Snapshots are JSON so issued documents stay stable after later branding edits.
 */

export const FINANCE_DOCUMENT_TEMPLATES = [
  "CLASSIC",
  "MODERN",
  "COMPACT",
  "PROFESSIONAL",
] as const;

export type FinanceDocumentTemplate = (typeof FINANCE_DOCUMENT_TEMPLATES)[number];

export type FinanceDocumentKind = "INVOICE" | "DELIVERY_NOTE";

export type FinanceBrandingView = {
  readonly companyName: string;
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly country: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
  readonly vatId: string;
  readonly taxNumber: string;
  readonly iban: string;
  readonly bic: string;
  readonly commercialRegister: string;
  readonly managingDirector: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly logoId: string | null;
};

export type FinanceCustomerBlock = {
  readonly companyName: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly taxNumber: string;
};

import type { FinancePaymentQrSnapshot, FinanceQrSettingsView } from "./epcQr";
export type {
  FinancePaymentQrContext,
  FinancePaymentQrSnapshot,
  FinanceQrPosition,
  FinanceQrSettingsView,
} from "./epcQr";
export { DEFAULT_QR_SETTINGS, emptyQrSettings, isFinanceQrPosition } from "./epcQr";

export type FinanceDocumentSnapshot = {
  readonly version: 1;
  readonly kind: FinanceDocumentKind;
  readonly template: FinanceDocumentTemplate;
  readonly branding: FinanceBrandingView;
  readonly customer: FinanceCustomerBlock;
  readonly frozenAt: string;
  readonly payment?: FinancePaymentQrSnapshot | null;
};

export type FinanceDocumentSettingsView = {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly invoiceTemplate: FinanceDocumentTemplate;
  readonly deliveryNoteTemplate: FinanceDocumentTemplate;
  readonly branding: FinanceBrandingView;
  readonly qr: FinanceQrSettingsView;
  readonly persisted: boolean;
  readonly updatedAt: string | null;
};

export type FinanceDocumentSettingsPatch = {
  readonly invoiceTemplate?: FinanceDocumentTemplate;
  readonly deliveryNoteTemplate?: FinanceDocumentTemplate;
  readonly companyName?: string;
  readonly street?: string;
  readonly postalCode?: string;
  readonly city?: string;
  readonly country?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly website?: string;
  readonly vatId?: string;
  readonly taxNumber?: string;
  readonly iban?: string;
  readonly bic?: string;
  readonly commercialRegister?: string;
  readonly managingDirector?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly qrEnabled?: boolean;
  readonly qrPosition?: FinanceQrSettingsView["position"];
  readonly qrIncludeAmount?: boolean;
  readonly qrIncludeInvoiceNumber?: boolean;
  readonly qrIncludeCustomerName?: boolean;
  readonly qrRemittanceText?: string;
};

export const DEFAULT_PRIMARY_COLOR = "#1B365D";
export const DEFAULT_SECONDARY_COLOR = "#C4A35A";
export const MAX_FINANCE_LOGO_BYTES = 512 * 1024;
export const FINANCE_LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type FinanceLogoMimeType = (typeof FINANCE_LOGO_MIME_TYPES)[number];

export function emptyBranding(companyName = ""): FinanceBrandingView {
  return {
    companyName,
    street: "",
    postalCode: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    vatId: "",
    taxNumber: "",
    iban: "",
    bic: "",
    commercialRegister: "",
    managingDirector: "",
    primaryColor: DEFAULT_PRIMARY_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
    logoId: null,
  };
}

export function financeLogoUrl(logoId: string | null | undefined): string | null {
  if (!logoId) return null;
  return `/api/v1/finance/document-logos/${logoId}`;
}

export function isFinanceDocumentTemplate(value: unknown): value is FinanceDocumentTemplate {
  return (
    typeof value === "string" &&
    (FINANCE_DOCUMENT_TEMPLATES as readonly string[]).includes(value)
  );
}
