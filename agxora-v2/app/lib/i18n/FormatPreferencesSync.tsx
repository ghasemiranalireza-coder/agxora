"use client";

/**
 * Keeps module-level formatter bridges aligned with LocaleProvider + org currency.
 * Does not redesign organization settings — only reads the active org currency.
 */

import { useEffect, useSyncExternalStore } from "react";
import {
  getOrganizationSession,
  subscribeOrganizationStore,
} from "../organization/organizationStore";
import { setActiveDisplayCurrency, setActiveFormatLocale } from "./format";
import { useLocale } from "./LocaleProvider";

export function FormatPreferencesSync(): null {
  const { locale } = useLocale();
  const organization = useSyncExternalStore(
    subscribeOrganizationStore,
    () => getOrganizationSession().organization,
    () => getOrganizationSession().organization,
  );

  // Sync during render so SSR + first client paint use the same locale bridge.
  setActiveFormatLocale(locale);

  useEffect(() => {
    setActiveFormatLocale(locale);
  }, [locale]);

  useEffect(() => {
    setActiveDisplayCurrency(organization?.currency ?? null);
  }, [organization?.currency]);

  return null;
}
