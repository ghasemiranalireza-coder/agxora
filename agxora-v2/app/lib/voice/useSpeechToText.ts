"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collectTranscript,
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  type SpeechRecognitionLike,
} from "./speechRecognition";
import { composeVoiceValue } from "./speechLang";

export type VoiceStatus =
  | "idle"
  | "listening"
  | "unsupported"
  | "denied"
  | "error";

export type VoiceSelection = {
  readonly start: number;
  readonly end: number;
};

/**
 * SSR and the first client render must share this value. Probing
 * `window` / SpeechRecognition here would disable the mic on the server
 * and enable it in the browser (hydration mismatch).
 */
export const INITIAL_VOICE_STATUS: VoiceStatus = "idle";

export function voiceStatusAfterMount(): VoiceStatus {
  return isSpeechRecognitionSupported() ? "idle" : "unsupported";
}

export function useSpeechToText(options: {
  readonly lang: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly getSelection?: () => VoiceSelection | null;
  readonly disabled?: boolean;
}): {
  readonly status: VoiceStatus;
  readonly supported: boolean;
  readonly listening: boolean;
  readonly message: VoiceStatus | null;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
  readonly dismissMessage: () => void;
} {
  const { lang, value, onChange, getSelection, disabled } = options;
  const [status, setStatus] = useState<VoiceStatus>(INITIAL_VOICE_STATUS);
  const [message, setMessage] = useState<VoiceStatus | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sessionRef = useRef<{
    original: string;
    start: number;
    end: number;
    committed: string;
  } | null>(null);
  const valueRef = useRef(value);
  const getSelectionRef = useRef(getSelection);
  const onChangeRef = useRef(onChange);
  const langRef = useRef(lang);

  useEffect(() => {
    valueRef.current = value;
    getSelectionRef.current = getSelection;
    onChangeRef.current = onChange;
    langRef.current = lang;
  }, [getSelection, lang, onChange, value]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const next = voiceStatusAfterMount();
      setStatus((current) => (current === "idle" ? next : current));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const stopEngine = useCallback((abort = false) => {
    const engine = recognitionRef.current;
    recognitionRef.current = null;
    if (abort) sessionRef.current = null;
    if (!engine) return;
    try {
      if (abort) engine.abort();
      else engine.stop();
    } catch {
      // already stopped
    }
  }, []);

  const start = useCallback(() => {
    if (disabled) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      setMessage("unsupported");
      return;
    }
    stopEngine(true);
    const current = valueRef.current;
    const caret = getSelectionRef.current?.() ?? null;
    sessionRef.current = {
      original: current,
      start: caret?.start ?? current.length,
      end: caret?.end ?? current.length,
      committed: "",
    };
    const engine = new Ctor();
    engine.lang = langRef.current;
    engine.interimResults = true;
    engine.continuous = true;
    engine.maxAlternatives = 1;
    engine.onresult = (event) => {
      const session = sessionRef.current;
      if (!session) return;
      const { finalText, interimText } = collectTranscript(event);
      if (finalText) {
        session.committed = `${session.committed}${finalText}`;
      }
      const spoken = `${session.committed}${interimText}`;
      onChangeRef.current(
        composeVoiceValue({
          original: session.original,
          selectionStart: session.start,
          selectionEnd: session.end,
          spoken,
        }),
      );
    };
    engine.onerror = (event) => {
      const code = event.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setStatus("denied");
        setMessage("denied");
      } else if (code === "no-speech" || code === "aborted") {
        setStatus("idle");
      } else {
        setStatus("error");
        setMessage("error");
      }
      stopEngine(true);
    };
    engine.onend = () => {
      recognitionRef.current = null;
      sessionRef.current = null;
      setStatus((currentStatus) =>
        currentStatus === "listening" ? "idle" : currentStatus,
      );
    };
    recognitionRef.current = engine;
    try {
      engine.start();
      setStatus("listening");
      setMessage(null);
    } catch {
      setStatus("error");
      setMessage("error");
      stopEngine(true);
    }
  }, [disabled, stopEngine]);

  const stop = useCallback(() => {
    stopEngine(false);
    setStatus((currentStatus) =>
      currentStatus === "listening" ? "idle" : currentStatus,
    );
  }, [stopEngine]);

  const toggle = useCallback(() => {
    if (status === "listening") stop();
    else start();
  }, [start, status, stop]);

  useEffect(() => () => stopEngine(true), [stopEngine]);

  return {
    status,
    supported: status !== "unsupported",
    listening: status === "listening",
    message,
    start,
    stop,
    toggle,
    dismissMessage: () => setMessage(null),
  };
}
