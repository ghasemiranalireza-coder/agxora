/**
 * ModelSelector — pick models by provider, capability, or preference.
 */

import type { AIModelCapability, AIProviderId } from "./AIModel";
import { aiModelRegistry } from "./AIModelRegistry";
import type { AISettings } from "./AISettings";

export class ModelSelector {
  select(input: {
    providerId?: AIProviderId;
    modelId?: string;
    settings?: AISettings;
    require?: AIModelCapability;
  }): string {
    if (input.modelId) {
      const found = aiModelRegistry.get(input.modelId);
      if (found) return found.id;
    }

    const providerId =
      input.providerId ?? input.settings?.defaultProviderId ?? "mock";
    const preferred = input.settings?.defaultModelId;
    if (preferred) {
      const match = aiModelRegistry.get(preferred);
      if (match && match.providerId === providerId) return match.id;
    }

    const candidates = aiModelRegistry.listForProvider(providerId);
    if (input.require) {
      const capable = candidates.filter((model) =>
        model.capabilities.includes(input.require!),
      );
      if (capable[0]) return capable[0].id;
    }
    return candidates[0]?.id ?? preferred ?? "mock-local";
  }
}

export const modelSelector = new ModelSelector();
