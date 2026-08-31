/**
 * Server-only OpenAI Chat Completions client.
 * Uses AGXORA_OPENAI_API_KEY. Never logs or returns the key.
 */

import "server-only";

import type { AIRuntimeContext } from "./AIContext";
import { AIError } from "./AIErrorHandler";
import type { AIChatResponse } from "./AIProvider";
import { assemblePrompt } from "./prompt/assemblePrompt";
import {
  getOpenAIApiKey,
  getOpenAIChatBaseUrl,
  getOpenAIChatModel,
} from "./serverConfig";
import type { AIStreamHandler } from "./AIStreaming";

const DEFAULT_TIMEOUT_MS = 60_000;
const FALLBACK_CHAT_MODEL = "gpt-4o";

export type OpenAIChatInput = {
  readonly context: AIRuntimeContext;
  readonly modelId?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
};

type OpenAIMessage = {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
};

type OpenAIChatCompletion = {
  readonly model?: string;
  readonly choices?: readonly {
    readonly message?: { readonly content?: string | null };
    readonly finish_reason?: string | null;
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
  readonly error?: { readonly message?: string; readonly code?: string };
};

function sanitizeProviderMessage(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9_*\-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\*{4,}/g, "[redacted]")
    .slice(0, 240);
}

function requireApiKey(): string {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: "OpenAI is not configured. Set AGXORA_OPENAI_API_KEY on the server.",
      providerId: "openai",
      retryable: false,
    });
  }
  return apiKey;
}

function toOpenAIMessages(context: AIRuntimeContext): OpenAIMessage[] {
  const assembled = assemblePrompt(context);
  return assembled.messages
    .filter(
      (message): message is { role: "system" | "user" | "assistant"; content: string } =>
        message.role === "system" ||
        message.role === "user" ||
        message.role === "assistant",
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function mapHttpError(status: number, rawMessage: string): AIError {
  const message = sanitizeProviderMessage(rawMessage) || `openai_http_${status}`;
  if (status === 401 || status === 403) {
    return new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message,
      providerId: "openai",
      retryable: false,
    });
  }
  if (status === 429) {
    return new AIError({
      code: "RATE_LIMITED",
      message,
      providerId: "openai",
      retryable: true,
    });
  }
  if (status >= 400 && status < 500) {
    return new AIError({
      code: "INVALID_REQUEST",
      message,
      providerId: "openai",
      retryable: false,
    });
  }
  return new AIError({
    code: "PROVIDER_UNAVAILABLE",
    message,
    providerId: "openai",
    retryable: true,
  });
}

function isModelMissing(status: number, message: string, code?: string): boolean {
  if (code === "model_not_found") return true;
  if (status !== 404 && status !== 400) return false;
  return /model/i.test(message) && /not found|does not exist|invalid/i.test(message);
}

