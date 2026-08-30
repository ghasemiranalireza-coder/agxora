/**
 * Adapter — bridges server AI chat to the dashboard chat module interface.
 */

import type { MemoryContextPacket } from "../../memory/MemoryTypes";
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProvider as ChatAiProvider,
} from "../../modules/chat/types";
import type { AIRuntimeContext } from "../AIContext";
import { requestServerAiChat } from "../clientChat";
import type { AISettings } from "../AISettings";

export type RuntimeContextEnricher = (
  request: AiCompletionRequest,
) => Partial<AIRuntimeContext> | undefined;

export type ChatSettingsGetter = () => Partial<AISettings> | undefined;
export type ChatLocaleGetter = () => string | undefined;

export interface ChatProviderAdapter extends ChatAiProvider {
  setEnricher(enricher: RuntimeContextEnricher | null): void;
  setSettingsGetter(getter: ChatSettingsGetter | null): void;
  setLocaleGetter(getter: ChatLocaleGetter | null): void;
}

export function createChatProviderAdapter(
  enricher?: RuntimeContextEnricher | null,
  settingsGetter?: ChatSettingsGetter | null,
  localeGetter?: ChatLocaleGetter | null,
): ChatProviderAdapter {
  let resolveExtras: RuntimeContextEnricher | null = enricher ?? null;
  let resolveSettings: ChatSettingsGetter | null = settingsGetter ?? null;
  let resolveLocale: ChatLocaleGetter | null = localeGetter ?? null;

  return {
    id: "server-ai-chat",
    setEnricher(next) {
      resolveExtras = next;
    },
    setSettingsGetter(next) {
      resolveSettings = next;
    },
    setLocaleGetter(next) {
      resolveLocale = next;
    },
    async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
      const context = toRuntimeContext(request, resolveExtras?.(request));
      const settings = resolveSettings?.();
      const response = await requestServerAiChat({
        context,
        providerId: settings?.defaultProviderId,
        modelId: settings?.defaultModelId,
        settings,
        preferredLocale: resolveLocale?.(),
        signal: request.signal,
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
          server: true,
        },
      };
    },
  };
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
      "You are AGXORA AI. Use organization memory and conversation history.",
    toolResults: extras?.toolResults,
  };
}
