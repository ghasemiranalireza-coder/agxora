/**
 * Conversation engine contracts — IDs, threads, regeneration, export.
 */

export type AIConversationId = string & { readonly __brand: "AIConversationId" };
export type AIThreadId = string & { readonly __brand: "AIThreadId" };
export type AIMessageId = string & { readonly __brand: "AIMessageId" };

export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export type AIMessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "failed"
  | "cancelled";

export interface AIConversationMessage {
  readonly id: AIMessageId;
  readonly conversationId: AIConversationId;
  readonly threadId: AIThreadId;
  readonly role: AIMessageRole;
  readonly content: string;
  readonly status: AIMessageStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly parentMessageId?: AIMessageId;
  readonly regeneratedFromId?: AIMessageId;
  readonly editedFromId?: AIMessageId;
  readonly error?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AIConversation {
  readonly id: AIConversationId;
  readonly threadId: AIThreadId;
  readonly title: string;
  readonly organizationId: string | null;
  readonly workspaceId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly archived?: boolean;
}

export interface AIConversationExport {
  readonly conversation: AIConversation;
  readonly messages: readonly AIConversationMessage[];
  readonly exportedAt: string;
  readonly format: "json";
}

export function asAIConversationId(value: string): AIConversationId {
  return value as AIConversationId;
}

export function asAIThreadId(value: string): AIThreadId {
  return value as AIThreadId;
}

export function asAIMessageId(value: string): AIMessageId {
  return value as AIMessageId;
}

export function createAIId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
