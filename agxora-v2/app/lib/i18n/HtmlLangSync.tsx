"use client";

import { useEffect } from "react";
import { DEFAULT_LOCALE } from "./locale";

/**
 * Enforces the deterministic RootLayout locale after mount.
 * Never reads navigator during render. Browser preference is opt-in and
 * applied only in useEffect after hydration has completed.
 */
export function HtmlLangSync({
  preferBrowserLanguage = false,
}: {
  readonly preferBrowserLanguage?: boolean;
}): null {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!preferBrowserLanguage) {
      if (document.documentElement.lang !== DEFAULT_LOCALE) {
        document.documentElement.lang = DEFAULT_LOCALE;
      }
      return;
    }

    // Post-hydration only — never affects SSR / first client paint.
    const browser = navigator.language?.split("-")[0]?.toLowerCase();
    const next =
      browser && /^[a-z]{2}$/.test(browser) ? browser : DEFAULT_LOCALE;
    document.documentElement.lang = next;
  }, [preferBrowserLanguage]);

  return null;
}
