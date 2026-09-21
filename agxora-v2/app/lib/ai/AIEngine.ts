/**
 * AIEngine — central orchestration for provider-independent intelligence.
 */

import type { AIRuntimeContext } from "./AIContext";
import { AIError, logAIError } from "./AIErrorHandler";
import type { AIProviderId } from "./AIModel";
import type {
  AIChatResponse,
  AIEmbeddingResponse,
  AIHealthStatus,
  AIProvider,
} from "./AIProvider";
import { aiProviderFactory } from "./AIProviderFactory";
import { defaultRateLimiter, type AIRateLimiter } from "./AIRateLimiter";
import {
  DEFAULT_AI_SETTINGS,
  mergeAISettings,
  type AISettings,
} from "./AISettings";
import {
  createStreamController,
  type AIStreamHandler,
} from "./AIStreaming";
import { trimToContextWindow } from "./AITokenCounter";
import {
  defaultToolRegistry,
  type AIToolRegistry,
} from "./AITools";
import {
  customerAiErrorForThrow,
  customerAiUnavailableError,
  isUnsafeSimulatedAiText,
  selectCustomerChatProviderId,
} from "./customerChatProvider";
import { assemblePrompt } from "./prompt/assemblePrompt";

export interface AIEngineGenerateInput {
  readonly context: AIRuntimeContext;
  readonly settings?: Partial<AISettings>;
  readonly providerId?: AIProviderId;
  readonly modelId?: string;
  readonly signal?: AbortSignal;
  readonly onStream?: AIStreamHandler;
  readonly useTools?: boolean;
}

export class AIEngine {
  private settings: AISettings = DEFAULT_AI_SETTINGS;
  private provider: AIProvider;

  constructor(
    private readonly factory = aiProviderFactory,
    private readonly rateLimiter: AIRateLimiter = defaultRateLimiter,
    private readonly tools: AIToolRegistry = defaultToolRegistry,
  ) {
    this.provider = this.factory.create(this.settings.defaultProviderId);
  }

  getSettings(): AISettings {
    return this.settings;
  }

  updateSettings(partial: Partial<AISettings>): AISettings {
    const nextProviderId = partial.defaultProviderId
      ? selectCustomerChatProviderId(partial.defaultProviderId)
      : undefined;
    this.settings = mergeAISettings({
      ...this.settings,
      ...partial,
      ...(nextProviderId ? { defaultProviderId: nextProviderId } : {}),
    });
    if (nextProviderId) {
      this.provider = this.factory.create(nextProviderId);
    }
    return this.settings;
  }

  setProvider(providerId: AIProviderId): AIProvider {
    const resolvedId = selectCustomerChatProviderId(providerId);
    this.provider = this.factory.create(resolvedId);
    this.settings = {
      ...this.settings,
      defaultProviderId: resolvedId,
    };
    return this.provider;
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  listTools() {
    return this.tools.list();
  }

  async health(providerId?: AIProviderId): Promise<AIHealthStatus> {
    const provider = providerId
      ? this.factory.create(providerId)
      : this.provider;
    return provider.health();
  }

  async generate(input: AIEngineGenerateInput): Promise<AIChatResponse> {
    const settings = mergeAISettings({ ...this.settings, ...input.settings });
    const requestedId = input.providerId ?? this.provider.id;
    const resolvedId = selectCustomerChatProviderId(requestedId);
    const provider =
      resolvedId === this.provider.id
        ? this.provider
        : this.factory.create(resolvedId);
    const modelId =
      input.modelId && input.modelId !== "mock-local"
        ? input.modelId
        : settings.defaultModelId;

    const limit = this.rateLimiter.check(
      `${provider.id}:${input.context.organization.organizationId ?? "anon"}`,
    );
    if (!limit.allowed) {
      const error = new AIError({
        code: "RATE_LIMITED",
        message: "AI rate limit exceeded",
        providerId: provider.id,
        retryable: true,
        details: { retryAfterMs: limit.retryAfterMs },
      });
      logAIError(error);
      throw error;
    }

    const assembled = assemblePrompt(input.context);
    const trimmed = trimToContextWindow({
      messages: assembled.messages,
      modelId,
      reserveOutputTokens: settings.maxTokens,
    });

    const requestContext: AIRuntimeContext = {
      ...input.context,
      conversation: trimmed.messages.filter((m) => m.role !== "system"),
      systemPrompt: assembled.systemPrompt,
      userPrompt: assembled.userPrompt,
    };

    const controller = createStreamController(input.signal);
    const request = {
      context: requestContext,
      modelId,
      settings,
      tools: input.useTools ? this.tools.list() : undefined,
      signal: controller.signal,
    };

    try {
      let response: AIChatResponse;
      if (settings.streamingEnabled && input.onStream) {
        response = await provider.stream(request, input.onStream);
      } else if (input.useTools) {
        response = await provider.toolCalling(request);
      } else {
        response = await provider.chat(request);
      }
      if (provider.id === "mock" || isUnsafeSimulatedAiText(response.content)) {
        throw customerAiUnavailableError(provider.id);
      }
      return response;
    } catch (error) {
      const aiError = customerAiErrorForThrow(error, provider.id);
      logAIError(aiError);
      throw aiError;
    }
  }

  async embed(
    input: string | readonly string[],
    modelId?: string,
  ): Promise<AIEmbeddingResponse> {
    return this.provider.embeddings({ input, modelId });
  }

  cancel(signalHost: { abort: () => void }): void {
    signalHost.abort();
  }
}

export const aiEngine = new AIEngine();
