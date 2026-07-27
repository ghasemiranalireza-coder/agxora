/**
 * ChatSessionManager — active session, abort, regenerate, retry orchestration.
 */

import { conversationPersistence } from "./ConversationPersistence";
import { streamingEngine } from "./StreamingEngine";
import type { AIStreamController } from "./StreamingEngine";

export class ChatSessionManager {
  private controller: AIStreamController | null = null;
  private sessionId: string | null = null;

  getSessionId(): string | null {
    return this.sessionId;
  }

  begin(sessionId: string): AIStreamController {
    this.stop();
    this.sessionId = sessionId;
    this.controller = streamingEngine.createController();
    return this.controller;
  }

  stop(): void {
    this.controller?.abort();
    this.controller = null;
  }

  get aborted(): boolean {
    return this.controller?.aborted ?? false;
  }

  signal(): AbortSignal | undefined {
    return this.controller?.signal;
  }

  persistActive(
    conversation: Parameters<typeof conversationPersistence.upsert>[0],
    messages: Parameters<typeof conversationPersistence.upsert>[1],
  ): void {
    conversationPersistence.upsert(conversation, messages, conversation.id);
  }
}

export const chatSessionManager = new ChatSessionManager();
