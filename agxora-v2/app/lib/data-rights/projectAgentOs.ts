/**
 * Phase 20 export slice of the existing Agent OS JSON.
 * Not a second store. Social credentials, messages, and traces are omitted.
 */

import { redactSecrets } from "./redact";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

function sameOrg(record: Record<string, unknown>, organizationId: string): boolean {
  const org = record.organizationId;
  return typeof org === "string" && org === organizationId;
}

function pick(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in record) output[key] = redactSecrets(record[key]);
  }
  return output;
}

export function projectAgentOsExport(payload: unknown, organizationId: string): {
  readonly workers: readonly Record<string, unknown>[];
  readonly goals: readonly Record<string, unknown>[];
  readonly plans: readonly Record<string, unknown>[];
  readonly approvals: readonly Record<string, unknown>[];
  readonly memories: readonly Record<string, unknown>[];
} {
  const root = asRecord(payload) ?? {};
  const workers = list(root.workers)
    .filter((item) => sameOrg(item, organizationId))
    .map((item) => pick(item, ["id", "organizationId", "role", "status", "name", "allowedCapabilities"]));
  const goals = list(root.businessGoals)
    .filter((item) => sameOrg(item, organizationId))
    .map((item) => pick(item, ["id", "organizationId", "statement", "status", "createdAt"]));
  const plans = list(root.plans)
    .filter((item) => sameOrg(item, organizationId))
    .map((item) => pick(item, ["id", "organizationId", "businessGoalId", "goalId", "status"]));
  const approvals = list(root.approvals)
    .filter((item) => sameOrg(item, organizationId))
    .map((item) => pick(item, ["id", "organizationId", "state", "stepId", "planId", "executionId"]));
  const memories = list(root.memories)
    .filter((item) => sameOrg(item, organizationId))
    .map((item) => pick(item, ["id", "organizationId", "key", "scope", "value", "createdAt"]));
  return { workers, goals, plans, approvals, memories };
}
