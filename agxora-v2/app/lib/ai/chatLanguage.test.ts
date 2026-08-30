/**
 * Server-side chat language instruction tests.
 */

import { describe, expect, it } from "vitest";
import {
  buildLanguageInstruction,
  resolveChatLocale,
} from "@/app/lib/ai/chatLanguage";

describe("chat language instructions", () => {
  it("prefers explicit UI locale over organization language", () => {
    expect(
      resolveChatLocale({
        preferredLocale: "de",
        organizationLanguage: "fa",
      }),
    ).toBe("de");
  });

  it("falls back to organization language", () => {
    expect(
      resolveChatLocale({
        preferredLocale: null,
        organizationLanguage: "fa",
      }),
    ).toBe("fa");
  });

  it("builds Persian instruction from locale", () => {
    const instruction = buildLanguageInstruction("fa");
    expect(instruction).toContain("فارسی");
    expect(instruction).toContain("(fa)");
    expect(instruction).toContain("MUST respond entirely");
  });

  it("builds German instruction from locale", () => {
    const instruction = buildLanguageInstruction("de");
    expect(instruction).toContain("Deutsch");
    expect(instruction).toContain("(de)");
  });

  it("builds English instruction from locale", () => {
    const instruction = buildLanguageInstruction("en");
    expect(instruction).toContain("English");
    expect(instruction).toContain("(en)");
  });
});
