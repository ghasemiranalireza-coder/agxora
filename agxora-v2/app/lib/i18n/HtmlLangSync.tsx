"use client";

import { useEffect } from "react";
import { DEFAULT_LOCALE } from "./locale";

/**
 * Keeps documentElement.lang aligned with the deterministic app locale.
 * Runs only after mount — never during SSR/render.
 */
export function HtmlLangSync(): null {
  useEffect(() => {
    if (document.documentElement.lang !== DEFAULT_LOCALE) {
      document.documentElement.lang = DEFAULT_LOCALE;
    }
  }, []);

  return null;
}
