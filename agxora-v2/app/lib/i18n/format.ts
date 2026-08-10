/**
 * Locale-aware Intl formatters — P0 foundation.
 * Finance/CRM/Documents migration to these helpers is P1.
 */

import {
  DEFAULT_LOCALE,
  toBcp47,
  type AppLocale,
} from "./locale";

export type FormatLocale = AppLocale | string;

function bcp47(locale?: FormatLocale): string {
  if (!locale) return toBcp47(DEFAULT_LOCALE);
  if (locale === "en" || locale === "de" || locale === "fa") {
    return toBcp47(locale);
  }
  return String(locale);
}

export function formatNumber(
  value: number,
  locale?: FormatLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(bcp47(locale), options).format(value);
}

export function formatCurrency(
  value: number,
  locale?: FormatLocale,
  currency = "EUR",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(bcp47(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

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
  return new Intl.DateTimeFormat(bcp47(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}

/** Back-compat wrappers — pin DEFAULT until callers pass active locale (P1). */
export function formatDisplayDate(iso: string): string {
  return formatDate(iso, DEFAULT_LOCALE);
}

export function formatDisplayDateTime(iso: string): string {
  return formatDateTime(iso, DEFAULT_LOCALE);
}
