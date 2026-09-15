import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  FINANCE_DOCUMENT_TEMPLATES,
  DEFAULT_PRIMARY_COLOR,
  emptyBranding,
  isFinanceDocumentTemplate,
} from "./types";
import {
  assertSafeLogoBytes,
  detectLogoMime,
  normalizeHexColor,
  parseDocumentSnapshot,
  parseSettingsPatch,
  parseTemplate,
} from "./validation";

const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP_HEADER = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

describe("finance document templates", () => {
  it("exposes four professional templates", () => {
    expect(FINANCE_DOCUMENT_TEMPLATES).toEqual(["CLASSIC", "MODERN", "COMPACT", "PROFESSIONAL"]);
    for (const template of FINANCE_DOCUMENT_TEMPLATES) {
      expect(isFinanceDocumentTemplate(template)).toBe(true);
      expect(parseTemplate(template, "invoiceTemplate")).toBe(template);
    }
  });

  it("rejects unknown template names", () => {
    expect(isFinanceDocumentTemplate("FANCY")).toBe(false);
    expect(() => parseTemplate("FANCY", "invoiceTemplate")).toThrow(PersistenceError);
  });
});

describe("finance branding validation", () => {
  it("uses CLASSIC-safe default branding", () => {
    const branding = emptyBranding("Nordlicht Handel GmbH");
    expect(branding.companyName).toBe("Nordlicht Handel GmbH");
    expect(branding.primaryColor).toBe(DEFAULT_PRIMARY_COLOR);
    expect(branding.logoId).toBeNull();
  });

  it("normalizes and rejects colors", () => {
    expect(normalizeHexColor("#22d3ee", DEFAULT_PRIMARY_COLOR)).toBe("#22D3EE");
    expect(normalizeHexColor("red", DEFAULT_PRIMARY_COLOR)).toBe(DEFAULT_PRIMARY_COLOR);
    expect(normalizeHexColor("#fff", DEFAULT_PRIMARY_COLOR)).toBe(DEFAULT_PRIMARY_COLOR);
    expect(() => parseSettingsPatch({ primaryColor: "red" })).toThrow(PersistenceError);
    expect(() => parseSettingsPatch({ secondaryColor: "#GGG000" })).toThrow(PersistenceError);
  });

  it("clips branding fields and rejects oversized values", () => {
    const patch = parseSettingsPatch({
      invoiceTemplate: "MODERN",
      deliveryNoteTemplate: "COMPACT",
      companyName: "  Hanseatische Handels GmbH  ",
      vatId: "DE813312217",
      primaryColor: "#1b365d",
    });
    expect(patch.invoiceTemplate).toBe("MODERN");
    expect(patch.deliveryNoteTemplate).toBe("COMPACT");
    expect(patch.companyName).toBe("Hanseatische Handels GmbH");
    expect(patch.primaryColor).toBe("#1B365D");
    expect(() => parseSettingsPatch({ companyName: "A".repeat(200) })).toThrow(PersistenceError);
  });
});

describe("finance logo validation", () => {
  it("accepts PNG, JPEG, and WebP magic bytes", () => {
    expect(detectLogoMime(PNG_HEADER)).toBe("image/png");
    expect(detectLogoMime(JPEG_HEADER)).toBe("image/jpeg");
    expect(detectLogoMime(WEBP_HEADER)).toBe("image/webp");
    expect(assertSafeLogoBytes(PNG_HEADER, "image/png")).toBe("image/png");
  });

  it("rejects SVG, empty, oversized, and mismatched types", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(() => assertSafeLogoBytes(svg)).toThrow(PersistenceError);
    expect(() => assertSafeLogoBytes(new Uint8Array())).toThrow(/empty/i);
    const huge = new Uint8Array(513 * 1024);
    huge.set(PNG_HEADER, 0);
    expect(() => assertSafeLogoBytes(huge)).toThrow(/512 KB/i);
    expect(() => assertSafeLogoBytes(PNG_HEADER, "image/jpeg")).toThrow(/does not match/i);
    expect(() => assertSafeLogoBytes(PNG_HEADER, "image/svg+xml")).toThrow(/PNG, JPEG, or WebP/i);
  });
});

describe("finance document snapshots", () => {
  it("parses a frozen v1 snapshot and ignores junk", () => {
    const snapshot = parseDocumentSnapshot({
      version: 1,
      kind: "INVOICE",
      template: "PROFESSIONAL",
      branding: {
        companyName: "Nordlicht Handel GmbH",
        primaryColor: "#112233",
        logoId: "logo-1",
      },
      customer: { companyName: "Hanseatische Handels GmbH", city: "Hamburg" },
      frozenAt: "2026-09-15T10:00:00.000Z",
    });
    expect(snapshot?.template).toBe("PROFESSIONAL");
    expect(snapshot?.branding.companyName).toBe("Nordlicht Handel GmbH");
    expect(snapshot?.branding.primaryColor).toBe("#112233");
    expect(snapshot?.branding.logoId).toBe("logo-1");
    expect(snapshot?.customer.companyName).toBe("Hanseatische Handels GmbH");
    expect(parseDocumentSnapshot(null)).toBeNull();
    expect(parseDocumentSnapshot({ version: 2, kind: "INVOICE", template: "CLASSIC" })).toBeNull();
    expect(parseDocumentSnapshot({ version: 1, kind: "INVOICE", template: "FANCY" })).toBeNull();
  });
});

describe("finance document CSS templates", () => {
  it("keeps four visually distinct print-ready variants without page overflow", () => {
    const css = readFileSync("app/components/finance/documents/document.css", "utf8");
    expect(css).toContain(".agx-doc--modern");
    expect(css).toContain(".agx-doc--compact");
    expect(css).toContain(".agx-doc--professional");
    expect(css).toContain("@media print");
    expect(css).toContain("minmax(min(100%, 220px), 1fr)");
    expect(css).toMatch(/\.agx-doc__tablewrap[\s\S]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.agx-doc-settings[\s\S]*minmax\(0,\s*1fr\)/);
  });
});
