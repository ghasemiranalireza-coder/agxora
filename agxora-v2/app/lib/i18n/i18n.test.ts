/**
 * Global i18n regression tests — locale model, translation, fallback, RTL.
 */

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
  isAppLocale,
  isCjkLocale,
  isRtlLocale,
  localeDirection,
  normalizeToAppLocale,
  toBcp47,
} from "./locale";
import { getCatalog, getFallbackCatalog } from "./catalog";
import { resolveMessage } from "./translate";
import { formatCurrency, formatDate, formatNumber, setActiveFormatLocale } from "./format";
import { resolveUserFacingErrorKey } from "./errorMap";

const ROOT = process.cwd();

describe("locale model", () => {
  it("supports all required locales", () => {
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(20);
    for (const code of SUPPORTED_LOCALES) {
      expect(LOCALE_LABELS[code]).toBeTruthy();
      expect(toBcp47(code)).toBeTruthy();
    }
  });

  it("normalizes browser tags to AppLocale", () => {
    expect(normalizeToAppLocale("en-US")).toBe("en");
    expect(normalizeToAppLocale("de-DE")).toBe("de");
    expect(normalizeToAppLocale("fa-IR")).toBe("fa");
    expect(normalizeToAppLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeToAppLocale("zh-Hans")).toBe("zh-CN");
    expect(normalizeToAppLocale("zh-TW")).toBe("zh-TW");
    expect(normalizeToAppLocale("pt-BR")).toBe("pt-BR");
    expect(normalizeToAppLocale("nl-BE")).toBe("nl-BE");
    expect(normalizeToAppLocale("fr-BE")).toBe("fr-BE");
    expect(normalizeToAppLocale("de-BE")).toBe("de-BE");
  });

  it("marks RTL locales correctly", () => {
    expect(isRtlLocale("fa")).toBe(true);
    expect(isRtlLocale("ar")).toBe(true);
    expect(localeDirection("fa")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
    expect(RTL_LOCALES.has("fa")).toBe(true);
  });

  it("identifies CJK locales", () => {
    expect(isCjkLocale("zh-CN")).toBe(true);
    expect(isCjkLocale("ja")).toBe(true);
    expect(isCjkLocale("en")).toBe(false);
  });
});

describe("translation catalog", () => {
  it("resolves English keys for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (!isAppLocale(locale)) continue;
      const save = resolveMessage(locale, "common.save");
      expect(save.length).toBeGreaterThan(0);
      expect(save).not.toBe("common.save");
    }
  });

  it("falls back to English for missing keys without breaking", () => {
    const missing = resolveMessage("fr", "common.thisKeyDoesNotExist");
    expect(missing).toBe("common.thisKeyDoesNotExist");
  });

  it("interpolates values", () => {
    const msg = resolveMessage("en", "team.page.lead", {
      organization: "Acme",
    });
    expect(msg).toContain("Acme");
  });

  it("includes core namespaces in every catalog", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (!isAppLocale(locale)) continue;
      const catalog = getCatalog(locale);
      expect(catalog.common).toBeTruthy();
      expect(catalog.navigation).toBeTruthy();
      expect(catalog.crm).toBeTruthy();
      expect(catalog.projects).toBeTruthy();
      expect(catalog.automation).toBeTruthy();
      expect(catalog.settings).toBeTruthy();
      expect(catalog.auth).toBeTruthy();
    }
  });

  it("English catalog has no empty leaf strings", () => {
    const en = getFallbackCatalog();
    const empty: string[] = [];
    function walk(obj: unknown, path: string): void {
      if (typeof obj === "string") {
        if (!obj.trim()) empty.push(path);
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) walk(v, path ? `${path}.${k}` : k);
      }
    }
    walk(en, "");
    expect(empty).toEqual([]);
  });

  it("resolves nested object keys", () => {
    const label = resolveMessage("en", "dashboard.quickActions.addCustomer.label");
    expect(label.length).toBeGreaterThan(0);
  });
});

describe("non-English translations differ from English for key terms", () => {
  const samples = [
    ["common.save", "de"],
    ["common.cancel", "de"],
    ["common.delete", "fa"],
    ["navigation.settings", "fr"],
    ["auth.login.submit", "zh-CN"],
  ] as const;

  for (const [key, locale] of samples) {
    it(`${locale} translates ${key}`, () => {
      if (!isAppLocale(locale)) return;
      const en = resolveMessage("en", key);
      const translated = resolveMessage(locale, key);
      expect(translated).not.toBe(en);
    });
  }
});

