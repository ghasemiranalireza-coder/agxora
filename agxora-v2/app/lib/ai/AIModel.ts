/**
 * AI model catalog — identifiers are data, never hardcoded in engines.
 */

export type AIProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "ollama"
  | "mock";

export type AIModelCapability =
  | "chat"
  | "streaming"
  | "tools"
  | "vision"
  | "embeddings"
  | "audio"
  | "reasoning";

export interface AIModelDefinition {
  readonly id: string;
  readonly providerId: AIProviderId;
  readonly displayName: string;
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly capabilities: readonly AIModelCapability[];
  readonly family?: string;
  readonly deprecated?: boolean;
}

/** Extensible registry seed — add models without changing engine code. */
export const AI_MODEL_CATALOG: readonly AIModelDefinition[] = [
  {
    id: "gpt-4.1",
    providerId: "openai",
    displayName: "GPT-4.1",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_768,
    capabilities: ["chat", "streaming", "tools", "vision", "embeddings"],
    family: "gpt",
  },
  {
    id: "gpt-5",
    providerId: "openai",
    displayName: "GPT-5 (future)",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    capabilities: ["chat", "streaming", "tools", "vision", "reasoning"],
    family: "gpt",
  },
  {
    id: "claude-sonnet",
    providerId: "anthropic",
    displayName: "Claude Sonnet",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: ["chat", "streaming", "tools", "vision", "reasoning"],
    family: "claude",
  },
  {
    id: "claude-opus",
    providerId: "anthropic",
    displayName: "Claude Opus",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: ["chat", "streaming", "tools", "vision", "reasoning"],
    family: "claude",
  },
  {
    id: "gemini-pro",
    providerId: "google",
    displayName: "Gemini Pro",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    capabilities: ["chat", "streaming", "tools", "vision", "embeddings"],
    family: "gemini",
  },
  {
    id: "gemini-flash",
    providerId: "google",
    displayName: "Gemini Flash",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    capabilities: ["chat", "streaming", "tools", "vision"],
    family: "gemini",
  },
  {
    id: "openrouter/auto",
    providerId: "openrouter",
    displayName: "OpenRouter Auto",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    capabilities: ["chat", "streaming", "tools"],
    family: "openrouter",
  },
  {
    id: "llama",
    providerId: "ollama",
    displayName: "Llama (local)",
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    capabilities: ["chat", "streaming", "tools"],
    family: "llama",
  },
  {
    id: "mistral",
    providerId: "ollama",
    displayName: "Mistral (local)",
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    capabilities: ["chat", "streaming"],
    family: "mistral",
  },
  {
    id: "deepseek",
    providerId: "openrouter",
    displayName: "DeepSeek",
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    capabilities: ["chat", "streaming", "tools", "reasoning"],
    family: "deepseek",
  },
  {
    id: "qwen",
    providerId: "ollama",
    displayName: "Qwen (local)",
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    capabilities: ["chat", "streaming", "tools"],
    family: "qwen",
  },
  {
    id: "mock-local",
    providerId: "mock",
    displayName: "AGXORA Mock",
    contextWindow: 32_768,
    maxOutputTokens: 4_096,
    capabilities: ["chat", "streaming", "tools", "embeddings"],
    family: "mock",
  },
] as const;

export function listModelsForProvider(
  providerId: AIProviderId,
): readonly AIModelDefinition[] {
  return AI_MODEL_CATALOG.filter((model) => model.providerId === providerId);
}

export function getModelDefinition(modelId: string): AIModelDefinition | undefined {
  return AI_MODEL_CATALOG.find((model) => model.id === modelId);
}
