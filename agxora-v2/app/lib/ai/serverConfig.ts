/**
 * Server-only AI configuration. Never returns secrets.
 */

import "server-only";

import { resolveTrustedOpenAIBaseUrl } from "@/app/lib/creative/config";

export const DEFAULT_OPENAI_CHAT_MODEL = "gpt-4.1";

export type AiServerPublicConfig = {
  readonly ready: boolean;
  readonly configured: boolean;
  readonly defaultProviderId: "openai";
  readonly defaultModelId: string;
  readonly providerId: "openai";
  readonly chatModelId: string;
  readonly message: string;
};

export function getOpenAIApiKey(): string | null {
  const value = process.env.AGXORA_OPENAI_API_KEY?.trim() || "";
  return value.length > 0 ? value : null;
}

export function getOpenAIChatModel(): string {
  return process.env.AGXORA_OPENAI_CHAT_MODEL?.trim() || DEFAULT_OPENAI_CHAT_MODEL;
}

export function getOpenAIChatBaseUrl(): string {
  return resolveTrustedOpenAIBaseUrl(process.env.AGXORA_OPENAI_BASE_URL);
}

export function getAiServerConfig(): AiServerPublicConfig {
  const configured = getOpenAIApiKey() !== null;
  const chatModelId = getOpenAIChatModel();
  return {
    ready: configured,
    configured,
    defaultProviderId: "openai",
    defaultModelId: chatModelId,
    providerId: "openai",
    chatModelId,
    message: configured
      ? "OpenAI is configured"
      : "OpenAI is not configured on the server",
  };
}
