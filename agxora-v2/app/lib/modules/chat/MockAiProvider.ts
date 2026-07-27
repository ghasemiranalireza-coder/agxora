import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider,
} from "./types";

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function craftReply(userText: string): string {
  const text = userText.toLowerCase();

  if (text.includes("revenue") || text.includes("forecast")) {
    return "Based on current workspace signals, revenue is projected to increase by approximately 18% next month. I can break this down by segment when your data connectors are linked.";
  }

  if (text.includes("customer") || text.includes("retention") || text.includes("trend")) {
    return "Customer retention improved by about 12% over the recent period. Engagement is strongest in returning accounts — I can deepen this once CRM data is connected.";
  }

  if (text.includes("hello") || text.includes("hi ") || text === "hi") {
    return "Hello. I am AGXORA AI — your business operating assistant. Ask about operations, customers, forecasts, or workflows for this organization.";
  }

  return `Understood: “${userText.trim()}”. I processed this through organization memory and am ready to assist. Connect an AI provider (OpenAI, Anthropic, or local LLM) for richer grounded answers — the chat pipeline is already production-wired.`;
}

/**
 * Mock async AI provider — real request/response lifecycle.
 * Replace with OpenAIProvider / AnthropicProvider later; UI stays unchanged.
 */
export class MockAiProvider implements AiProvider {
  readonly id = "mock";

  constructor(private readonly latencyMs = 900) {}

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    await delay(this.latencyMs, request.signal);

    const memoryHint =
      request.memory.entries.length > 0
        ? request.memory.entries.length
        : 0;

    return {
      content: craftReply(request.userMessage.content),
      provider: this.id,
      model: "agxora-mock-v1",
      usage: {
        promptTokens: request.messages.reduce(
          (sum, m) => sum + Math.ceil(m.content.length / 4),
          0,
        ),
        completionTokens: 64,
      },
      metadata: {
        memoryEntries: memoryHint,
        organizationId: request.organizationId ?? null,
        workspaceId: request.workspaceId ?? null,
      },
    };
  }
}
