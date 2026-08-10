/**
 * Locale-aware Intl formatters — Phase 41 P1.
 *
 * Locale (presentation) and currency (ISO 4217) are independent:
 *   formatCurrency(49.99, "fa", "EUR") is valid.
 *
 * Active UI locale is bridged from LocaleProvider via setActiveFormatLocale.
 * Display currency defaults to EUR; organization currency overrides when set.
 */

import {
  DEFAULT_LOCALE,
  isAppLocale,
  toBcp47,
  type AppLocale,
} from "./locale";

export type FormatLocale = AppLocale | string;

/** Product default when no organization currency is available. */
export const DEFAULT_DISPLAY_CURRENCY = "EUR";

const ISO_4217 = /^[A-Za-z]{3}$/;

let activeFormatLocale: AppLocale = DEFAULT_LOCALE;
let activeDisplayCurrency: string | null = null;

/** Called by LocaleProvider so module formatters follow the UI locale. */
export function setActiveFormatLocale(locale: AppLocale): void {
  activeFormatLocale = locale;
}

export function getActiveFormatLocale(): AppLocale {
  return activeFormatLocale;
}

/**
 * Optional organization currency bridge (ISO 4217).
 * Pass null to clear and fall back to DEFAULT_DISPLAY_CURRENCY.
 */
export function setActiveDisplayCurrency(currency: string | null): void {
  if (!currency) {
    activeDisplayCurrency = null;
    return;
  }
  const normalized = currency.trim().toUpperCase();
  activeDisplayCurrency = ISO_4217.test(normalized) ? normalized : null;
}

export function getActiveDisplayCurrency(): string {
  return activeDisplayCurrency ?? DEFAULT_DISPLAY_CURRENCY;
}

/**
 * Resolve currency for display.
 * Explicit argument wins; else organization bridge; else EUR.
 */
export function resolveDisplayCurrency(
  explicit?: string | null,
): string {
  if (explicit) {
    const normalized = explicit.trim().toUpperCase();
    if (ISO_4217.test(normalized)) return normalized;
  }
  return getActiveDisplayCurrency();
}

function bcp47(locale?: FormatLocale): string {
  if (!locale) return toBcp47(getActiveFormatLocale());
  if (isAppLocale(locale)) return toBcp47(locale);
  return String(locale);
}

export function formatNumber(
  value: number,
  locale?: FormatLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(bcp47(locale), options).format(value);
}

/**
 * @param value — numeric amount (not converted)
 * @param locale — UI locale for separators / symbol placement (optional → active)
 * @param currency — ISO 4217 code (optional → org / EUR); independent of locale
 */
export function formatCurrency(
  value: number,
  locale?: FormatLocale,
  currency?: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(bcp47(locale), {
    style: "currency",
    currency: resolveDisplayCurrency(currency),
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Accepts either a 0–1 ratio or a 0–100 percentage (values with abs > 1).
 */
export function formatPercent(
  value: number,
  locale?: FormatLocale,
  options?: Intl.NumberFormatOptions,
): string {
  const ratio = Math.abs(value) > 1 ? value / 100 : value;
  return new Intl.NumberFormat(bcp47(locale), {
    style: "percent",
    maximumFractionDigits: 0,
    ...options,
  }).format(ratio);
}

export function formatDate(
  iso: string | Date,
  locale?: FormatLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return typeof iso === "string" ? iso : "";
  return new Intl.DateTimeFormat(bcp47(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTime(
  iso: string | Date,
  locale?: FormatLocale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return typeof iso === "string" ? iso : "";
  return new Intl.DateTimeFormat(bcp47(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}

/** Display helpers — follow active UI locale (no longer pinned to English). */
export function formatDisplayDate(
  iso: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return formatDate(iso, getActiveFormatLocale(), options);
}

export function formatDisplayDateTime(
  iso: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return formatDateTime(iso, getActiveFormatLocale(), options);
}
