/**
 * Browser SpeechRecognition helpers — no audio capture, no upload, no logging.
 */

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechRecognitionResultEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<{
    readonly isFinal: boolean;
    readonly 0?: { readonly transcript?: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function collectTranscript(
  event: SpeechRecognitionResultEventLike,
): { readonly finalText: string; readonly interimText: string } {
  let finalText = "";
  let interimText = "";
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    const piece = result?.[0]?.transcript ?? "";
    if (!piece) continue;
    if (result.isFinal) finalText += piece;
    else interimText += piece;
  }
  return { finalText, interimText };
}
