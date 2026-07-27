/**
 * Shared HTTP helpers for real provider adapters (server-only).
 */

import "server-only";

import { AIError } from "../AIErrorHandler";
import type { AIProviderId } from "../AIModel";

export async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return response.statusText;
  }
}

export function mapHttpError(
  providerId: AIProviderId,
  response: Response,
  body: string,
): AIError {
  if (response.status === 401 || response.status === 403) {
    return new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: "Invalid API key for provider",
      providerId,
      retryable: false,
      details: { status: response.status },
    });
  }
  if (response.status === 404) {
    return new AIError({
      code: "INVALID_REQUEST",
      message: "Model not found or endpoint missing",
      providerId,
      retryable: false,
      details: { status: response.status, body },
    });
  }
  if (response.status === 429) {
    return new AIError({
      code: "RATE_LIMITED",
      message: "Provider rate limit exceeded",
      providerId,
      retryable: true,
      details: { status: response.status },
    });
  }
  if (response.status >= 500) {
    return new AIError({
      code: "PROVIDER_UNAVAILABLE",
      message: "Provider unavailable",
      providerId,
      retryable: true,
      details: { status: response.status, body },
    });
  }
  return new AIError({
    code: "UNKNOWN",
    message: `Provider error (${response.status})`,
    providerId,
    retryable: true,
    details: { status: response.status, body },
  });
}

export function assertNotAborted(signal?: AbortSignal, providerId?: AIProviderId): void {
  if (signal?.aborted) {
    throw new AIError({
      code: "ABORTED",
      message: "Generation cancelled",
      providerId,
      retryable: false,
    });
  }
}

export type OpenAIStyleMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
