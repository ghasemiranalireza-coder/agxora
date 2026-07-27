/**
 * Client remote AI provider — calls server routes. Never holds API keys.
 */

import type { AIRuntimeContext } from "../AIContext";
import type { AIProviderId } from "../AIModel";
import type { AISettings } from "../AISettings";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
} from "../../modules/chat/types";

export type StreamDeltaHandler = (delta: string, content: string) => void;

export interface RemoteAiProviderOptions {
  readonly getContext: (request: AiCompletionRequest) => AIRuntimeContext;
  readonly getSettings?: () => Partial<AISettings> | undefined;
  readonly getProviderId?: () => AIProviderId | undefined;
  readonly getModelId?: () => string | undefined;
  readonly onDelta?: StreamDeltaHandler;
}

export class RemoteAiProvider implements AiProvider {
  readonly id = "remote-ai-engine";
  private onDelta?: StreamDeltaHandler;

  constructor(private readonly options: RemoteAiProviderOptions) {
    this.onDelta = options.onDelta;
  }

  setOnDelta(handler: StreamDeltaHandler | undefined): void {
    this.onDelta = handler;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const context = this.options.getContext(request);
    const settings = this.options.getSettings?.();
    const providerId = this.options.getProviderId?.() ?? settings?.defaultProviderId;
    const modelId = this.options.getModelId?.() ?? settings?.defaultModelId;
    const streaming = settings?.streamingEnabled !== false;

    if (streaming) {
      return this.completeStreaming(request, context, settings, providerId, modelId);
    }

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, settings, providerId, modelId }),
      signal: request.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(payload?.error?.message ?? `AI request failed (${response.status})`);
    }

    const data = (await response.json()) as {
      content: string;
      providerId: string;
      modelId: string;
      usage?: AiCompletionResponse["usage"];
    };

    return {
      content: data.content,
      provider: data.providerId,
      model: data.modelId,
      usage: data.usage,
      metadata: { remote: true },
    };
  }

  private async completeStreaming(
    request: AiCompletionRequest,
    context: AIRuntimeContext,
    settings: Partial<AISettings> | undefined,
    providerId: AIProviderId | undefined,
    modelId: string | undefined,
  ): Promise<AiCompletionResponse> {
    const response = await fetch("/api/ai/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, settings, providerId, modelId }),
      signal: request.signal,
    });

    if (!response.ok || !response.body) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(payload?.error?.message ?? `AI stream failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let provider: string = providerId ?? "mock";
    let model = modelId ?? "mock-local";
    let usage: AiCompletionResponse["usage"];
    let eventName = "message";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        let dataLine = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLine = line.slice(5).trim();
          }
        }
        if (!dataLine) continue;

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(dataLine) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (eventName === "delta") {
          const delta = typeof payload.delta === "string" ? payload.delta : "";
          const next =
            typeof payload.content === "string" ? payload.content : content + delta;
          content = next;
          this.onDelta?.(delta, content);
        } else if (eventName === "result") {
          content =
            typeof payload.content === "string" ? payload.content : content;
          if (typeof payload.providerId === "string") provider = payload.providerId;
          if (typeof payload.modelId === "string") model = payload.modelId;
          if (payload.usage && typeof payload.usage === "object") {
            usage = payload.usage as AiCompletionResponse["usage"];
          }
        } else if (eventName === "error") {
          throw new Error(
            typeof payload.message === "string"
              ? payload.message
              : "AI stream error",
          );
        }
      }
    }

    return {
      content,
      provider,
      model,
      usage,
      metadata: { remote: true, streamed: true },
    };
  }
}
