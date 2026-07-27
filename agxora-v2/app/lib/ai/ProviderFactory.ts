/**
 * ProviderFactory — create provider instances by id.
 */

import type { AIProviderId } from "./AIModel";
import type { AIProvider } from "./AIProvider";
import { aiProviderRegistry } from "./AIProviderRegistry";

export class ProviderFactory {
  create(providerId: AIProviderId): AIProvider {
    return aiProviderRegistry.create(providerId);
  }

  list(): readonly AIProviderId[] {
    return aiProviderRegistry.list();
  }
}

export const providerFactory = new ProviderFactory();
