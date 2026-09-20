/**
 * Universal search index — navigation commands and quick actions only.
 * Live CRM / finance / documents entities are indexed by their own modules.
 * Seeded demo entities are intentionally excluded from production search.
 */

import { SAAS_MODULES } from "../saas/modules";
import {
  FIRST_CUSTOMER_AGENTS_HREF,
  FIRST_CUSTOMER_CUSTOMER_HREF,
  FIRST_CUSTOMER_FINANCE_HREF,
  FIRST_CUSTOMER_SEARCH_MODULE_KEYS,
  FIRST_CUSTOMER_SETTINGS_HREF,
  isFirstCustomerSearchHrefAllowed,
} from "./firstCustomerSurface";
import type { QuickAction, RecentActivityItem, SearchResult } from "./types";

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "action-create-customer",
    title: "Create Customer",
    subtitle: "Open CRM to add a real customer record",
    href: FIRST_CUSTOMER_CUSTOMER_HREF,
    keywords: ["create", "customer", "crm", "new"],
  },
  {
    id: "action-create-invoice",
    title: "Create Invoice",
    subtitle: "Open Finance invoice workspace",
    href: "/dashboard/finance/delivery-notes",
    keywords: ["create", "invoice", "finance", "billing"],
  },
  {
    id: "action-open-settings",
    title: "Open Settings",
    subtitle: "Workspace preferences",
    href: FIRST_CUSTOMER_SETTINGS_HREF,
    keywords: ["settings", "preferences"],
  },
];

export const COMMAND_ENTRIES: readonly SearchResult[] = [
  {
    id: "cmd-open-crm",
    kind: "module",
    group: "commands",
    title: "Open CRM",
    subtitle: "AI CRM module",
    href: FIRST_CUSTOMER_CUSTOMER_HREF,
    keywords: ["open", "crm", "customers"],
  },
  {
    id: "cmd-open-customers",
    kind: "module",
    group: "commands",
    title: "Open CRM",
    subtitle: "Real customer records in CRM",
    href: FIRST_CUSTOMER_CUSTOMER_HREF,
    keywords: ["open", "customers", "accounts", "crm"],
  },
  {
    id: "cmd-open-finance",
    kind: "module",
    group: "commands",
    title: "Open Finance",
    subtitle: "Finance & Tax module",
    href: FIRST_CUSTOMER_FINANCE_HREF,
    keywords: ["open", "finance", "tax"],
  },
  {
    id: "cmd-open-settings",
    kind: "module",
    group: "commands",
    title: "Open Settings",
    subtitle: "Workspace settings",
    href: FIRST_CUSTOMER_SETTINGS_HREF,
    keywords: ["open", "settings"],
  },
  {
    id: "cmd-open-agents",
    kind: "module",
    group: "commands",
    title: "Open Agents",
    subtitle: "Agent operating system",
    href: FIRST_CUSTOMER_AGENTS_HREF,
    keywords: ["open", "agents", "ai", "operations"],
  },
];

let cachedIndex: readonly SearchResult[] | null = null;

export function buildSearchIndex(): readonly SearchResult[] {
  if (cachedIndex) return cachedIndex;

  const allowedModules = new Set<string>(FIRST_CUSTOMER_SEARCH_MODULE_KEYS);
  const results: SearchResult[] = [];

  for (const mod of SAAS_MODULES) {
    if (!allowedModules.has(mod.key)) continue;
    if (!isFirstCustomerSearchHrefAllowed(mod.href)) continue;
    results.push({
      id: `module-${mod.key}`,
      kind: "module",
      group: mod.key === "settings" || mod.key === "team" ? "settings" : "commands",
      title: mod.label,
      subtitle: mod.description,
      href: mod.href,
      keywords: [mod.key, mod.label, mod.description, "module", "open"],
      preview: mod.description,
      meta: { Type: "Module" },
    });
  }

  for (const action of QUICK_ACTIONS) {
    if (!isFirstCustomerSearchHrefAllowed(action.href)) continue;
    results.push({
      id: action.id,
      kind: "action",
      group: "actions",
      title: action.title,
      subtitle: action.subtitle,
      href: action.href,
      keywords: action.keywords,
      preview: action.subtitle,
      meta: { Type: "Quick Action" },
    });
  }

  for (const cmd of COMMAND_ENTRIES) {
    if (!isFirstCustomerSearchHrefAllowed(cmd.href)) continue;
    results.push(cmd);
  }

  cachedIndex = results;
  return cachedIndex;
}

export function buildRecentActivity(): readonly RecentActivityItem[] {
  return [];
}

/** Clear cached index (tests / hot reload). */
export function resetSearchIndexCache(): void {
  cachedIndex = null;
}
