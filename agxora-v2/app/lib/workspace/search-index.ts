/**
 * Universal search index — navigation commands and quick actions only.
 * Live CRM / finance / documents entities are indexed by their own modules.
 * Seeded demo entities are intentionally excluded from production search.
 */

import { SAAS_MODULES } from "../saas/modules";
import type { QuickAction, RecentActivityItem, SearchResult } from "./types";

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "action-create-customer",
    title: "Create Customer",
    subtitle: "Open Customers to add a record",
    href: "/dashboard/customers",
    keywords: ["create", "customer", "crm", "new"],
  },
  {
    id: "action-create-invoice",
    title: "Create Invoice",
    subtitle: "Open Finance invoice workspace",
    href: "/dashboard/finance",
    keywords: ["create", "invoice", "finance", "billing"],
  },
  {
    id: "action-upload-document",
    title: "Upload Document",
    subtitle: "Open Documents Knowledge Hub",
    href: "/dashboard/documents",
    keywords: ["upload", "document", "file", "knowledge"],
  },
  {
    id: "action-new-workflow",
    title: "New Workflow",
    subtitle: "Open Automation Engine builder",
    href: "/dashboard/automation",
    keywords: ["workflow", "automation", "new"],
  },
  {
    id: "action-new-project",
    title: "New Project",
    subtitle: "Open Projects workspace",
    href: "/dashboard/projects",
    keywords: ["project", "new"],
  },
  {
    id: "action-invite-member",
    title: "Invite Team Member",
    subtitle: "Open Team invitations",
    href: "/dashboard/team",
    keywords: ["invite", "team", "member"],
  },
  {
    id: "action-open-billing",
    title: "Open Billing",
    subtitle: "Plans, invoices, and subscription",
    href: "/dashboard/billing",
    keywords: ["billing", "subscription", "plan"],
  },
  {
    id: "action-open-settings",
    title: "Open Settings",
    subtitle: "Workspace preferences",
    href: "/dashboard/settings",
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
    href: "/dashboard/crm",
    keywords: ["open", "crm", "customers"],
  },
  {
    id: "cmd-open-customers",
    kind: "module",
    group: "commands",
    title: "Open Customers",
    subtitle: "Customer management",
    href: "/dashboard/customers",
    keywords: ["open", "customers", "accounts"],
  },
  {
    id: "cmd-open-finance",
    kind: "module",
    group: "commands",
    title: "Open Finance",
    subtitle: "Finance & Tax module",
    href: "/dashboard/finance",
    keywords: ["open", "finance", "tax"],
  },
  {
    id: "cmd-open-documents",
    kind: "module",
    group: "commands",
    title: "Open Documents",
    subtitle: "Knowledge Hub",
    href: "/dashboard/documents",
    keywords: ["open", "documents", "knowledge"],
  },
  {
    id: "cmd-open-automation",
    kind: "module",
    group: "commands",
    title: "Open Automation",
    subtitle: "Workflow engine",
    href: "/dashboard/automation",
    keywords: ["open", "automation", "workflow"],
  },
  {
    id: "cmd-open-settings",
    kind: "module",
    group: "commands",
    title: "Open Settings",
    subtitle: "Workspace settings",
    href: "/dashboard/settings",
    keywords: ["open", "settings"],
  },
  {
    id: "cmd-open-projects",
    kind: "module",
    group: "commands",
    title: "Open Projects",
    subtitle: "Project portfolio",
    href: "/dashboard/projects",
    keywords: ["open", "projects"],
  },
  {
    id: "cmd-open-ai",
    kind: "module",
    group: "commands",
    title: "Open AI",
    subtitle: "AI platform workspace",
    href: "/dashboard/ai",
    keywords: ["open", "ai", "assistant"],
  },
  {
    id: "cmd-open-analytics",
    kind: "module",
    group: "commands",
    title: "Open Analytics",
    subtitle: "Intelligence center",
    href: "/dashboard/analytics",
    keywords: ["open", "analytics", "intelligence"],
  },
  {
    id: "cmd-open-identity",
    kind: "module",
    group: "commands",
    title: "Open Identity & Access",
    subtitle: "IAM settings, RBAC, audit",
    href: "/dashboard/identity",
    keywords: ["open", "identity", "iam", "rbac", "security", "audit"],
  },
  {
    id: "cmd-open-billing",
    kind: "module",
    group: "commands",
    title: "Open Billing",
    subtitle: "Subscription portal & plans",
    href: "/dashboard/billing",
    keywords: ["open", "billing", "subscription", "plans"],
  },
  {
    id: "cmd-open-integrations",
    kind: "module",
    group: "commands",
    title: "Open Integrations",
    subtitle: "Integration Center & API ecosystem",
    href: "/dashboard/integrations",
    keywords: ["open", "integrations", "connectors", "webhooks", "oauth", "api"],
  },
];

let cachedIndex: readonly SearchResult[] | null = null;

export function buildSearchIndex(): readonly SearchResult[] {
  if (cachedIndex) return cachedIndex;

  const results: SearchResult[] = [];

  for (const mod of SAAS_MODULES) {
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
