import type { SearchGroup, SearchResult } from "./types";

type LabelKeys = {
  readonly titleKey: string;
  readonly subtitleKey: string;
};

const ACTION_KEYS: Record<string, LabelKeys> = {
  "action-create-customer": {
    titleKey: "dashboard.search.actions.createCustomer.title",
    subtitleKey: "dashboard.search.actions.createCustomer.subtitle",
  },
  "action-create-invoice": {
    titleKey: "dashboard.search.actions.createInvoice.title",
    subtitleKey: "dashboard.search.actions.createInvoice.subtitle",
  },
  "action-upload-document": {
    titleKey: "dashboard.search.actions.uploadDocument.title",
    subtitleKey: "dashboard.search.actions.uploadDocument.subtitle",
  },
  "action-new-workflow": {
    titleKey: "dashboard.search.actions.newWorkflow.title",
    subtitleKey: "dashboard.search.actions.newWorkflow.subtitle",
  },
  "action-new-project": {
    titleKey: "dashboard.search.actions.newProject.title",
    subtitleKey: "dashboard.search.actions.newProject.subtitle",
  },
  "action-invite-member": {
    titleKey: "dashboard.search.actions.inviteMember.title",
    subtitleKey: "dashboard.search.actions.inviteMember.subtitle",
  },
  "action-open-billing": {
    titleKey: "dashboard.search.actions.openBilling.title",
    subtitleKey: "dashboard.search.actions.openBilling.subtitle",
  },
  "action-open-settings": {
    titleKey: "dashboard.search.actions.openSettings.title",
    subtitleKey: "dashboard.search.actions.openSettings.subtitle",
  },
};

const COMMAND_KEYS: Record<string, LabelKeys> = {
  "cmd-open-crm": {
    titleKey: "dashboard.search.commands.openCrm.title",
    subtitleKey: "dashboard.search.commands.openCrm.subtitle",
  },
  "cmd-open-customers": {
    titleKey: "dashboard.search.commands.openCustomers.title",
    subtitleKey: "dashboard.search.commands.openCustomers.subtitle",
  },
  "cmd-open-finance": {
    titleKey: "dashboard.search.commands.openFinance.title",
    subtitleKey: "dashboard.search.commands.openFinance.subtitle",
  },
  "cmd-open-documents": {
    titleKey: "dashboard.search.commands.openDocuments.title",
    subtitleKey: "dashboard.search.commands.openDocuments.subtitle",
  },
  "cmd-open-automation": {
    titleKey: "dashboard.search.commands.openAutomation.title",
    subtitleKey: "dashboard.search.commands.openAutomation.subtitle",
  },
  "cmd-open-settings": {
    titleKey: "dashboard.search.commands.openSettings.title",
    subtitleKey: "dashboard.search.commands.openSettings.subtitle",
  },
  "cmd-open-projects": {
    titleKey: "dashboard.search.commands.openProjects.title",
    subtitleKey: "dashboard.search.commands.openProjects.subtitle",
  },
  "cmd-open-ai": {
    titleKey: "dashboard.search.commands.openAi.title",
    subtitleKey: "dashboard.search.commands.openAi.subtitle",
  },
  "cmd-open-analytics": {
    titleKey: "dashboard.search.commands.openAnalytics.title",
    subtitleKey: "dashboard.search.commands.openAnalytics.subtitle",
  },
  "cmd-open-identity": {
    titleKey: "dashboard.search.commands.openIdentity.title",
    subtitleKey: "dashboard.search.commands.openIdentity.subtitle",
  },
  "cmd-open-billing": {
    titleKey: "dashboard.search.commands.openBilling.title",
    subtitleKey: "dashboard.search.commands.openBilling.subtitle",
  },
  "cmd-open-integrations": {
    titleKey: "dashboard.search.commands.openIntegrations.title",
    subtitleKey: "dashboard.search.commands.openIntegrations.subtitle",
  },
};

const MODULE_KEYS: Record<string, LabelKeys> = {
  dashboard: {
    titleKey: "navigation.dashboard",
    subtitleKey: "dashboard.search.modules.dashboard.subtitle",
  },
  customers: {
    titleKey: "navigation.customers",
    subtitleKey: "dashboard.search.modules.customers.subtitle",
  },
  projects: {
    titleKey: "navigation.projects",
    subtitleKey: "dashboard.search.modules.projects.subtitle",
  },
  invoices: {
    titleKey: "dashboard.search.modules.invoices.title",
    subtitleKey: "dashboard.search.modules.invoices.subtitle",
  },
  finance: {
    titleKey: "navigation.financeTax",
    subtitleKey: "dashboard.search.modules.finance.subtitle",
  },
  crm: {
    titleKey: "navigation.aiCrm",
    subtitleKey: "dashboard.search.modules.crm.subtitle",
  },
  creator: {
    titleKey: "navigation.aiCreatorStudio",
    subtitleKey: "dashboard.search.modules.creator.subtitle",
  },
  documents: {
    titleKey: "navigation.documents",
    subtitleKey: "dashboard.search.modules.documents.subtitle",
  },
  ai: {
    titleKey: "dashboard.search.modules.ai.title",
    subtitleKey: "dashboard.search.modules.ai.subtitle",
  },
  analytics: {
    titleKey: "navigation.analytics",
    subtitleKey: "dashboard.search.modules.analytics.subtitle",
  },
  automation: {
    titleKey: "navigation.automation",
    subtitleKey: "dashboard.search.modules.automation.subtitle",
  },
  memory: {
    titleKey: "dashboard.search.modules.memory.title",
    subtitleKey: "dashboard.search.modules.memory.subtitle",
  },
  team: {
    titleKey: "navigation.team",
    subtitleKey: "dashboard.search.modules.team.subtitle",
  },
  settings: {
    titleKey: "navigation.settings",
    subtitleKey: "dashboard.search.modules.settings.subtitle",
  },
};

function resolveKeys(item: SearchResult): LabelKeys | null {
  if (ACTION_KEYS[item.id]) return ACTION_KEYS[item.id];
  if (COMMAND_KEYS[item.id]) return COMMAND_KEYS[item.id];
  if (item.id.startsWith("module-")) {
    const moduleKey = item.id.slice("module-".length);
    return MODULE_KEYS[moduleKey] ?? null;
  }
  return null;
}

export function localizeSearchResult(
  item: SearchResult,
  t: (key: string) => string,
): SearchResult {
  const keys = resolveKeys(item);
  if (!keys) return item;

  const title = t(keys.titleKey);
  const subtitle = t(keys.subtitleKey);
  const meta = item.meta
    ? Object.fromEntries(
        Object.entries(item.meta).map(([key, value]) => {
          if (key === "Type") {
            return [t("dashboard.search.meta.type"), t(value === "Module" ? "dashboard.search.meta.module" : "dashboard.search.meta.quickAction")];
          }
          return [key, value];
        }),
      )
    : undefined;

  return {
    ...item,
    title,
    subtitle,
    preview: item.preview ? subtitle : undefined,
    meta,
  };
}

export function localizeSearchResults(
  items: readonly SearchResult[],
  t: (key: string) => string,
): readonly SearchResult[] {
  return items.map((item) => localizeSearchResult(item, t));
}

export function searchGroupLabel(
  group: SearchGroup,
  t: (key: string) => string,
): string {
  return t(`dashboard.search.groups.${group}`);
}
