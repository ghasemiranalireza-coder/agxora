/**
 * First-customer chat must never silently use MockAI.
 * MockAIProvider remains available for tests and explicit local fixtures.
 */

import type { AIProviderId } from "./AIModel";
import { AIError } from "./AIErrorHandler";
import { isMockAiFallbackText } from "./openaiApi";

export const CUSTOMER_CHAT_PROVIDER_ID = "openai" as const;
export const CUSTOMER_AI_UNAVAILABLE_KEY = "dashboard.chat.unavailable";

export function isMockAiProviderId(id: string | null | undefined): boolean {
  return id === "mock";
}

export function selectCustomerChatProviderId(
  requested?: AIProviderId | null,
): AIProviderId {
  if (!requested || isMockAiProviderId(requested)) {
    return CUSTOMER_CHAT_PROVIDER_ID;
  }
  return requested;
}

export function containsInventedBusinessMetrics(content: string): boolean {
  const text = content.toLowerCase();
  return (
    text.includes("approximately 18%") ||
    text.includes("about 12%") ||
    /revenue is projected to increase by approximately 18%/.test(text) ||
    /customer retention improved by about 12%/.test(text)
  );
}

export function isUnsafeSimulatedAiText(content: string): boolean {
  return isMockAiFallbackText(content) || containsInventedBusinessMetrics(content);
}

export function customerAiUnavailableError(
  providerId: string = CUSTOMER_CHAT_PROVIDER_ID,
): AIError {
  return new AIError({
    code: "PROVIDER_UNAVAILABLE",
    message: CUSTOMER_AI_UNAVAILABLE_KEY,
    providerId,
    retryable: true,
  });
}

export function isCustomerAiUnavailableError(error: unknown): boolean {
  if (!(error instanceof AIError)) return false;
  return (
    error.code === "PROVIDER_NOT_CONFIGURED" ||
    error.code === "PROVIDER_UNAVAILABLE"
  );
}

export function customerAiErrorForThrow(error: unknown, providerId?: string): AIError {
  if (error instanceof AIError) {
    if (
      error.code === "ABORTED" ||
      error.code === "RATE_LIMITED" ||
      error.code === "INVALID_REQUEST"
    ) {
      return error;
    }
    if (isCustomerAiUnavailableError(error)) {
      return new AIError({
        code: error.code,
        message: CUSTOMER_AI_UNAVAILABLE_KEY,
        providerId: error.providerId ?? providerId,
        retryable: error.retryable,
      });
    }
  }
  return customerAiUnavailableError(providerId);
}
