/**
 * AIProviderRegistry — register unlimited future providers.
 */

import type { AIProviderId } from "./AIModel";
import type { AIProvider } from "./AIProvider";
import {
  aiProviderFactory,
  createAIProvider,
  listRegisteredProviderIds,
  registerAIProvider,
  type AIProviderFactoryFn,
} from "./AIProviderFactory";

export class AIProviderRegistry {
  register(id: AIProviderId, factory: AIProviderFactoryFn): void {
    registerAIProvider(id, factory);
  }

  create(id: AIProviderId): AIProvider {
    return createAIProvider(id);
  }

  list(): readonly AIProviderId[] {
    return listRegisteredProviderIds();
  }

  has(id: AIProviderId): boolean {
    return listRegisteredProviderIds().includes(id);
  }
}

export const aiProviderRegistry = new AIProviderRegistry();

export {
  aiProviderFactory,
  createAIProvider,
  listRegisteredProviderIds,
  registerAIProvider,
};
