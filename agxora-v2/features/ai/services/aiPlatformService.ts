/**
 * Central AI platform service — sole UI entry to generation.
 * Routes all generation through the authenticated server AI chat boundary.
 */

import type { AIRuntimeContext } from "@/app/lib/ai/AIContext";
import type { AISettings } from "@/app/lib/ai/AISettings";
import { AIError, toAIError } from "@/app/lib/ai/AIErrorHandler";
import { requestServerAiChat } from "@/app/lib/ai/clientChat";
import { buildContextPreamble, getAiPlatformContext } from "../context";
import { aiConversationStore } from "../store/conversationStore";
import { aiUsageTracker } from "../store/usageTracker";
import type { AiMessage } from "../types";
import { createAiId, estimateTokens } from "../utils";

export interface AiGenerateOptions {
  readonly conversationId: string;
  readonly userContent: string;
  readonly settings: AISettings;
  readonly organizationId?: string | null;
  readonly workspaceId?: string | null;
  /** When regenerating, the assistant message to replace. */
  readonly retryAssistantMessageId?: string;
}

export interface AiGenerateHandle {
  readonly abort: () => void;
  readonly promise: Promise<AiMessage>;
}

function buildRuntimeContext(input: {
  conversationId: string;
  userContent: string;
  settings: AISettings;
  organizationId?: string | null;
  workspaceId?: string | null;
}): AIRuntimeContext {
  const conversation = aiConversationStore.getConversation(input.conversationId);
  const history =
    conversation?.messages
      .filter((m) => m.status === "complete" || m.role === "user")
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })) ?? [];

  const contextPreamble = buildContextPreamble(getAiPlatformContext());
  const systemParts = [
    input.settings.systemPromptOverride?.trim() ||
      "You are AGXORA AI — the enterprise operating assistant for this organization. Be precise, actionable, and provider-independent.",
    conversation?.systemPromptOverride?.trim(),
    contextPreamble || undefined,
  ].filter(Boolean);

  return {
    organization: {
      organizationId: input.organizationId ?? null,
      workspaceId: input.workspaceId ?? null,
    },
    conversation: history,
    userPrompt: input.userContent,
    systemPrompt: systemParts.join("\n\n"),
  };
}

/**
 * Send a user message and complete an assistant reply via the server AI provider.
 */
export function generateAiReply(options: AiGenerateOptions): AiGenerateHandle {
  const controller = new AbortController();
  const store = aiConversationStore;

  const promise = (async (): Promise<AiMessage> => {
    store.setGenerating(true);

    let userMessageId: string | undefined;
    if (!options.retryAssistantMessageId) {
      const userMessage = store.appendMessage(options.conversationId, {
        role: "user",
        content: options.userContent,
        status: "complete",
      });
      userMessageId = userMessage.id;
    }

    let assistantId = options.retryAssistantMessageId;
    if (assistantId) {
      store.updateMessage(options.conversationId, assistantId, {
        content: "",
        status: "streaming",
        error: undefined,
      });
    } else {
      const pending = store.appendMessage(options.conversationId, {
        role: "assistant",
        content: "",
        status: "streaming",
      });
      assistantId = pending.id;
    }

    const context = buildRuntimeContext({
      conversationId: options.conversationId,
      userContent: options.userContent,
      settings: options.settings,
      organizationId: options.organizationId,
      workspaceId: options.workspaceId,
    });

    try {
      const response = await requestServerAiChat({
        context,
        providerId: options.settings.defaultProviderId,
        modelId: options.settings.defaultModelId,
        settings: options.settings,
        signal: controller.signal,
      });

      const finalMessage: AiMessage = {
        id: assistantId,
        role: "assistant",
        content: response.content,
        createdAt: new Date().toISOString(),
        status: "complete",
        estimatedTokens: estimateTokens(response.content),
        providerId: response.providerId,
        model: response.modelId,
      };

      store.updateMessage(options.conversationId, assistantId, {
        content: finalMessage.content,
        status: "complete",
        estimatedTokens: finalMessage.estimatedTokens,
        providerId: finalMessage.providerId,
        model: finalMessage.model,
        error: undefined,
      });

      aiUsageTracker.record({
        promptTokens: response.usage?.promptTokens,
        completionTokens: response.usage?.completionTokens,
        providerId: response.providerId,
        model: response.modelId,
      });

      return finalMessage;
    } catch (error) {
      const aiError =
        error instanceof AIError
          ? error
          : toAIError(error, options.settings.defaultProviderId);

      store.updateMessage(options.conversationId, assistantId!, {
        status: "error",
        error: aiError.message,
      });
      void userMessageId;
      throw aiError;
    } finally {
      store.setGenerating(false);
    }
  })();

  return {
    abort: () => controller.abort(),
    promise,
  };
}

export function createEmptyAssistantPlaceholder(): string {
  return createAiId("msg");
}

export type { AIError };
