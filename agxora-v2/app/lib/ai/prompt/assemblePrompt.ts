/**
 * Modular prompt assembly pipeline.
 *
 * System → Organization → Business → Memory → Knowledge → Conversation → User
 */

import type { AIMessageSlice, AIRuntimeContext } from "../AIContext";

export interface AssembledPrompt {
  readonly messages: readonly AIMessageSlice[];
  readonly systemPrompt: string;
  readonly userPrompt: string;
}

export function assemblePrompt(context: AIRuntimeContext): AssembledPrompt {
  const sections: string[] = [];

  sections.push(
    context.systemPrompt?.trim() ||
      "You are AGXORA AI, the operating assistant for a universal business operating system.",
  );

  const org = context.organization;
  if (org.companyName || org.organizationId) {
    sections.push(
      [
        "Organization:",
        org.companyName ? `name=${org.companyName}` : null,
        org.organizationId ? `id=${org.organizationId}` : null,
        org.workspaceId ? `workspace=${org.workspaceId}` : null,
        org.businessType ? `type=${org.businessType}` : null,
        org.country ? `country=${org.country}` : null,
        org.language ? `language=${org.language}` : null,
        org.timezone ? `timezone=${org.timezone}` : null,
      ]
        .filter(Boolean)
        .join("; "),
    );
  }

  if (context.business) {
    const b = context.business;
    sections.push(
      [
        "Business:",
        b.templateId ? `template=${b.templateId}` : null,
        b.templateSummary ? `summary=${b.templateSummary}` : null,
        b.reasoningDomains?.length
          ? `focus=${b.reasoningDomains.join(", ")}`
          : null,
        b.goals?.length ? `goals=${b.goals.join("; ")}` : null,
        b.departments?.length
          ? `departments=${b.departments.join(", ")}`
          : null,
        b.employees?.length ? `employees=${b.employees.join(", ")}` : null,
        b.customers?.length ? `customers=${b.customers.join(", ")}` : null,
        b.projects?.length ? `projects=${b.projects.join(", ")}` : null,
        b.files?.length ? `files=${b.files.join(", ")}` : null,
        b.modules?.length ? `modules=${b.modules.join(", ")}` : null,
        b.agents?.length ? `agents=${b.agents.join(", ")}` : null,
        b.kpis?.length ? `kpis=${b.kpis.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("; "),
    );
  }

  if (context.memory?.entries.length) {
    const mem = context.memory.entries
      .slice(0, 12)
      .map((entry) => `- [${entry.kind}] ${entry.key}: ${entry.content}`)
      .join("\n");
    sections.push(`Memory:\n${mem}`);
  }

  if (context.knowledge?.entries.length) {
    const knowledge = context.knowledge.entries
      .slice(0, 12)
      .map((entry) => `- ${entry.title}: ${entry.content}`)
      .join("\n");
    sections.push(`Knowledge:\n${knowledge}`);
  }

  if (context.toolResults?.length) {
    const tools = context.toolResults
      .map((item) => `- ${item.toolName}: ${item.result}`)
      .join("\n");
    sections.push(`Tool results:\n${tools}`);
  }

  const systemPrompt = sections.join("\n\n");
  const history = context.conversation.filter(
    (message) => message.role !== "system",
  );

  const messages: AIMessageSlice[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: context.userPrompt },
  ];

  return {
    messages,
    systemPrompt,
    userPrompt: context.userPrompt,
  };
}
