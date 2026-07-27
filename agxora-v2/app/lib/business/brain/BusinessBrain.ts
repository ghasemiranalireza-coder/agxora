import type { BusinessType } from "../BusinessType";
import { getBusinessTypeMeta } from "../BusinessType";
import type { BusinessTemplate } from "../templates/types";
import { businessTemplateRegistry } from "../templates/BusinessTemplateRegistry";
import {
  CompanyKnowledgeStore,
  companyKnowledgeStore,
} from "../knowledge/CompanyKnowledgeStore";

export interface BusinessProfile {
  readonly organizationId: string;
  readonly companyName: string;
  readonly businessType: BusinessType;
  readonly templateId: string;
  readonly country: string;
  readonly language: string;
  readonly timezone: string;
  readonly goals: readonly string[];
  readonly activatedModules: readonly string[];
  readonly activatedAgents: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ActivateBusinessInput {
  readonly organizationId: string;
  readonly companyName: string;
  readonly businessType: BusinessType;
  readonly templateId?: string;
  readonly country: string;
  readonly language: string;
  readonly timezone: string;
  readonly goals?: readonly string[];
}

/**
 * BusinessBrain — orchestrates template activation, knowledge seeding,
 * and runtime business profile for the AI OS.
 */
export class BusinessBrain {
  private readonly profiles = new Map<string, BusinessProfile>();

  constructor(
    private readonly templates = businessTemplateRegistry,
    private readonly knowledge: CompanyKnowledgeStore = companyKnowledgeStore,
  ) {}

  activate(input: ActivateBusinessInput): {
    profile: BusinessProfile;
    template: BusinessTemplate;
  } {
    const template = input.templateId
      ? this.templates.require(input.templateId)
      : this.templates.primaryFor(input.businessType);

    if (template.businessType !== input.businessType) {
      throw new Error(
        `Template ${template.id} does not match business type ${input.businessType}`,
      );
    }

    const now = new Date().toISOString();
    const profile: BusinessProfile = {
      organizationId: input.organizationId,
      companyName: input.companyName.trim(),
      businessType: input.businessType,
      templateId: template.id,
      country: input.country,
      language: input.language,
      timezone: input.timezone,
      goals: input.goals ?? [],
      activatedModules: [...template.defaultModules],
      activatedAgents: [...template.defaultAgents],
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.set(profile.organizationId, profile);
    this.seedKnowledge(profile, template);

    return { profile, template };
  }

  getProfile(organizationId: string): BusinessProfile | undefined {
    return this.profiles.get(organizationId);
  }

  listProfiles(): readonly BusinessProfile[] {
    return [...this.profiles.values()];
  }

  private seedKnowledge(
    profile: BusinessProfile,
    template: BusinessTemplate,
  ): void {
    const meta = getBusinessTypeMeta(profile.businessType);

    this.knowledge.upsertByTitle({
      organizationId: profile.organizationId,
      businessType: profile.businessType,
      kind: "profile",
      title: "Company profile",
      content: `${profile.companyName} operates as a ${meta.label} business in ${profile.country}. Primary language: ${profile.language}. Timezone: ${profile.timezone}.`,
      tags: ["profile", profile.businessType],
    });

    this.knowledge.upsertByTitle({
      organizationId: profile.organizationId,
      businessType: profile.businessType,
      kind: "process",
      title: "Operating template",
      content: `${template.name}: ${template.summary}. Focus areas: ${template.aiFocus.join(", ")}.`,
      tags: ["template", template.id],
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
