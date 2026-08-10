/**
 * AGXORA locale model — Phase 41 P0.
 *
 * Runtime locales: en, de, fa.
 * Architectural slots for future locales (ar, he, …) without catalogs yet.
 *
 * Never read navigator/window during SSR or render.
 * SSR may read the validated agxora-locale cookie only (see resolveServerLocale).
 * Client soft-resolves storage / browser after hydration.
 */

export const DEFAULT_LOCALE = "en" as const;

/** Locales with full P0 message catalogs. */
export type AppLocale = "en" | "de" | "fa";

/** Future locales reserved for architecture (no catalogs in P0). */
export type FutureLocale = "ar" | "he" | "fr" | "es" | "it" | "pt" | "tr" | "ru" | "zh" | "ja" | "ko";

export type KnownLocale = AppLocale | FutureLocale;

export const SUPPORTED_LOCALES: readonly AppLocale[] = ["en", "de", "fa"] as const;

/** Locales that require dir="rtl" when catalogs ship (fa active; ar/he prepared). */
export const RTL_LOCALES: ReadonlySet<KnownLocale> = new Set(["fa", "ar", "he"]);

export const LOCALE_COOKIE = "agxora-locale";

export const LOCALE_STORAGE_KEY = "agxora-locale-v1";

export const LOCALE_LABELS: Readonly<Record<AppLocale, string>> = {
  en: "English",
  de: "Deutsch",
  fa: "فارسی",
};

/** BCP-47 tags for Intl + html lang. */
export const LOCALE_BCP47: Readonly<Record<AppLocale, string>> = {
  en: "en",
  de: "de",
  fa: "fa",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "de" || value === "fa";
}

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale as KnownLocale);
}

export function localeDirection(locale: AppLocale): "ltr" | "rtl" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

export function toBcp47(locale: AppLocale): string {
  return LOCALE_BCP47[locale];
}

/**
 * Map free-form preference strings (en-GB, de-DE, fa-IR, …) → AppLocale.
 */
export function normalizeToAppLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (isAppLocale(raw)) return raw;
  const base = raw.split(/[-_]/)[0] ?? "";
  if (isAppLocale(base)) return base;
  return null;
}
