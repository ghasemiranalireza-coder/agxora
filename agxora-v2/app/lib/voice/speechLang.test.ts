import { describe, expect, it } from "vitest";
import {
  SPEECH_LANG_BY_LOCALE,
  composeVoiceValue,
  speechLangFromLocale,
} from "./speechLang";

describe("speechLangFromLocale", () => {
  it("maps core AGXORA locales to regional speech tags", () => {
    expect(speechLangFromLocale("de")).toBe("de-DE");
    expect(speechLangFromLocale("en")).toBe("en-US");
    expect(speechLangFromLocale("fa")).toBe("fa-IR");
  });

  it("covers every bundled locale", () => {
    expect(Object.keys(SPEECH_LANG_BY_LOCALE).length).toBeGreaterThanOrEqual(20);
  });
});

describe("composeVoiceValue", () => {
  it("inserts spoken text at the caret without wiping existing content", () => {
    expect(
      composeVoiceValue({
        original: "Hello world",
        selectionStart: 5,
        selectionEnd: 5,
        spoken: "there",
      }),
    ).toBe("Hello there world");
  });

  it("replaces a selection", () => {
    expect(
      composeVoiceValue({
        original: "Invoice notes",
        selectionStart: 8,
        selectionEnd: 13,
        spoken: "draft",
      }),
    ).toBe("Invoice draft");
  });

  it("returns the original value when nothing was spoken", () => {
    expect(
      composeVoiceValue({
        original: "keep me",
        selectionStart: 0,
        selectionEnd: 7,
        spoken: "   ",
      }),
    ).toBe("keep me");
  });
});
