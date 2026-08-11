/**
 * Message catalog loader — static imports keep P0/P1/P2 simple and SSR-safe.
 * Future locales can switch to dynamic import() without changing the t() API.
 */

import type { AppLocale } from "./locale";
import { DEFAULT_LOCALE } from "./locale";

import enCommon from "./messages/en/common.json";
import enNavigation from "./messages/en/navigation.json";
import enPricing from "./messages/en/pricing.json";
import enBilling from "./messages/en/billing.json";
import enSettings from "./messages/en/settings.json";
import enErrors from "./messages/en/errors.json";
import enDashboard from "./messages/en/dashboard.json";
import enAuth from "./messages/en/auth.json";
import enCrm from "./messages/en/crm.json";
import enFinance from "./messages/en/finance.json";

import deCommon from "./messages/de/common.json";
import deNavigation from "./messages/de/navigation.json";
import dePricing from "./messages/de/pricing.json";
import deBilling from "./messages/de/billing.json";
import deSettings from "./messages/de/settings.json";
import deErrors from "./messages/de/errors.json";
import deDashboard from "./messages/de/dashboard.json";
import deAuth from "./messages/de/auth.json";
import deCrm from "./messages/de/crm.json";
import deFinance from "./messages/de/finance.json";

import faCommon from "./messages/fa/common.json";
import faNavigation from "./messages/fa/navigation.json";
import faPricing from "./messages/fa/pricing.json";
import faBilling from "./messages/fa/billing.json";
import faSettings from "./messages/fa/settings.json";
import faErrors from "./messages/fa/errors.json";
import faDashboard from "./messages/fa/dashboard.json";
import faAuth from "./messages/fa/auth.json";
import faCrm from "./messages/fa/crm.json";
import faFinance from "./messages/fa/finance.json";

export type MessageTree = {
  readonly common: Record<string, unknown>;
  readonly navigation: Record<string, unknown>;
  readonly pricing: Record<string, unknown>;
  readonly billing: Record<string, unknown>;
  readonly settings: Record<string, unknown>;
  readonly errors: Record<string, unknown>;
  readonly dashboard: Record<string, unknown>;
  readonly auth: Record<string, unknown>;
  readonly crm: Record<string, unknown>;
  readonly finance: Record<string, unknown>;
};

const CATALOGS: Readonly<Record<AppLocale, MessageTree>> = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    pricing: enPricing,
    billing: enBilling,
    settings: enSettings,
    errors: enErrors,
    dashboard: enDashboard,
    auth: enAuth,
    crm: enCrm,
    finance: enFinance,
  },
  de: {
    common: deCommon,
    navigation: deNavigation,
    pricing: dePricing,
    billing: deBilling,
    settings: deSettings,
    errors: deErrors,
    dashboard: deDashboard,
    auth: deAuth,
    crm: deCrm,
    finance: deFinance,
  },
  fa: {
    common: faCommon,
    navigation: faNavigation,
    pricing: faPricing,
    billing: faBilling,
    settings: faSettings,
    errors: faErrors,
    dashboard: faDashboard,
    auth: faAuth,
    crm: faCrm,
    finance: faFinance,
  },
};

export function getCatalog(locale: AppLocale): MessageTree {
  return CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
}

export function getFallbackCatalog(): MessageTree {
  return CATALOGS[DEFAULT_LOCALE];
}
