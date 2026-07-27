/**
 * Streaming architecture — events, cancel, retry, regenerate.
 */

export type AIStreamEventType =
  | "start"
  | "delta"
  | "tool_call"
  | "tool_result"
  | "usage"
  | "error"
  | "done"
  | "cancelled";

export interface AIStreamEvent {
  readonly type: AIStreamEventType;
  readonly conversationId?: string;
  readonly messageId?: string;
  readonly delta?: string;
  readonly content?: string;
  readonly error?: string;
  readonly usage?: {
    readonly promptTokens?: number;
    readonly completionTokens?: number;
    readonly totalTokens?: number;
  };
  readonly toolCall?: {
    readonly id: string;
    readonly name: string;
    readonly arguments: string;
  };
  readonly timestamp: string;
}

export type AIStreamHandler = (event: AIStreamEvent) => void;

export interface AIStreamController {
  readonly abort: () => void;
  readonly signal: AbortSignal;
  readonly aborted: boolean;
}

export function createStreamController(
  parent?: AbortSignal,
): AIStreamController {
  const controller = new AbortAbortControllerSafe();
  if (parent) {
    if (parent.aborted) controller.abort();
    else {
      parent.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }
  return {
    abort: () => controller.abort(),
    signal: controller.signal,
    get aborted() {
      return controller.signal.aborted;
    },
  };
}

class AbortAbortControllerSafe {
  private readonly inner = new AbortController();
  abort(): void {
    this.inner.abort();
  }
  get signal(): AbortSignal {
    return this.inner.signal;
  }
}

export async function emitStreamText(input: {
  text: string;
  chunkSize?: number;
  delayMs?: number;
  signal?: AbortSignal;
  onEvent: AIStreamHandler;
  conversationId?: string;
  messageId?: string;
}): Promise<string> {
  const chunkSize = input.chunkSize ?? 12;
  const delayMs = input.delayMs ?? 16;
  let assembled = "";

  input.onEvent({
    type: "start",
    conversationId: input.conversationId,
    messageId: input.messageId,
    timestamp: new Date().toISOString(),
  });

  for (let i = 0; i < input.text.length; i += chunkSize) {
    if (input.signal?.aborted) {
      input.onEvent({
        type: "cancelled",
        conversationId: input.conversationId,
        messageId: input.messageId,
        content: assembled,
        timestamp: new Date().toISOString(),
      });
      return assembled;
    }

    const delta = input.text.slice(i, i + chunkSize);
    assembled += delta;
    input.onEvent({
      type: "delta",
      conversationId: input.conversationId,
      messageId: input.messageId,
      delta,
      content: assembled,
      timestamp: new Date().toISOString(),
    });

    if (delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        input.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        throw error;
      });
    }
  }

  input.onEvent({
    type: "done",
    conversationId: input.conversationId,
    messageId: input.messageId,
    content: assembled,
    timestamp: new Date().toISOString(),
  });

  return assembled;
}
