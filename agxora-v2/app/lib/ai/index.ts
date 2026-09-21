/**
 * AGXORA AI Engine — public surface.
 */

export * from "./AIModel";
export * from "./AISettings";
export * from "./AIContext";
export * from "./AIConversation";
export * from "./AIConversationEngine";
export * from "./AIStreaming";
export * from "./AITools";
export * from "./AITokenCounter";
export * from "./AIRateLimiter";
export * from "./AIErrorHandler";
export * from "./AIProvider";
export * from "./AIProviderFactory";
export * from "./AIEngine";
export * from "./AIVoice";
export * from "./AIVision";
export * from "./prompt/assemblePrompt";
export { MockAIProvider } from "./providers/MockAIProvider";
export { OpenAIProvider } from "./providers/OpenAIProvider";
export {
  AnthropicProvider,
  GoogleGeminiProvider,
  OpenRouterProvider,
  OllamaProvider,
  AzureOpenAIProvider,
  LocalProvider,
} from "./providers/StubProviders";
export {
  createChatProviderAdapter,
  type ChatProviderAdapter,
  type RuntimeContextEnricher,
} from "./adapters/chatProviderAdapter";
export {
  selectCustomerChatProviderId,
  isMockAiProviderId,
  containsInventedBusinessMetrics,
  isUnsafeSimulatedAiText,
  customerAiUnavailableError,
  CUSTOMER_CHAT_PROVIDER_ID,
  CUSTOMER_AI_UNAVAILABLE_KEY,
} from "./customerChatProvider";
export {
  AISettingsProvider,
  useAISettings,
  useOptionalAISettings,
  type AIProviderContextValue,
  type AISettingsPatch,
} from "./AIProviderContext";
