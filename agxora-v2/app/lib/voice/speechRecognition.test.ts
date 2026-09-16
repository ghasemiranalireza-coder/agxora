import { describe, expect, it } from "vitest";
import { collectTranscript } from "./speechRecognition";

describe("collectTranscript", () => {
  it("separates final and interim phrases from a recognition event", () => {
    const event = {
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: "Create " } },
        { isFinal: false, 0: { transcript: "invoice" } },
      ],
    };
    expect(collectTranscript(event)).toEqual({
      finalText: "Create ",
      interimText: "invoice",
    });
  });

  it("ignores empty alternatives and respects resultIndex", () => {
    const event = {
      resultIndex: 1,
      results: [
        { isFinal: true, 0: { transcript: "ignored" } },
        { isFinal: true, 0: { transcript: "kept" } },
        { isFinal: false, 0: { transcript: "" } },
      ],
    };
    expect(collectTranscript(event)).toEqual({
      finalText: "kept",
      interimText: "",
    });
  });
});
