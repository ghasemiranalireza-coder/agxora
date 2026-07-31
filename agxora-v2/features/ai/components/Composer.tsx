"use client";

import {
  useCallback,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
} from "react";
import { Button } from "@/app/components/ui";

export interface ComposerProps {
  readonly disabled?: boolean;
  readonly generating?: boolean;
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onSend: (value: string) => void;
  readonly onStop?: () => void;
  readonly onOpenCommands?: () => void;
}

export function Composer({
  disabled,
  generating,
  draft,
  onDraftChange,
  onSend,
  onStop,
  onOpenCommands,
}: ComposerProps): JSX.Element {
  const submit = useCallback(() => {
    const value = draft.trim();
    if (!value || disabled || generating) return;
    onSend(value);
    onDraftChange("");
  }, [disabled, draft, generating, onDraftChange, onSend]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div
        className="rounded-2xl p-2"
        style={{
          background:
            "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 80%, transparent)",
          border:
            "1px solid color-mix(in srgb, var(--agx-border, #334155) 75%, transparent)",
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          disabled={disabled}
          placeholder="Message AGXORA AI… (Enter to send, Shift+Enter for newline)"
          className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
          style={{ color: "var(--agx-text, #f8fafc)" }}
          aria-label="Message composer"
        />
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <div className="flex items-center gap-2">
            {onOpenCommands ? (
              <button
                type="button"
                className="text-[11px] opacity-80 hover:opacity-100"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                onClick={onOpenCommands}
              >
                Commands ⌘⇧K
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {generating && onStop ? (
              <Button type="button" size="sm" variant="secondary" onClick={onStop}>
                Stop
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={disabled || generating || !draft.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
