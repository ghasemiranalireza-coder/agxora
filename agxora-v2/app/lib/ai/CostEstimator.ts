/**
 * CostEstimator — rough USD cost estimates per provider/model family.
 * Architecture-ready; rates are approximate placeholders.
 */

import { aiModelRegistry } from "./AIModelRegistry";
import { estimateTokens } from "./AITokenCounter";

/** Approximate USD per 1M tokens — update as pricing changes. */
const RATE_TABLE: Readonly<
  Record<string, { inputPerMillion: number; outputPerMillion: number }>
> = {
  openai: { inputPerMillion: 2.5, outputPerMillion: 10 },
  anthropic: { inputPerMillion: 3, outputPerMillion: 15 },
  google: { inputPerMillion: 1.25, outputPerMillion: 5 },
  openrouter: { inputPerMillion: 2, outputPerMillion: 8 },
  ollama: { inputPerMillion: 0, outputPerMillion: 0 },
  mock: { inputPerMillion: 0, outputPerMillion: 0 },
};

export interface CostEstimate {
  readonly providerId: string;
  readonly modelId: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly estimatedUsd: number;
}

export class CostEstimator {
  estimate(input: {
    modelId: string;
    promptText: string;
    completionText?: string;
    promptTokens?: number;
    completionTokens?: number;
  }): CostEstimate {
    const model = aiModelRegistry.get(input.modelId);
    const providerId = model?.providerId ?? "mock";
    const rates = RATE_TABLE[providerId] ?? RATE_TABLE.mock;
    const promptTokens =
      input.promptTokens ?? estimateTokens(input.promptText);
    const completionTokens =
      input.completionTokens ??
      estimateTokens(input.completionText ?? "");
    const estimatedUsd =
      (promptTokens / 1_000_000) * rates.inputPerMillion +
      (completionTokens / 1_000_000) * rates.outputPerMillion;

    return {
      providerId,
      modelId: input.modelId,
      promptTokens,
      completionTokens,
      estimatedUsd: Number(estimatedUsd.toFixed(6)),
    };
  }
}

export const costEstimator = new CostEstimator();
