"use client";

import { useMemo, type JSX } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../lib/modules/chat";
import { useTheme } from "../lib/theme";

interface ChatMessageBubbleProps {
  readonly message: ChatMessage;
  readonly onCopy?: () => void;
  readonly onRegenerate?: () => void;
  readonly showActions?: boolean;
}

export function ChatMessageBubble({
  message,
  onCopy,
  onRegenerate,
  showActions = false,
}: ChatMessageBubbleProps): JSX.Element | null {
  const { tokens } = useTheme();
  const isUser = message.role === "user";

  const content = useMemo(() => message.content, [message.content]);

  if (message.status === "failed" && !message.content) {
    return null;
  }

  return (
    <div
      style={{
        padding: "13px 15px",
        borderRadius: "16px",
        background: isUser ? tokens.chatBubbleBg : tokens.chatReplyBg,
        color: isUser ? tokens.text : tokens.accent,
        border: `1px solid ${isUser ? tokens.divider : tokens.panelBorder}`,
        fontSize: "13.5px",
        lineHeight: 1.55,
        transition:
          "background 420ms cubic-bezier(0.22, 1, 0.36, 1), border-color 420ms cubic-bezier(0.22, 1, 0.36, 1), color 420ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {isUser ? (
        <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
      ) : (
        <div className="agx-md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: tokens.accent, textDecoration: "underline" }}
                >
                  {children}
                </a>
              ),
              code: ({ className, children, ...props }) => {
                const isBlock = Boolean(className);
                if (!isBlock) {
                  return (
                    <code
                      style={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: "0.92em",
                        padding: "1px 5px",
                        borderRadius: 6,
                        background: tokens.inputBg,
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <pre
                    style={{
                      margin: "10px 0",
                      padding: "12px",
                      borderRadius: 12,
                      overflowX: "auto",
                      background: tokens.inputBg,
                      border: `1px solid ${tokens.divider}`,
                    }}
                  >
                    <code
                      className={className}
                      style={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: "12.5px",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  </pre>
                );
              },
              table: ({ children }) => (
                <div style={{ overflowX: "auto", margin: "10px 0" }}>
                  <table
                    style={{
                      borderCollapse: "collapse",
                      width: "100%",
                      fontSize: "12.5px",
                    }}
                  >
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th
                  style={{
                    border: `1px solid ${tokens.divider}`,
                    padding: "6px 8px",
                    textAlign: "left",
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  style={{
                    border: `1px solid ${tokens.divider}`,
                    padding: "6px 8px",
                  }}
                >
                  {children}
                </td>
              ),
              ul: ({ children }) => (
                <ul style={{ margin: "8px 0", paddingLeft: 18 }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ margin: "8px 0", paddingLeft: 18 }}>{children}</ol>
              ),
              blockquote: ({ children }) => (
                <blockquote
                  style={{
                    margin: "8px 0",
                    paddingLeft: 12,
                    borderLeft: `3px solid ${tokens.panelBorder}`,
                    opacity: 0.9,
                  }}
                >
                  {children}
                </blockquote>
              ),
            }}
          >
            {content || (message.status === "streaming" ? "…" : "")}
          </ReactMarkdown>
        </div>
      )}

      {showActions && !isUser && message.status === "complete" ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onCopy}
            style={{
              border: `1px solid ${tokens.panelBorder}`,
              background: "transparent",
              color: tokens.textMuted,
              borderRadius: 10,
              padding: "4px 8px",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            style={{
              border: `1px solid ${tokens.panelBorder}`,
              background: "transparent",
              color: tokens.textMuted,
              borderRadius: 10,
              padding: "4px 8px",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Regenerate
          </button>
        </div>
      ) : null}
    </div>
  );
}
