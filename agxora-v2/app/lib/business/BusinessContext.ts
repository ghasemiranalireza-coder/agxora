/**
 * BusinessContext — universal organization model + AI reasoning context.
 *
 * Organization → Departments → Teams → Employees → Customers →
 * Projects → Tasks → Files → Conversations → Memory
 */

import type { MemoryContextPacket } from "../memory/MemoryTypes";
import type { BusinessCatalogEntry } from "./BusinessCatalog";
import type { BusinessMetricSnapshot } from "./BusinessMetrics";
import type { BusinessProfile } from "./BusinessProfile";
import type { BusinessTemplate } from "./templates/types";

export type OrgNodeId = string;

export interface OrgDepartment {
  readonly id: OrgNodeId;
  readonly name: string;
  readonly parentId?: OrgNodeId;
}

export interface OrgTeam {
  readonly id: OrgNodeId;
  readonly departmentId: OrgNodeId;
  readonly name: string;
}

export interface OrgEmployee {
  readonly id: OrgNodeId;
  readonly teamId?: OrgNodeId;
  readonly departmentId?: OrgNodeId;
  readonly name: string;
  readonly title?: string;
}

export interface OrgCustomer {
  readonly id: OrgNodeId;
  readonly name: string;
  readonly segment?: string;
}

export interface OrgProject {
  readonly id: OrgNodeId;
  readonly name: string;
  readonly customerId?: OrgNodeId;
  readonly status: "planned" | "active" | "blocked" | "done";
}

export interface OrgTask {
  readonly id: OrgNodeId;
  readonly projectId?: OrgNodeId;
  readonly title: string;
  readonly status: "todo" | "doing" | "done";
  readonly assigneeId?: OrgNodeId;
}

export interface OrgFile {
  readonly id: OrgNodeId;
  readonly name: string;
  readonly projectId?: OrgNodeId;
  readonly mimeType?: string;
}

export interface OrgConversation {
  readonly id: OrgNodeId;
  readonly title: string;
  readonly channel: "chat" | "email" | "meeting" | "other";
}

export interface UniversalOrganizationModel {
  readonly organizationId: string;
  readonly companyName: string;
  readonly departments: readonly OrgDepartment[];
  readonly teams: readonly OrgTeam[];
  readonly employees: readonly OrgEmployee[];
  readonly customers: readonly OrgCustomer[];
  readonly projects: readonly OrgProject[];
  readonly tasks: readonly OrgTask[];
  readonly files: readonly OrgFile[];
  readonly conversations: readonly OrgConversation[];
  readonly memoryScopeId: string;
}

export interface BusinessReasoningContext {
  readonly profile: BusinessProfile;
  readonly catalog: BusinessCatalogEntry;
  readonly template: BusinessTemplate;
  readonly metrics: BusinessMetricSnapshot;
  readonly organization: UniversalOrganizationModel;
  readonly memory?: MemoryContextPacket;
  readonly systemPrompt: string;
  readonly generatedAt: string;
}

export function buildSkeletonOrganization(
  profile: BusinessProfile,
): UniversalOrganizationModel {
  const departments: OrgDepartment[] = profile.recognition.departments.map(
    (name, index) => ({
      id: `dept_${index + 1}`,
      name,
    }),
  );

  return {
    organizationId: profile.organizationId,
    companyName: profile.companyName,
    departments,
    teams: [],
    employees: [],
    customers: [],
    projects: [],
    tasks: [],
    files: [],
    conversations: [],
    memoryScopeId: `org:${profile.organizationId}`,
  };
}

export function composeBusinessSystemPrompt(input: {
  profile: BusinessProfile;
  catalog: BusinessCatalogEntry;
  template: BusinessTemplate;
  metrics: BusinessMetricSnapshot;
}): string {
  const { profile, catalog, template, metrics } = input;
  return [
    `You are AGXORA AI Business Brain for ${profile.companyName}.`,
    `Business type: ${catalog.label} (${profile.businessType}).`,
    `Industry: ${catalog.industry} / ${catalog.industryFamily}.`,
    `Size: ${profile.size}. Locale: ${profile.language}, ${profile.country}, ${profile.currency}, ${profile.timezone}.`,
    `Template: ${template.name} — ${template.summary}.`,
    `Reason specifically about: ${profile.reasoningDomains.join(", ")}.`,
    `KPIs: ${catalog.defaultKpis.join(", ")}.`,
    `Pain points to watch: ${catalog.painPoints.join(", ")}.`,
    `Health score: ${metrics.universal.healthScore}. Risk score: ${metrics.universal.riskScore}.`,
    profile.goals.length
      ? `Goals: ${profile.goals.join("; ")}.`
      : "Goals: not specified.",
    "Stay universal: reason through the active business template, never hard-code a single vertical into core behavior.",
  ].join("\n");
}
