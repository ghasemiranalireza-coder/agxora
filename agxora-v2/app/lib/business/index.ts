/**
 * AGXORA Universal AI Business Brain — public surface.
 */

export * from "./BusinessType";
export * from "./BusinessCatalog";
export * from "./BusinessRegistry";
export * from "./BusinessFactory";
export * from "./BusinessProfile";
export * from "./BusinessBrain";
export * from "./BusinessTemplates";
export * from "./BusinessMetrics";
export * from "./BusinessContext";

export * from "./templates";
export * from "./knowledge/types";
export {
  CompanyKnowledgeStore,
  companyKnowledgeStore,
} from "./knowledge/CompanyKnowledgeStore";
export {
  AiContextBuilder,
  aiContextBuilder,
  type AiOperatingContext,
} from "./context/AiContextBuilder";
export {
  BusinessOsProvider,
  useBusinessOs,
  type BusinessOsContextValue,
} from "./BusinessOsProvider";
