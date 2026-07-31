/**
 * Agent memory engine — working, conversation, business, long-term, workspace, agent.
 */

import type { MemoryRecord, MemoryScope } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function createMemoryRecord(input: {
  readonly organizationId: string;
  readonly scope: MemoryScope;
  readonly key: string;
  readonly value: unknown;
  readonly agentInstanceId?: string;
  readonly expiresAt?: string;
}): MemoryRecord {
  return {
    id: createId("mem"),
    organizationId: input.organizationId,
    agentInstanceId: input.agentInstanceId,
    scope: input.scope,
    key: input.key,
    value: input.value,
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
  };
}

export function filterMemory(
  records: readonly MemoryRecord[],
  query: {
    readonly organizationId: string;
    readonly scope?: MemoryScope;
    readonly agentInstanceId?: string;
    readonly key?: string;
  },
): readonly MemoryRecord[] {
  const now = Date.now();
  return records.filter((r) => {
    if (r.organizationId !== query.organizationId) return false;
    if (r.expiresAt && Date.parse(r.expiresAt) <= now) return false;
    if (query.scope && r.scope !== query.scope) return false;
    if (query.agentInstanceId && r.agentInstanceId !== query.agentInstanceId) {
      return false;
    }
    if (query.key && r.key !== query.key) return false;
    return true;
  });
}
