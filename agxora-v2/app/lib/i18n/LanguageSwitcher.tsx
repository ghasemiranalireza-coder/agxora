"use client";

import type { JSX } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  normalizeToAppLocale,
} from "./locale";
import { useLocale } from "./LocaleProvider";

/**
 * Compact language selector — one controlled pattern for public + settings.
 */
export function LanguageSwitcher({
  id = "agxora-language",
  size = "sm",
}: {
  readonly id?: string;
  readonly size?: "sm" | "md";
}): JSX.Element {
  const { locale, setLocale, t } = useLocale();
  const pad = size === "sm" ? "6px 10px" : "8px 12px";

  return (
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: size === "sm" ? 12 : 13,
        color: "var(--agx-text-muted, #94a3b8)",
      }}
    >
      <span className="sr-only">{t("common.language")}</span>
      <select
        id={id}
        value={locale}
        aria-label={t("common.language")}
        onChange={(event) => {
          const next = normalizeToAppLocale(event.target.value) ?? DEFAULT_LOCALE;
          setLocale(next);
        }}
        style={{
          minHeight: 36,
          padding: pad,
          borderRadius: 10,
          border: "1px solid var(--agx-ds-border, rgba(255,255,255,0.12))",
          background: "var(--agx-ds-surface, rgba(255,255,255,0.04))",
          color: "var(--agx-ds-text, #f4f8fb)",
          font: "inherit",
          cursor: "pointer",
        }}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
