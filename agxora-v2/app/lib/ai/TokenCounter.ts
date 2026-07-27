/**
 * TokenCounter — estimate tokens and trim context windows.
 */

export {
  estimateTokens,
  estimateMessagesTokens,
  trimToContextWindow,
  type TrimResult,
} from "./AITokenCounter";

import {
  estimateMessagesTokens,
  estimateTokens,
  trimToContextWindow,
} from "./AITokenCounter";
import type { AIMessageSlice } from "./AIContext";

export class TokenCounter {
  estimate(text: string): number {
    return estimateTokens(text);
  }

  estimateMessages(messages: readonly AIMessageSlice[]): number {
    return estimateMessagesTokens(messages);
  }

  trim(input: {
    messages: readonly AIMessageSlice[];
    modelId: string;
    reserveOutputTokens?: number;
  }) {
    return trimToContextWindow(input);
  }
}

export const tokenCounter = new TokenCounter();
