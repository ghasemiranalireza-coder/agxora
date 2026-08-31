import { afterEach, describe, expect, it } from "vitest";
import { AIError } from "./AIErrorHandler";
import { completeOpenAIChat } from "./openaiChat";
import { isMockAiFallbackText } from "./openaiApi";
import { getAiServerConfig } from "./serverConfig";
import { DEFAULT_AI_SETTINGS } from "./AISettings";

describe("serverChat unit", () => {
  const previousKey = process.env.AGXORA_OPENAI_API_KEY;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.AGXORA_OPENAI_API_KEY;
    else process.env.AGXORA_OPENAI_API_KEY = previousKey;
  });

  it("throws PROVIDER_NOT_CONFIGURED when the key is missing", async () => {
    delete process.env.AGXORA_OPENAI_API_KEY;
    const config = getAiServerConfig();
    expect(config.ready).toBe(false);
    expect(config.configured).toBe(false);
    expect(config.defaultProviderId).toBe("mock");
    expect(JSON.stringify(config)).not.toMatch(/sk-/i);

    await expect(
      completeOpenAIChat({
        context: {
          organization: { organizationId: null, workspaceId: null },
          conversation: [],
          userPrompt: "Hello, how are you?",
        },
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
  });

  it("does not turn OpenAI HTTP failures into mock replies", async () => {
    process.env.AGXORA_OPENAI_API_KEY = "sk-test-not-a-real-key";
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { message: "invalid_api_key" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });

    try {
      await completeOpenAIChat({
        context: {
          organization: { organizationId: null, workspaceId: null },
          conversation: [],
          userPrompt: "Hello, how are you?",
        },
        fetchImpl,
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AIError);
      const aiError = error as AIError;
      expect(aiError.code).toBe("PROVIDER_NOT_CONFIGURED");
      expect(isMockAiFallbackText(aiError.message)).toBe(false);
    }
  });

  it("defaults production settings to OpenAI", () => {
    expect(DEFAULT_AI_SETTINGS.defaultProviderId).toBe("openai");
    expect(DEFAULT_AI_SETTINGS.defaultModelId).not.toBe("mock-local");
  });
});
