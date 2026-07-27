/**
 * Server-side generation runner — selects real provider or mock fallback.
 */

import "server-only";

import type { AIRuntimeContext } from "../AIContext";
import type { AIChatResponse } from "../AIProvider";
import type { AIProviderId } from "../AIModel";
import {
  DEFAULT_AI_SETTINGS,
  mergeAISettings,
  type AISettings,
} from "../AISettings";
import type { AIStreamHandler } from "../AIStreaming";
import { MockAIProvider } from "../providers/MockAIProvider";
import { modelSelector } from "../ModelSelector";
import { promptBuilder } from "../PromptBuilder";
import { tokenCounter } from "../TokenCounter";
import { toAIError } from "../AIErrorHandler";
import {
  getProviderSecret,
  loadServerAISettings,
  providerIdToSecretKind,
} from "./secrets";
import { OpenAIRealProvider } from "./providers/OpenAIRealProvider";
import { AnthropicRealProvider } from "./providers/AnthropicRealProvider";
import { GoogleGeminiRealProvider } from "./providers/GoogleGeminiRealProvider";
import { OpenRouterRealProvider } from "./providers/OpenRouterRealProvider";
import { OllamaRealProvider } from "./providers/OllamaRealProvider";

export interface ServerGenerateInput {
  readonly context: AIRuntimeContext;
  readonly settings?: Partial<AISettings>;
  readonly providerId?: AIProviderId;
  readonly modelId?: string;
  readonly signal?: AbortSignal;
  readonly stream?: boolean;
  readonly onEvent?: AIStreamHandler;
}

type RunnableProvider = {
  readonly id: AIProviderId;
  chat(request: {
    context: AIRuntimeContext;
    modelId: string;
    settings: AISettings;
    signal?: AbortSignal;
  }): Promise<AIChatResponse>;
  stream(
    request: {
      context: AIRuntimeContext;
      modelId: string;
      settings: AISettings;
      signal?: AbortSignal;
    },
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse>;
};

async function resolveProvider(
  providerId: AIProviderId,
): Promise<RunnableProvider> {
  if (providerId === "mock") return new MockAIProvider(12);

  const kind = providerIdToSecretKind(providerId);
  if (providerId === "ollama") {
    return new OllamaRealProvider();
  }
  if (kind) {
    const secret = await getProviderSecret(kind);
    if (!secret) {
      // Fall back to mock so local/dev UX still works without keys.
      return new MockAIProvider(12);
    }
  }

  switch (providerId) {
    case "openai":
      return new OpenAIRealProvider();
    case "anthropic":
      return new AnthropicRealProvider();
    case "google":
      return new GoogleGeminiRealProvider();
    case "openrouter":
      return new OpenRouterRealProvider();
    default:
      return new MockAIProvider(12);
  }
}

export async function runServerGeneration(
  input: ServerGenerateInput,
): Promise<AIChatResponse> {
  const stored = await loadServerAISettings();
  const settings = mergeAISettings({
    ...DEFAULT_AI_SETTINGS,
    ...stored,
    ...input.settings,
  });

  const providerId = input.providerId ?? settings.defaultProviderId;
  const modelId = modelSelector.select({
    providerId,
    modelId: input.modelId ?? settings.defaultModelId,
    settings,
    require: "chat",
  });

  const sanitizedContext: AIRuntimeContext = {
    ...input.context,
    userPrompt: promptBuilder.sanitizeUserPrompt(input.context.userPrompt),
  };

  const assembled = promptBuilder.build(sanitizedContext);
  const trimmed = tokenCounter.trim({
    messages: assembled.messages,
    modelId,
    reserveOutputTokens: settings.maxTokens,
  });

  const requestContext: AIRuntimeContext = {
    ...sanitizedContext,
    conversation: trimmed.messages.filter((m) => m.role !== "system"),
    systemPrompt: assembled.systemPrompt,
    userPrompt: assembled.userPrompt,
  };

  const provider = await resolveProvider(providerId);
  const request = {
    context: requestContext,
    modelId,
    settings,
    signal: input.signal,
  };

  try {
    if (input.stream && input.onEvent) {
      return await provider.stream(request, input.onEvent);
    }
    if (settings.streamingEnabled && input.onEvent) {
      return await provider.stream(request, input.onEvent);
    }
    return await provider.chat(request);
  } catch (error) {
    throw toAIError(error, providerId);
  }
}
