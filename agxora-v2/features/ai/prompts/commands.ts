/**
 * AI Command Palette — extendable command registry.
 */

import type { AiCommand } from "../types";

export const AI_COMMANDS: AiCommand[] = [
  {
    id: "cmd-summarize-customer",
    label: "Summarize customer",
    description: "Executive summary of the active customer",
    prompt:
      "Summarize the current customer: profile, contacts, pipeline, risks, and next action.",
    category: "crm",
    keywords: ["crm", "customer", "summary", "account"],
  },
  {
    id: "cmd-generate-proposal",
    label: "Generate proposal",
    description: "Draft a client proposal outline",
    prompt:
      "Generate a professional client proposal with executive summary, scope, deliverables, timeline, and investment.",
    category: "marketing",
    keywords: ["proposal", "sales", "pitch"],
  },
  {
    id: "cmd-analyze-project",
    label: "Analyze project",
    description: "Project health and risk analysis",
    prompt:
      "Analyze the current project for status, blockers, schedule risk, and recommended next steps.",
    category: "projects",
    keywords: ["project", "risk", "status"],
  },
  {
    id: "cmd-create-task-list",
    label: "Create task list",
    description: "Break work into actionable tasks",
    prompt:
      "Create a prioritized task list with owners (roles), estimates, and dependencies for the current goal.",
    category: "projects",
    keywords: ["tasks", "todo", "plan"],
  },
  {
    id: "cmd-generate-email",
    label: "Generate email",
    description: "Draft a professional email",
    prompt:
      "Draft a concise professional email based on the current context. Include subject line and clear CTA.",
    category: "general",
    keywords: ["email", "mail", "outreach"],
  },
  {
    id: "cmd-explain-invoice",
    label: "Explain invoice",
    description: "Plain-language invoice explanation",
    prompt:
      "Explain the current invoice in plain language: amounts, due date, line items, and payment status.",
    category: "finance",
    keywords: ["invoice", "finance", "billing"],
  },
];

const extraCommands: AiCommand[] = [];

/** Register a command at runtime (extension point for future modules). */
export function registerAiCommand(command: AiCommand): void {
  const exists =
    AI_COMMANDS.some((c) => c.id === command.id) ||
    extraCommands.some((c) => c.id === command.id);
  if (exists) return;
  extraCommands.push(command);
}

export function listAiCommands(): AiCommand[] {
  return [...AI_COMMANDS, ...extraCommands];
}

export function searchAiCommands(query: string): AiCommand[] {
  const q = query.trim().toLowerCase();
  const all = listAiCommands();
  if (!q) return all;
  return all.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
  );
}

export function getAiCommandById(id: string): AiCommand | undefined {
  return listAiCommands().find((c) => c.id === id);
}
