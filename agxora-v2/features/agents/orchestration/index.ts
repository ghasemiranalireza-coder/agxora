/**
 * Orchestration — agent-to-agent messages, delegation, supervisor.
 */

import type { AgentMessage } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function createAgentMessage(input: {
  readonly fromInstanceId: string;
  readonly toInstanceId: string;
  readonly type: AgentMessage["type"];
  readonly payload?: Readonly<Record<string, unknown>>;
}): AgentMessage {
  return {
    id: createId("amsg"),
    fromInstanceId: input.fromInstanceId,
    toInstanceId: input.toInstanceId,
    type: input.type,
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  };
}

/** Sequential execution order helper. */
export function sequentialOrder(
  instanceIds: readonly string[],
): readonly string[] {
  return [...instanceIds];
}

/** Parallel placeholder — returns same set tagged for future fan-out. */
export function parallelPlaceholder(
  instanceIds: readonly string[],
): { readonly mode: "parallel_placeholder"; readonly targets: readonly string[] } {
  return { mode: "parallel_placeholder", targets: instanceIds };
}
