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
import { estimateMessagesTokens } from "../AITokenCounter";

function craftReply(userText: string, businessType?: string): string {
  const text = userText.toLowerCase();
  const vertical = businessType ? ` for your ${businessType} business` : "";

  if (text.includes("revenue") || text.includes("forecast")) {
    return `Based on current workspace signals${vertical}, revenue is projected to increase by approximately 18% next month. I can break this down by segment when your data connectors are linked.`;
  }
  if (text.includes("customer") || text.includes("retention") || text.includes("trend")) {
    return `Customer retention improved by about 12% over the recent period${vertical}. Engagement is strongest in returning accounts — deepen this once CRM data is connected.`;
  }
  if (text.includes("hello") || text === "hi" || text.startsWith("hi ")) {
    return "Hello. I am AGXORA AI — your business operating assistant. Ask about operations, customers, forecasts, or workflows.";
  }
  return `Understood: “${userText.trim()}”. I assembled organization, business, memory, and conversation context${vertical}. Connect OpenAI, Anthropic, Gemini, OpenRouter, or Ollama when ready — the provider interface is already live.`;
}

/**
 * Local mock provider — full interface without network calls.
 */
export class MockAIProvider implements AIProvider {
  readonly id = "mock" as const;
  readonly displayName = "AGXORA Mock";

  constructor(private readonly latencyMs = 40) {}

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    this.assertNotAborted(request.signal);
    const content = craftReply(
      request.context.userPrompt,
      request.context.business?.templateSummary,
    );
    const promptTokens = estimateMessagesTokens(request.context.conversation);
    return {
      content,
      providerId: this.id,
      modelId: request.modelId,
      usage: {
        promptTokens,
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: promptTokens + Math.ceil(content.length / 4),
      },
      finishReason: "stop",
    };
  }

  async stream(
    request: AIChatRequest,
    onEvent: AIStreamHandler,
  ): Promise<AIChatResponse> {
    const base = await this.chat(request);
    const content = await emitStreamText({
      text: base.content,
      delayMs: this.latencyMs,
      signal: request.signal,
      onEvent,
    });
    return {
      ...base,
      content,
      finishReason: request.signal?.aborted ? "cancelled" : "stop",
    };
  }

  async embeddings(request: AIEmbeddingRequest): Promise<AIEmbeddingResponse> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    return {
      providerId: this.id,
      modelId: request.modelId ?? "mock-embed",
      vectors: inputs.map((text) => pseudoEmbed(text)),
    };
  }

  async models() {
    return listModelsForProvider(this.id);
  }

  async health(): Promise<AIHealthStatus> {
    return {
      ok: true,
      providerId: this.id,
      configured: true,
      message: "Mock provider ready (no network)",
      checkedAt: new Date().toISOString(),
    };
  }

  async toolCalling(request: AIChatRequest): Promise<AIChatResponse> {
    const response = await this.chat(request);
    return {
      ...response,
      toolCalls: [],
      finishReason: "stop",
    };
  }

  async vision(request: AIVisionRequest): Promise<AIChatResponse> {
    return {
      content:
        "Vision architecture is ready. Connect a vision-capable provider to analyze images and documents.",
      providerId: this.id,
      modelId: request.modelId ?? "mock-local",
      finishReason: "stop",
    };
  }

  private assertNotAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new AIError({
        code: "ABORTED",
        message: "Generation cancelled",
        providerId: this.id,
      });
    }
  }
}

function pseudoEmbed(text: string): number[] {
  const dims = 16;
  const out = new Array<number>(dims).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    out[i % dims] += text.charCodeAt(i) / 255;
  }
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0)) || 1;
  return out.map((v) => v / norm);
}
