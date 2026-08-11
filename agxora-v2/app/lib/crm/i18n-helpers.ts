import type { TranslateFn } from "../i18n";
import type { CrmActivityKind } from "../crm/directory/types";

/** Resolve validation/store messages that may be i18n keys or legacy English. */
export function translateCrmMessage(
  t: TranslateFn,
  message: string | undefined,
): string | undefined {
  if (!message) return message;
  return message.startsWith("crm.") ? t(message) : message;
}

/** Localize CRM profile activity titles by kind, with legacy title fallback. */
export function translateActivityTitle(
  t: TranslateFn,
  kind: CrmActivityKind,
  legacyTitle?: string,
): string {
  const key = `crm.profile.activity.kinds.${kind}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return translateCrmMessage(t, legacyTitle) ?? legacyTitle ?? kind;
}
