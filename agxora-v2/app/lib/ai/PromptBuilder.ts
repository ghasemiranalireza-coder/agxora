/**
 * PromptBuilder — modular prompt assembly pipeline.
 */

import type { AIRuntimeContext } from "./AIContext";
import {
  assemblePrompt,
  type AssembledPrompt,
} from "./prompt/assemblePrompt";

export class PromptBuilder {
  build(context: AIRuntimeContext): AssembledPrompt {
    return assemblePrompt(context);
  }

  sanitizeUserPrompt(text: string): string {
    return text.replace(/\u0000/g, "").trim().slice(0, 32_000);
  }
}

export const promptBuilder = new PromptBuilder();
