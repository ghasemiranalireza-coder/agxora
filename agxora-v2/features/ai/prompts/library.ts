/**
 * Prompt library — reusable templates by business category.
 */

import type { AiPromptCategory, AiPromptTemplate } from "../types";

export const AI_PROMPT_CATEGORIES: { id: AiPromptCategory; label: string }[] = [
  { id: "crm", label: "CRM" },
  { id: "projects", label: "Projects" },
  { id: "finance", label: "Finance" },
  { id: "marketing", label: "Marketing" },
  { id: "documents", label: "Documents" },
  { id: "automation", label: "Automation" },
  { id: "general", label: "General" },
];

export const AI_PROMPT_LIBRARY: AiPromptTemplate[] = [
  {
    id: "crm-summarize-customer",
    title: "Summarize customer",
    description: "Executive summary of a customer relationship",
    category: "crm",
    body: "Summarize this customer in 5 bullets: company profile, key contacts, pipeline status, risks, and next recommended action.\n\nCustomer:\n{{customer}}",
    tags: ["summary", "account"],
  },
  {
    id: "crm-follow-up-email",
    title: "Follow-up email",
    description: "Draft a professional CRM follow-up",
    category: "crm",
    body: "Draft a concise, professional follow-up email for this CRM interaction. Tone: clear and respectful. Include a clear CTA.\n\nContext:\n{{context}}",
    tags: ["email"],
  },
  {
    id: "projects-analyze",
    title: "Analyze project",
    description: "Health check for a project",
    category: "projects",
    body: "Analyze this project: status, blockers, schedule risk, and recommended actions for the next sprint.\n\nProject:\n{{project}}",
    tags: ["risk", "status"],
  },
  {
    id: "projects-task-list",
    title: "Create task list",
    description: "Break work into actionable tasks",
    category: "projects",
    body: "Create a prioritized task list with owners (roles), estimates, and dependencies for:\n\n{{goal}}",
    tags: ["tasks"],
  },
  {
    id: "finance-explain-invoice",
    title: "Explain invoice",
    description: "Plain-language invoice explanation",
    category: "finance",
    body: "Explain this invoice in plain language for a non-finance stakeholder. Cover amounts, due date, line items, and payment status.\n\nInvoice:\n{{invoice}}",
    tags: ["invoice"],
  },
  {
    id: "finance-cashflow-brief",
    title: "Cashflow brief",
    description: "Short cashflow narrative",
    category: "finance",
    body: "Write a short cashflow brief from the following figures. Highlight risks and opportunities.\n\nData:\n{{data}}",
    tags: ["cashflow"],
  },
  {
    id: "marketing-campaign-outline",
    title: "Campaign outline",
    description: "Structure a marketing campaign",
    category: "marketing",
    body: "Outline a marketing campaign with audience, channels, messaging pillars, timeline, and KPIs for:\n\n{{brief}}",
    tags: ["campaign"],
  },
  {
    id: "marketing-proposal",
    title: "Generate proposal",
    description: "Client-facing proposal draft",
    category: "marketing",
    body: "Generate a client proposal with executive summary, scope, deliverables, timeline, and investment section.\n\nBrief:\n{{brief}}",
    tags: ["proposal"],
  },
  {
    id: "documents-summarize",
    title: "Summarize document",
    description: "Structured document summary",
    category: "documents",
    body: "Summarize this document with: purpose, key points, decisions, open questions, and action items.\n\nDocument:\n{{document}}",
    tags: ["summary"],
  },
  {
    id: "automation-workflow",
    title: "Design workflow",
    description: "Automation workflow sketch",
    category: "automation",
    body: "Design an automation workflow with triggers, conditions, actions, and failure handling for:\n\n{{process}}",
    tags: ["workflow"],
  },
  {
    id: "general-brainstorm",
    title: "Brainstorm options",
    description: "Structured ideation",
    category: "general",
    body: "Brainstorm 8 options for the following challenge. Rank by impact vs effort.\n\nChallenge:\n{{challenge}}",
    tags: ["ideas"],
  },
  {
    id: "general-explain",
    title: "Explain simply",
    description: "Clear explanation for stakeholders",
    category: "general",
    body: "Explain the following topic simply for an executive audience. Use short paragraphs and one analogy.\n\nTopic:\n{{topic}}",
    tags: ["explain"],
  },
];

export function getPromptsByCategory(category: AiPromptCategory): AiPromptTemplate[] {
  return AI_PROMPT_LIBRARY.filter((p) => p.category === category);
}

export function getPromptById(id: string): AiPromptTemplate | undefined {
  return AI_PROMPT_LIBRARY.find((p) => p.id === id);
}

export function searchPrompts(query: string): AiPromptTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return AI_PROMPT_LIBRARY;
  return AI_PROMPT_LIBRARY.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
  );
}

/** Fill {{placeholders}} in a template body. */
export function applyPromptTemplate(
  body: string,
  vars: Record<string, string>,
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}
