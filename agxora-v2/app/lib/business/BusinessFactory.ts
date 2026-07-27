/**
 * BusinessFactory — creates profiles, metrics, and org skeletons
 * from activation input + catalog recognition.
 */

import { getCatalogEntry } from "./BusinessCatalog";
import {
  buildSkeletonOrganization,
  type UniversalOrganizationModel,
} from "./BusinessContext";
import {
  createMetricSnapshot,
  type BusinessMetricSnapshot,
} from "./BusinessMetrics";
import type {
  ActivateBusinessInput,
  BusinessProfile,
  BusinessRecognition,
} from "./BusinessProfile";
import { listBusinessTemplates } from "./BusinessTemplates";
import type { BusinessTemplate } from "./templates/types";

export class BusinessFactory {
  createRecognition(
    input: ActivateBusinessInput,
  ): BusinessRecognition {
    const catalog = getCatalogEntry(input.businessType);
    return {
      businessType: input.businessType,
      industry: catalog.industry,
      size: input.size ?? catalog.defaultSize,
      country: input.country,
      language: input.language,
      currency: input.currency ?? catalog.defaultCurrency,
      timezone: input.timezone,
      departments: input.departments ?? catalog.defaultDepartments,
      employeesEstimate: input.employeesEstimate,
      services: input.services ?? catalog.typicalServices,
      products: input.products ?? catalog.typicalProducts,
      customers: catalog.typicalCustomers,
      suppliers: catalog.typicalSuppliers,
      locations: catalog.typicalLocations,
      goals: input.goals ?? catalog.defaultGoals,
      kpis: catalog.defaultKpis,
      painPoints: catalog.painPoints,
    };
  }

  resolveTemplate(input: ActivateBusinessInput): BusinessTemplate {
    if (input.templateId) {
      const found = listBusinessTemplates().find(
        (item) => item.id === input.templateId,
      );
      if (!found) throw new Error(`Unknown template: ${input.templateId}`);
      if (found.businessType !== input.businessType) {
        throw new Error(
          `Template ${found.id} does not match business type ${input.businessType}`,
        );
      }
      return found;
    }

    const primary = listBusinessTemplates().find(
      (item) => item.businessType === input.businessType,
    );
    if (!primary) {
      throw new Error(`No template for business type: ${input.businessType}`);
    }
    return primary;
  }

  createProfile(input: ActivateBusinessInput): {
    profile: BusinessProfile;
    template: BusinessTemplate;
    metrics: BusinessMetricSnapshot;
    organization: UniversalOrganizationModel;
  } {
    const template = this.resolveTemplate(input);
    const recognition = this.createRecognition(input);
    const now = new Date().toISOString();

    const profile: BusinessProfile = {
      organizationId: input.organizationId,
      companyName: input.companyName.trim(),
      businessType: input.businessType,
      templateId: template.id,
      country: recognition.country,
      language: recognition.language,
      timezone: recognition.timezone,
      currency: recognition.currency,
      size: recognition.size,
      goals: recognition.goals,
      recognition,
      activatedModules: [...template.defaultModules],
      activatedAgents: [...template.defaultAgents],
      reasoningDomains: [
        ...new Set([...template.aiFocus, ...getCatalogEntry(input.businessType).reasoningDomains]),
      ],
      createdAt: now,
      updatedAt: now,
    };

    const metrics = createMetricSnapshot({
      organizationId: profile.organizationId,
      businessType: profile.businessType,
      universal: {
        employees: recognition.employeesEstimate ?? 0,
      },
    });

    const organization = buildSkeletonOrganization(profile);

    return { profile, template, metrics, organization };
  }
}

export const businessFactory = new BusinessFactory();
