"use client";

import { useEffect } from "react";

const SSR_HTML_LANG = "en";

/**
 * Keeps <html lang> aligned with RootLayout during SSR/hydration.
 * Optional browser-language sync runs only after mount (no render-time detection).
 */
export function HtmlLangSync({
  preferBrowserLanguage = false,
}: {
  readonly preferBrowserLanguage?: boolean;
}): null {
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Always start from the deterministic RootLayout value.
    if (!preferBrowserLanguage) {
      if (document.documentElement.lang !== SSR_HTML_LANG) {
        document.documentElement.lang = SSR_HTML_LANG;
      }
      return;
    }

    const browser = navigator.language?.split("-")[0]?.toLowerCase();
    const next = browser && /^[a-z]{2}$/.test(browser) ? browser : SSR_HTML_LANG;
    document.documentElement.lang = next;
  }, [preferBrowserLanguage]);

  return null;
}
