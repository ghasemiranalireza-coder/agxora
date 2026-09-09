import { describe, expect, it } from "vitest";
import { UI } from "./tokens";

/** WCAG relative luminance for sRGB hex (#rrggbb). */
function relativeLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const toLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(Number.parseInt(n.slice(0, 2), 16));
  const g = toLinear(Number.parseInt(n.slice(2, 4), 16));
  const b = toLinear(Number.parseInt(n.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("AGXORA design tokens", () => {
  it("exposes navy, glass, gold, and AI cyan semantics", () => {
    expect(UI.color.background).toContain("--agx-ds-background");
    expect(UI.color.glass).toContain("--agx-ds-glass");
    expect(UI.color.gold).toContain("--agx-ds-gold");
    expect(UI.color.aiCyan).toContain("--agx-ds-ai-cyan");
    expect(UI.color.aiBlue).toContain("--agx-ds-ai-blue");
    expect(UI.color.gold).not.toMatch(/#00ff|#ff00ff/i);
  });

  it("keeps muted text at AA contrast on the navy canvas", () => {
    const navy = "#121a2a";
    expect(contrastRatio("#a8b6c7", navy)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#d5deea", navy)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#f4f8fb", navy)).toBeGreaterThanOrEqual(4.5);
    expect(UI.color.textMuted).toContain("#a8b6c7");
  });
});
