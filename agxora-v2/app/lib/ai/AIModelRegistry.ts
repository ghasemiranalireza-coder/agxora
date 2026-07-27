/**
 * AIModelRegistry — unlimited model catalog without hardcoded engine switches.
 */

import {
  AI_MODEL_CATALOG,
  getModelDefinition,
  listModelsForProvider,
  type AIModelCapability,
  type AIModelDefinition,
  type AIProviderId,
} from "./AIModel";

const dynamicModels = new Map<string, AIModelDefinition>();

export class AIModelRegistry {
  list(): readonly AIModelDefinition[] {
    return [...AI_MODEL_CATALOG, ...dynamicModels.values()];
  }

  listForProvider(providerId: AIProviderId): readonly AIModelDefinition[] {
    return this.list().filter((model) => model.providerId === providerId);
  }

  get(modelId: string): AIModelDefinition | undefined {
    return dynamicModels.get(modelId) ?? getModelDefinition(modelId);
  }

  register(model: AIModelDefinition): void {
    dynamicModels.set(model.id, model);
  }

  unregister(modelId: string): boolean {
    return dynamicModels.delete(modelId);
  }

  findByCapability(
    capability: AIModelCapability,
  ): readonly AIModelDefinition[] {
    return this.list().filter((model) =>
      model.capabilities.includes(capability),
    );
  }
}

export const aiModelRegistry = new AIModelRegistry();

export { listModelsForProvider, getModelDefinition, AI_MODEL_CATALOG };
