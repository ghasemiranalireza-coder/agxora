/**
 * Server-side AI chat generation — actor-scoped, provider-backed, no client secrets.
 */

import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { AIRuntimeContext } from "./AIContext";
import { AIError } from "./AIErrorHandler";
import type { AIProviderId } from "./AIModel";
import type { AIChatResponse } from "./AIProvider";
import { buildLanguageInstruction, resolveChatLocale } from "./chatLanguage";
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
  readonly preferredLocale?: string | null;
};

export type ServerAiReadiness = {
  readonly ready: boolean;
  readonly defaultProviderId: AIProviderId | null;
  readonly configuredProviders: readonly AIProviderId[];
  readonly mockAllowed: boolean;
  readonly mockOnly: boolean;
  readonly issueCode?: "provider_not_configured" | "mock_only";
  readonly message: string;
};

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

  const mockAllowed = isMockChatAllowed();
  const defaultProviderId = getDefaultConfiguredServerProviderId();
  const mockOnly = defaultProviderId === "mock";

  if (!defaultProviderId || mockOnly) {
    return {
      ready: false,
      defaultProviderId: mockOnly ? "mock" : null,
      configuredProviders,
      mockAllowed,
      mockOnly,
      issueCode: mockOnly ? "mock_only" : "provider_not_configured",
      message: mockOnly
        ? "Only mock AI is available. Configure AGXORA_OPENAI_API_KEY for real chat."
        : "No AI provider is configured. Set AGXORA_OPENAI_API_KEY on the server.",
    };
  }

  return {
    ready: true,
    defaultProviderId,
    configuredProviders,
    mockAllowed,
    mockOnly: false,
    message: `${defaultProviderId} is configured for chat`,
  };
}

function assertActorOrganizationScope(
  actor: Actor,
  context: AIRuntimeContext,
): AIRuntimeContext {
  const clientOrg = context.organization.organizationId;
  if (clientOrg && clientOrg !== actor.organizationId) {
    throw new PersistenceError("forbidden", "Organization mismatch", {
      details: [{ field: "organizationId", message: "cross_org" }],
    });
  }
  return {
    ...context,
    organization: {
      ...context.organization,
      organizationId: actor.organizationId,
    },
  };
}

export async function generateServerAiChatForActor(
  actor: Actor,
  input: ServerAiChatInput,
): Promise<AIChatResponse> {
  const settings = mergeAISettings(input.settings);
  const providerId = resolveServerProviderId(
    input.providerId ?? settings.defaultProviderId,
  );
  const provider = createServerAIProvider(providerId);
  const modelId = input.modelId ?? settings.defaultModelId;

  const scopedContext = assertActorOrganizationScope(actor, input.context);
  const locale = resolveChatLocale({
    preferredLocale: input.preferredLocale,
    organizationLanguage: scopedContext.organization.language,
  });

  const enrichedContext: AIRuntimeContext = {
    ...scopedContext,
    organization: {
      ...scopedContext.organization,
      organizationId: actor.organizationId,
      language: locale,
    },
    systemPrompt: [
      scopedContext.systemPrompt?.trim(),
      buildLanguageInstruction(locale),
    ]
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
