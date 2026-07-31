/**
 * Token estimation + cost placeholders for the AI platform.
 * Heuristic only — replace with provider tokenizers later.
 */

import { estimateTokens } from "@/app/lib/ai/AITokenCounter";
import type { AiMessage, AiUsageSnapshot } from "../types";

export { estimateTokens };

export function estimateMessageTokens(messages: readonly AiMessage[]): {
  prompt: number;
  completion: number;
  total: number;
} {
  let prompt = 0;
  let completion = 0;
  for (const message of messages) {
    const tokens = message.estimatedTokens ?? estimateTokens(message.content);
    if (message.role === "assistant") completion += tokens;
    else prompt += tokens;
  }
  return { prompt, completion, total: prompt + completion };
}

/** Cost placeholder — returns null until billing rates are configured. */
export function estimateCostUsd(_tokens: number, _providerId: string): number | null {
  void _tokens;
  void _providerId;
  return null;
}

export function buildUsageSnapshot(input: {
  messages: readonly AiMessage[];
  providerId: string;
  model: string;
}): AiUsageSnapshot {
  const { prompt, completion, total } = estimateMessageTokens(input.messages);
  return {
    estimatedPromptTokens: prompt,
    estimatedCompletionTokens: completion,
    estimatedTotalTokens: total,
    estimatedCostUsd: estimateCostUsd(total, input.providerId),
    providerId: input.providerId,
    model: input.model,
    updatedAt: new Date().toISOString(),
  };
}
