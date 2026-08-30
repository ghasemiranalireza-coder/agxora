/**
 * Server-side AI chat generation — actor-scoped, provider-backed, no client secrets.
 */

import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import type { AIRuntimeContext } from "./AIContext";
import { AIError } from "./AIErrorHandler";
import type { AIProviderId } from "./AIModel";
import type { AIChatResponse } from "./AIProvider";
import { assemblePrompt } from "./prompt/assemblePrompt";
import { mergeAISettings, type AISettings } from "./AISettings";
import { trimToContextWindow } from "./AITokenCounter";
import {
  createServerAIProvider,
  resolveServerProviderId,
} from "./serverProviderFactory";
import {
  getDefaultConfiguredServerProviderId,
  isMockChatAllowed,
  isServerAiProviderConfigured,
} from "./serverConfig";

export type ServerAiChatInput = {
  readonly context: AIRuntimeContext;
  readonly settings?: Partial<AISettings>;
  readonly providerId?: AIProviderId;
  readonly modelId?: string;
};

export type ServerAiReadiness = {
  readonly ready: boolean;
  readonly defaultProviderId: AIProviderId | null;
  readonly configuredProviders: readonly AIProviderId[];
  readonly mockAllowed: boolean;
  readonly issueCode?: "provider_not_configured";
  readonly message: string;
};

const LANGUAGE_INSTRUCTION =
  "Respond in the same language the user writes in. If the user writes in German, respond in German. If the user writes in Persian, respond in Persian. Match the user's language naturally.";

export function evaluateServerAiReadiness(): ServerAiReadiness {
  const configuredProviders = (
    [
      "openai",
      "anthropic",
      "google",
      "openrouter",
      "ollama",
      "azure",
      "local",
    ] as const
  ).filter((id) => isServerAiProviderConfigured(id));

  const defaultProviderId = getDefaultConfiguredServerProviderId();
  const mockAllowed = isMockChatAllowed();

  if (!defaultProviderId) {
    return {
      ready: false,
      defaultProviderId: null,
      configuredProviders,
      mockAllowed,
      issueCode: "provider_not_configured",
      message:
        "No AI provider is configured. Set AGXORA_OPENAI_API_KEY on the server.",
    };
  }

  return {
    ready: true,
    defaultProviderId,
    configuredProviders,
    mockAllowed,
    message:
      defaultProviderId === "mock"
        ? "Mock AI provider enabled for development"
        : `${defaultProviderId} is configured for chat`,
  };
}

export async function generateServerAiChatForActor(
  actor: Actor,
  input: ServerAiChatInput,
): Promise<AIChatResponse> {
  void actor.organizationId;

  const settings = mergeAISettings(input.settings);
  const providerId = resolveServerProviderId(
    input.providerId ?? settings.defaultProviderId,
  );
  const provider = createServerAIProvider(providerId);
  const modelId = input.modelId ?? settings.defaultModelId;

  const enrichedContext: AIRuntimeContext = {
    ...input.context,
    organization: {
      ...input.context.organization,
      organizationId:
        input.context.organization.organizationId ?? actor.organizationId,
    },
    systemPrompt: [input.context.systemPrompt?.trim(), LANGUAGE_INSTRUCTION]
      .filter(Boolean)
      .join("\n\n"),
  };

  const assembled = assemblePrompt(enrichedContext);
  const trimmed = trimToContextWindow({
    messages: assembled.messages,
    modelId,
    reserveOutputTokens: settings.maxTokens,
  });

  const requestContext: AIRuntimeContext = {
    ...enrichedContext,
    conversation: trimmed.messages.filter((message) => message.role !== "system"),
    systemPrompt: assembled.systemPrompt,
    userPrompt: assembled.userPrompt,
  };

  try {
    return await provider.chat({
      context: requestContext,
      modelId,
      settings,
      signal: undefined,
    });
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError({
      code: "PROVIDER_UNAVAILABLE",
      message: error instanceof Error ? error.message : "AI provider failed",
      providerId,
      retryable: true,
    });
  }
}
