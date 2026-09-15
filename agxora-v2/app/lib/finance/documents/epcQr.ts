/**
 * EPC069-12 / GiroCode SEPA Credit Transfer QR payload.
 * Pure encoding + validation — no I/O, safe for tests and client preview.
 */

export const FINANCE_QR_POSITIONS = ["BOTTOM_RIGHT", "BOTTOM_LEFT", "AFTER_TOTALS"] as const;
export type FinanceQrPosition = (typeof FINANCE_QR_POSITIONS)[number];

export type FinanceQrSettingsView = {
  readonly enabled: boolean;
  readonly position: FinanceQrPosition;
  readonly includeAmount: boolean;
  readonly includeInvoiceNumber: boolean;
  readonly includeCustomerName: boolean;
  readonly remittanceText: string;
};

export type FinancePaymentQrContext = {
  readonly amount: string;
  readonly currency: string;
  readonly invoiceNumber: string;
  readonly customerName: string;
};

export type FinancePaymentQrSnapshot = {
  readonly enabled: boolean;
  readonly position: FinanceQrPosition;
  readonly includeAmount: boolean;
  readonly includeInvoiceNumber: boolean;
  readonly includeCustomerName: boolean;
  readonly remittanceText: string;
  readonly beneficiaryName: string;
  readonly iban: string;
  readonly bic: string;
  readonly amount: string | null;
  readonly currency: "EUR";
  readonly reference: string | null;
  readonly customerName: string | null;
  readonly epcPayload: string | null;
  readonly missing: readonly string[];
};

export const DEFAULT_QR_SETTINGS: FinanceQrSettingsView = {
  enabled: true,
  position: "BOTTOM_RIGHT",
  includeAmount: true,
  includeInvoiceNumber: true,
  includeCustomerName: false,
  remittanceText: "",
};

const IBAN_CHAR = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/;
const BIC_RE = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export function emptyQrSettings(): FinanceQrSettingsView {
  return { ...DEFAULT_QR_SETTINGS };
}

export function isFinanceQrPosition(value: unknown): value is FinanceQrPosition {
  return typeof value === "string" && (FINANCE_QR_POSITIONS as readonly string[]).includes(value);
}

export function normalizeIban(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

export function normalizeBic(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (iban.length < 15 || iban.length > 34) return false;
  if (!IBAN_CHAR.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = "";
  for (const ch of rearranged) {
    expanded += /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
  }
  let remainder = 0;
  for (const digit of expanded) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function isValidBic(value: string): boolean {
  const bic = normalizeBic(value);
  return bic.length === 0 || BIC_RE.test(bic);
}

function oneLine(value: string, max: number): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function formatEpcAmount(amount: string): string | null {
  const parsed = Number(amount.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0.01 || parsed > 999_999_999.99) {
    return null;
  }
  return `EUR${parsed.toFixed(2)}`;
}

export function buildEpcQrPayload(input: {
  readonly beneficiaryName: string;
  readonly iban: string;
  readonly bic?: string;
  readonly amount?: string | null;
  readonly remittance?: string | null;
}): { readonly payload: string | null; readonly missing: readonly string[] } {
  const missing: string[] = [];
  const name = oneLine(input.beneficiaryName, 70);
  if (!name) missing.push("missing_beneficiary");
  const iban = normalizeIban(input.iban);
  if (!iban) missing.push("missing_iban");
  else if (!isValidIban(iban)) missing.push("invalid_iban");
  const bic = input.bic ? normalizeBic(input.bic) : "";
  if (bic && !isValidBic(bic)) missing.push("invalid_bic");
  let amountLine = "";
  if (input.amount != null && input.amount !== "") {
    const formatted = formatEpcAmount(input.amount);
    if (!formatted) missing.push("invalid_amount");
    else amountLine = formatted;
  }
  const remittance = oneLine(input.remittance ?? "", 140);
  if (missing.length > 0) {
    return { payload: null, missing };
  }
  const payload = [
    "BCD",
    "002",
    "1",
    "SCT",
    bic,
    name,
    iban,
    amountLine,
    "",
    remittance,
  ].join("\n");
  return { payload, missing: [] };
}

export function buildPaymentQrSnapshot(
  qr: FinanceQrSettingsView,
  branding: { readonly companyName: string; readonly iban: string; readonly bic: string },
  context: FinancePaymentQrContext,
): FinancePaymentQrSnapshot {
  const beneficiaryName = oneLine(branding.companyName, 70);
  const iban = normalizeIban(branding.iban);
  const bic = normalizeBic(branding.bic);
  if (!qr.enabled) {
    return {
      enabled: false,
      position: qr.position,
      includeAmount: qr.includeAmount,
      includeInvoiceNumber: qr.includeInvoiceNumber,
      includeCustomerName: qr.includeCustomerName,
      remittanceText: qr.remittanceText,
      beneficiaryName,
      iban,
      bic,
      amount: null,
      currency: "EUR",
      reference: null,
      customerName: null,
      epcPayload: null,
      missing: [],
    };
  }
  const missing: string[] = [];
  if (context.currency && context.currency.toUpperCase() !== "EUR") {
    missing.push("invalid_currency");
  }
  const amount = qr.includeAmount ? context.amount : null;
  const reference = qr.includeInvoiceNumber ? oneLine(context.invoiceNumber, 35) : null;
  const customerName = qr.includeCustomerName ? oneLine(context.customerName, 70) : null;
  const remittanceParts = [
    qr.includeInvoiceNumber ? context.invoiceNumber : "",
    qr.remittanceText,
    qr.includeCustomerName ? context.customerName : "",
  ]
    .map((part) => oneLine(part, 140))
    .filter(Boolean);
  const remittance = remittanceParts.join(" ").slice(0, 140);
  const encoded = buildEpcQrPayload({
    beneficiaryName,
    iban,
    bic,
    amount,
    remittance,
  });
  return {
    enabled: true,
    position: qr.position,
    includeAmount: qr.includeAmount,
    includeInvoiceNumber: qr.includeInvoiceNumber,
    includeCustomerName: qr.includeCustomerName,
    remittanceText: oneLine(qr.remittanceText, 140),
    beneficiaryName,
    iban,
    bic,
    amount: qr.includeAmount ? context.amount : null,
    currency: "EUR",
    reference,
    customerName,
    epcPayload: missing.length > 0 ? null : encoded.payload,
    missing: missing.length > 0 ? missing : encoded.missing,
  };
}
