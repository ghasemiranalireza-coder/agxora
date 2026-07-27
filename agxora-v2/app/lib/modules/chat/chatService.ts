import { createChatProviderAdapter } from "../../ai/adapters/chatProviderAdapter";
import {
  createConversationId,
  createMessage,
  type ChatMessage,
  type ConversationId,
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

const SEED_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Show revenue forecast", "Revenue expected to increase by 18% next month."],
  ["Analyze customer trends", "Customer retention improved by 12%."],
];

export function createChatService(config: ChatServiceConfig): ChatService {
  let organizationId = config.organizationId ?? null;
  let workspaceId = config.workspaceId ?? null;
  let provider = config.provider;
  let conversation = createConversation();
  let messages: ChatMessage[] = seedMessages(conversation.id);
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

  function seedMessages(conversationId: ConversationId): ChatMessage[] {
    const base = Date.now() - SEED_PAIRS.length * 60_000;
    const seeded: ChatMessage[] = [];

    SEED_PAIRS.forEach(([user, assistant], index) => {
      const t = base + index * 60_000;
      const userMsg = createMessage({
        conversationId,
        role: "user",
        content: user,
        status: "complete",
        createdAt: new Date(t).toISOString(),
        updatedAt: new Date(t).toISOString(),
      });
      const assistantMsg = createMessage({
        conversationId,
        role: "assistant",
        content: assistant,
        status: "complete",
        metadata: { seeded: true },
        createdAt: new Date(t + 1200).toISOString(),
        updatedAt: new Date(t + 1200).toISOString(),
      });

      seeded.push(userMsg, assistantMsg);

      config.memory.recordMessage({
        conversationId,
        messageId: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        organizationId,
        workspaceId,
      });
      config.memory.recordMessage({
        conversationId,
        messageId: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        organizationId,
        workspaceId,
      });
    });

    return seeded;
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
      messages = seedMessages(conversation.id);
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
