import { describe, expect, it } from "vitest";
import { UI } from "./tokens";

describe("AGXORA design tokens", () => {
  it("exposes navy, glass, gold, and AI cyan semantics", () => {
    expect(UI.color.background).toContain("--agx-ds-background");
    expect(UI.color.glass).toContain("--agx-ds-glass");
    expect(UI.color.gold).toContain("--agx-ds-gold");
    expect(UI.color.aiCyan).toContain("--agx-ds-ai-cyan");
    expect(UI.color.aiBlue).toContain("--agx-ds-ai-blue");
    expect(UI.color.gold).not.toMatch(/#00ff|#ff00ff/i);
  });
});
