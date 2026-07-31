"use client";

import {
  memo,
  useEffect,
  useRef,
  type JSX,
} from "react";
import type { AiMessage } from "../types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

export interface ChatThreadProps {
  readonly messages: readonly AiMessage[];
  readonly generating: boolean;
  readonly onRetry: (messageId: string) => void;
}

function ChatThreadInner({
  messages,
  generating,
  onRetry,
}: ChatThreadProps): JSX.Element {
  const endRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, generating]);

  const last = messages[messages.length - 1];
  const showTyping =
    generating &&
    (!last || last.role === "user" || (last.role === "assistant" && !last.content));

  return (
    <div
      ref={scrollerRef}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.length === 0 ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            AGXORA AI Workspace
          </p>
          <p className="max-w-md text-sm leading-relaxed">
            Start a conversation, pick a prompt from the library, or open the
            command palette (⌘⇧K / Ctrl⇧K).
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onRetry={onRetry}
          />
        ))
      )}
      {showTyping && messages.length > 0 && last?.role === "user" ? (
        <div className="flex justify-start">
          <TypingIndicator />
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}

export const ChatThread = memo(ChatThreadInner);
