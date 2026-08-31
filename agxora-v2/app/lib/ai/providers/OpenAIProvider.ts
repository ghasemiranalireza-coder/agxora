/**
 * Client-safe OpenAI provider.
 * Calls server /api/v1/ai/chat — never reads AGXORA_OPENAI_API_KEY.
 */

import { AIError } from "../AIErrorHandler";
import { listModelsForProvider } from "../AIModel";
import type {
  AIChatRequest,
  AIChatResponse,
  AIEmbeddingRequest,
  AIEmbeddingResponse,
  AIHealthStatus,
  AIProvider,
  AIVisionRequest,
} from "../AIProvider";
import type { AIStreamHandler } from "../AIStreaming";
import {
  OPENAI_CHAT_PATH,
  OPENAI_READINESS_PATH,
  type OpenAIChatApiError,
  type OpenAIChatApiRequest,
  type OpenAIChatApiSuccess,
} from "../openaiApi";

function toApiError(payload: OpenAIChatApiError | null, fallback: string): AIError {
  const code = payload?.code;
  if (code === "unauthorized" || code === "forbidden") {
    return new AIError({
      code: "INVALID_REQUEST",
      message: payload?.message || fallback,
      providerId: "openai",
      retryable: false,
    });
  }
  if (code === "rate_limited") {
    return new AIError({
      code: "RATE_LIMITED",
      message: payload?.message || fallback,
      providerId: "openai",
      retryable: true,
    });
  }
  const mapped =
    code === "PROVIDER_NOT_CONFIGURED" ||
    code === "PROVIDER_UNAVAILABLE" ||
    code === "RATE_LIMITED" ||
    code === "ABORTED" ||
    code === "INVALID_REQUEST"
      ? code
      : "PROVIDER_UNAVAILABLE";
  return new AIError({
    code: mapped,
    message: payload?.message || fallback,
    providerId: "openai",
    retryable: payload?.retryable ?? mapped !== "PROVIDER_NOT_CONFIGURED",
  });
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toChatBody(request: AIChatRequest, stream: boolean): OpenAIChatApiRequest {
  return {
    context: request.context,
    modelId: request.modelId,
    temperature: request.settings.temperature,
    maxTokens: request.settings.maxTokens,
    stream,
  };
}

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly displayName = "OpenAI";

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const response = await fetch(OPENAI_CHAT_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(toChatBody(request, false)),
      signal: request.signal,
    });

    const payload = (await parseJson(response)) as
      | OpenAIChatApiSuccess
      | OpenAIChatApiError
      | null;

    if (!response.ok || !payload || !("ok" in payload) || payload.ok !== true) {
      throw toApiError(
        payload && typeof payload === "object" && "ok" in payload && payload.ok === false
          ? payload
          : null,
        `OpenAI chat failed (${response.status})`,
      );
    }

    return {
      content: payload.content,
      providerId: "openai",
      modelId: payload.modelId,
      usage: payload.usage,
      finishReason: payload.finishReason ?? "stop",
    };
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    const response = await fetch(OPENAI_CHAT_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      credentials: "same-origin",
      body: JSON.stringify(toChatBody(request, true)),
      signal: request.signal,
    });

    if (!response.ok) {
      const payload = (await parseJson(response)) as OpenAIChatApiError | null;
      throw toApiError(payload, `OpenAI stream failed (${response.status})`);
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
    let assembled = "";
    let modelId = request.modelId;

    onEvent({
      type: "start",
      timestamp: new Date().toISOString(),
    });

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
        let event: {
          readonly type?: string;
          readonly delta?: string;
          readonly content?: string;
          readonly error?: string;
          readonly modelId?: string;
        };
        try {
          event = JSON.parse(data) as typeof event;
        } catch {
          continue;
        }
        if (event.modelId) modelId = event.modelId;
        if (event.type === "error") {
          throw new AIError({
            code: "PROVIDER_UNAVAILABLE",
            message: event.error || "OpenAI stream error",
            providerId: "openai",
            retryable: true,
          });
        }
        if (event.delta) {
          assembled += event.delta;
          onEvent({
            type: "delta",
            delta: event.delta,
            content: assembled,
            timestamp: new Date().toISOString(),
          });
        }
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
      finishReason: request.signal?.aborted ? "cancelled" : "stop",
    };
  }

  async embeddings(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    void request;
    throw new AIError({
      code: "INVALID_REQUEST",
      message: "OpenAI embeddings are not enabled on this chat path",
      providerId: "openai",
      retryable: false,
    });
  }

  async models() {
    return listModelsForProvider(this.id);
  }

  async health(): Promise<AIHealthStatus> {
    try {
      const response = await fetch(OPENAI_READINESS_PATH, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await parseJson(response)) as {
        readonly ready?: boolean;
        readonly configured?: boolean;
        readonly message?: string;
      } | null;
      const configured = Boolean(payload?.configured);
      const ready = Boolean(payload?.ready);
      return {
        ok: ready,
        providerId: this.id,
        configured,
        message:
          payload?.message ||
          (ready ? "OpenAI is ready" : "OpenAI is not ready"),
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        ok: false,
        providerId: this.id,
        configured: false,
        message: "OpenAI readiness endpoint is unreachable",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async toolCalling(request: AIChatRequest): Promise<AIChatResponse> {
    return this.chat(request);
  }

  async vision(request: AIVisionRequest): Promise<AIChatResponse> {
    void request;
    throw new AIError({
      code: "INVALID_REQUEST",
      message: "OpenAI vision is not enabled on this chat path",
      providerId: "openai",
      retryable: false,
    });
  }
}
