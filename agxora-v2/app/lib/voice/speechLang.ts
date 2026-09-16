import type { AppLocale } from "@/app/lib/i18n/locale";

/**
 * Map AGXORA locales to SpeechRecognition `lang` tags.
 * Short catalog tags (de, fa) expand to regional tags recognizers expect.
 */
export const SPEECH_LANG_BY_LOCALE: Readonly<Record<AppLocale, string>> = {
  en: "en-US",
  de: "de-DE",
  fa: "fa-IR",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ja: "ja-JP",
  nl: "nl-NL",
  "nl-BE": "nl-BE",
  fr: "fr-FR",
  "fr-BE": "fr-BE",
  "de-BE": "de-DE",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  "pt-BR": "pt-BR",
  ru: "ru-RU",
  tr: "tr-TR",
  ar: "ar-SA",
  ko: "ko-KR",
  pl: "pl-PL",
  uk: "uk-UA",
  hi: "hi-IN",
  id: "id-ID",
  vi: "vi-VN",
};

export function speechLangFromLocale(locale: AppLocale): string {
  return SPEECH_LANG_BY_LOCALE[locale] ?? "en-US";
}

export function composeVoiceValue(params: {
  readonly original: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly spoken: string;
}): string {
  const spoken = params.spoken.trim();
  if (!spoken) return params.original;
  const len = params.original.length;
  const start = Math.max(0, Math.min(params.selectionStart, len));
  const end = Math.max(start, Math.min(params.selectionEnd, len));
  const prefix = params.original.slice(0, start);
  const suffix = params.original.slice(end);
  const spaceBefore =
    prefix.length > 0 && !/\s$/.test(prefix) && !spoken.startsWith(" ");
  const spaceAfter =
    suffix.length > 0 && !/^\s/.test(suffix) && !spoken.endsWith(" ");
  return `${prefix}${spaceBefore ? " " : ""}${spoken}${spaceAfter ? " " : ""}${suffix}`;
}
