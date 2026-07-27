/**
 * BusinessBrain — Universal AI Business Brain.
 *
 * Activates templates, seeds company knowledge, builds reasoning context,
 * and adapts AI focus by business type — without DB or external APIs.
 */

import {
  CompanyKnowledgeStore,
  companyKnowledgeStore,
} from "./knowledge/CompanyKnowledgeStore";
import { getCatalogEntry } from "./BusinessCatalog";
import {
  composeBusinessSystemPrompt,
  type BusinessReasoningContext,
  type UniversalOrganizationModel,
} from "./BusinessContext";
import { businessFactory, BusinessFactory } from "./BusinessFactory";
import type { BusinessMetricSnapshot } from "./BusinessMetrics";
import type {
  ActivateBusinessInput,
  BusinessProfile,
} from "./BusinessProfile";
import { businessRegistry, BusinessRegistry } from "./BusinessRegistry";
import type { BusinessTemplate } from "./templates/types";
import type { MemoryContextPacket } from "../memory/MemoryTypes";

export type { BusinessProfile, ActivateBusinessInput } from "./BusinessProfile";

export class BusinessBrain {
  private readonly metrics = new Map<string, BusinessMetricSnapshot>();
  private readonly organizations = new Map<string, UniversalOrganizationModel>();

  constructor(
    private readonly factory: BusinessFactory = businessFactory,
    private readonly registry: BusinessRegistry = businessRegistry,
    private readonly knowledge: CompanyKnowledgeStore = companyKnowledgeStore,
  ) {}

  activate(input: ActivateBusinessInput): {
    profile: BusinessProfile;
    template: BusinessTemplate;
  } {
    const created = this.factory.createProfile(input);
    this.registry.putProfile(created.profile);
    this.metrics.set(created.profile.organizationId, created.metrics);
    this.organizations.set(created.profile.organizationId, created.organization);
    this.seedKnowledge(created.profile, created.template);
    return { profile: created.profile, template: created.template };
  }

  getProfile(organizationId: string): BusinessProfile | undefined {
    return this.registry.getProfile(organizationId);
  }

  listProfiles(): readonly BusinessProfile[] {
    return this.registry.listProfiles();
  }

  getMetrics(organizationId: string): BusinessMetricSnapshot | undefined {
    return this.metrics.get(organizationId);
  }

  getOrganizationModel(
    organizationId: string,
  ): UniversalOrganizationModel | undefined {
    return this.organizations.get(organizationId);
  }

  /**
   * Build a full reasoning context for chat / agents.
   * Reasoning domains change by business type (restaurant vs hotel vs law…).
   */
  buildReasoningContext(input: {
    organizationId: string;
    memory?: MemoryContextPacket;
  }): BusinessReasoningContext {
    const profile = this.registry.getProfile(input.organizationId);
    if (!profile) {
      throw new Error(`No business profile for organization: ${input.organizationId}`);
    }

    const catalog = getCatalogEntry(profile.businessType);
    const template = this.registry.requireTemplate(profile.templateId);
    const metrics =
      this.metrics.get(profile.organizationId) ??
      this.factory.createProfile({
        organizationId: profile.organizationId,
        companyName: profile.companyName,
        businessType: profile.businessType,
        templateId: profile.templateId,
        country: profile.country,
        language: profile.language,
        timezone: profile.timezone,
        currency: profile.currency,
        size: profile.size,
        goals: profile.goals,
      }).metrics;

    const organization =
      this.organizations.get(profile.organizationId) ??
      this.factory.createProfile({
        organizationId: profile.organizationId,
        companyName: profile.companyName,
        businessType: profile.businessType,
        templateId: profile.templateId,
        country: profile.country,
        language: profile.language,
        timezone: profile.timezone,
        currency: profile.currency,
        size: profile.size,
        goals: profile.goals,
      }).organization;

    const systemPrompt = composeBusinessSystemPrompt({
      profile,
      catalog,
      template,
      metrics,
    });

    return {
      profile,
      catalog,
      template,
      metrics,
      organization,
      memory: input.memory,
      systemPrompt,
      generatedAt: new Date().toISOString(),
    };
  }

  private seedKnowledge(
    profile: BusinessProfile,
    template: BusinessTemplate,
  ): void {
    const catalog = getCatalogEntry(profile.businessType);

    this.knowledge.upsertByTitle({
      organizationId: profile.organizationId,
      businessType: profile.businessType,
      kind: "profile",
      title: "Company profile",
      content: `${profile.companyName} is a ${catalog.label} (${catalog.industryFamily}) business in ${profile.country}. Size: ${profile.size}. Language: ${profile.language}. Currency: ${profile.currency}. Timezone: ${profile.timezone}.`,
      tags: ["profile", profile.businessType],
    });

    this.knowledge.upsertByTitle({
      organizationId: profile.organizationId,
      businessType: profile.businessType,
      kind: "process",
      title: "Operating template",
      content: `${template.name}: ${template.summary}. AI focuses on: ${template.aiFocus.join(", ")}.`,
      tags: ["template", template.id],
    });

    this.knowledge.upsertByTitle({
      organizationId: profile.organizationId,
      businessType: profile.businessType,
      kind: "policy",
      title: "Reasoning domains",
      content: profile.reasoningDomains.join(", "),
      tags: ["reasoning", profile.businessType],
    });

    this.knowledge.upsertByTitle({
      organizationId: profile.organizationId,
      businessType: profile.businessType,
      kind: "metric",
      title: "KPI focus",
      content: catalog.defaultKpis.join(", "),
      tags: ["kpi"],
    });

    for (const seed of template.knowledgeSeeds) {
      this.knowledge.upsertByTitle({
        organizationId: profile.organizationId,
        businessType: profile.businessType,
        kind: "note",
        title: seed,
        content: seed,
        tags: ["seed", profile.businessType],
      });
    }

    if (profile.goals.length > 0) {
      this.knowledge.upsertByTitle({
        organizationId: profile.organizationId,
        businessType: profile.businessType,
        kind: "metric",
        title: "Business goals",
        content: profile.goals.join("; "),
        tags: ["goals"],
      });
    }
  }
}

export const businessBrain = new BusinessBrain();
