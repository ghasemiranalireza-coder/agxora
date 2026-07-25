/**
 * Chat Service — local conversation store + send pipeline.
 *
 * Awaits AI backend. Streaming / memory / providers are stubbed.
 */

import {
  asConversationId,
  asMessageId,
  createId,
  type ConversationId,
} from "../../core/ids";
import type { EventBus } from "../../core/bus/EventBus";
import { CoreEvents } from "../../core/bus/EventBus";
import type {
  ChatMessage,
  ChatStreamHandler,
  Conversation,
  SendMessageInput,
  SendMessageResult,
} from "./types";

export interface ChatServiceOptions {
  readonly events?: EventBus;
  readonly workspaceId?: string | null;
  readonly organizationId?: string | null;
  readonly seedDemoMessages?: boolean;
}

export interface ChatService {
  listConversations(): readonly Conversation[];
  getConversation(id: ConversationId): Conversation | undefined;
  getActiveConversation(): Conversation | null;
  ensureActiveConversation(): Conversation;
  listMessages(conversationId?: ConversationId): readonly ChatMessage[];
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  setWorkspaceContext(workspaceId: string | null, organizationId: string | null): void;
  /** Future: wire a real streaming provider. */
  streamReply(
    conversationId: ConversationId,
    handler: ChatStreamHandler,
  ): Promise<void>;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

const PLACEHOLDER_ASSISTANT =
  "AGXORA AI is ready. The chat interface is connected — AI responses will appear here once the backend is linked.";

const DEMO_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Show revenue forecast", "Revenue expected to increase by 18% next month."],
  ["Analyze customer trends", "Customer retention improved by 12%."],
];

export function createChatService(options: ChatServiceOptions = {}): ChatService {
  const conversations = new Map<ConversationId, Conversation>();
  const messages = new Map<ConversationId, ChatMessage[]>();
  const listeners = new Set<() => void>();
  let activeId: ConversationId | null = null;
  let workspaceId = options.workspaceId ?? null;
  let organizationId = options.organizationId ?? null;

  const emit = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const createConversation = (title = "AGXORA AI"): Conversation => {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: asConversationId(createId("conv")),
      workspaceId,
      organizationId,
      title,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    conversations.set(conversation.id, conversation);
    messages.set(conversation.id, []);
    activeId = conversation.id;

    options.events?.publish({
      type: CoreEvents.CHAT_CONVERSATION_CREATED,
      source: "module.chat",
      timestamp: now,
      workspaceId,
      organizationId,
      payload: { conversationId: conversation.id },
    });

    return conversation;
  };

  const seedDemo = (conversation: Conversation): void => {
    const now = Date.now();
    const seeded: ChatMessage[] = [];
    DEMO_PAIRS.forEach(([user, assistant], index) => {
      const base = now - (DEMO_PAIRS.length - index) * 60_000;
      seeded.push({
        id: asMessageId(createId("msg")),
        conversationId: conversation.id,
        role: "user",
        content: user,
        status: "complete",
        createdAt: new Date(base).toISOString(),
        updatedAt: new Date(base).toISOString(),
      });
      seeded.push({
        id: asMessageId(createId("msg")),
        conversationId: conversation.id,
        role: "assistant",
        content: assistant,
        status: "complete",
        createdAt: new Date(base + 1_000).toISOString(),
        updatedAt: new Date(base + 1_000).toISOString(),
        meta: { placeholder: true, demo: true },
      });
    });
    messages.set(conversation.id, seeded);
  };

  if (options.seedDemoMessages !== false) {
    const conv = createConversation();
    seedDemo(conv);
  }

  return {
    listConversations() {
      return [...conversations.values()].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );
    },

    getConversation(id) {
      return conversations.get(id);
    },

    getActiveConversation() {
      if (!activeId) return null;
      return conversations.get(activeId) ?? null;
    },

    ensureActiveConversation() {
      const existing = this.getActiveConversation();
      if (existing) return existing;
      return createConversation();
    },

    listMessages(conversationId) {
      const id = conversationId ?? activeId;
      if (!id) return [];
      return [...(messages.get(id) ?? [])];
    },

    async sendMessage(input) {
      const content = input.content.trim();
      if (!content) {
        throw new Error("Message content is required");
      }

      const conversation =
        (input.conversationId
          ? conversations.get(input.conversationId)
          : null) ?? this.ensureActiveConversation();

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: asMessageId(createId("msg")),
        conversationId: conversation.id,
        role: "user",
        content,
        status: "sent",
        createdAt: now,
        updatedAt: now,
        attachments: input.attachments,
      };

      const assistantMessage: ChatMessage = {
        id: asMessageId(createId("msg")),
        conversationId: conversation.id,
        role: "assistant",
        content: PLACEHOLDER_ASSISTANT,
        status: "complete",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        meta: {
          placeholder: true,
          aiConnected: false,
          streamingReady: true,
        },
      };

      const thread = messages.get(conversation.id) ?? [];
      thread.push(userMessage, assistantMessage);
      messages.set(conversation.id, thread);

      const updated: Conversation = {
        ...conversation,
        updatedAt: now,
        title:
          conversation.title === "AGXORA AI"
            ? content.slice(0, 48)
            : conversation.title,
      };
      conversations.set(conversation.id, updated);
      activeId = conversation.id;

      options.events?.publish({
        type: CoreEvents.CHAT_MESSAGE_SENT,
        source: "module.chat",
        timestamp: now,
        workspaceId,
        organizationId,
        payload: {
          conversationId: conversation.id,
          messageId: userMessage.id,
        },
      });

      emit();
      return { conversation: updated, userMessage, assistantMessage };
    },

    setWorkspaceContext(nextWorkspaceId, nextOrganizationId) {
      workspaceId = nextWorkspaceId;
      organizationId = nextOrganizationId;
    },

    async streamReply(conversationId, handler) {
      // Architecture stub — future provider streams tokens here.
      const thread = messages.get(conversationId) ?? [];
      const lastAssistant = [...thread]
        .reverse()
        .find((m) => m.role === "assistant");
      if (!lastAssistant) return;
      handler({
        conversationId,
        messageId: lastAssistant.id,
        delta: lastAssistant.content,
        done: true,
      });
    },

    clear() {
      conversations.clear();
      messages.clear();
      activeId = null;
      emit();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
