/**
 * Chat message model and factory helpers.
 */

export type MessageId = string & { readonly __brand: "MessageId" };
export type ConversationId = string & { readonly __brand: "ConversationId" };

export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus =
  | "pending"
  | "sent"
  | "streaming"
  | "complete"
  | "failed";

export interface ChatMessage {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly role: MessageRole;
  readonly content: string;
  readonly status: MessageStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly error?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function asMessageId(value: string): MessageId {
  return value as MessageId;
}

export function asConversationId(value: string): ConversationId {
  return value as ConversationId;
}

export function createMessageId(): MessageId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return asMessageId(`msg_${crypto.randomUUID()}`);
  }
  return asMessageId(
    `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
  );
}

export function createConversationId(): ConversationId {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return asConversationId(`conv_${crypto.randomUUID()}`);
  }
  return asConversationId(
    `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
  );
}

export function createMessage(input: {
  conversationId: ConversationId;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  metadata?: Readonly<Record<string, unknown>>;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}): ChatMessage {
  const now = new Date().toISOString();
  return {
    id: createMessageId(),
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    status: input.status ?? "complete",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
    metadata: input.metadata,
    error: input.error,
  };
}
