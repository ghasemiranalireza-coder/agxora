/**
 * Translation resolve — namespace.key paths with safe fallbacks.
 */

import { getCatalog, getFallbackCatalog, type MessageTree } from "./catalog";
import type { AppLocale } from "./locale";

export type TranslateValues = Readonly<Record<string, string | number>>;

function warnMissing(locale: AppLocale, key: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[i18n] Missing key "${key}" for locale "${locale}"`);
  }
}

function readPath(tree: MessageTree, key: string): unknown {
  const [ns, ...rest] = key.split(".");
  if (!ns || rest.length === 0) return undefined;
  const root = tree[ns as keyof MessageTree];
  if (!root || typeof root !== "object") return undefined;
  let cursor: unknown = root;
  for (const part of rest) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function interpolate(template: string, values?: TranslateValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values[name];
    return value === undefined || value === null ? `{${name}}` : String(value);
  });
}

export function resolveMessage(
  locale: AppLocale,
  key: string,
  values?: TranslateValues,
): string {
  const primary = readPath(getCatalog(locale), key);
  if (typeof primary === "string") {
    return interpolate(primary, values);
  }

  const fallback = readPath(getFallbackCatalog(), key);
  if (typeof fallback === "string") {
    if (locale !== "en") warnMissing(locale, key);
    return interpolate(fallback, values);
  }

  warnMissing(locale, key);
  return key;
}

export function resolveMessageList(locale: AppLocale, key: string): string[] {
  const primary = readPath(getCatalog(locale), key);
  if (Array.isArray(primary) && primary.every((item) => typeof item === "string")) {
    return primary as string[];
  }
  const fallback = readPath(getFallbackCatalog(), key);
  if (Array.isArray(fallback) && fallback.every((item) => typeof item === "string")) {
    if (locale !== "en") warnMissing(locale, key);
    return fallback as string[];
  }
  warnMissing(locale, key);
  return [];
}
