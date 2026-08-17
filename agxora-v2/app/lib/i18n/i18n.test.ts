/**
 * Global i18n regression tests — locale model, translation, fallback, RTL.
 */

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
import { resolveMessage, resolveMessageList } from "./translate";

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
