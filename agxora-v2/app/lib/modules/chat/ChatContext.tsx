"use client";

import { createContext } from "react";
import type { ChatMessage, ConversationId, MessageId } from "./Message";
import type {
  ChatStatus,
  Conversation,
  SendMessageResult,
} from "./types";

export interface ChatContextValue {
  readonly conversation: Conversation | null;
  readonly conversations: readonly Conversation[];
  readonly messages: readonly ChatMessage[];
  readonly draft: string;
  readonly setDraft: (value: string) => void;
  readonly searchQuery: string;
  readonly setSearchQuery: (value: string) => void;
  readonly status: ChatStatus;
  readonly error: string | null;
  readonly isSending: boolean;
  readonly isTyping: boolean;
  readonly isStreaming: boolean;
  readonly canSend: boolean;
  readonly send: (content?: string) => Promise<SendMessageResult | null>;
  readonly stop: () => void;
  readonly regenerate: (messageId?: MessageId) => Promise<SendMessageResult | null>;
  readonly retry: () => Promise<SendMessageResult | null>;
  readonly deleteConversation: () => void;
  readonly renameConversation: (title: string) => void;
  readonly newConversation: () => void;
  readonly switchConversation: (id: ConversationId) => void;
  readonly clearError: () => void;
  readonly activeConversationId: ConversationId | null;
}

export const ChatContext = createContext<ChatContextValue | null>(null);
