/**
 * AGXORA global locale model — expanded for worldwide language support.
 *
 * Never read navigator/window during SSR or render.
 * SSR reads validated agxora-locale cookie only (see resolveServerLocale).
 * Client soft-resolves storage / browser after hydration.
 */

export const DEFAULT_LOCALE = "en" as const;

/** All locales with message catalogs (bundled via scripts/i18n/build-bundles.mjs). */
export type AppLocale =
  | "en"
  | "de"
  | "fa"
  | "zh-CN"
  | "zh-TW"
  | "ja"
  | "nl"
  | "nl-BE"
  | "fr"
  | "fr-BE"
  | "de-BE"
  | "es"
  | "it"
  | "pt"
  | "pt-BR"
  | "ru"
  | "tr"
  | "ar"
  | "ko"
  | "pl"
  | "uk"
  | "hi"
  | "id"
  | "vi";

export const SUPPORTED_LOCALES: readonly AppLocale[] = [
  "en",
  "de",
  "fa",
  "zh-CN",
  "zh-TW",
  "ja",
  "nl",
  "nl-BE",
  "fr",
  "fr-BE",
  "de-BE",
  "es",
  "it",
  "pt",
  "pt-BR",
  "ru",
  "tr",
  "ar",
  "ko",
  "pl",
  "uk",
  "hi",
  "id",
  "vi",
] as const;

/** Locales that require dir="rtl". */
export const RTL_LOCALES: ReadonlySet<AppLocale> = new Set(["fa", "ar"]);

export const LOCALE_COOKIE = "agxora-locale";
export const LOCALE_STORAGE_KEY = "agxora-locale-v2";

/** Native language names for the selector (always recognizable). */
export const LOCALE_LABELS: Readonly<Record<AppLocale, string>> = {
  en: "English",
  de: "Deutsch",
  fa: "فارسی",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  nl: "Nederlands",
  "nl-BE": "Nederlands (België)",
  fr: "Français",
  "fr-BE": "Français (Belgique)",
  "de-BE": "Deutsch (Belgien)",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  "pt-BR": "Português (Brasil)",
  ru: "Русский",
  tr: "Türkçe",
  ar: "العربية",
  ko: "한국어",
  pl: "Polski",
  uk: "Українська",
  hi: "हिन्दी",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
};

/** BCP-47 tags for Intl + html lang. */
export const LOCALE_BCP47: Readonly<Record<AppLocale, string>> = {
  en: "en",
  de: "de",
  fa: "fa",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ja: "ja",
  nl: "nl",
  "nl-BE": "nl-BE",
  fr: "fr",
  "fr-BE": "fr-BE",
  "de-BE": "de-BE",
  es: "es",
  it: "it",
  pt: "pt",
  "pt-BR": "pt-BR",
  ru: "ru",
  tr: "tr",
  ar: "ar",
  ko: "ko",
  pl: "pl",
  uk: "uk",
  hi: "hi",
  id: "id",
  vi: "vi",
};

const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return typeof value === "string" && LOCALE_SET.has(value);
}

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale as AppLocale);
}

export function localeDirection(locale: AppLocale): "ltr" | "rtl" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

export function toBcp47(locale: AppLocale): string {
  return LOCALE_BCP47[locale];
}

/** CJK locales need wider UI tolerance. */
export function isCjkLocale(locale: AppLocale): boolean {
  return locale === "zh-CN" || locale === "zh-TW" || locale === "ja" || locale === "ko";
}

/**
 * Map free-form preference strings (en-GB, de-DE, fa-IR, zh, …) → AppLocale.
 */
export function normalizeToAppLocale(
  value: string | null | undefined,
): AppLocale | null {
  if (!value) return null;
  const raw = value.trim();
  if (isAppLocale(raw)) return raw;

  const lower = raw.toLowerCase();
  if (isAppLocale(lower)) return lower;

  // BCP-47 exact matches (case-sensitive tags like zh-CN)
  const normalized = raw.replace("_", "-");
  if (isAppLocale(normalized)) return normalized;

  const tag = lower.replace("_", "-");

  // Regional variants
  if (tag.startsWith("zh-cn") || tag === "zh-hans") return "zh-CN";
  if (tag.startsWith("zh-tw") || tag.startsWith("zh-hk") || tag === "zh-hant") return "zh-TW";
  if (tag.startsWith("pt-br")) return "pt-BR";
  if (tag.startsWith("nl-be")) return "nl-BE";
  if (tag.startsWith("fr-be")) return "fr-BE";
  if (tag.startsWith("de-be")) return "de-BE";

  const base = tag.split("-")[0] ?? "";
  const baseMap: Record<string, AppLocale> = {
    en: "en",
    de: "de",
    fa: "fa",
    zh: "zh-CN",
    ja: "ja",
    nl: "nl",
    fr: "fr",
    es: "es",
    it: "it",
    pt: "pt",
    ru: "ru",
    tr: "tr",
    ar: "ar",
    ko: "ko",
    pl: "pl",
    uk: "uk",
    hi: "hi",
    id: "id",
    vi: "vi",
  };
  return baseMap[base] ?? null;
}
