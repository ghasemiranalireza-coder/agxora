import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  FINANCE_DOCUMENT_TEMPLATES,
  FINANCE_LOGO_MIME_TYPES,
  MAX_FINANCE_LOGO_BYTES,
  emptyBranding,
  isFinanceDocumentTemplate,
  type FinanceBrandingView,
  type FinanceCustomerBlock,
  type FinanceDocumentKind,
  type FinanceDocumentSettingsPatch,
  type FinanceDocumentSnapshot,
  type FinanceDocumentTemplate,
  type FinanceLogoMimeType,
} from "./types";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const TEXT_LIMITS: Record<string, number> = {
  companyName: 160,
  street: 160,
  postalCode: 24,
  city: 80,
  country: 80,
  phone: 40,
  email: 160,
  website: 200,
  vatId: 40,
  taxNumber: 40,
  iban: 42,
  bic: 16,
  commercialRegister: 160,
  managingDirector: 120,
};

export function normalizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return fallback;
  return `#${trimmed.slice(1).toUpperCase()}`;
}

function clip(value: unknown, field: keyof typeof TEXT_LIMITS): string {
  if (value == null) return "";
  if (typeof value !== "string") {
    throw new PersistenceError("validation", `Invalid ${field}`);
  }
  const trimmed = value.trim();
  if (trimmed.length > TEXT_LIMITS[field]) {
    throw new PersistenceError("validation", `${field} is too long`);
  }
  return trimmed;
}

export function parseTemplate(value: unknown, field: string): FinanceDocumentTemplate {
  if (!isFinanceDocumentTemplate(value)) {
    throw new PersistenceError(
      "validation",
      `${field} must be one of ${FINANCE_DOCUMENT_TEMPLATES.join(", ")}`,
    );
  }
  return value;
}

export function parseSettingsPatch(input: FinanceDocumentSettingsPatch): FinanceDocumentSettingsPatch {
  const patch: {
    invoiceTemplate?: FinanceDocumentTemplate;
    deliveryNoteTemplate?: FinanceDocumentTemplate;
    companyName?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    vatId?: string;
    taxNumber?: string;
    iban?: string;
    bic?: string;
    commercialRegister?: string;
    managingDirector?: string;
    primaryColor?: string;
    secondaryColor?: string;
  } = {};
  if (input.invoiceTemplate !== undefined) {
    patch.invoiceTemplate = parseTemplate(input.invoiceTemplate, "invoiceTemplate");
  }
  if (input.deliveryNoteTemplate !== undefined) {
    patch.deliveryNoteTemplate = parseTemplate(input.deliveryNoteTemplate, "deliveryNoteTemplate");
  }
  if (input.companyName !== undefined) patch.companyName = clip(input.companyName, "companyName");
  if (input.street !== undefined) patch.street = clip(input.street, "street");
  if (input.postalCode !== undefined) patch.postalCode = clip(input.postalCode, "postalCode");
  if (input.city !== undefined) patch.city = clip(input.city, "city");
  if (input.country !== undefined) patch.country = clip(input.country, "country");
  if (input.phone !== undefined) patch.phone = clip(input.phone, "phone");
  if (input.email !== undefined) patch.email = clip(input.email, "email");
  if (input.website !== undefined) patch.website = clip(input.website, "website");
  if (input.vatId !== undefined) patch.vatId = clip(input.vatId, "vatId");
  if (input.taxNumber !== undefined) patch.taxNumber = clip(input.taxNumber, "taxNumber");
  if (input.iban !== undefined) patch.iban = clip(input.iban, "iban");
  if (input.bic !== undefined) patch.bic = clip(input.bic, "bic");
  if (input.commercialRegister !== undefined) {
    patch.commercialRegister = clip(input.commercialRegister, "commercialRegister");
  }
  if (input.managingDirector !== undefined) {
    patch.managingDirector = clip(input.managingDirector, "managingDirector");
  }
  if (input.primaryColor !== undefined) {
    const color = input.primaryColor.trim();
    if (!HEX_COLOR.test(color)) {
      throw new PersistenceError("validation", "Invalid primaryColor");
    }
    patch.primaryColor = normalizeHexColor(color, DEFAULT_PRIMARY_COLOR);
  }
  if (input.secondaryColor !== undefined) {
    const color = input.secondaryColor.trim();
    if (!HEX_COLOR.test(color)) {
      throw new PersistenceError("validation", "Invalid secondaryColor");
    }
    patch.secondaryColor = normalizeHexColor(color, DEFAULT_SECONDARY_COLOR);
  }
  return patch;
}

