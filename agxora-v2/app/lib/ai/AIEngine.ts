/**
 * AIEngine — central orchestration for provider-independent intelligence.
 */

import type { AIRuntimeContext } from "./AIContext";
import { AIError, logAIError, toAIError } from "./AIErrorHandler";
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
    this.settings = mergeAISettings({ ...this.settings, ...partial });
    if (partial.defaultProviderId) {
      this.provider = this.factory.create(partial.defaultProviderId);
    }
    return this.settings;
  }

  setProvider(providerId: AIProviderId): AIProvider {
    this.provider = this.factory.create(providerId);
    this.settings = {
      ...this.settings,
      defaultProviderId: providerId,
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
    const provider = input.providerId
      ? this.factory.create(input.providerId)
      : this.provider;
    const modelId = input.modelId ?? settings.defaultModelId;

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
      if (settings.streamingEnabled && input.onStream) {
        return await provider.stream(request, input.onStream);
      }
      if (input.useTools) {
        return await provider.toolCalling(request);
      }
      return await provider.chat(request);
    } catch (error) {
      const aiError = toAIError(error, provider.id);
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