async function postChatCompletions(input: {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly body: Record<string, unknown>;
  readonly fetchImpl: typeof fetch;
  readonly signal: AbortSignal;
}): Promise<Response> {
  return input.fetchImpl(`${input.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
    signal: input.signal,
  });
}

function resolveRequestedModel(modelId?: string): string {
  const requested = modelId?.trim();
  if (requested && requested !== "mock-local") return requested;
  return getOpenAIChatModel();
}

export async function completeOpenAIChat(
  input: OpenAIChatInput,
): Promise<AIChatResponse> {
  const apiKey = requireApiKey();
  const fetchImpl = input.fetchImpl ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  if (input.signal) {
    if (input.signal.aborted) controller.abort();
    else input.signal.addEventListener("abort", onParentAbort, { once: true });
  }

  const messages = toOpenAIMessages(input.context);
  const primaryModel = resolveRequestedModel(input.modelId);
  const temperature = input.temperature ?? 0.4;
  const maxTokens = input.maxTokens ?? 2048;

  try {
    const attempt = async (
      model: string,
      tokenField: "max_tokens" | "max_completion_tokens" = "max_tokens",
    ): Promise<AIChatResponse> => {
      const response = await postChatCompletions({
        apiKey,
        baseUrl: getOpenAIChatBaseUrl(),
        body: {
          model,
          messages,
          temperature,
          [tokenField]: maxTokens,
          stream: false,
        },
        fetchImpl,
        signal: controller.signal,
      });

      let payload: OpenAIChatCompletion | null = null;
      try {
        payload = (await response.json()) as OpenAIChatCompletion;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const raw =
          payload?.error?.message || `openai_http_${response.status}`;
        if (
          tokenField === "max_tokens" &&
          /max_tokens|max_completion_tokens/i.test(raw)
        ) {
          return attempt(model, "max_completion_tokens");
        }
        if (
          model !== FALLBACK_CHAT_MODEL &&
          isModelMissing(response.status, raw, payload?.error?.code)
        ) {
          return attempt(FALLBACK_CHAT_MODEL, tokenField);
        }
        throw mapHttpError(response.status, raw);
      }

      const content = payload?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new AIError({
          code: "PROVIDER_UNAVAILABLE",
          message: "OpenAI returned an empty chat completion",
          providerId: "openai",
          retryable: true,
        });
      }

      const finish = payload?.choices?.[0]?.finish_reason;
      return {
        content,
        providerId: "openai",
        modelId: payload?.model || model,
        usage: {
          promptTokens: payload?.usage?.prompt_tokens,
          completionTokens: payload?.usage?.completion_tokens,
          totalTokens: payload?.usage?.total_tokens,
        },
        finishReason:
          finish === "length"
            ? "length"
            : finish === "tool_calls"
              ? "tool_calls"
              : "stop",
      };
    };

    return await attempt(primaryModel);
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new AIError({
        code: "ABORTED",
        message: input.signal?.aborted
          ? "Generation cancelled"
          : "OpenAI request timed out",
        providerId: "openai",
        retryable: !input.signal?.aborted,
      });
    }
    throw new AIError({
      code: "PROVIDER_UNAVAILABLE",
      message: sanitizeProviderMessage(
        error instanceof Error ? error.message : "OpenAI request failed",
      ),
      providerId: "openai",
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onParentAbort);
  }
}

export async function streamOpenAIChat(
  input: OpenAIChatInput,
  onEvent: AIStreamHandler,
): Promise<AIChatResponse> {
  const apiKey = requireApiKey();
  const fetchImpl = input.fetchImpl ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  if (input.signal) {
    if (input.signal.aborted) controller.abort();
    else input.signal.addEventListener("abort", onParentAbort, { once: true });
  }

  const messages = toOpenAIMessages(input.context);
  const model = resolveRequestedModel(input.modelId);
  let assembled = "";
  let modelId = model;

  onEvent({
    type: "start",
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await postChatCompletions({
      apiKey,
      baseUrl: getOpenAIChatBaseUrl(),
      body: {
        model,
        messages,
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxTokens ?? 2048,
        stream: true,
      },
      fetchImpl,
      signal: controller.signal,
    });

    if (!response.ok) {
      let raw = `openai_http_${response.status}`;
      try {
        const payload = (await response.json()) as OpenAIChatCompletion;
        raw = payload.error?.message || raw;
      } catch {
        /* keep status fallback */
      }
      throw mapHttpError(response.status, raw);
    }

    if (!response.body) {
      throw new AIError({
        code: "PROVIDER_UNAVAILABLE",
        message: "OpenAI stream had no body",
        providerId: "openai",
        retryable: true,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let parsed: {
          readonly model?: string;
          readonly choices?: readonly {
            readonly delta?: { readonly content?: string };
          }[];
        };
        try {
          parsed = JSON.parse(data) as typeof parsed;
        } catch {
          continue;
        }
        if (parsed.model) modelId = parsed.model;
        const delta = parsed.choices?.[0]?.delta?.content;
        if (!delta) continue;
        assembled += delta;
        onEvent({
          type: "delta",
          delta,
          content: assembled,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (!assembled.trim()) {
      throw new AIError({
        code: "PROVIDER_UNAVAILABLE",
        message: "OpenAI stream returned no content",
        providerId: "openai",
        retryable: true,
      });
    }

    onEvent({
      type: "done",
      content: assembled,
      timestamp: new Date().toISOString(),
    });

    return {
      content: assembled,
      providerId: "openai",
      modelId,
      finishReason: controller.signal.aborted ? "cancelled" : "stop",
    };
  } catch (error) {
    if (error instanceof AIError) {
      onEvent({
        type: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      onEvent({
        type: "cancelled",
        content: assembled,
        timestamp: new Date().toISOString(),
      });
      throw new AIError({
        code: "ABORTED",
        message: input.signal?.aborted
          ? "Generation cancelled"
          : "OpenAI request timed out",
        providerId: "openai",
        retryable: !input.signal?.aborted,
      });
    }
    const mapped = new AIError({
      code: "PROVIDER_UNAVAILABLE",
      message: sanitizeProviderMessage(
        error instanceof Error ? error.message : "OpenAI stream failed",
      ),
      providerId: "openai",
      retryable: true,
    });
    onEvent({
      type: "error",
      error: mapped.message,
      timestamp: new Date().toISOString(),
    });
    throw mapped;
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onParentAbort);
  }
}
