/**
 * Server-only AI provider configuration (secrets never leave the server).
 */

import "server-only";

import type { AIProviderId } from "./AIModel";
import { AI_ENV_KEYS } from "./AISettings";
import { resolveTrustedOpenAIBaseUrl } from "@/app/lib/creative/config";

export type ServerAiProviderConfig = {
  readonly providerId: AIProviderId;
  readonly openaiApiKey: string | null;
  readonly openaiBaseUrl: string;
  readonly openaiChatModel: string;
  readonly anthropicApiKey: string | null;
  readonly googleApiKey: string | null;
  readonly openrouterApiKey: string | null;
  readonly ollamaBaseUrl: string | null;
  readonly azureApiKey: string | null;
  readonly localLlmBaseUrl: string | null;
  readonly allowMock: boolean;
};

function envPresent(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

export function isServerAiProviderConfigured(providerId: AIProviderId): boolean {
  switch (providerId) {
    case "openai":
      return envPresent(AI_ENV_KEYS.openai);
    case "anthropic":
      return envPresent(AI_ENV_KEYS.anthropic);
    case "google":
      return envPresent(AI_ENV_KEYS.google);
    case "openrouter":
      return envPresent(AI_ENV_KEYS.openrouter);
    case "ollama":
      return envPresent(AI_ENV_KEYS.ollama);
    case "azure":
      return envPresent(AI_ENV_KEYS.azure);
    case "local":
      return envPresent(AI_ENV_KEYS.local);
    case "mock":
      return isMockChatAllowed();
    default:
      return false;
  }
}

export function isMockChatAllowed(): boolean {
  const raw = process.env.AGXORA_AI_CHAT_ALLOW_MOCK?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** First configured provider in priority order for server-side chat. */
export function getDefaultConfiguredServerProviderId(): AIProviderId | null {
  const priority: readonly AIProviderId[] = [
    "openai",
    "anthropic",
    "google",
    "openrouter",
    "ollama",
    "azure",
    "local",
  ];
  for (const id of priority) {
    if (isServerAiProviderConfigured(id)) return id;
  }
  if (isMockChatAllowed()) return "mock";
  return null;
}

export function getServerAiProviderConfig(): ServerAiProviderConfig {
  const explicitDefault = process.env.AGXORA_AI_CHAT_DEFAULT_PROVIDER?.trim().toLowerCase();
  const defaultProvider =
    (explicitDefault as AIProviderId | undefined) ??
    getDefaultConfiguredServerProviderId() ??
    "openai";

  return {
    providerId: defaultProvider,
    openaiApiKey: process.env.AGXORA_OPENAI_API_KEY?.trim() || null,
    openaiBaseUrl: resolveTrustedOpenAIBaseUrl(process.env.AGXORA_OPENAI_BASE_URL),
    openaiChatModel:
      process.env.AGXORA_OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini",
    anthropicApiKey: process.env.AGXORA_ANTHROPIC_API_KEY?.trim() || null,
    googleApiKey: process.env.AGXORA_GOOGLE_API_KEY?.trim() || null,
    openrouterApiKey: process.env.AGXORA_OPENROUTER_API_KEY?.trim() || null,
    ollamaBaseUrl: process.env.AGXORA_OLLAMA_BASE_URL?.trim() || null,
    azureApiKey: process.env.AGXORA_AZURE_OPENAI_API_KEY?.trim() || null,
    localLlmBaseUrl: process.env.AGXORA_LOCAL_LLM_BASE_URL?.trim() || null,
    allowMock: isMockChatAllowed(),
  };
}

export function resolveOpenAIChatModel(modelId: string, config: ServerAiProviderConfig): string {
  const catalogMap: Record<string, string> = {
    "gpt-4.1": config.openaiChatModel,
    "gpt-5": config.openaiChatModel,
    "mock-local": config.openaiChatModel,
  };
  return catalogMap[modelId] ?? modelId;
}
