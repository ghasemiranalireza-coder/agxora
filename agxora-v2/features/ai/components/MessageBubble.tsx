"use client";

import { memo, useCallback, type JSX } from "react";
import { useT } from "@/app/lib/i18n";
import { MarkdownContent } from "../utils/markdown";
import type { AiMessage } from "../types";
import { TypingIndicator } from "./TypingIndicator";

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export interface MessageBubbleProps {
  readonly message: AiMessage;
  readonly onRetry?: (messageId: string) => void;
}

function MessageBubbleInner({
  message,
  onRetry,
}: MessageBubbleProps): JSX.Element {
  const t = useT();
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(message.content);
  }, [message.content]);

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      data-message-id={message.id}
    >
      <div className="max-w-[min(720px,92%)] space-y-1.5">
        <div
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            background: isUser
              ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 18%, transparent)"
              : "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 88%, transparent)",
            border: isUser
              ? "1px solid color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)"
              : "1px solid color-mix(in srgb, var(--agx-border, #334155) 65%, transparent)",
          }}
        >
          {isUser ? (
            <p
              className="whitespace-pre-wrap text-sm leading-relaxed"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {message.content}
            </p>
          ) : isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <MarkdownContent content={message.content || t("ai.messageBubble.ellipsis")} />
          )}
          {isError && message.error ? (
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--agx-danger, #f87171)" }}
            >
              {message.error}
            </p>
          ) : null}
        </div>

        <div
          className={`flex items-center gap-2 text-[11px] ${isUser ? "justify-end" : "justify-start"}`}
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <span>{formatTime(message.createdAt)}</span>
          {!isUser && message.providerId ? (
            <span className="opacity-70">· {message.providerId}</span>
          ) : null}
          {!isUser && message.content ? (
            <button
              type="button"
              className="opacity-80 hover:opacity-100"
              onClick={copy}
            >
              {t("ai.messageBubble.copy")}
            </button>
          ) : null}
          {!isUser && (isError || message.status === "complete") && onRetry ? (
            <button
              type="button"
              className="opacity-80 hover:opacity-100"
              onClick={() => onRetry(message.id)}
            >
              {t("ai.messageBubble.retry")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleInner);
