"use client";

import { createContext } from "react";
import type { ChatMessage, ConversationId } from "./Message";
import type { ChatStatus, Conversation, SendMessageResult } from "./types";

export interface ChatContextValue {
  readonly conversation: Conversation | null;
  readonly messages: readonly ChatMessage[];
  readonly draft: string;
  readonly setDraft: (value: string) => void;
  readonly status: ChatStatus;
  readonly error: string | null;
  readonly isSending: boolean;
  readonly isTyping: boolean;
  readonly canSend: boolean;
  readonly send: (content?: string) => Promise<SendMessageResult | null>;
  readonly clearError: () => void;
  readonly activeConversationId: ConversationId | null;
}

export const ChatContext = createContext<ChatContextValue | null>(null);
