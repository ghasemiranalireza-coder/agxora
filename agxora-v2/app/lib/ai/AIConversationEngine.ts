/**
 * Conversation engine — history, regenerate, edit, export.
 */

import {
  asAIConversationId,
  asAIMessageId,
  asAIThreadId,
  createAIId,
  type AIConversation,
  type AIConversationExport,
  type AIConversationMessage,
  type AIMessageId,
} from "./AIConversation";

export class AIConversationEngine {
  private readonly conversations = new Map<string, AIConversation>();
  private readonly messages = new Map<string, AIConversationMessage[]>();

  create(input: {
    organizationId?: string | null;
    workspaceId?: string | null;
    title?: string;
  }): AIConversation {
    const now = new Date().toISOString();
    const conversation: AIConversation = {
      id: asAIConversationId(createAIId("aconv")),
      threadId: asAIThreadId(createAIId("athr")),
      title: input.title ?? "AGXORA AI",
      organizationId: input.organizationId ?? null,
      workspaceId: input.workspaceId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    return conversation;
  }

  get(id: string): AIConversation | undefined {
    return this.conversations.get(id);
  }

  listMessages(conversationId: string): readonly AIConversationMessage[] {
    return [...(this.messages.get(conversationId) ?? [])];
  }

  append(message: Omit<AIConversationMessage, "id" | "createdAt" | "updatedAt"> & {
    id?: AIMessageId;
  }): AIConversationMessage {
    const now = new Date().toISOString();
    const full: AIConversationMessage = {
      ...message,
      id: message.id ?? asAIMessageId(createAIId("amsg")),
      createdAt: now,
      updatedAt: now,
    };
    const list = this.messages.get(message.conversationId) ?? [];
    list.push(full);
    this.messages.set(message.conversationId, list);
    this.touch(message.conversationId, now);
    return full;
  }

  updateMessage(
    conversationId: string,
    messageId: string,
    patch: Partial<Pick<AIConversationMessage, "content" | "status" | "error" | "metadata">>,
  ): AIConversationMessage | undefined {
    const list = this.messages.get(conversationId);
    if (!list) return undefined;
    const index = list.findIndex((item) => item.id === messageId);
    if (index < 0) return undefined;
    const updated: AIConversationMessage = {
      ...list[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.touch(conversationId, updated.updatedAt);
    return updated;
  }

  regenerateFrom(
    conversationId: string,
    assistantMessageId: string,
  ): AIConversationMessage | undefined {
    const list = this.messages.get(conversationId);
    if (!list) return undefined;
    const original = list.find((item) => item.id === assistantMessageId);
    if (!original || original.role !== "assistant") return undefined;
    return this.append({
      conversationId: original.conversationId,
      threadId: original.threadId,
      role: "assistant",
      content: "",
      status: "pending",
      regeneratedFromId: original.id,
      parentMessageId: original.parentMessageId,
    });
  }

  editUserMessage(
    conversationId: string,
    messageId: string,
    content: string,
  ): AIConversationMessage | undefined {
    const list = this.messages.get(conversationId);
    if (!list) return undefined;
    const original = list.find((item) => item.id === messageId);
    if (!original || original.role !== "user") return undefined;
    return this.append({
      conversationId: original.conversationId,
      threadId: original.threadId,
      role: "user",
      content,
      status: "complete",
      editedFromId: original.id,
    });
  }

  export(conversationId: string): AIConversationExport | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;
    return {
      conversation,
      messages: this.listMessages(conversationId),
      exportedAt: new Date().toISOString(),
      format: "json",
    };
  }

  private touch(conversationId: string, updatedAt: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;
    this.conversations.set(conversationId, { ...conversation, updatedAt });
  }
}

export const aiConversationEngine = new AIConversationEngine();
