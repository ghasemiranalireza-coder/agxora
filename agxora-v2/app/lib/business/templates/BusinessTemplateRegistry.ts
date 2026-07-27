import type { BusinessType } from "../BusinessType";
import { BUSINESS_TEMPLATES } from "./catalog";
import type { BusinessTemplate } from "./types";

export class BusinessTemplateRegistry {
  private readonly byId = new Map<string, BusinessTemplate>();
  private readonly byType = new Map<BusinessType, BusinessTemplate[]>();

  constructor(templates: readonly BusinessTemplate[] = BUSINESS_TEMPLATES) {
    for (const template of templates) {
      this.register(template);
    }
  }

  register(template: BusinessTemplate): void {
    if (this.byId.has(template.id)) {
      throw new Error(`Template already registered: ${template.id}`);
    }
    this.byId.set(template.id, template);
    const list = this.byType.get(template.businessType) ?? [];
    list.push(template);
    this.byType.set(template.businessType, list);
  }

  get(id: string): BusinessTemplate | undefined {
    return this.byId.get(id);
  }

  require(id: string): BusinessTemplate {
    const template = this.get(id);
    if (!template) throw new Error(`Unknown template: ${id}`);
    return template;
  }

  list(): readonly BusinessTemplate[] {
    return [...this.byId.values()];
  }

  listByType(type: BusinessType): readonly BusinessTemplate[] {
    return [...(this.byType.get(type) ?? [])];
  }

  primaryFor(type: BusinessType): BusinessTemplate {
    const list = this.listByType(type);
    if (list.length === 0) {
      throw new Error(`No template for business type: ${type}`);
    }
    return list[0];
  }
}

export const businessTemplateRegistry = new BusinessTemplateRegistry();
