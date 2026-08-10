import { createChatProviderAdapter } from "../../ai/adapters/chatProviderAdapter";
import {
  createConversationId,
  createMessage,
  type ChatMessage,
} from "./Message";
import type {
  AiProvider,
  ChatServiceConfig,
  Conversation,
  SendMessageInput,
  SendMessageResult,
} from "./types";

export interface ChatService {
  getConversation(): Conversation;
  listMessages(): readonly ChatMessage[];
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  setContext(organizationId: string | null, workspaceId: string | null): void;
  setProvider(provider: AiProvider): void;
  clearError(): void;
  reset(): void;
}

export function createChatService(config: ChatServiceConfig): ChatService {
  let organizationId = config.organizationId ?? null;
  let workspaceId = config.workspaceId ?? null;
  let provider = config.provider;
  let conversation = createConversation();
  /** Empty transcript — do not seed fabricated Q&A. */
  let messages: ChatMessage[] = [];
  let abortController: AbortController | null = null;

  function createConversation(): Conversation {
    const now = new Date().toISOString();
    return {
      id: createConversationId(),
      title: "AGXORA AI",
      organizationId,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    getConversation() {
      return conversation;
    },

    listMessages() {
      return [...messages];
    },

    async sendMessage(input) {
      const content = input.content.trim();
      if (!content) {
        throw new Error("Message content is required");
      }

      abortController?.abort();
      abortController = new AbortController();
      const signal = abortController.signal;

      const userMessage = createMessage({
        conversationId: conversation.id,
        role: "user",
        content,
        status: "sent",
      });

      messages = [...messages, userMessage];
      conversation = {
        ...conversation,
        updatedAt: userMessage.createdAt,
        title:
          conversation.title === "AGXORA AI"
            ? content.slice(0, 48)
            : conversation.title,
        organizationId,
        workspaceId,
      };

      // Every message passes through MemoryEngine before response generation.
      config.memory.recordMessage({
        conversationId: conversation.id,
        messageId: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        organizationId,
        workspaceId,
      });

      const memory = config.memory.buildContext(
        { kind: "conversation", id: conversation.id },
        { limit: 32 },
      );

      try {
        const completion = await provider.complete({
          conversationId: conversation.id,
          messages,
          userMessage,
          memory,
          organizationId,
          workspaceId,
          signal,
        });

        const assistantMessage = createMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: completion.content,
          status: "complete",
          metadata: {
            provider: completion.provider,
            model: completion.model,
            usage: completion.usage,
            ...completion.metadata,
          },
        });

        messages = [...messages, assistantMessage];
        conversation = {
          ...conversation,
          updatedAt: assistantMessage.createdAt,
        };

        config.memory.recordMessage({
          conversationId: conversation.id,
          messageId: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          organizationId,
          workspaceId,
        });

        return { userMessage, assistantMessage, conversation };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }

        const message =
          error instanceof Error ? error.message : "Failed to generate response";

        const failed = createMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: "",
          status: "failed",
          error: message,
        });

        messages = [...messages, failed];
        throw new Error(message);
      }
    },

    setContext(nextOrganizationId, nextWorkspaceId) {
      organizationId = nextOrganizationId;
      workspaceId = nextWorkspaceId;
      conversation = {
        ...conversation,
        organizationId,
        workspaceId,
      };
    },

    setProvider(next) {
      provider = next;
    },

    clearError() {
      // Stateful error lives in the provider UI layer.
    },

    reset() {
      abortController?.abort();
      conversation = createConversation();
      messages = [];
    },
  };
}

export function createDefaultChatService(
  memory: ChatServiceConfig["memory"],
  context?: {
    organizationId?: string | null;
    workspaceId?: string | null;
  },
  provider?: AiProvider,
): ChatService {
  return createChatService({
    provider: provider ?? createChatProviderAdapter(),
    memory,
    organizationId: context?.organizationId ?? null,
    workspaceId: context?.workspaceId ?? null,
  });
}
