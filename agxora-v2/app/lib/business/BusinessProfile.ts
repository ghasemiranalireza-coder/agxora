/**
 * BusinessProfile — recognized identity of an organization inside AGXORA.
 */

import type { BusinessSize, BusinessType } from "./BusinessType";

export interface BusinessRecognition {
  readonly businessType: BusinessType;
  readonly industry: string;
  readonly size: BusinessSize;
  readonly country: string;
  readonly language: string;
  readonly currency: string;
  readonly timezone: string;
  readonly departments: readonly string[];
  readonly employeesEstimate?: number;
  readonly services: readonly string[];
  readonly products: readonly string[];
  readonly customers: readonly string[];
  readonly suppliers: readonly string[];
  readonly locations: readonly string[];
  readonly goals: readonly string[];
  readonly kpis: readonly string[];
  readonly painPoints: readonly string[];
}

export interface BusinessProfile {
  readonly organizationId: string;
  readonly companyName: string;
  readonly businessType: BusinessType;
  readonly templateId: string;
  readonly country: string;
  readonly language: string;
  readonly timezone: string;
  readonly currency: string;
  readonly size: BusinessSize;
  readonly goals: readonly string[];
  readonly recognition: BusinessRecognition;
  readonly activatedModules: readonly string[];
  readonly activatedAgents: readonly string[];
  readonly reasoningDomains: readonly string[];
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
  readonly currency?: string;
  readonly size?: BusinessSize;
  readonly goals?: readonly string[];
  readonly departments?: readonly string[];
  readonly services?: readonly string[];
  readonly products?: readonly string[];
  readonly employeesEstimate?: number;
}
