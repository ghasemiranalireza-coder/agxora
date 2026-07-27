/**
 * Adapter — bridges AIEngine / Remote AI to the chat module AiProvider interface
 * without changing ChatPanel / dashboard visual design.
 */

import type { MemoryContextPacket } from "../../memory/MemoryTypes";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider as ChatAiProvider,
} from "../../modules/chat/types";
import { aiEngine, type AIEngine } from "../AIEngine";
import type { AIRuntimeContext } from "../AIContext";
import type { AISettings } from "../AISettings";
import { RemoteAiProvider } from "./RemoteAiProvider";

export type RuntimeContextEnricher = (
  request: AiCompletionRequest,
) => Partial<AIRuntimeContext> | undefined;

export interface ChatProviderAdapter extends ChatAiProvider {
  readonly engine: AIEngine;
  setEnricher(enricher: RuntimeContextEnricher | null): void;
}

export interface RemoteChatProviderAdapter extends ChatAiProvider {
  setEnricher(enricher: RuntimeContextEnricher | null): void;
}

function toRuntimeContext(
  request: AiCompletionRequest,
  extras?: Partial<AIRuntimeContext>,
): AIRuntimeContext {
  const memory: MemoryContextPacket = request.memory;
  return {
    organization: {
      organizationId: request.organizationId ?? null,
      workspaceId: request.workspaceId ?? null,
      ...extras?.organization,
    },
    business: extras?.business,
    memory: extras?.memory ?? memory,
    knowledge: extras?.knowledge,
    conversation: request.messages
      .filter((message) => message.id !== request.userMessage.id)
      .map((message) => ({
        role:
          message.role === "system"
            ? ("system" as const)
            : message.role === "assistant"
              ? ("assistant" as const)
              : ("user" as const),
        content: message.content,
      })),
    userPrompt: request.userMessage.content,
    systemPrompt:
      extras?.systemPrompt ??
      "You are AGXORA AI. Use organization memory and conversation history. Stay provider-independent.",
    toolResults: extras?.toolResults,
  };
}

/**
 * Local engine adapter (no network). Prefer createRemoteChatProvider for real AI.
 */
export function createChatProviderAdapter(
  engine: AIEngine = aiEngine,
  enricher?: RuntimeContextEnricher | null,
): ChatProviderAdapter {
  let resolveExtras: RuntimeContextEnricher | null = enricher ?? null;

  return {
    id: "ai-engine",
    engine,
    setEnricher(next) {
      resolveExtras = next;
    },
    async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
      const context = toRuntimeContext(request, resolveExtras?.(request));
      const response = await engine.generate({
        context,
        signal: request.signal,
        onStream: request.onDelta
          ? (event) => {
              if (event.type === "delta" && event.content) {
                request.onDelta?.(event.delta ?? "", event.content);
              }
            }
          : undefined,
      });

      return {
        content: response.content,
        provider: response.providerId,
        model: response.modelId,
        usage: {
          promptTokens: response.usage?.promptTokens,
          completionTokens: response.usage?.completionTokens,
        },
        metadata: {
          finishReason: response.finishReason,
          engine: true,
        },
      };
    },
  };
}

export function createRemoteChatProvider(input: {
  enricher?: RuntimeContextEnricher | null;
  getSettings?: () => Partial<AISettings> | undefined;
}): RemoteChatProviderAdapter {
  let resolveExtras: RuntimeContextEnricher | null = input.enricher ?? null;

  const remote = new RemoteAiProvider({
    getContext: (request) =>
      toRuntimeContext(request, resolveExtras?.(request) ?? undefined),
    getSettings: () => input.getSettings?.(),
  });

  return {
    id: remote.id,
    setEnricher(next) {
      resolveExtras = next;
    },
    async complete(request) {
      remote.setOnDelta(request.onDelta);
      return remote.complete(request);
    },
  };
}
