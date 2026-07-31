/**
 * Deterministic app locale for SSR + hydration.
 *
 * Must match the language of hardcoded UI copy (currently English).
 * Setting html[lang] to a different language (e.g. "de") while strings are
 * English causes browsers to auto-translate the DOM and break hydration.
 *
 * Never derive this from navigator/window during render or SSR.
 * User locale preferences belong in a future i18n provider after hydration.
 */
export const DEFAULT_LOCALE = "en" as const;

export type AppLocale = "en" | "de" | "fr" | "es" | "ar";

export const SUPPORTED_LOCALES: readonly AppLocale[] = [
  "en",
  "de",
  "fr",
  "es",
  "ar",
] as const;
