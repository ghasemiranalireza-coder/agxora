/**
 * Deterministic date/number formatting for SSR + hydration.
 * Always pin locale — never rely on the runtime default.
 */

import { DEFAULT_LOCALE } from "./locale";

export function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString(DEFAULT_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDisplayDateTime(iso: string): string {
  return new Date(iso).toLocaleString(DEFAULT_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
