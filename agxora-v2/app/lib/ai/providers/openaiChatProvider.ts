/**
 * Server-only OpenAI chat completions provider (real network calls).
 */

import "server-only";

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
import { AIError } from "../AIErrorHandler";
import { emitStreamText, type AIStreamHandler } from "../AIStreaming";
import {
  getServerAiProviderConfig,
  resolveOpenAIChatModel,
} from "../serverConfig";

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export class OpenAIChatProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly displayName = "OpenAI";

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const config = getServerAiProviderConfig();
    if (!config.openaiApiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message:
          "OpenAI is not configured. Set AGXORA_OPENAI_API_KEY on the server.",
        providerId: this.id,
      });
    }

    const model = resolveOpenAIChatModel(request.modelId, config);
    const messages = buildOpenAiMessages(request);
    const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: request.settings.temperature,
        top_p: request.settings.topP,
        max_tokens: request.settings.maxTokens,
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      throw await toOpenAiError(response, this.id);
    }

    const payload = (await response.json()) as OpenAiChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) {
      throw new AIError({
        code: "PROVIDER_UNAVAILABLE",
        message: "OpenAI returned an empty completion",
        providerId: this.id,
      });
    }

    return {
      content,
      providerId: this.id,
      modelId: model,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
      finishReason: mapFinishReason(payload.choices?.[0]?.finish_reason),
    };
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    const base = await this.chat(request);
    const content = await emitStreamText({
      text: base.content,
      delayMs: 12,
      signal: request.signal,
      onEvent,
    });
    return {
      ...base,
      content,
      finishReason: request.signal?.aborted ? "cancelled" : base.finishReason,
    };
  }

  async embeddings(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    void request;
    throw new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: "OpenAI embeddings are not enabled in this release",
      providerId: this.id,
    });
  }

  async models() {
    return listModelsForProvider(this.id);
  }

  async health(): Promise<AIHealthStatus> {
    const config = getServerAiProviderConfig();
    const configured = Boolean(config.openaiApiKey);
    return {
      ok: configured,
      providerId: this.id,
      configured,
      message: configured
        ? "OpenAI chat provider configured"
        : "Set AGXORA_OPENAI_API_KEY to enable OpenAI chat",
      checkedAt: new Date().toISOString(),
    };
  }

  async toolCalling(request: AIChatRequest): Promise<AIChatResponse> {
    return this.chat(request);
  }

  async vision(request: AIVisionRequest): Promise<AIChatResponse> {
    void request;
    throw new AIError({
      code: "PROVIDER_NOT_CONFIGURED",
      message: "OpenAI vision is not enabled in this release",
      providerId: this.id,
    });
  }
}

function buildOpenAiMessages(request: AIChatRequest): OpenAiMessage[] {
  const system = request.context.systemPrompt?.trim();
  const history = request.context.conversation
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map(
      (message): OpenAiMessage => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }),
    );

  const messages: OpenAiMessage[] = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }
  messages.push(...history);
  if (
    !history.length ||
    history[history.length - 1]?.content !== request.context.userPrompt
  ) {
    messages.push({ role: "user", content: request.context.userPrompt });
  }
  return messages;
}

async function toOpenAiError(response: Response, providerId: "openai"): Promise<AIError> {
  let message = `OpenAI request failed (${response.status})`;
  try {
    const body = (await response.json()) as {
      error?: { message?: string; type?: string };
    };
    if (body.error?.message) {
      message = body.error.message;
    }
  } catch {
    // ignore parse errors
  }
  return new AIError({
    code: response.status === 429 ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE",
    message,
    providerId,
    retryable: response.status === 429 || response.status >= 500,
  });
}

function mapFinishReason(
  reason: string | null | undefined,
): AIChatResponse["finishReason"] {
  if (reason === "length") return "length";
  if (reason === "tool_calls") return "tool_calls";
  if (reason === "stop") return "stop";
  return "stop";
}
