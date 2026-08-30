/**
 * Server-only AI provider factory — real network adapters when configured.
 */

import "server-only";

import type { AIProviderId } from "./AIModel";
import type { AIProvider } from "./AIProvider";
import { AIError } from "./AIErrorHandler";
import { MockAIProvider } from "./providers/MockAIProvider";
import { OpenAIChatProvider } from "./providers/openaiChatProvider";
import {
  getDefaultConfiguredServerProviderId,
  isMockChatAllowed,
  isServerAiProviderConfigured,
} from "./serverConfig";

const openAiSingleton = new OpenAIChatProvider();
const mockSingleton = new MockAIProvider();

export function createServerAIProvider(providerId: AIProviderId): AIProvider {
  if (providerId === "mock") {
    if (!isMockChatAllowed()) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message:
          "Mock AI is disabled in this environment. Configure AGXORA_OPENAI_API_KEY or set AGXORA_AI_CHAT_ALLOW_MOCK=true for local development.",
        providerId: "mock",
      });
    }
    return mockSingleton;
  }

  if (providerId === "openai") {
    if (!isServerAiProviderConfigured("openai")) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message:
          "OpenAI is not configured. Set AGXORA_OPENAI_API_KEY on the server.",
        providerId: "openai",
      });
    }
    return openAiSingleton;
  }

  if (!isServerAiProviderConfigured(providerId)) {
    throw new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: `${providerId} is not configured on the server.`,
      providerId,
    });
  }

  throw new AIError({
    code: "PROVIDER_NOT_CONFIGURED",
    message: `${providerId} network adapter is not enabled yet. Configure OpenAI first.`,
    providerId,
  });
}

export function resolveServerProviderId(
  requested?: AIProviderId | null,
): AIProviderId {
  if (requested === "mock") {
    if (!isMockChatAllowed()) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message:
          "Mock AI is disabled. Configure AGXORA_OPENAI_API_KEY on the server.",
        providerId: "mock",
      });
    }
    return "mock";
  }

  if (requested) {
    if (isServerAiProviderConfigured(requested)) {
      return requested;
    }
    throw new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: `${requested} is not configured on the server.`,
      providerId: requested,
    });
  }

  const fallback = getDefaultConfiguredServerProviderId();
  if (!fallback || fallback === "mock") {
    throw new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message:
        "No AI provider is configured. Set AGXORA_OPENAI_API_KEY (or another provider key) on the server.",
    });
  }
  return fallback;
}
