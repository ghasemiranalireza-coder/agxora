/**
 * StreamingEngine — token streaming, cancel, retry, regenerate events.
 */

import {
  createStreamController,
  emitStreamText,
  type AIStreamController,
  type AIStreamEvent,
  type AIStreamHandler,
} from "./AIStreaming";

export type StreamingRetryPolicy = {
  readonly maxAttempts: number;
  readonly backoffMs: number;
};

export class StreamingEngine {
  createController(parent?: AbortSignal): AIStreamController {
    return createStreamController(parent);
  }

  async emitText(input: {
    text: string;
    chunkSize?: number;
    delayMs?: number;
    signal?: AbortSignal;
    onEvent: AIStreamHandler;
    conversationId?: string;
    messageId?: string;
  }): Promise<string> {
    return emitStreamText(input);
  }

  async withRetry<T>(
    operation: (attempt: number, signal: AbortSignal) => Promise<T>,
    policy: StreamingRetryPolicy = { maxAttempts: 2, backoffMs: 400 },
    parent?: AbortSignal,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
      const controller = createStreamController(parent);
      try {
        return await operation(attempt, controller.signal);
      } catch (error) {
        lastError = error;
        if (parent?.aborted) throw error;
        if (attempt >= policy.maxAttempts) break;
        await new Promise((resolve) =>
          setTimeout(resolve, policy.backoffMs * attempt),
        );
      }
    }
    throw lastError;
  }
}

export const streamingEngine = new StreamingEngine();

export type { AIStreamController, AIStreamEvent, AIStreamHandler };
export { createStreamController, emitStreamText };
