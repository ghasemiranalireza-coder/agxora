/**
 * Real OpenRouter adapter — OpenAI-compatible (server-only).
 */

import "server-only";

import type { AIChatRequest, AIChatResponse } from "../../AIProvider";
import type { AIStreamHandler } from "../../AIStreaming";
import { listModelsForProvider } from "../../AIModel";
import { AIError } from "../../AIErrorHandler";
import { assemblePrompt } from "../../prompt/assemblePrompt";
import { getProviderSecret } from "../secrets";
import { assertNotAborted, mapHttpError, readErrorBody } from "../http";

function mapModelId(modelId: string): string {
  if (modelId === "openrouter/auto") return "openrouter/auto";
  if (modelId === "deepseek") return "deepseek/deepseek-chat";
  return modelId;
}

export class OpenRouterRealProvider {
  readonly id = "openrouter" as const;
  readonly displayName = "OpenRouter";

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const apiKey = await getProviderSecret("openrouter");
    if (!apiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "OpenRouter API key not configured",
        providerId: this.id,
      });
    }

    const assembled = assemblePrompt(request.context);
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agxora.app",
          "X-Title": "AGXORA",
        },
        body: JSON.stringify({
          model: mapModelId(request.modelId),
          messages: assembled.messages
            .filter(
              (m) =>
                m.role === "system" ||
                m.role === "user" ||
                m.role === "assistant",
            )
            .map((m) => ({ role: m.role, content: m.content })),
          temperature: request.settings.temperature,
          max_tokens: request.settings.maxTokens,
          stream: false,
        }),
        signal: request.signal,
      },
    );

    if (!response.ok) {
      throw mapHttpError(this.id, response, await readErrorBody(response));
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    return {
      content: data.choices?.[0]?.message?.content ?? "",
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
    const apiKey = await getProviderSecret("openrouter");
    if (!apiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "OpenRouter API key not configured",
        providerId: this.id,
      });
    }

    const assembled = assemblePrompt(request.context);
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agxora.app",
          "X-Title": "AGXORA",
        },
        body: JSON.stringify({
          model: mapModelId(request.modelId),
          messages: assembled.messages
            .filter(
              (m) =>
                m.role === "system" ||
                m.role === "user" ||
                m.role === "assistant",
            )
            .map((m) => ({ role: m.role, content: m.content })),
          temperature: request.settings.temperature,
          max_tokens: request.settings.maxTokens,
          stream: true,
        }),
        signal: request.signal,
      },
    );

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
          // ignore
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
    const configured = Boolean(await getProviderSecret("openrouter"));
    return {
      ok: configured,
      providerId: this.id,
      configured,
      message: configured ? "OpenRouter key present" : "OpenRouter key missing",
      checkedAt: new Date().toISOString(),
    };
  }
}
