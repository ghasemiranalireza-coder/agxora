/**
 * AI Foundation — context builders for future AGXORA intelligence.
 *
 * Phase 3 does NOT implement agents, tools, or model calls.
 * This module only standardizes how organizational identity is
 * packaged for later AI systems.
 */

import type {
  Organization,
  OrganizationAiContext,
  Workspace,
} from "../types";

/**
 * Deterministic context snapshot. Safe to serialize into prompts,
 * embeddings pipelines, or agent memory stores later.
 */
export function buildOrganizationAiContext(
  organization: Organization,
  workspace: Workspace,
  generatedAt: string = new Date().toISOString(),
): OrganizationAiContext {
  return {
    organizationId: organization.id,
    workspaceId: workspace.id,
    name: organization.name,
    type: organization.type,
    industry: organization.industry,
    industryLabel: organization.industryLabel,
    country: organization.country,
    language: organization.language,
    currency: organization.currency,
    timezone: organization.timezone,
    size: organization.size,
    mission: organization.mission,
    vision: organization.vision,
    primaryGoals: organization.primaryGoals,
    departments: organization.departments,
    aiPreferences: organization.aiPreferences,
    generatedAt,
  };
}

/**
 * Compact textual summary for future retrieval / system prompts.
 * Not used by any agent in Phase 3.
 */
export function summarizeOrganizationForAi(
  context: OrganizationAiContext,
): string {
  const goals =
    context.primaryGoals.length > 0
      ? context.primaryGoals.join("; ")
      : "unspecified";

  return [
    `Organization: ${context.name}`,
    `Type: ${context.type}`,
    `Industry: ${context.industryLabel ?? context.industry}`,
    `Location: ${context.country}`,
    `Locale: ${context.language} / ${context.currency} / ${context.timezone}`,
    `Size: ${context.size}`,
    `Goals: ${goals}`,
    context.mission ? `Mission: ${context.mission}` : null,
    context.vision ? `Vision: ${context.vision}` : null,
    `AI tone: ${context.aiPreferences.tone}`,
  ]
    .filter(Boolean)
    .join("\n");
}
