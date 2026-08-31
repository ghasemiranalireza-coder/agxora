/**
 * Shared OpenAI chat API contract (no secrets).
 * Client OpenAIProvider ↔ server /api/v1/ai/chat.
 */

import type { AIRuntimeContext } from "./AIContext";
import type { AIProviderId } from "./AIModel";

export type OpenAIChatApiRequest = {
  readonly context: AIRuntimeContext;
  readonly modelId?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stream?: boolean;
};

export type OpenAIChatApiSuccess = {
  readonly ok: true;
  readonly content: string;
  readonly providerId: "openai";
  readonly modelId: string;
  readonly usage?: {
    readonly promptTokens?: number;
    readonly completionTokens?: number;
    readonly totalTokens?: number;
  };
  readonly finishReason?: "stop" | "length" | "tool_calls" | "cancelled" | "error";
};

export type OpenAIChatApiError = {
  readonly ok: false;
  readonly code: string;
  readonly message: string;
  readonly providerId?: AIProviderId;
  readonly retryable?: boolean;
};

export const OPENAI_CHAT_PATH = "/api/v1/ai/chat";
export const OPENAI_READINESS_PATH = "/api/v1/ai/readiness";

export function isMockAiFallbackText(content: string): boolean {
  const text = content.trim();
  if (text.startsWith("Understood:")) return true;
  if (text.includes("Connect OpenAI, Anthropic, Gemini, OpenRouter, or Ollama")) {
    return true;
  }
  if (text.includes("replied with the local mock engine")) return true;
  if (text.includes("the provider interface is already live")) return true;
  return false;
}
