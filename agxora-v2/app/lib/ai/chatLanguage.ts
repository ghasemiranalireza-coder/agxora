/**
 * Server-side chat language instructions derived from AGXORA locale model.
 */

import "server-only";

import {
  isAppLocale,
  LOCALE_LABELS,
  normalizeToAppLocale,
  type AppLocale,
} from "@/app/lib/i18n/locale";

export function resolveChatLocale(input: {
  readonly preferredLocale?: string | null;
  readonly organizationLanguage?: string | null;
}): AppLocale {
  const fromPreferred = normalizeToAppLocale(input.preferredLocale);
  if (fromPreferred) return fromPreferred;

  const fromOrg = normalizeToAppLocale(input.organizationLanguage);
  if (fromOrg) return fromOrg;

  return "en";
}

export function buildLanguageInstruction(locale: AppLocale): string {
  const label = LOCALE_LABELS[locale] ?? LOCALE_LABELS.en;
  return [
    `The user's selected AGXORA language preference is "${label}" (${locale}).`,
    "You MUST respond entirely in that language unless the user explicitly asks for a different language.",
    "Write naturally for a native speaker of that language.",
    "Do not use English boilerplate such as \"Understood:\" when the selected language is not English.",
  ].join(" ");
}

export function parsePreferredLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") return null;
  return isAppLocale(value) ? value : normalizeToAppLocale(value);
}
