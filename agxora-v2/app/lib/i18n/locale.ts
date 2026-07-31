/**
 * Deterministic app locale — identical on server and client for first paint.
 * Never derive this from navigator/window during render or SSR.
 * User language preference may be applied after hydration only.
 */
export const DEFAULT_LOCALE = "de" as const;

export type AppLocale = typeof DEFAULT_LOCALE | "en" | "fr" | "es" | "ar";

export const SUPPORTED_LOCALES: readonly AppLocale[] = [
  "de",
  "en",
  "fr",
  "es",
  "ar",
] as const;
