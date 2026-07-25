/**
 * Chat Core Module — domain models.
 *
 * Production-ready contracts for conversation / message / streaming.
 * Real AI responses are intentionally not implemented yet.
 */

import type { ConversationId, MessageId } from "../../core/ids";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type MessageStatus =
  | "pending"
  | "sent"
  | "streaming"
  | "complete"
  | "failed"
  | "cancelled";

export type ConversationStatus = "active" | "archived" | "error";

export interface ChatAttachment {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes?: number;
  readonly url?: string;
}

export interface ChatMessage {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly role: MessageRole;
  readonly content: string;
  readonly status: MessageStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly attachments?: readonly ChatAttachment[];
  /** Future: token usage, tool calls, citations. */
  readonly meta?: Record<string, unknown>;
}

export interface Conversation {
  readonly id: ConversationId;
  readonly workspaceId: string | null;
  readonly organizationId: string | null;
  readonly title: string;
  readonly status: ConversationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Future memory / AI context linkage. */
  readonly memoryScopeId?: string;
  readonly meta?: Record<string, unknown>;
}

export interface SendMessageInput {
  readonly conversationId?: ConversationId;
  readonly content: string;
  readonly attachments?: readonly ChatAttachment[];
}

export interface SendMessageResult {
  readonly conversation: Conversation;
  readonly userMessage: ChatMessage;
  /**
   * Placeholder assistant turn acknowledging the message.
   * Not a real AI response — backend integration later.
   */
  readonly assistantMessage: ChatMessage;
}

/** Future streaming contract (architecture only). */
export interface ChatStreamChunk {
  readonly conversationId: ConversationId;
  readonly messageId: MessageId;
  readonly delta: string;
  readonly done: boolean;
}

export type ChatStreamHandler = (chunk: ChatStreamChunk) => void;
