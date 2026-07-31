/**
 * Reasoning engine — multi-step reasoning, reflection, self-check, confidence.
 */

import type { ReasoningTrace } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function buildReasoningTrace(input: {
  readonly taskId: string;
  readonly goal: string;
  readonly observations?: readonly string[];
}): ReasoningTrace {
  const steps = [
    `Understand goal: ${input.goal}`,
    "Gather relevant context and knowledge",
    "Select tools within permission boundaries",
    ...(input.observations ?? []),
    "Produce actionable output",
  ];
  const confidence = Math.min(
    0.95,
    0.55 + steps.length * 0.06 + (input.observations?.length ?? 0) * 0.05,
  );
  return {
    id: createId("reason"),
    taskId: input.taskId,
    steps,
    reflection: "Placeholder reflection — validate assumptions against sources.",
    selfCheck: "Placeholder self-check — confirm tool allowlist and data scope.",
    confidence: Math.round(confidence * 100) / 100,
    createdAt: new Date().toISOString(),
  };
}
