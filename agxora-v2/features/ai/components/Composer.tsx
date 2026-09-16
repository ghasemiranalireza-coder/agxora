"use client";

import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
} from "react";
import { Button, VoiceInputButton } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";

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
  const t = useT();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);

  const submit = useCallback(() => {
    const value = draft.trim();
    if (!value || disabled || generating || listening) return;
    onSend(value);
    onDraftChange("");
  }, [disabled, draft, generating, listening, onDraftChange, onSend]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!listening) submit();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div
        className="rounded-2xl p-2"
        style={{
          background:
            "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 80%, transparent)",
          border: listening
            ? "1px solid color-mix(in srgb, #fb7185 45%, transparent)"
            : "1px solid color-mix(in srgb, var(--agx-border, #334155) 75%, transparent)",
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          disabled={disabled}
          placeholder={
            listening ? t("ui.voice.listening") : t("ai.composer.placeholder")
          }
          className="w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
          style={{ color: "var(--agx-text, #f8fafc)" }}
          aria-label={t("ai.composer.ariaLabel")}
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
                {t("ai.composer.commandsShortcut")}
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <VoiceInputButton
              value={draft}
              onChange={onDraftChange}
              disabled={disabled || generating}
              inputRef={inputRef}
              onListeningChange={setListening}
            />
            {generating && onStop ? (
              <Button type="button" size="sm" variant="secondary" onClick={onStop}>
                {t("ai.composer.stop")}
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={disabled || generating || listening || !draft.trim()}
            >
              {t("ai.composer.send")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
