import { createChatProviderAdapter } from "../../ai/adapters/chatProviderAdapter";
import { conversationPersistence } from "../../ai/ConversationPersistence";
import {
  createConversationId,
  createMessage,
  type ChatMessage,
  type ConversationId,
  type MessageId,
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
  listConversations(): readonly Conversation[];
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  stopGeneration(): void;
  regenerate(messageId?: MessageId): Promise<SendMessageResult | null>;
  retryLast(): Promise<SendMessageResult | null>;
  deleteConversation(conversationId?: ConversationId): void;
  renameConversation(title: string, conversationId?: ConversationId): void;
  searchConversations(query: string): readonly Conversation[];
  switchConversation(conversationId: ConversationId): boolean;
  newConversation(): Conversation;
  setContext(organizationId: string | null, workspaceId: string | null): void;
  setProvider(provider: AiProvider): void;
  setAutoTitleEnabled(enabled: boolean): void;
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
  let autoTitleEnabled = config.autoTitleEnabled ?? true;
  let conversation = createConversation();
  let messages: ChatMessage[] = seedMessages(conversation.id);
  let abortController: AbortController | null = null;
  let lastUserPrompt: string | null = null;

  function createConversation(title = "AGXORA AI"): Conversation {
    const now = new Date().toISOString();
    return {
      id: createConversationId(),
      title,
      organizationId,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    };
  }

  function notify(): void {
    config.onMessagesChange?.(conversation, messages);
    conversationPersistence.upsert(conversation, messages, conversation.id);
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

  function updateAssistantStreaming(
    messageId: MessageId,
    content: string,
  ): void {
    messages = messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            content,
            status: "streaming" as const,
            updatedAt: new Date().toISOString(),
          }
        : message,
    );
    config.onMessagesChange?.(conversation, messages);
  }

  async function generateAssistant(
    userMessage: ChatMessage,
  ): Promise<ChatMessage> {
    abortController?.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    const memory = config.memory.buildContext(
      { kind: "conversation", id: conversation.id },
      { limit: 32 },
    );

    const pending = createMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "",
      status: "streaming",
    });
    messages = [...messages, pending];
    notify();

    try {
      const completion = await provider.complete({
        conversationId: conversation.id,
        messages: messages.filter((m) => m.id !== pending.id),
        userMessage,
        memory,
        organizationId,
        workspaceId,
        signal,
        onDelta: (_delta, content) => {
          updateAssistantStreaming(pending.id, content);
        },
      });

      const assistantMessage: ChatMessage = {
        ...pending,
        content: completion.content,
        status: "complete",
        updatedAt: new Date().toISOString(),
        metadata: {
          provider: completion.provider,
          model: completion.model,
          usage: completion.usage,
          ...completion.metadata,
        },
      };

      messages = messages.map((message) =>
        message.id === pending.id ? assistantMessage : message,
      );
      conversation = {
        ...conversation,
        updatedAt: assistantMessage.updatedAt,
      };
      notify();

      config.memory.recordMessage({
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        organizationId,
        workspaceId,
      });

      return assistantMessage;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        messages = messages.map((message) =>
          message.id === pending.id
            ? {
                ...message,
                status: "complete" as const,
                metadata: { ...(message.metadata ?? {}), cancelled: true },
                updatedAt: new Date().toISOString(),
              }
            : message,
        );
        notify();
        throw error;
      }

      const messageText =
        error instanceof Error ? error.message : "Failed to generate response";

      const failed: ChatMessage = {
        ...pending,
        content: "",
        status: "failed",
        error: messageText,
        updatedAt: new Date().toISOString(),
      };
      messages = messages.map((message) =>
        message.id === pending.id ? failed : message,
      );
      notify();
      throw new Error(messageText);
    }
  }

  // Hydrate from persistence when available.
  const persisted = conversationPersistence.load();
  const active = persisted.bundles.find(
    (bundle) => bundle.conversation.id === persisted.activeId,
  );
  if (active) {
    conversation = active.conversation;
    messages = [...active.messages];
  } else {
    notify();
  }

  return {
    getConversation() {
      return conversation;
    },

    listMessages() {
      return [...messages];
    },

    listConversations() {
      return conversationPersistence
        .load()
        .bundles.map((bundle) => bundle.conversation);
    },

    async sendMessage(input) {
      const content = input.content.trim();
      if (!content) {
        throw new Error("Message content is required");
      }

      lastUserPrompt = content;

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
          autoTitleEnabled && conversation.title === "AGXORA AI"
            ? content.slice(0, 48)
            : conversation.title,
        organizationId,
        workspaceId,
      };
      notify();

      config.memory.recordMessage({
        conversationId: conversation.id,
        messageId: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        organizationId,
        workspaceId,
      });

      const assistantMessage = await generateAssistant(userMessage);
      return { userMessage, assistantMessage, conversation };
    },

    stopGeneration() {
      abortController?.abort();
      abortController = null;
    },

    async regenerate(messageId) {
      const targetId =
        messageId ??
        [...messages].reverse().find((m) => m.role === "assistant")?.id;
      if (!targetId) return null;

      const index = messages.findIndex((m) => m.id === targetId);
      if (index < 0) return null;

      let userMessage: ChatMessage | undefined;
      for (let i = index - 1; i >= 0; i -= 1) {
        if (messages[i].role === "user") {
          userMessage = messages[i];
          break;
        }
      }
      if (!userMessage) return null;

      messages = messages.slice(0, index);
      notify();
      lastUserPrompt = userMessage.content;
      const assistantMessage = await generateAssistant(userMessage);
      return { userMessage, assistantMessage, conversation };
    },

    async retryLast() {
      if (!lastUserPrompt) {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (!lastUser) return null;
        lastUserPrompt = lastUser.content;
      }
      // Remove trailing failed assistant if present.
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && last.status === "failed") {
        messages = messages.slice(0, -1);
        notify();
      }
      return this.regenerate();
    },

    deleteConversation(conversationId) {
      const id = conversationId ?? conversation.id;
      conversationPersistence.delete(id);
      const next = conversationPersistence.load();
      const active = next.bundles[0];
      if (active) {
        conversation = active.conversation;
        messages = [...active.messages];
      } else {
        conversation = createConversation();
        messages = [];
        notify();
      }
    },

    renameConversation(title, conversationId) {
      const id = conversationId ?? conversation.id;
      const trimmed = title.trim() || "AGXORA AI";
      conversationPersistence.rename(id, trimmed);
      if (conversation.id === id) {
        conversation = { ...conversation, title: trimmed };
        notify();
      }
    },

    searchConversations(query) {
      return conversationPersistence
        .search(query)
        .map((bundle) => bundle.conversation);
    },

    switchConversation(conversationId) {
      const bundle = conversationPersistence
        .load()
        .bundles.find((item) => item.conversation.id === conversationId);
      if (!bundle) return false;
      conversation = bundle.conversation;
      messages = [...bundle.messages];
      conversationPersistence.upsert(conversation, messages, conversation.id);
      return true;
    },

    newConversation() {
      abortController?.abort();
      conversation = createConversation();
      messages = [];
      notify();
      return conversation;
    },

    setContext(nextOrganizationId, nextWorkspaceId) {
      organizationId = nextOrganizationId;
      workspaceId = nextWorkspaceId;
      conversation = {
        ...conversation,
        organizationId,
        workspaceId,
      };
      notify();
    },

    setProvider(next) {
      provider = next;
    },

    setAutoTitleEnabled(enabled) {
      autoTitleEnabled = enabled;
    },

    clearError() {
      // Stateful error lives in the provider UI layer.
    },

    reset() {
      abortController?.abort();
      conversation = createConversation();
      messages = seedMessages(conversation.id);
      notify();
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
  options?: {
    autoTitleEnabled?: boolean;
    onMessagesChange?: ChatServiceConfig["onMessagesChange"];
  },
): ChatService {
  return createChatService({
    provider: provider ?? createChatProviderAdapter(),
    memory,
    organizationId: context?.organizationId ?? null,
    workspaceId: context?.workspaceId ?? null,
    autoTitleEnabled: options?.autoTitleEnabled,
    onMessagesChange: options?.onMessagesChange,
  });
}
