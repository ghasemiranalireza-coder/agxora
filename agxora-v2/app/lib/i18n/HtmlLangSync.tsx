"use client";

import { useEffect } from "react";
import { useLocale } from "./LocaleProvider";

/**
 * Syncs documentElement lang + dir with the active LocaleProvider locale.
 * Runs after mount / locale changes — never during SSR render.
 */
export function HtmlLangSync(): null {
  const { locale, dir, bcp47 } = useLocale();

  useEffect(() => {
    const root = document.documentElement;
    if (root.lang !== bcp47) root.lang = bcp47;
    if (root.dir !== dir) root.dir = dir;
    root.dataset.locale = locale;
  }, [locale, dir, bcp47]);

  return null;
}
