/**
 * Browser client for server-side AI chat (no secrets in the client).
 */

import type { AIRuntimeContext } from "./AIContext";
import { AIError } from "./AIErrorHandler";
import type { AIProviderId } from "./AIModel";
import type { AIChatResponse } from "./AIProvider";
import type { AISettings } from "./AISettings";

export type ClientAiChatInput = {
  readonly context: AIRuntimeContext;
  readonly providerId?: AIProviderId;
  readonly modelId?: string;
  readonly settings?: Partial<AISettings>;
  readonly signal?: AbortSignal;
};

export async function requestServerAiChat(
  input: ClientAiChatInput,
): Promise<AIChatResponse> {
  const response = await fetch("/api/v1/ai/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context: input.context,
      providerId: input.providerId,
      modelId: input.modelId,
      settings: input.settings,
    }),
    signal: input.signal,
  });

  const payload = (await response.json()) as {
    ok?: boolean;
    code?: string;
    message?: string;
    providerId?: AIProviderId;
    content?: string;
    modelId?: string;
    usage?: AIChatResponse["usage"];
    finishReason?: AIChatResponse["finishReason"];
  };

  if (!response.ok || !payload.ok || !payload.content) {
    throw new AIError({
      code:
        payload.code === "PROVIDER_NOT_CONFIGURED"
          ? "PROVIDER_NOT_CONFIGURED"
          : response.status === 429
            ? "RATE_LIMITED"
            : "PROVIDER_UNAVAILABLE",
      message:
        payload.message ||
        (response.status === 503
          ? "AI provider is not configured on the server."
          : "AI chat request failed"),
      providerId: payload.providerId,
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  return {
    content: payload.content,
    providerId: payload.providerId ?? "openai",
    modelId: payload.modelId ?? input.modelId ?? "gpt-4o-mini",
    usage: payload.usage,
    finishReason: payload.finishReason,
  };
}
