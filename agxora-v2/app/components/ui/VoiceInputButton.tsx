"use client";

import {
  useCallback,
  useEffect,
  type JSX,
  type RefObject,
} from "react";
import { useLocale, useT } from "@/app/lib/i18n";
import { speechLangFromLocale } from "@/app/lib/voice/speechLang";
import { useSpeechToText } from "@/app/lib/voice/useSpeechToText";

type TextControl = HTMLInputElement | HTMLTextAreaElement;

export function VoiceInputButton({
  value,
  onChange,
  disabled = false,
  inputRef,
  lang,
  onListeningChange,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly disabled?: boolean;
  readonly inputRef?: RefObject<TextControl | null>;
  readonly lang?: string;
  readonly onListeningChange?: (listening: boolean) => void;
}): JSX.Element {
  const t = useT();
  const { locale } = useLocale();
  const getSelection = useCallback(
    () => readSelection(inputRef, value),
    [inputRef, value],
  );
  const voice = useSpeechToText({
    lang: lang ?? speechLangFromLocale(locale),
    value,
    onChange,
    getSelection,
    disabled,
  });

  useEffect(() => {
    onListeningChange?.(voice.listening);
  }, [onListeningChange, voice.listening]);

  const label = voice.listening ? t("ui.voice.stop") : t("ui.voice.start");

  const onClick = useCallback(() => {
    if (disabled) return;
    voice.toggle();
  }, [disabled, voice]);

  const statusText = voice.listening
    ? t("ui.voice.listening")
    : voice.message === "unsupported"
      ? t("ui.voice.unsupported")
      : voice.message === "denied"
        ? t("ui.voice.denied")
        : voice.message === "error"
          ? t("ui.voice.error")
          : "";

  return (
    <span className="agx-voice">
      <button
        type="button"
        className={`agx-voice__btn${voice.listening ? " agx-voice__btn--live" : ""}`}
        aria-label={label}
        aria-pressed={voice.listening}
        title={label}
        disabled={disabled || voice.status === "unsupported"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      >
        <MicIcon listening={voice.listening} />
      </button>
      <span className="sr-only" aria-live="polite">
        {statusText}
      </span>
      {voice.message && !voice.listening ? (
        <span className="agx-voice__hint" role="status">
          {statusText}
        </span>
      ) : null}
    </span>
  );
}

function readSelection(
  inputRef: RefObject<TextControl | null> | undefined,
  value: string,
): { start: number; end: number } {
  const el = inputRef?.current;
  if (!el || typeof el.selectionStart !== "number") {
    return { start: value.length, end: value.length };
  }
  return {
    start: el.selectionStart ?? value.length,
    end: el.selectionEnd ?? el.selectionStart ?? value.length,
  };
}

function MicIcon({ listening }: { readonly listening: boolean }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v4" />
      <path d="M8 23h8" />
      {listening ? <circle cx="12" cy="12" r="11" opacity="0.35" /> : null}
    </svg>
  );
}