describe("DEFAULT_LOCALE", () => {
  it("is English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

describe("locale catalog completeness", () => {
  it("loads all 24 supported locales", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(24);
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = getCatalog(locale);
      expect(catalog.common).toBeTruthy();
      expect(resolveMessage(locale, "common.save")).not.toBe("common.save");
      expect(resolveMessage(locale, "common.search")).not.toBe("common.search");
    }
  });
});

describe("RTL direction", () => {
  it("marks fa and ar as rtl and every other supported locale as ltr", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "fa" || locale === "ar") {
        expect(isRtlLocale(locale)).toBe(true);
        expect(localeDirection(locale)).toBe("rtl");
      } else {
        expect(isRtlLocale(locale)).toBe(false);
        expect(localeDirection(locale)).toBe("ltr");
      }
    }
    expect(RTL_LOCALES.size).toBe(2);
  });
});

describe("CJK locale configuration", () => {
  it("identifies Simplified/Traditional Chinese, Japanese, and Korean", () => {
    expect(isCjkLocale("zh-CN")).toBe(true);
    expect(isCjkLocale("zh-TW")).toBe(true);
    expect(isCjkLocale("ja")).toBe(true);
    expect(isCjkLocale("ko")).toBe(true);
    expect(isCjkLocale("en")).toBe(false);
    expect(isCjkLocale("de")).toBe(false);
  });
});

describe("translation switching", () => {
  it("returns different UI copy when the locale changes", () => {
    const en = resolveMessage("en", "common.save");
    const de = resolveMessage("de", "common.save");
    const fa = resolveMessage("fa", "common.search");
    const ar = resolveMessage("ar", "common.cancel");
    expect(en).toBe("Save");
    expect(de).toBe("Speichern");
    expect(fa).not.toBe("Search");
    expect(ar).not.toBe("Cancel");
    expect(resolveMessage("zh-CN", "common.home")).not.toBe(
      resolveMessage("en", "common.home"),
    );
  });

  it("preserves pricing interpolation placeholders and substitutes values", () => {
    const en = resolveMessage("en", "pricing.yearlyHint", {
      amount: "€191.90",
      percent: 20,
    });
    expect(en).toContain("€191.90");
    expect(en).toContain("20");
    expect(en).not.toContain("{amount}");
    expect(en).not.toContain("{percent}");
    for (const locale of SUPPORTED_LOCALES) {
      const msg = resolveMessage(locale, "pricing.yearlyHint", {
        amount: "X",
        percent: 9,
      });
      expect(msg).toContain("X");
      expect(msg).toContain("9");
      expect(msg).not.toContain("{amount}");
      expect(msg).not.toContain("{percent}");
    }
  });
});

describe("number/date/currency formatting follows the active locale", () => {
  it("formats numbers and currency with locale separators", () => {
    setActiveFormatLocale("de");
    expect(formatNumber(1234.5, "de")).toMatch(/1\.234/);
    expect(formatCurrency(19.99, "de", "EUR")).toMatch(/€|EUR|19/);
    setActiveFormatLocale("en");
    expect(formatNumber(1234.5, "en")).toMatch(/1,234/);
  });

  it("formats dates with the requested locale", () => {
    const iso = "2026-08-17T12:00:00.000Z";
    const fa = formatDate(iso, "fa");
    const en = formatDate(iso, "en");
    expect(fa.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
  });
});

describe("error mapping", () => {
  it("maps English auth errors onto stable translation keys", () => {
    expect(resolveUserFacingErrorKey(new Error("Invalid email or password"))).toBe(
      "errors.codes.AUTH_INVALID_CREDENTIALS",
    );
    expect(resolveUserFacingErrorKey({ code: "AUTH_SESSION_EXPIRED" })).toBe(
      "errors.codes.AUTH_SESSION_EXPIRED",
    );
    expect(resolveMessage("de", "errors.codes.AUTH_INVALID_CREDENTIALS")).not.toBe(
      "Invalid email or password.",
    );
  });
});

describe("i18n audits", () => {
  it("passes placeholder and key parity validation", () => {
    execFileSync(process.execPath, ["scripts/i18n/validate-i18n.mjs"], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });

  it("passes the hardcoded UI string audit", () => {
    execFileSync(process.execPath, ["scripts/i18n/check-hardcoded.mjs"], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
