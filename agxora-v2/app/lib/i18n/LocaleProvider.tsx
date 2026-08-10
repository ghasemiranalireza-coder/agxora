"use client";

/**
 * LocaleProvider — first-class UI locale for AGXORA (Phase 41 P0).
 *
 * SSR: seed from `initialLocale` (validated cookie via root layout, else en).
 * Client hydrate: same seed → no mismatch; then soft-resolve storage/browser.
 *
 * Resolution (client, after mount):
 * 1. Explicit user preference (setter / profile)
 * 2. Cookie / local preference
 * 3. Workspace language (optional)
 * 4. Browser language (soft first visit)
 * 5. DEFAULT_LOCALE
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import {
  resolveClientLocale,
  writeLocaleCookie,
  writeLocaleStorage,
} from "./cookie";
import {
  DEFAULT_LOCALE,
  localeDirection,
  normalizeToAppLocale,
  toBcp47,
  type AppLocale,
} from "./locale";
import {
  resolveMessage,
  resolveMessageList,
  type TranslateValues,
} from "./translate";
import { setActiveFormatLocale } from "./format";

export type TranslateFn = (key: string, values?: TranslateValues) => string;

interface LocaleContextValue {
  readonly locale: AppLocale;
  readonly dir: "ltr" | "rtl";
  readonly bcp47: string;
  readonly hydrated: boolean;
  readonly setLocale: (locale: AppLocale) => void;
  readonly t: TranslateFn;
  readonly tList: (key: string) => string[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  workspaceLanguage,
  userLanguage,
}: {
  readonly children: ReactNode;
  /** Server-validated locale from cookie (or DEFAULT_LOCALE). Must match SSR html. */
  readonly initialLocale?: AppLocale;
  readonly workspaceLanguage?: string | null;
  readonly userLanguage?: string | null;
}): JSX.Element {
  const seed = normalizeToAppLocale(initialLocale) ?? DEFAULT_LOCALE;
  const [locale, setLocaleState] = useState<AppLocale>(seed);
  const [hydrated, setHydrated] = useState(false);
  /** Prevents first-visit hydrate from clobbering an explicit user choice. */
  const explicitChoiceRef = useRef(false);

  // Keep module formatters aligned with the rendered locale (SSR + client).
  setActiveFormatLocale(locale);

  useEffect(() => {
    // Soft client resolution after hydration (storage / browser when cookie absent).
    const id = window.setTimeout(() => {
      if (explicitChoiceRef.current) {
        setHydrated(true);
        return;
      }
      const resolved = resolveClientLocale({
        userPreference: userLanguage,
        workspaceLanguage,
      });
      setActiveFormatLocale(resolved);
      setLocaleState(resolved);
      writeLocaleCookie(resolved);
      writeLocaleStorage(resolved);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [userLanguage, workspaceLanguage]);

  const setLocale = useCallback((next: AppLocale) => {
    explicitChoiceRef.current = true;
    setActiveFormatLocale(next);
    setLocaleState(next);
    writeLocaleCookie(next);
    writeLocaleStorage(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, values) => resolveMessage(locale, key, values),
    [locale],
  );

  const tList = useCallback(
    (key: string) => resolveMessageList(locale, key),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDirection(locale),
      bcp47: toBcp47(locale),
      hydrated,
      setLocale,
      t,
      tList,
    }),
    [locale, hydrated, setLocale, t, tList],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useT(): TranslateFn {
  return useLocale().t;
}

/** Safe optional hook for non-provider trees (should not be needed in app). */
export function useOptionalLocale(): LocaleContextValue | null {
  return useContext(LocaleContext);
}

export function applyLocalePreference(raw: string): AppLocale | null {
  return normalizeToAppLocale(raw);
}
