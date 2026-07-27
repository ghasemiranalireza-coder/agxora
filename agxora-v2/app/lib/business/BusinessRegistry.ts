/**
 * BusinessRegistry — central index of catalog, templates, and live profiles.
 */

import {
  BUSINESS_CATALOG,
  getCatalogEntry,
  type BusinessCatalogEntry,
} from "./BusinessCatalog";
import type { BusinessProfile } from "./BusinessProfile";
import {
  BUSINESS_TEMPLATES,
  getTemplatesForType,
  listBusinessTemplates,
} from "./BusinessTemplates";
import type { BusinessType } from "./BusinessType";
import type { BusinessTemplate } from "./templates/types";

export class BusinessRegistry {
  private readonly profiles = new Map<string, BusinessProfile>();

  listCatalog(): readonly BusinessCatalogEntry[] {
    return BUSINESS_CATALOG;
  }

  getCatalog(type: BusinessType): BusinessCatalogEntry {
    return getCatalogEntry(type);
  }

  listTemplates(): readonly BusinessTemplate[] {
    return listBusinessTemplates();
  }

  templatesFor(type: BusinessType): readonly BusinessTemplate[] {
    return getTemplatesForType(type);
  }

  primaryTemplate(type: BusinessType): BusinessTemplate {
    const list = this.templatesFor(type);
    if (list.length === 0) {
      throw new Error(`No template registered for: ${type}`);
    }
    return list[0];
  }

  getTemplate(id: string): BusinessTemplate | undefined {
    return BUSINESS_TEMPLATES.find((item) => item.id === id);
  }

  requireTemplate(id: string): BusinessTemplate {
    const template = this.getTemplate(id);
    if (!template) throw new Error(`Unknown template: ${id}`);
    return template;
  }

  putProfile(profile: BusinessProfile): void {
    this.profiles.set(profile.organizationId, profile);
  }

  getProfile(organizationId: string): BusinessProfile | undefined {
    return this.profiles.get(organizationId);
  }

  listProfiles(): readonly BusinessProfile[] {
    return [...this.profiles.values()];
  }

  removeProfile(organizationId: string): boolean {
    return this.profiles.delete(organizationId);
  }
}

export const businessRegistry = new BusinessRegistry();
