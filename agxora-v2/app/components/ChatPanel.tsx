"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
} from "react";
import { useChat, type ConversationId } from "../lib/modules/chat";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";
import { ChatMessageBubble } from "./ChatMessageBubble";

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
  const {
    conversation,
    conversations,
    messages,
    draft,
    setDraft,
    searchQuery,
    setSearchQuery,
    send,
    stop,
    regenerate,
    retry,
    deleteConversation,
    renameConversation,
    newConversation,
    switchConversation,
    canSend,
    isSending,
    isTyping,
    isStreaming,
    error,
    clearError,
  } = useChat();

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isTyping, isStreaming]);

  const handleSend = async (): Promise<void> => {
    if (!canSend) return;
    await send();
    inputRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void handleSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const busy = isSending || isTyping || isStreaming;

  const copyMessage = async (id: string, content: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div
      className="agx-glass-panel"
      style={{
        padding: "28px 30px",
        borderRadius: "26px",
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        backdropFilter: tokens.cardBlur,
        WebkitBackdropFilter: tokens.cardBlur,
        transition: surfaceTransition,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            color: tokens.accent,
            margin: 0,
            fontSize: "12px",
            fontWeight: 650,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            transition: surfaceTransition,
          }}
        >
          AGXORA AI
        </h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => newConversation()}
            style={ghostBtn(tokens)}
          >
            New
          </button>
          <button
            type="button"
            onClick={() => {
              setTitleDraft(conversation?.title ?? "");
              setRenaming((v) => !v);
            }}
            style={ghostBtn(tokens)}
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => deleteConversation()}
            style={ghostBtn(tokens)}
          >
            Delete
          </button>
        </div>
      </div>

      {renaming ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            renameConversation(titleDraft);
            setRenaming(false);
          }}
          style={{ display: "flex", gap: 8, marginBottom: 12 }}
        >
          <input
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            aria-label="Conversation title"
            className="agx-input"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${tokens.inputBorder}`,
              background: tokens.inputBg,
              color: tokens.text,
              fontSize: 13,
            }}
          />
          <button type="submit" style={ghostBtn(tokens)}>
            Save
          </button>
        </form>
      ) : (
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: tokens.textMuted,
            letterSpacing: "0.02em",
          }}
        >
          {conversation?.title ?? "AGXORA AI"}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search conversations…"
          aria-label="Search conversations"
          className="agx-input"
          style={{
            flex: 1,
            minWidth: 140,
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${tokens.inputBorder}`,
            background: tokens.inputBg,
            color: tokens.text,
            fontSize: 12.5,
          }}
        />
        <select
          aria-label="Switch conversation"
          value={conversation?.id ?? ""}
          onChange={(event) => {
            if (event.target.value) {
              switchConversation(event.target.value as ConversationId);
            }
          }}
          style={{
            maxWidth: 180,
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${tokens.inputBorder}`,
            background: tokens.inputBg,
            color: tokens.text,
            fontSize: 12.5,
          }}
        >
          {conversations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={listRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "18px",
          maxHeight: "320px",
          overflowY: "auto",
        }}
      >
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            showActions={message.role === "assistant"}
            onCopy={() => void copyMessage(message.id, message.content)}
            onRegenerate={() => void regenerate(message.id)}
          />
        ))}

        {isTyping && !messages.some((m) => m.status === "streaming") ? (
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
            AGXORA is thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={clearError}
            style={{
              flex: 1,
              minWidth: 160,
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
            {error} — tap to dismiss
          </button>
          <button type="button" onClick={() => void retry()} style={ghostBtn(tokens)}>
            Retry
          </button>
        </div>
      ) : null}

      {copiedId ? (
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            color: tokens.textMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Copied
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "10px",
        }}
      >
        <textarea
          ref={inputRef}
          className="agx-input"
          placeholder="Ask AGXORA AI..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={2}
          aria-label="Message AGXORA AI"
          style={{
            flex: 1,
            minWidth: 0,
            resize: "none",
            padding: "14px 16px",
            borderRadius: "16px",
            border: `1px solid ${tokens.inputBorder}`,
            background: tokens.inputBg,
            color: tokens.text,
            outline: "none",
            fontSize: "14px",
            lineHeight: 1.4,
            opacity: busy ? 0.7 : 1,
            transition: surfaceTransition,
          }}
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop generation"
            style={{
              flexShrink: 0,
              padding: "14px 18px",
              borderRadius: "16px",
              border: `1px solid ${tokens.panelBorder}`,
              background: tokens.inputBg,
              color: tokens.text,
              fontSize: "13px",
              fontWeight: 650,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: surfaceTransition,
            }}
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
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
            Send
          </button>
        )}
      </form>
    </div>
  );
}

function ghostBtn(tokens: {
  panelBorder: string;
  textMuted: string;
}): CSSProperties {
  return {
    border: `1px solid ${tokens.panelBorder}`,
    background: "transparent",
    color: tokens.textMuted,
    borderRadius: 10,
    padding: "5px 9px",
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
