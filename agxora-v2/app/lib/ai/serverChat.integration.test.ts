/**
 * Live OpenAI integration tests.
 * These call the real OpenAI API when AGXORA_OPENAI_API_KEY is present.
 * They never print the key.
 */

import { afterEach, describe, expect, it } from "vitest";
import { completeOpenAIChat } from "./openaiChat";
import { isMockAiFallbackText } from "./openaiApi";
import { getAiServerConfig, getOpenAIApiKey } from "./serverConfig";
import type { AIRuntimeContext } from "./AIContext";

const hasLiveKey = Boolean(getOpenAIApiKey());

function contextFor(userPrompt: string): AIRuntimeContext {
  return {
    organization: { organizationId: null, workspaceId: null },
    conversation: [],
    userPrompt,
  };
}

describe("serverChat live OpenAI", () => {
  afterEach(() => {
    expect(process.env.AGXORA_OPENAI_API_KEY ?? "").not.toContain("console.log");
  });

  it("reports OpenAI configured without exposing secrets", () => {
    const config = getAiServerConfig();
    expect(config.providerId).toBe("openai");
    expect(JSON.stringify(config)).not.toMatch(/sk-/i);
    if (hasLiveKey) {
      expect(config.configured).toBe(true);
      expect(config.ready).toBe(true);
      expect(config.defaultProviderId).toBe("openai");
    }
  });

  it.skipIf(!hasLiveKey)(
    "English live chat uses OpenAI",
    async () => {
      const result = await completeOpenAIChat({
        context: contextFor("Hello, how are you?"),
        temperature: 0.3,
        maxTokens: 256,
      });
      expect(result.providerId).toBe("openai");
      expect(result.content.trim().length).toBeGreaterThan(8);
      expect(isMockAiFallbackText(result.content)).toBe(false);
      expect(result.modelId.toLowerCase()).not.toContain("mock");
    },
    90_000,
  );

  it.skipIf(!hasLiveKey)(
    "German live chat uses OpenAI",
    async () => {
      const result = await completeOpenAIChat({
        context: contextFor("Hallo, wie geht es dir?"),
        temperature: 0.3,
        maxTokens: 256,
      });
      expect(result.providerId).toBe("openai");
      expect(result.content.trim().length).toBeGreaterThan(8);
      expect(isMockAiFallbackText(result.content)).toBe(false);
      expect(result.content).not.toMatch(/^Understood:/);
    },
    90_000,
  );

  it.skipIf(!hasLiveKey)(
    "Persian live chat uses OpenAI",
    async () => {
      const result = await completeOpenAIChat({
        context: contextFor("سلام، حالت چطوره؟"),
        temperature: 0.3,
        maxTokens: 256,
      });
      expect(result.providerId).toBe("openai");
      expect(result.content.trim().length).toBeGreaterThan(8);
      expect(isMockAiFallbackText(result.content)).toBe(false);
      expect(result.content).toMatch(/[\u0600-\u06FF]/);
    },
    90_000,
  );

  it.skipIf(!hasLiveKey)(
    "business Persian live chat uses OpenAI",
    async () => {
      const result = await completeOpenAIChat({
        context: contextFor(
          "برای یک شرکت کوچک که می‌خواهد مشتری بیشتری پیدا کند، یک برنامه کوتاه بازاریابی پیشنهاد بده.",
        ),
        temperature: 0.4,
        maxTokens: 512,
      });
      expect(result.providerId).toBe("openai");
      expect(result.content.trim().length).toBeGreaterThan(40);
      expect(isMockAiFallbackText(result.content)).toBe(false);
      expect(result.content).toMatch(/[\u0600-\u06FF]/);
    },
    90_000,
  );
});
