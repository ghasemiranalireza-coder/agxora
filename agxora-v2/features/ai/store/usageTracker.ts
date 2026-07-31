/**
 * Session usage tracker — estimated tokens + cost placeholder.
 */

import type { AiUsageSnapshot } from "../types";
import { estimateCostUsd } from "../utils/tokens";

interface UsageAccumulator {
  promptTokens: number;
  completionTokens: number;
  providerId: string;
  model: string;
}

let accumulator: UsageAccumulator = {
  promptTokens: 0,
  completionTokens: 0,
  providerId: "mock",
  model: "mock-local",
};

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export const aiUsageTracker = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  record(input: {
    promptTokens?: number;
    completionTokens?: number;
    providerId: string;
    model: string;
  }): void {
    accumulator = {
      promptTokens:
        accumulator.promptTokens + Math.max(0, input.promptTokens ?? 0),
      completionTokens:
        accumulator.completionTokens +
        Math.max(0, input.completionTokens ?? 0),
      providerId: input.providerId,
      model: input.model,
    };
    emit();
  },

  reset(): void {
    accumulator = {
      promptTokens: 0,
      completionTokens: 0,
      providerId: "mock",
      model: "mock-local",
    };
    emit();
  },

  snapshot(): AiUsageSnapshot {
    const total = accumulator.promptTokens + accumulator.completionTokens;
    return {
      estimatedPromptTokens: accumulator.promptTokens,
      estimatedCompletionTokens: accumulator.completionTokens,
      estimatedTotalTokens: total,
      estimatedCostUsd: estimateCostUsd(total, accumulator.providerId),
      providerId: accumulator.providerId,
      model: accumulator.model,
      updatedAt: new Date().toISOString(),
    };
  },
};
