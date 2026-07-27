/**
 * AGXORA AI Engine — public surface.
 */

export * from "./AIModel";
export * from "./AISettings";
export * from "./AIContext";
export * from "./AIConversation";
export {
  AIConversationEngine,
  aiConversationEngine,
} from "./AIConversationEngine";
export {
  ConversationEngine,
  conversationEngine,
} from "./ConversationEngine";
export * from "./AIStreaming";
export {
  StreamingEngine,
  streamingEngine,
} from "./StreamingEngine";
export * from "./AITools";
export {
  ToolExecutionEngine,
  toolExecutionEngine,
  TOOL_DOMAINS,
  TOOL_DOMAIN_CONTRACTS,
} from "./ToolExecutionEngine";
export type { ToolDomain, ToolDomainContract } from "./ToolExecutionEngine";
export * from "./AITokenCounter";
export { TokenCounter, tokenCounter } from "./TokenCounter";
export * from "./AIRateLimiter";
export * from "./AIErrorHandler";
export * from "./AIProvider";
export type { UniversalAIProvider } from "./UniversalAIProvider";
export * from "./AIProviderFactory";
export {
  AIProviderRegistry,
  aiProviderRegistry,
} from "./AIProviderRegistry";
export { ProviderFactory, providerFactory } from "./ProviderFactory";
export {
  AIModelRegistry,
  aiModelRegistry,
} from "./AIModelRegistry";
export { ModelSelector, modelSelector } from "./ModelSelector";
export { PromptBuilder, promptBuilder } from "./PromptBuilder";
export { CostEstimator, costEstimator } from "./CostEstimator";
export type { CostEstimate } from "./CostEstimator";
export {
  AIResponseParser,
  aiResponseParser,
} from "./AIResponseParser";
export type {
  ParsedAIResponse,
  ParsedCitation,
  ParsedCodeBlock,
} from "./AIResponseParser";
export {
  ConversationPersistence,
  conversationPersistence,
} from "./ConversationPersistence";
export {
  ChatSessionManager,
  chatSessionManager,
} from "./ChatSessionManager";
export * from "./AIEngine";
export * from "./AIVoice";
export * from "./AIVision";
export * from "./prompt/assemblePrompt";
export { MockAIProvider } from "./providers/MockAIProvider";
export {
  OpenAIProvider,
  AnthropicProvider,
  GoogleGeminiProvider,
  OpenRouterProvider,
  OllamaProvider,
} from "./providers/StubProviders";
export {
  createChatProviderAdapter,
  createRemoteChatProvider,
  type ChatProviderAdapter,
  type RemoteChatProviderAdapter,
  type RuntimeContextEnricher,
} from "./adapters/chatProviderAdapter";
export { RemoteAiProvider } from "./adapters/RemoteAiProvider";
export {
  AISettingsProvider,
  useAISettings,
  useOptionalAISettings,
  type AIProviderContextValue,
  type AISettingsPatch,
} from "./AIProviderContext";
