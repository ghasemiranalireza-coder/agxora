/**
 * Real Google Gemini adapter (server-only).
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
  if (modelId === "gemini-pro") return "gemini-2.0-flash";
  if (modelId === "gemini-flash") return "gemini-2.0-flash";
  return modelId;
}

export class GoogleGeminiRealProvider {
  readonly id = "google" as const;
  readonly displayName = "Google Gemini";

  private async endpoint(modelId: string, stream: boolean): Promise<{
    url: string;
    apiKey: string;
  }> {
    const apiKey = await getProviderSecret("google");
    if (!apiKey) {
      throw new AIError({
        code: "PROVIDER_NOT_CONFIGURED",
        message: "Google Gemini API key not configured",
        providerId: this.id,
      });
    }
    const model = mapModelId(modelId);
    const action = stream ? "streamGenerateContent" : "generateContent";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}${
      stream ? "&alt=sse" : ""
    }`;
    return { url, apiKey };
  }

  private buildBody(request: AIChatRequest) {
    const assembled = assemblePrompt(request.context);
    const contents = assembled.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    return {
      systemInstruction: { parts: [{ text: assembled.systemPrompt }] },
      contents,
      generationConfig: {
        temperature: request.settings.temperature,
        maxOutputTokens: request.settings.maxTokens,
      },
    };
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const { url } = await this.endpoint(request.modelId, false);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBody(request)),
      signal: request.signal,
    });
    if (!response.ok) {
      throw mapHttpError(this.id, response, await readErrorBody(response));
    }
    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    const content =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    return {
      content,
      providerId: this.id,
      modelId: request.modelId,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        totalTokens: data.usageMetadata?.totalTokenCount,
      },
      finishReason: "stop",
    };
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    assertNotAborted(request.signal, this.id);
    const { url } = await this.endpoint(request.modelId, true);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBody(request)),
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
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const delta =
            json.candidates?.[0]?.content?.parts
              ?.map((p) => p.text ?? "")
              .join("") ?? "";
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
    const configured = Boolean(await getProviderSecret("google"));
    return {
      ok: configured,
      providerId: this.id,
      configured,
      message: configured ? "Gemini key present" : "Gemini key missing",
      checkedAt: new Date().toISOString(),
    };
  }
}
