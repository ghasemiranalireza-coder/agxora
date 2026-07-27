/**
 * Provider factory — register future vendors without changing callers.
 */

import type { AIProviderId } from "./AIModel";
import type { AIProvider } from "./AIProvider";
import { MockAIProvider } from "./providers/MockAIProvider";
import {
  AnthropicProvider,
  GoogleGeminiProvider,
  OllamaProvider,
  OpenAIProvider,
  OpenRouterProvider,
} from "./providers/StubProviders";

export type AIProviderFactoryFn = () => AIProvider;

const registry = new Map<AIProviderId, AIProviderFactoryFn>([
  ["mock", () => new MockAIProvider()],
  ["openai", () => new OpenAIProvider()],
  ["anthropic", () => new AnthropicProvider()],
  ["google", () => new GoogleGeminiProvider()],
  ["openrouter", () => new OpenRouterProvider()],
  ["ollama", () => new OllamaProvider()],
]);

export function registerAIProvider(
  id: AIProviderId,
  factory: AIProviderFactoryFn,
): void {
  registry.set(id, factory);
}

export function createAIProvider(id: AIProviderId): AIProvider {
  const factory = registry.get(id);
  if (!factory) {
    throw new Error(`Unknown AI provider: ${id}`);
  }
  return factory();
}

export function listRegisteredProviderIds(): readonly AIProviderId[] {
  return [...registry.keys()];
}

export class AIProviderFactory {
  create(id: AIProviderId): AIProvider {
    return createAIProvider(id);
  }

  register(id: AIProviderId, factory: AIProviderFactoryFn): void {
    registerAIProvider(id, factory);
  }

  list(): readonly AIProviderId[] {
    return listRegisteredProviderIds();
  }
}

export const aiProviderFactory = new AIProviderFactory();
