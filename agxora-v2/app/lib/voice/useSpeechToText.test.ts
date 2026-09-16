import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  INITIAL_VOICE_STATUS,
  voiceStatusAfterMount,
} from "./useSpeechToText";

const HOOK_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "useSpeechToText.ts"),
  "utf8",
);

describe("voice hydration contract", () => {
  afterEach(() => {
    const scope = globalThis as typeof globalThis & {
      window?: Window & {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      };
    };
    if (scope.window) {
      delete scope.window.SpeechRecognition;
      delete scope.window.webkitSpeechRecognition;
    }
  });

  it("starts idle without probing SpeechRecognition during state init", () => {
    expect(INITIAL_VOICE_STATUS).toBe("idle");
    expect(HOOK_SOURCE).toMatch(
      /useState<VoiceStatus>\(INITIAL_VOICE_STATUS\)/,
    );
    expect(HOOK_SOURCE).not.toMatch(
      /useState<VoiceStatus>\(\(\)\s*=>/,
    );
    expect(HOOK_SOURCE).not.toMatch(
      /useState<VoiceStatus>\(\s*isSpeechRecognitionSupported/,
    );
  });

  it("probes support only via the after-mount helper", () => {
    expect(HOOK_SOURCE).toMatch(/voiceStatusAfterMount\(\)/);
    const effectBlock = HOOK_SOURCE.slice(
      HOOK_SOURCE.indexOf("voiceStatusAfterMount"),
    );
    expect(HOOK_SOURCE).toContain("useEffect(() => {\n    const next = voiceStatusAfterMount();");
    expect(effectBlock.length).toBeGreaterThan(0);
  });

  it("reports idle after mount when webkit SpeechRecognition exists", () => {
    const scope = globalThis as typeof globalThis & { window?: Window };
    scope.window = {
      webkitSpeechRecognition: function SpeechRecognitionStub() {},
    } as unknown as Window;
    expect(voiceStatusAfterMount()).toBe("idle");
  });

  it("reports unsupported after mount when no recognizer exists", () => {
    const scope = globalThis as typeof globalThis & { window?: Window };
    scope.window = {} as Window;
    expect(voiceStatusAfterMount()).toBe("unsupported");
  });
});
