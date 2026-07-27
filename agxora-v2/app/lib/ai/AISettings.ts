/**
 * AI settings — user/org preferences. API keys never stored here.
 */

import type { AIProviderId } from "./AIModel";

export type ReasoningLevel = "low" | "medium" | "high";

export interface AISettings {
  readonly defaultProviderId: AIProviderId;
  readonly defaultModelId: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly streamingEnabled: boolean;
  readonly systemPromptOverride?: string;
  readonly reasoningLevel: ReasoningLevel;
  readonly memoryEnabled: boolean;
  readonly autoTitleEnabled: boolean;
  readonly voiceEnabled: boolean;
  readonly visionEnabled: boolean;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  defaultProviderId: "mock",
  defaultModelId: "mock-local",
  temperature: 0.4,
  maxTokens: 2048,
  streamingEnabled: true,
  reasoningLevel: "medium",
  memoryEnabled: true,
  autoTitleEnabled: true,
  voiceEnabled: false,
  visionEnabled: false,
};

export function mergeAISettings(
  partial?: Partial<AISettings>,
): AISettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    ...partial,
  };
}

/** Environment variable names only — never hardcode secrets. */
export const AI_ENV_KEYS = {
  openai: "AGXORA_OPENAI_API_KEY",
  anthropic: "AGXORA_ANTHROPIC_API_KEY",
  google: "AGXORA_GOOGLE_API_KEY",
  openrouter: "AGXORA_OPENROUTER_API_KEY",
  ollama: "AGXORA_OLLAMA_BASE_URL",
} as const;
