/**
 * Token estimation and context-window trimming.
 */

import type { AIMessageSlice } from "./AIContext";
import { getModelDefinition } from "./AIModel";

/** Rough estimator — replace with provider tokenizers later. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateMessagesTokens(
  messages: readonly AIMessageSlice[],
): number {
  return messages.reduce(
    (sum, message) => sum + estimateTokens(message.content) + 4,
    0,
  );
}

export interface TrimResult {
  readonly messages: readonly AIMessageSlice[];
  readonly removedCount: number;
  readonly estimatedTokens: number;
}

/**
 * Keep system messages + newest turns within the model context window.
 */
export function trimToContextWindow(input: {
  messages: readonly AIMessageSlice[];
  modelId: string;
  reserveOutputTokens?: number;
}): TrimResult {
  const model = getModelDefinition(input.modelId);
  const window = model?.contextWindow ?? 32_768;
  const reserve = input.reserveOutputTokens ?? model?.maxOutputTokens ?? 2048;
  const budget = Math.max(1024, window - reserve);

  const system = input.messages.filter((m) => m.role === "system");
  const rest = input.messages.filter((m) => m.role !== "system");

  let kept = [...rest];
  let estimated = estimateMessagesTokens([...system, ...kept]);
  let removedCount = 0;

  while (estimated > budget && kept.length > 1) {
    kept = kept.slice(1);
    removedCount += 1;
    estimated = estimateMessagesTokens([...system, ...kept]);
  }

  return {
    messages: [...system, ...kept],
    removedCount,
    estimatedTokens: estimated,
  };
}
