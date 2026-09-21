import { describe, expect, it } from "vitest";
import { AIEngine } from "./AIEngine";
import { AIError } from "./AIErrorHandler";
import type { AIProvider } from "./AIProvider";
import type { AIProviderFactory } from "./AIProviderFactory";
import { AIRateLimiter } from "./AIRateLimiter";
import {
  CUSTOMER_AI_UNAVAILABLE_KEY,
  containsInventedBusinessMetrics,
  isMockAiProviderId,
  isUnsafeSimulatedAiText,
  selectCustomerChatProviderId,
} from "./customerChatProvider";
import { MockAIProvider } from "./providers/MockAIProvider";
import { createChatService } from "../modules/chat/chatService";
import { MockAiProvider } from "../modules/chat/MockAiProvider";

function context(prompt: string) {
  return {
    organization: { organizationId: "org-day2", workspaceId: "ws-day2" },
    conversation: [],
    userPrompt: prompt,
  };
}

function fakeOpenAI(
  impl: AIProvider["chat"],
): AIProvider {
  return {
    id: "openai",
    displayName: "OpenAI",
    chat: impl,
    stream: impl,
    async embeddings() {
      throw new Error("unused");
    },
    async models() {
      return [];
    },
    async health() {
      return {
        ok: true,
        providerId: "openai",
        configured: true,
        message: "ok",
        checkedAt: new Date().toISOString(),
      };
    },
    toolCalling: impl,
    vision: impl,
  };
}

function engineFor(create: (id: string) => AIProvider): AIEngine {
  return new AIEngine(
    {
      create: (id) => create(id),
    } as AIProviderFactory,
    new AIRateLimiter(),
  );
}

describe("Day 2 fail-closed customer chat", () => {
  it("TEST A: configured real provider is selected", async () => {
    const created: string[] = [];
    const engine = engineFor((id) => {
      created.push(id);
      expect(id).not.toBe("mock");
      return fakeOpenAI(async (request) => ({
        content: `real:${request.context.userPrompt}`,
        providerId: "openai",
        modelId: "gpt-4.1",
        finishReason: "stop",
      }));
    });

    const response = await engine.generate({
      context: context("Summarize this week's invoices"),
      settings: { streamingEnabled: false },
    });

    expect(selectCustomerChatProviderId("openai")).toBe("openai");
    expect(created.every((id) => id === "openai")).toBe(true);
    expect(response.providerId).toBe("openai");
    expect(response.content).toBe("real:Summarize this week's invoices");
    expect(isUnsafeSimulatedAiText(response.content)).toBe(false);
  });

  it("TEST B: unavailable / mock request never selects MockAIProvider", async () => {
    const created: string[] = [];
    const engine = engineFor((id) => {
      created.push(id);
      if (id === "mock") {
        throw new Error("MockAIProvider must not be selected");
      }
      return fakeOpenAI(async () => {
        throw new AIError({
          code: "PROVIDER_NOT_CONFIGURED",
          message: "OpenAI is not configured on the server.",
          providerId: "openai",
        });
      });
    });

    expect(selectCustomerChatProviderId("mock")).toBe("openai");
    expect(isMockAiProviderId(engine.setProvider("mock").id)).toBe(false);
    expect(engine.getProvider().id).toBe("openai");

    await expect(
      engine.generate({
        context: context("What is our revenue forecast?"),
        providerId: "mock",
        settings: { streamingEnabled: false },
      }),
    ).rejects.toMatchObject({
      message: CUSTOMER_AI_UNAVAILABLE_KEY,
    });

    expect(created).not.toContain("mock");
  });

  it("TEST C: unavailable path does not return invented 18%/12% metrics", async () => {
    const mock = new MockAIProvider(0);
    const invented = await mock.chat({
      context: context("Show revenue and customer retention"),
      modelId: "mock-local",
      settings: {
        defaultProviderId: "mock",
        defaultModelId: "mock-local",
        temperature: 0,
        topP: 1,
        maxTokens: 64,
        streamingEnabled: false,
        reasoningLevel: "low",
        voiceEnabled: false,
        visionEnabled: false,
      },
    });
    expect(containsInventedBusinessMetrics(invented.content)).toBe(true);

    const engine = engineFor((id) => {
      expect(id).toBe("openai");
      return fakeOpenAI(async () => {
        throw new Error("provider unavailable");
      });
    });

    try {
      await engine.generate({
        context: context("Show revenue and customer retention"),
        providerId: "mock",
        settings: { streamingEnabled: false },
      });
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AIError);
      const aiError = error as AIError;
      expect(containsInventedBusinessMetrics(aiError.message)).toBe(false);
      expect(isUnsafeSimulatedAiText(aiError.message)).toBe(false);
      expect(aiError.message).toBe(CUSTOMER_AI_UNAVAILABLE_KEY);
    }

    const service = createChatService({
      provider: new MockAiProvider(0),
      memory: {
        recordMessage: () => undefined,
        buildContext: () => ({
          scope: { kind: "conversation", id: "c1" },
          entries: [],
          generatedAt: new Date().toISOString(),
        }),
      },
    });

    await expect(
      service.sendMessage({ content: "What is our revenue forecast?" }),
    ).rejects.toThrow(CUSTOMER_AI_UNAVAILABLE_KEY);
    const failed = service.listMessages().find((message) => message.role === "assistant");
    expect(failed?.content).toBe("");
    expect(containsInventedBusinessMetrics(failed?.error ?? "")).toBe(false);
  });

  it("TEST D: provider throw becomes a safe unavailable response", async () => {
    const engine = engineFor(() =>
      fakeOpenAI(async () => {
        throw new Error("upstream 502");
      }),
    );

    await expect(
      engine.generate({
        context: context("Hello"),
        settings: { streamingEnabled: false },
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      message: CUSTOMER_AI_UNAVAILABLE_KEY,
    });
  });
});
