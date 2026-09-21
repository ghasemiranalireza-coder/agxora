import type { FinanceDocumentSettingsPatch } from "./types";

/**
 * Onboarding fields that may be written through to FinanceDocumentSettings.
 * House number is not a Prisma column — it is composed into `street`.
 */
export type OnboardingFinanceInput = {
  readonly companyName?: string | null;
  readonly street?: string | null;
  readonly houseNumber?: string | null;
  readonly postalCode?: string | null;
  readonly city?: string | null;
  readonly country?: string | null;
  readonly vatId?: string | null;
  readonly iban?: string | null;
  readonly bic?: string | null;
};

function trimField(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Combine street + house number into the existing FinanceDocumentSettings.street field. */
export function composeOnboardingStreet(
  street?: string | null,
  houseNumber?: string | null,
): string {
  return [trimField(street), trimField(houseNumber)].filter(Boolean).join(" ");
}

function assignIfPresent(
  patch: Record<string, string>,
  key: keyof FinanceDocumentSettingsPatch,
  value: string,
): void {
  if (value) {
    patch[key] = value;
  }
}

/**
 * Build a partial FinanceDocumentSettings patch from onboarding input.
 *
 * Empty / whitespace-only values are omitted so existing finance settings
 * are not overwritten unless the customer actually provided a value.
 */
export function buildOnboardingFinancePatch(
  input: OnboardingFinanceInput,
): FinanceDocumentSettingsPatch {
  const patch: Record<string, string> = {};
  assignIfPresent(patch, "companyName", trimField(input.companyName));
  assignIfPresent(patch, "street", composeOnboardingStreet(input.street, input.houseNumber));
  assignIfPresent(patch, "postalCode", trimField(input.postalCode));
  assignIfPresent(patch, "city", trimField(input.city));
  assignIfPresent(patch, "country", trimField(input.country));
  assignIfPresent(patch, "vatId", trimField(input.vatId));
  assignIfPresent(patch, "iban", trimField(input.iban));
  assignIfPresent(patch, "bic", trimField(input.bic));
  return patch;
}

export function hasOnboardingFinancePatch(
  patch: FinanceDocumentSettingsPatch,
): boolean {
  return Object.keys(patch).length > 0;
}
