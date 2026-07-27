import type { BusinessType } from "../BusinessType";

export type TemplateModuleKey =
  | "crm"
  | "finance"
  | "operations"
  | "inventory"
  | "scheduling"
  | "analytics"
  | "automation"
  | "documents"
  | "support"
  | "compliance"
  | "logistics";

export type TemplateAgentKey =
  | "operations"
  | "revenue"
  | "customer"
  | "compliance"
  | "scheduling"
  | "insights";

export interface BusinessTemplate {
  readonly id: string;
  readonly businessType: BusinessType;
  readonly name: string;
  readonly version: string;
  readonly summary: string;
  readonly defaultModules: readonly TemplateModuleKey[];
  readonly defaultAgents: readonly TemplateAgentKey[];
  readonly defaultRoles: readonly string[];
  readonly starterWorkflows: readonly string[];
  readonly knowledgeSeeds: readonly string[];
  readonly aiFocus: readonly string[];
}

export interface BusinessTemplateSelection {
  readonly businessType: BusinessType;
  readonly templateId: string;
  readonly companyName: string;
  readonly country: string;
  readonly language: string;
  readonly timezone: string;
  readonly goals: readonly string[];
}
