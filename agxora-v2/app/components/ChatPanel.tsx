"use client";

import {
  useEffect,
  useRef,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
} from "react";
import { useChat } from "../lib/modules/chat";
import { useLocale } from "../lib/i18n";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `text-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `backdrop-filter ${THEME_TRANSITION_MS}ms ease`,
].join(", ");

/**
 * ChatPanel — visual shell preserved from the approved dashboard chat card.
 * State comes exclusively from ChatProvider / useChat.
 */
export function ChatPanel(): JSX.Element {
  const { tokens } = useTheme();
  const { t } = useLocale();
  const {
    messages,
    draft,
    setDraft,
    send,
    canSend,
    isSending,
    isTyping,
    error,
    clearError,
  } = useChat();

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (): Promise<void> => {
    if (!canSend) return;
    await send();
    inputRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void handleSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const disabled = isSending || isTyping;

  return (
    <div
      className="agx-glass-panel"
      style={{
        padding: "24px",
        borderRadius: "24px",
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        backdropFilter: tokens.cardBlur,
        WebkitBackdropFilter: tokens.cardBlur,
        transition: surfaceTransition,
      }}
    >
      <h2
        style={{
          color: tokens.accent,
          marginBottom: "18px",
          marginTop: 0,
          fontSize: "12px",
          fontWeight: 650,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          transition: surfaceTransition,
        }}
      >
        {t("dashboard.chat.title")}
      </h2>

      <div
        ref={listRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "18px",
          maxHeight: "320px",
          minHeight: "180px",
          overflowY: "auto",
        }}
      >
        {messages.length === 0 && !isTyping ? (
          <div
            style={{
              padding: "18px 16px",
              borderRadius: "16px",
              border: `1px dashed ${tokens.panelBorder}`,
              color: tokens.textMuted,
              fontSize: "13.5px",
              lineHeight: 1.55,
            }}
          >
            {t("dashboard.chat.emptyState")}
          </div>
        ) : null}

        {messages.map((message) => {
          if (message.status === "failed" && !message.content) {
            return null;
          }
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              style={{
                padding: "13px 15px",
                borderRadius: "16px",
                background: isUser ? tokens.chatBubbleBg : tokens.chatReplyBg,
                color: isUser ? tokens.text : tokens.accent,
                border: `1px solid ${
                  isUser ? tokens.divider : tokens.panelBorder
                }`,
                fontSize: "13.5px",
                transition: surfaceTransition,
              }}
            >
              {message.content}
            </div>
          );
        })}

        {isTyping ? (
          <div
            style={{
              padding: "13px 15px",
              borderRadius: "16px",
              background: tokens.chatReplyBg,
              color: tokens.accent,
              border: `1px solid ${tokens.panelBorder}`,
              fontSize: "13.5px",
              opacity: 0.85,
              transition: surfaceTransition,
            }}
          >
            {t("dashboard.chat.thinking")}
          </div>
        ) : null}
      </div>

      {error ? (
        <button
          type="button"
          onClick={clearError}
          style={{
            display: "block",
            width: "100%",
            marginBottom: "12px",
            padding: "10px 12px",
            borderRadius: "12px",
            border: `1px solid ${tokens.panelBorder}`,
            background: tokens.chatBubbleBg,
            color: tokens.text,
            fontSize: "12.5px",
            textAlign: "left",
            cursor: "pointer",
            transition: surfaceTransition,
          }}
        >
          {t("dashboard.chat.errorDismiss", { error })}
        </button>
      ) : null}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <input
          ref={inputRef}
          className="agx-input"
          placeholder={t("dashboard.chat.placeholder")}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={t("dashboard.chat.messageAria")}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "14px 16px",
            borderRadius: "16px",
            border: `1px solid ${tokens.inputBorder}`,
            background: tokens.inputBg,
            color: tokens.text,
            outline: "none",
            fontSize: "14px",
            opacity: disabled ? 0.7 : 1,
            transition: surfaceTransition,
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={t("dashboard.chat.sendAria")}
          style={{
            flexShrink: 0,
            padding: "14px 18px",
            borderRadius: "16px",
            border: `1px solid ${tokens.panelBorder}`,
            background: canSend ? tokens.chatReplyBg : tokens.inputBg,
            color: canSend ? tokens.accent : tokens.text,
            opacity: canSend ? 1 : 0.55,
            fontSize: "13px",
            fontWeight: 650,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: canSend ? "pointer" : "not-allowed",
            transition: surfaceTransition,
          }}
        >
          {t("dashboard.chat.send")}
        </button>
      </form>
    </div>
  );
}
