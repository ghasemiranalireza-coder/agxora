/**
 * AI Provider layer — re-exports enterprise providers.
 * UI must never import provider classes directly; use services instead.
 */

export type { AIProvider } from "@/app/lib/ai/AIProvider";
export type { AIProviderId } from "@/app/lib/ai/AIModel";
export {
  createAIProvider,
  registerAIProvider,
  listRegisteredProviderIds,
  AIProviderFactory,
  aiProviderFactory,
} from "@/app/lib/ai/AIProviderFactory";
export { OpenAIProvider } from "@/app/lib/ai/providers/OpenAIProvider";
export { AzureOpenAIProvider } from "@/app/lib/ai/providers/StubProviders";
export { LocalProvider } from "@/app/lib/ai/providers/StubProviders";
export { AnthropicProvider } from "@/app/lib/ai/providers/StubProviders";
export { MockAIProvider } from "@/app/lib/ai/providers/MockAIProvider";
