"use client";

/**
 * React-bound formatters — always use the active LocaleProvider locale.
 * Currency remains an explicit / organization concern (not derived from locale).
 */

import { useMemo } from "react";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  getActiveDisplayCurrency,
  resolveDisplayCurrency,
} from "./format";
import { useLocale } from "./LocaleProvider";

export function useFormatters() {
  const { locale, bcp47 } = useLocale();

  return useMemo(
    () => ({
      locale,
      bcp47,
      currency: getActiveDisplayCurrency(),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, locale, options),
      currencyAmount: (
        value: number,
        currency?: string,
        options?: Intl.NumberFormatOptions,
      ) => formatCurrency(value, locale, currency, options),
      percent: (value: number, options?: Intl.NumberFormatOptions) =>
        formatPercent(value, locale, options),
      date: (iso: string | Date, options?: Intl.DateTimeFormatOptions) =>
        formatDate(iso, locale, options),
      dateTime: (iso: string | Date, options?: Intl.DateTimeFormatOptions) =>
        formatDateTime(iso, locale, options),
      resolveCurrency: resolveDisplayCurrency,
    }),
    [locale, bcp47],
  );
}
