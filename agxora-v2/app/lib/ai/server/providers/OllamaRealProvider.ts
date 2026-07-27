/**
 * Real Ollama local adapter (server-only).
 */

import "server-only";

import type { AIChatRequest, AIChatResponse } from "../../AIProvider";
import type { AIStreamHandler } from "../../AIStreaming";
import { listModelsForProvider } from "../../AIModel";
import { AIError } from "../../AIErrorHandler";
import { assemblePrompt } from "../../prompt/assemblePrompt";
import { resolveOllamaBaseUrl } from "../secrets";
import { assertNotAborted, mapHttpError, readErrorBody } from "../http";

export class OllamaRealProvider {
  readonly id = "ollama" as const;
  readonly displayName = "Ollama";

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const base = await resolveOllamaBaseUrl();
    const assembled = assemblePrompt(request.context);
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.modelId,
          stream: false,
          messages: assembled.messages
            .filter(
              (m) =>
                m.role === "system" ||
                m.role === "user" ||
                m.role === "assistant",
            )
            .map((m) => ({ role: m.role, content: m.content })),
          options: {
            temperature: request.settings.temperature,
            num_predict: request.settings.maxTokens,
          },
        }),
        signal: request.signal,
      });
    } catch {
      throw new AIError({
        code: "PROVIDER_UNAVAILABLE",
        message: "Ollama is unreachable",
        providerId: this.id,
        retryable: true,
      });
    }

    if (!response.ok) {
      throw mapHttpError(this.id, response, await readErrorBody(response));
    }

    const data = (await response.json()) as {
      message?: { content?: string };
    };
    return {
      content: data.message?.content ?? "",
      providerId: this.id,
      modelId: request.modelId,
      finishReason: "stop",
    };
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const base = await resolveOllamaBaseUrl();
    const assembled = assemblePrompt(request.context);
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.modelId,
          stream: true,
          messages: assembled.messages
            .filter(
              (m) =>
                m.role === "system" ||
                m.role === "user" ||
                m.role === "assistant",
            )
            .map((m) => ({ role: m.role, content: m.content })),
          options: {
            temperature: request.settings.temperature,
            num_predict: request.settings.maxTokens,
          },
        }),
        signal: request.signal,
      });
    } catch {
      throw new AIError({
        code: "PROVIDER_UNAVAILABLE",
        message: "Ollama is unreachable",
        providerId: this.id,
        retryable: true,
      });
    }

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
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed) as {
            message?: { content?: string };
            done?: boolean;
          };
          const delta = json.message?.content ?? "";
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
    const base = await resolveOllamaBaseUrl();
    try {
      const response = await fetch(`${base.replace(/\/$/, "")}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      return {
        ok: response.ok,
        providerId: this.id,
        configured: true,
        message: response.ok ? "Ollama reachable" : "Ollama responded with error",
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        ok: false,
        providerId: this.id,
        configured: true,
        message: "Ollama unreachable",
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
