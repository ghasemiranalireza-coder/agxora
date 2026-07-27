/**
 * Real Anthropic Messages adapter (server-only).
 */

import "server-only";

import type { AIChatRequest, AIChatResponse } from "../../AIProvider";
import type { AIStreamHandler } from "../../AIStreaming";
import { listModelsForProvider } from "../../AIModel";
import { AIError } from "../../AIErrorHandler";
import { assemblePrompt } from "../../prompt/assemblePrompt";
import { getProviderSecret } from "../secrets";
import {
  assertNotAborted,
  mapHttpError,
  readErrorBody,
} from "../http";

function mapModelId(modelId: string): string {
  if (modelId === "claude-sonnet") return "claude-sonnet-4-20250514";
  if (modelId === "claude-opus") return "claude-opus-4-20250514";
  return modelId;
}

export class AnthropicRealProvider {
  readonly id = "anthropic" as const;
  readonly displayName = "Anthropic Claude";

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const apiKey = await getProviderSecret("anthropic");
    if (!apiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "Anthropic API key not configured",
        providerId: this.id,
      });
    }

    const assembled = assemblePrompt(request.context);
    const system = assembled.systemPrompt;
    const messages = assembled.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: mapModelId(request.modelId),
        max_tokens: request.settings.maxTokens,
        temperature: request.settings.temperature,
        system,
        messages,
        stream: false,
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      throw mapHttpError(this.id, response, await readErrorBody(response));
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content =
      data.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("") ?? "";

    return {
      content,
      providerId: this.id,
      modelId: request.modelId,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens:
          (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: "stop",
    };
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const apiKey = await getProviderSecret("anthropic");
    if (!apiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "Anthropic API key not configured",
        providerId: this.id,
      });
    }

    const assembled = assemblePrompt(request.context);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: mapModelId(request.modelId),
        max_tokens: request.settings.maxTokens,
        temperature: request.settings.temperature,
        system: assembled.systemPrompt,
        messages: assembled.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content })),
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
        try {
          const json = JSON.parse(payload) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (
            json.type === "content_block_delta" &&
            json.delta?.type === "text_delta" &&
            json.delta.text
          ) {
            content += json.delta.text;
            onEvent({
              type: "delta",
              delta: json.delta.text,
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
    const configured = Boolean(await getProviderSecret("anthropic"));
    return {
      ok: configured,
      providerId: this.id,
      configured,
      message: configured ? "Anthropic key present" : "Anthropic key missing",
      checkedAt: new Date().toISOString(),
    };
  }
}