export function detectLogoMime(bytes: Uint8Array): FinanceLogoMimeType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }
  return null;
}

export function assertSafeLogoBytes(bytes: Uint8Array, claimedType?: string): FinanceLogoMimeType {
  if (bytes.length === 0) {
    throw new PersistenceError("validation", "Logo file is empty");
  }
  if (bytes.length > MAX_FINANCE_LOGO_BYTES) {
    throw new PersistenceError("validation", "Logo must be 512 KB or smaller");
  }
  const detected = detectLogoMime(bytes);
  if (!detected) {
    throw new PersistenceError("validation", "Logo must be PNG, JPEG, or WebP");
  }
  if (claimedType && claimedType !== "application/octet-stream") {
    const normalized = claimedType.toLowerCase() === "image/jpg" ? "image/jpeg" : claimedType.toLowerCase();
    if (!(FINANCE_LOGO_MIME_TYPES as readonly string[]).includes(normalized)) {
      throw new PersistenceError("validation", "Logo must be PNG, JPEG, or WebP");
    }
    if (normalized !== detected) {
      throw new PersistenceError("validation", "Logo file type does not match its contents");
    }
  }
  return detected;
}

export function parseDocumentSnapshot(value: unknown): FinanceDocumentSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.version !== 1) return null;
  if (row.kind !== "INVOICE" && row.kind !== "DELIVERY_NOTE") return null;
  if (!isFinanceDocumentTemplate(row.template)) return null;
  const branding = parseBranding(row.branding);
  const customer = parseCustomerBlock(row.customer);
  if (!branding || !customer) return null;
  return {
    version: 1,
    kind: row.kind as FinanceDocumentKind,
    template: row.template,
    branding,
    customer,
    frozenAt: typeof row.frozenAt === "string" ? row.frozenAt : new Date().toISOString(),
  };
}

function parseBranding(value: unknown): FinanceBrandingView | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const base = emptyBranding(typeof row.companyName === "string" ? row.companyName : "");
  return {
    ...base,
    street: str(row.street),
    postalCode: str(row.postalCode),
    city: str(row.city),
    country: str(row.country),
    phone: str(row.phone),
    email: str(row.email),
    website: str(row.website),
    vatId: str(row.vatId),
    taxNumber: str(row.taxNumber),
    iban: str(row.iban),
    bic: str(row.bic),
    commercialRegister: str(row.commercialRegister),
    managingDirector: str(row.managingDirector),
    primaryColor: normalizeHexColor(str(row.primaryColor), DEFAULT_PRIMARY_COLOR),
    secondaryColor: normalizeHexColor(str(row.secondaryColor), DEFAULT_SECONDARY_COLOR),
    logoId: typeof row.logoId === "string" && row.logoId ? row.logoId : null,
  };
}

function parseCustomerBlock(value: unknown): FinanceCustomerBlock | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    companyName: str(row.companyName),
    address: str(row.address),
    city: str(row.city),
    country: str(row.country),
    taxNumber: str(row.taxNumber),
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function brandingFromRow(row: {
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
}): FinanceBrandingView {
  return {
    companyName: row.companyName,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    phone: row.phone,
    email: row.email,
    website: row.website,
    vatId: row.vatId,
    taxNumber: row.taxNumber,
    iban: row.iban,
    bic: row.bic,
    commercialRegister: row.commercialRegister,
    managingDirector: row.managingDirector,
    primaryColor: normalizeHexColor(row.primaryColor, DEFAULT_PRIMARY_COLOR),
    secondaryColor: normalizeHexColor(row.secondaryColor, DEFAULT_SECONDARY_COLOR),
    logoId: row.logoId,
  };
}
