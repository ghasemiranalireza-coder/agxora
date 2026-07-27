import type { MemoryContextPacket } from "../../memory/MemoryTypes";
import type { BusinessType } from "../BusinessType";
import { getBusinessTypeMeta } from "../BusinessType";
import type { BusinessProfile } from "../BusinessProfile";
import {
  CompanyKnowledgeStore,
  companyKnowledgeStore,
} from "../knowledge/CompanyKnowledgeStore";
import type { KnowledgeEntry } from "../knowledge/types";
import {
  businessTemplateRegistry,
  type BusinessTemplate,
} from "../templates";

export interface AiOperatingContext {
  readonly organizationId: string;
  readonly companyName: string;
  readonly businessType: BusinessType;
  readonly businessLabel: string;
  readonly templateId: string;
  readonly templateSummary: string;
  readonly country: string;
  readonly language: string;
  readonly timezone: string;
  readonly goals: readonly string[];
  readonly modules: readonly string[];
  readonly agents: readonly string[];
  readonly aiFocus: readonly string[];
  readonly reasoningDomains: readonly string[];
  readonly knowledge: readonly KnowledgeEntry[];
  readonly memory?: MemoryContextPacket;
  readonly systemPrompt: string;
  readonly generatedAt: string;
}

/**
 * AI Context Builder — assembles organization + template + knowledge
 * into a provider-ready context packet for chat / agents.
 */
export class AiContextBuilder {
  constructor(
    private readonly knowledge: CompanyKnowledgeStore = companyKnowledgeStore,
    private readonly templates = businessTemplateRegistry,
  ) {}

  build(input: {
    profile: BusinessProfile;
    memory?: MemoryContextPacket;
    knowledgeLimit?: number;
  }): AiOperatingContext {
    const template = this.templates.require(input.profile.templateId);
    const meta = getBusinessTypeMeta(input.profile.businessType);
    const knowledge = this.knowledge.query({
      organizationId: input.profile.organizationId,
      limit: input.knowledgeLimit ?? 20,
    });
    const reasoningDomains =
      input.profile.reasoningDomains ?? template.aiFocus;

    const systemPrompt = this.composeSystemPrompt(
      input.profile,
      template,
      meta.label,
      knowledge,
      reasoningDomains,
    );

    return {
      organizationId: input.profile.organizationId,
      companyName: input.profile.companyName,
      businessType: input.profile.businessType,
      businessLabel: meta.label,
      templateId: template.id,
      templateSummary: template.summary,
      country: input.profile.country,
      language: input.profile.language,
      timezone: input.profile.timezone,
      goals: input.profile.goals,
      modules: input.profile.activatedModules,
      agents: input.profile.activatedAgents,
      aiFocus: template.aiFocus,
      reasoningDomains,
      knowledge,
      memory: input.memory,
      systemPrompt,
      generatedAt: new Date().toISOString(),
    };
  }

  private composeSystemPrompt(
    profile: BusinessProfile,
    template: BusinessTemplate,
    businessLabel: string,
    knowledge: readonly KnowledgeEntry[],
    reasoningDomains: readonly string[],
  ): string {
    const knowledgeBlock = knowledge
      .slice(0, 8)
      .map((entry) => `- ${entry.title}: ${entry.content}`)
      .join("\n");

    return [
      `You are AGXORA AI, the operating assistant for ${profile.companyName}.`,
      `Business type: ${businessLabel} (${profile.businessType}).`,
      `Template: ${template.name} — ${template.summary}.`,
      `Locale: ${profile.language}, ${profile.country}, ${profile.timezone}.`,
      `Reason about: ${reasoningDomains.join(", ")}.`,
      profile.goals.length
        ? `Goals: ${profile.goals.join("; ")}.`
        : "Goals: not specified.",
      `Focus signals: ${template.aiFocus.join(", ")}.`,
      knowledgeBlock
        ? `Company knowledge:\n${knowledgeBlock}`
        : "Company knowledge: none seeded yet.",
      "Stay industry-aware via the active template. Do not invent vertical-specific systems outside the activated modules.",
    ].join("\n");
  }
}

export const aiContextBuilder = new AiContextBuilder();
