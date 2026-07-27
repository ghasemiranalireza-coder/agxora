import type { MemoryContextPacket } from "../../memory/MemoryTypes";
import type { ChatMessage, ConversationId, MessageId } from "./Message";

export type ChatStatus =
  | "idle"
  | "sending"
  | "typing"
  | "streaming"
  | "error";

export interface Conversation {
  readonly id: ConversationId;
  readonly title: string;
  readonly organizationId: string | null;
  readonly workspaceId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ChatState {
  readonly conversation: Conversation | null;
  readonly messages: readonly ChatMessage[];
  readonly draft: string;
  readonly status: ChatStatus;
  readonly error: string | null;
  readonly isSending: boolean;
  readonly isTyping: boolean;
}

export interface SendMessageInput {
  readonly content: string;
  readonly conversationId?: ConversationId;
}

export interface SendMessageResult {
  readonly userMessage: ChatMessage;
  readonly assistantMessage: ChatMessage;
  readonly conversation: Conversation;
}

/**
 * Pluggable AI backend contract.
 * Swap Mock → OpenAI / Anthropic / local LLM without changing UI.
 */
export interface AiCompletionRequest {
  readonly conversationId: ConversationId;
  readonly messages: readonly ChatMessage[];
  readonly userMessage: ChatMessage;
  readonly memory: MemoryContextPacket;
  readonly organizationId?: string | null;
  readonly workspaceId?: string | null;
  readonly signal?: AbortSignal;
  readonly onDelta?: (delta: string, content: string) => void;
}

export interface AiCompletionResponse {
  readonly content: string;
  readonly provider: string;
  readonly model: string;
  readonly usage?: {
    readonly promptTokens?: number;
    readonly completionTokens?: number;
  };
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AiProvider {
  readonly id: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}

export interface ChatServiceConfig {
  readonly provider: AiProvider;
  readonly memory: {
    recordMessage: (input: {
      conversationId: string;
      messageId: string;
      role: string;
      content: string;
      organizationId?: string | null;
      workspaceId?: string | null;
    }) => unknown;
    buildContext: (
      scope: { kind: "conversation"; id: string },
      options?: { limit?: number },
    ) => MemoryContextPacket;
  };
  readonly organizationId?: string | null;
  readonly workspaceId?: string | null;
  readonly typingDelayMs?: number;
  readonly autoTitleEnabled?: boolean;
  readonly onMessagesChange?: (
    conversation: Conversation,
    messages: readonly ChatMessage[],
  ) => void;
}

export type { ChatMessage, ConversationId, MessageId };
