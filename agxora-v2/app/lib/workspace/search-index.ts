import { DEFAULT_WORKFLOW, WORKFLOW_RUNS, WORKFLOW_TEMPLATES } from "../automation";
import { CUSTOMER_360, PIPELINE_DEALS } from "../crm";
import { MEDIA_ASSETS } from "../creator-studio";
import { DOCUMENT_ACTIVITY, KNOWLEDGE_ARTICLES, KNOWLEDGE_DOCUMENTS } from "../documents";
import { FINANCE_INVOICES } from "../finance";
import { SAAS_MODULES } from "../saas/modules";
import { TEAM_MEMBERS } from "../settings";
import type { QuickAction, RecentActivityItem, SearchResult } from "./types";

/** Synthetic projects — Projects module is still a stub; OS layer owns this index. */
const WORKSPACE_PROJECTS: readonly {
  readonly id: string;
  readonly name: string;
  readonly customer: string;
  readonly status: string;
}[] = [
  {
    id: "proj-nordlicht-onboarding",
    name: "Nordlicht Onboarding",
    customer: "Nordlicht GmbH",
    status: "active",
  },
  {
    id: "proj-helios-pos",
    name: "Helios POS Rollout",
    customer: "Helios Markets",
    status: "active",
  },
  {
    id: "proj-brand-refresh",
    name: "Brand Refresh Q3",
    customer: "Internal",
    status: "planning",
  },
];

