/**
 * Real OpenAI Chat Completions adapter (server-only).
 */

import "server-only";

import type { AIChatRequest, AIChatResponse, AIProvider } from "../../AIProvider";
import type { AIStreamHandler } from "../../AIStreaming";
import { listModelsForProvider } from "../../AIModel";
import { AIError } from "../../AIErrorHandler";
import { getProviderSecret } from "../secrets";
import {
  assertNotAborted,
  mapHttpError,
  readErrorBody,
  type OpenAIStyleMessage,
} from "../http";
import { assemblePrompt } from "../../prompt/assemblePrompt";

function toMessages(request: AIChatRequest): OpenAIStyleMessage[] {
  const assembled = assemblePrompt(request.context);
  return assembled.messages
    .filter((m) => m.role === "system" || m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }));
}

export class OpenAIRealProvider implements Pick<
  AIProvider,
  "id" | "displayName" | "chat" | "stream" | "models" | "health"
> {
  readonly id = "openai" as const;
  readonly displayName = "OpenAI";

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const apiKey = await getProviderSecret("openai");
    if (!apiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "OpenAI API key not configured",
        providerId: this.id,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.modelId,
        messages: toMessages(request),
        temperature: request.settings.temperature,
        max_tokens: request.settings.maxTokens,
        stream: false,
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      throw mapHttpError(this.id, response, await readErrorBody(response));
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    return {
      content,
      providerId: this.id,
      modelId: request.modelId,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
      finishReason: "stop",
    };
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const apiKey = await getProviderSecret("openai");
    if (!apiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "OpenAI API key not configured",
        providerId: this.id,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.modelId,
        messages: toMessages(request),
        temperature: request.settings.temperature,
        max_tokens: request.settings.maxTokens,
        stream: true,
      }),
      signal: request.signal,
    });

    if (!response.ok || !response.body) {
      throw mapHttpError(this.id, response, await readErrorBody(response));
    }

    onEvent({ type: "start", timestamp: new Date().toISOString() });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    while (true) {
      assertNotAborted(request.signal, this.id);
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            content += delta;
            onEvent({
              type: "delta",
              delta,
              content,
              timestamp: new Date().toISOString(),
            });
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    onEvent({
      type: "done",
      content,
      timestamp: new Date().toISOString(),
    });

    return {
      content,
      providerId: this.id,
      modelId: request.modelId,
      finishReason: request.signal?.aborted ? "cancelled" : "stop",
    };
  }

  async models() {
    return listModelsForProvider(this.id);
  }

  async health() {
    const configured = Boolean(await getProviderSecret("openai"));
    return {
      ok: configured,
      providerId: this.id,
      configured,
      message: configured ? "OpenAI key present" : "OpenAI key missing",
      checkedAt: new Date().toISOString(),
    };
  }
}