export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    id: "action-create-customer",
    title: "Create Customer",
    subtitle: "Open CRM to add a customer",
    href: "/dashboard/crm",
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
    id: "action-open-ai",
    title: "Open AI Workspace",
    subtitle: "AGXORA AI Platform",
    href: "/dashboard/ai",
    keywords: ["ai", "chat", "assistant", "prompts", "commands"],
  },
  {
    id: "action-open-identity",
    title: "Open Identity Settings",
    subtitle: "Organizations, workspaces, RBAC",
    href: "/dashboard/identity",
    keywords: ["identity", "iam", "rbac", "organization", "workspace", "security"],
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
    subtitle: "Control Center",
    href: "/dashboard/settings",
    keywords: ["open", "settings", "control"],
  },
  {
    id: "cmd-open-ai-platform",
    kind: "module",
    group: "commands",
    title: "Open AI Platform",
    subtitle: "Enterprise AI workspace",
    href: "/dashboard/ai",
    keywords: ["open", "ai", "chat", "assistant", "platform", "prompts"],
  },
  {
    id: "cmd-open-profile",
    kind: "module",
    group: "commands",
    title: "Open Profile",
    subtitle: "User identity preferences",
    href: "/dashboard/profile",
    keywords: ["open", "profile", "account", "user", "identity"],
  },
  {
    id: "cmd-open-identity",
    kind: "module",
    group: "commands",
    title: "Open Identity & Access",
    subtitle: "IAM settings, RBAC, audit",
    href: "/dashboard/identity",
    keywords: ["open", "identity", "iam", "rbac", "security", "audit", "workspace"],
  },
  {
    id: "cmd-create-customer",
    kind: "action",
    group: "commands",
    title: "Create Customer",
    subtitle: "Quick command → CRM",
    href: "/dashboard/crm",
    keywords: ["create", "customer"],
  },
  {
    id: "cmd-create-workflow",
    kind: "action",
    group: "commands",
    title: "Create Workflow",
    subtitle: "Quick command → Automation",
    href: "/dashboard/automation",
    keywords: ["create", "workflow"],
  },
  {
    id: "cmd-upload-document",
    kind: "action",
    group: "commands",
    title: "Upload Document",
    subtitle: "Quick command → Documents",
    href: "/dashboard/documents",
    keywords: ["upload", "document"],
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

  const invoiceIdByNumber = new Map(
    FINANCE_INVOICES.map((inv) => [inv.number, inv.id] as const),
  );

  results.push({
    id: CUSTOMER_360.id,
    kind: "customer",
    group: "crm",
    title: CUSTOMER_360.name,
    subtitle: `${CUSTOMER_360.company.name} · ${CUSTOMER_360.email}`,
    href: "/dashboard/crm#customer-360",
    keywords: [
      CUSTOMER_360.name,
      CUSTOMER_360.email,
      CUSTOMER_360.company.name,
      "customer",
      "crm",
      ...CUSTOMER_360.contacts.map((c) => c.name),
    ],
    preview: CUSTOMER_360.aiSummary,
    meta: {
      Company: CUSTOMER_360.company.name,
      Status: CUSTOMER_360.status,
      Health: String(CUSTOMER_360.healthScore),
    },
    relatedIds: [
      ...CUSTOMER_360.invoices
        .map((n) => invoiceIdByNumber.get(n))
        .filter((id): id is string => Boolean(id)),
      "doc-contract-acme",
      "doc-invoice-pack",
      DEFAULT_WORKFLOW.id,
      "proj-nordlicht-onboarding",
    ],
    pinnable: true,
  });

  for (const contact of CUSTOMER_360.contacts) {
    results.push({
      id: contact.id,
      kind: "customer",
      group: "crm",
      title: contact.name,
      subtitle: `${contact.role} · ${CUSTOMER_360.company.name}`,
      href: "/dashboard/crm#customer-360",
      keywords: [contact.name, contact.email, contact.role, "contact", "crm"],
      preview: `Contact at ${CUSTOMER_360.company.name}`,
      meta: { Role: contact.role, Email: contact.email },
      relatedIds: [CUSTOMER_360.id],
      pinnable: true,
    });
  }

  for (const deal of PIPELINE_DEALS) {
    results.push({
      id: deal.id,
      kind: "customer",
      group: "crm",
      title: deal.title,
      subtitle: `${deal.company} · ${deal.stage} · ${deal.owner}`,
      href: "/dashboard/crm#sales-pipeline",
      keywords: [deal.title, deal.company, deal.owner, deal.stage, "deal", "pipeline", "crm"],
      preview: `Pipeline deal worth ${deal.value} ${deal.currency}`,
      meta: {
        Company: deal.company,
        Stage: deal.stage,
        Owner: deal.owner,
      },
      relatedIds:
        deal.company === "Nordlicht GmbH"
          ? [CUSTOMER_360.id, "proj-nordlicht-onboarding"]
          : ["proj-helios-pos"],
      pinnable: true,
    });
  }

  for (const inv of FINANCE_INVOICES) {
    results.push({
      id: inv.id,
      kind: "invoice",
      group: "finance",
      title: inv.number,
      subtitle: `${inv.company} · ${inv.status} · ${inv.currency} ${inv.amount}`,
      href: "/dashboard/finance",
      keywords: [inv.number, inv.company, inv.status, inv.category, "invoice", "finance"],
      preview: `Invoice ${inv.number} for ${inv.company} (${inv.paymentStatus}).`,
      meta: {
        Company: inv.company,
        Status: inv.status,
        Category: inv.category,
      },
      relatedIds:
        inv.company.toLowerCase().includes("nordlicht")
          ? [CUSTOMER_360.id, "doc-invoice-pack", "proj-nordlicht-onboarding"]
          : undefined,
      pinnable: true,
    });
  }

  for (const doc of KNOWLEDGE_DOCUMENTS) {
    if (doc.trashed) continue;
    results.push({
      id: doc.id,
      kind: "document",
      group: "documents",
      title: doc.name,
      subtitle: `${doc.department} · ${doc.category} · ${doc.owner}`,
      href: "/dashboard/documents#documents-library",
      keywords: [doc.name, doc.owner, doc.category, doc.department, ...doc.tags, "document"],
      preview: doc.ai.summary,
      meta: {
        Type: doc.fileType,
        Status: doc.status,
        Owner: doc.owner,
      },
      relatedIds: doc.ai.relatedDocumentIds,
      pinnable: true,
    });
  }

  for (const article of KNOWLEDGE_ARTICLES) {
    results.push({
      id: article.id,
      kind: "knowledge_article",
      group: "documents",
      title: article.title,
      subtitle: `${article.kind} · ${article.owner}`,
      href: "/dashboard/documents#documents-knowledge",
      keywords: [article.title, article.kind, ...article.tags, "knowledge", "article"],
      preview: article.summary,
      meta: { Kind: article.kind, Status: article.status },
      pinnable: true,
    });
  }

  results.push({
    id: DEFAULT_WORKFLOW.id,
    kind: "workflow",
    group: "automation",
    title: DEFAULT_WORKFLOW.name,
    subtitle: DEFAULT_WORKFLOW.description,
    href: "/dashboard/automation#workflow-builder",
    keywords: [DEFAULT_WORKFLOW.name, "workflow", "automation", "onboarding"],
    preview: DEFAULT_WORKFLOW.description,
    meta: { Active: DEFAULT_WORKFLOW.active ? "Yes" : "No" },
    relatedIds: ["doc-process-onboarding", CUSTOMER_360.id],
    pinnable: true,
  });

  for (const tpl of WORKFLOW_TEMPLATES) {
    results.push({
      id: tpl.id,
      kind: "template",
      group: "automation",
      title: tpl.name,
      subtitle: `${tpl.category} · ${tpl.nodeCount} nodes · ${tpl.estimatedRuntime}`,
      href: "/dashboard/automation#workflow-templates",
      keywords: [tpl.name, tpl.category, tpl.description, "template", "workflow"],
      preview: tpl.description,
      meta: {
        Category: tpl.category,
        Difficulty: tpl.difficulty,
        Nodes: String(tpl.nodeCount),
      },
      pinnable: true,
    });
  }

  for (const run of WORKFLOW_RUNS) {
    results.push({
      id: run.id,
      kind: "automation_run",
      group: "automation",
      title: run.workflowName,
      subtitle: `${run.status} · ${run.trigger} · ${run.executedBy}`,
      href: "/dashboard/automation#workflow-history",
      keywords: [run.workflowName, run.status, run.trigger, "run", "automation"],
      preview: run.aiSummary,
      meta: { Status: run.status, Trigger: run.trigger },
      relatedIds: [run.workflowId],
    });
  }

  for (const project of WORKSPACE_PROJECTS) {
    results.push({
      id: project.id,
      kind: "project",
      group: "projects",
      title: project.name,
      subtitle: `${project.customer} · ${project.status}`,
      href: "/dashboard/projects",
      keywords: [project.name, project.customer, project.status, "project"],
      preview: `Project for ${project.customer}`,
      meta: { Customer: project.customer, Status: project.status },
      relatedIds:
        project.customer === "Nordlicht GmbH"
          ? [CUSTOMER_360.id, DEFAULT_WORKFLOW.id]
          : undefined,
      pinnable: true,
    });
  }

  for (const asset of MEDIA_ASSETS) {
    results.push({
      id: asset.id,
      kind: "creator_asset",
      group: "creator",
      title: asset.name,
      subtitle: `${asset.kind} · ${asset.folder}`,
      href: "/dashboard/creator",
      keywords: [asset.name, asset.kind, asset.folder, ...asset.tags, "creator", "asset"],
      preview: `Creator asset in ${asset.folder}`,
      meta: { Kind: asset.kind, Folder: asset.folder },
      pinnable: true,
    });
  }

  for (const member of TEAM_MEMBERS) {
    results.push({
      id: member.id,
      kind: "team_member",
      group: "settings",
      title: member.name,
      subtitle: `${member.role} · ${member.email}`,
      href: "/dashboard/settings#team",
      keywords: [member.name, member.email, member.role, "team", "member"],
      preview: `${member.name} — ${member.role} (${member.status})`,
      meta: { Role: member.role, Status: member.status },
      pinnable: true,
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
  const docs = DOCUMENT_ACTIVITY.slice(0, 3).map((a) => ({
    id: `act-doc-${a.id}`,
    title: a.title,
    detail: a.detail,
    href: "/dashboard/documents",
    kind: "document" as const,
    at: a.at,
  }));

  const invoices = FINANCE_INVOICES.slice(0, 2).map((inv) => ({
    id: `act-inv-${inv.id}`,
    title: inv.number,
    detail: `${inv.company} · ${inv.status}`,
    href: "/dashboard/finance",
    kind: "invoice" as const,
    at: inv.dueDate,
  }));

  const runs = WORKFLOW_RUNS.slice(0, 2).map((run) => ({
    id: `act-run-${run.id}`,
    title: run.workflowName,
    detail: `${run.status} · ${run.detail}`,
    href: "/dashboard/automation#workflow-history",
    kind: "automation_run" as const,
    at: run.startedAt,
  }));

  return [
    {
      id: "act-cust-1",
      title: CUSTOMER_360.name,
      detail: `${CUSTOMER_360.company.name} · Customer 360 viewed`,
      href: "/dashboard/crm#customer-360",
      kind: "customer",
      at: "2026-07-30T16:00:00Z",
    },
    {
      id: "act-proj-1",
      title: WORKSPACE_PROJECTS[0].name,
      detail: "Project milestone updated",
      href: "/dashboard/projects",
      kind: "project",
      at: "2026-07-30T12:00:00Z",
    },
    ...docs,
    ...invoices,
    ...runs,
  ];
}
