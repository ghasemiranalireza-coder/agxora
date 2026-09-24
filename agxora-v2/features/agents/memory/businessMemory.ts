/**
 * Governed business memory on the existing Agent OS memory records.
 * This is not a second store. Only VERIFIED items are authoritative.
 */

import { auditLog } from "@/app/lib/backend/audit/logger";
import { agentsStore } from "../store";
import type { MemoryRecord } from "../types";
import { createMemoryRecord } from "./index";
import {
  isBusinessMemoryValue,
  type BusinessMemoryProvenance,
  type BusinessMemoryStatus,
  type BusinessMemorySubject,
  type BusinessMemoryType,
  type BusinessMemoryValue,
} from "./businessContext";

const TRUSTED: ReadonlySet<BusinessMemoryProvenance> = new Set([
  "CRM",
  "USER_INPUT",
  "VERIFIED_EXECUTION",
  "BUSINESS_GOAL",
  "SYSTEM",
  "IMPORTED_DATA",
]);

export interface BusinessMemoryDraft {
  readonly organizationId: string;
  readonly actorId?: string;
  readonly subjectType: BusinessMemorySubject;
  readonly subjectId?: string;
  readonly memoryType: BusinessMemoryType;
  readonly content: string;
  readonly status: BusinessMemoryStatus;
  readonly provenance: BusinessMemoryProvenance;
  readonly sourceReference?: string;
}

export interface BusinessGraphEdge {
  readonly organizationId: string;
  readonly type: "BELONGS_TO" | "HAS_MEMORY" | "ABOUT_CUSTOMER" | "RESULT_OF" | "VERIFIED_BY";
  readonly fromId: string;
  readonly toId: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function assertTenant(organizationId: string): string {
  const tenant = organizationId.trim();
  if (!tenant) throw new Error("Tenant context is required.");
  return tenant;
}

function assertVerified(draft: BusinessMemoryDraft): void {
  if (draft.status !== "VERIFIED") return;
  if (!TRUSTED.has(draft.provenance)) {
    throw new Error("Untrusted provenance cannot be verified.");
  }
}

function recordsFor(organizationId: string): readonly MemoryRecord[] {
  return agentsStore.getSnapshot().memories.filter(
    (record) => record.organizationId === organizationId && record.scope === "business" && isBusinessMemoryValue(record.value),
  );
}

export function createBusinessMemory(draft: BusinessMemoryDraft): MemoryRecord {
  const organizationId = assertTenant(draft.organizationId);
  assertVerified(draft);
  const content = draft.content.trim();
  if (!content) throw new Error("Memory content is required.");
  if (draft.subjectType === "customer" && !draft.subjectId?.trim()) {
    throw new Error("Customer memory requires a customer id.");
  }
  const now = nowIso();
  const value: BusinessMemoryValue = {
    kind: "business_memory",
    subjectType: draft.subjectType,
    subjectId: draft.subjectId?.trim() || undefined,
    memoryType: draft.memoryType,
    content,
    status: draft.status,
    provenance: draft.provenance,
    sourceReference: draft.sourceReference,
    verifiedAt: draft.status === "VERIFIED" ? now : undefined,
    conflict: false,
    history: [],
    updatedAt: now,
  };
  const record = createMemoryRecord({
    organizationId,
    scope: "business",
    key: `memory:${draft.memoryType}:${draft.subjectType}:${draft.subjectId ?? "org"}:${now}`,
    value,
  });
  agentsStore.pushMemory(record);
  auditLog({
    action: "business_memory.create",
    resource: "business_memory",
    resourceId: record.id,
    organizationId,
    actorUserId: draft.actorId,
    metadata: {
      status: value.status,
      provenance: value.provenance,
      memoryType: value.memoryType,
      subjectType: value.subjectType,
    },
  });
  return record;
}

/**
 * A conflicting newer fact is stored beside the previous content.
 * The previous wording stays in history. The planner does not pick a winner.
 */
export function updateBusinessMemory(input: {
  readonly organizationId: string;
  readonly actorId?: string;
  readonly memoryId: string;
  readonly content: string;
  readonly status: BusinessMemoryStatus;
  readonly provenance: BusinessMemoryProvenance;
  readonly sourceReference?: string;
}): MemoryRecord {
  const organizationId = assertTenant(input.organizationId);
  assertVerified({ ...input, subjectType: "organization", memoryType: "BUSINESS_FACT" });
  const current = agentsStore.getSnapshot().memories.find((record) => record.id === input.memoryId);
  if (!current || current.organizationId !== organizationId || !isBusinessMemoryValue(current.value)) {
    throw new Error("Memory not found.");
  }
  const previous = current.value;
  const content = input.content.trim();
  const conflict = previous.status === "VERIFIED" && input.status === "VERIFIED" && previous.content !== content;
  const next: BusinessMemoryValue = {
    ...previous,
    content,
    status: input.status,
    provenance: input.provenance,
    sourceReference: input.sourceReference ?? previous.sourceReference,
    verifiedAt: input.status === "VERIFIED" ? nowIso() : previous.verifiedAt,
    conflict: previous.conflict || conflict,
    history: [
      ...previous.history,
      {
        content: previous.content,
        status: previous.status,
        provenance: previous.provenance,
        recordedAt: previous.updatedAt,
      },
    ],
    updatedAt: nowIso(),
  };
  const record: MemoryRecord = { ...current, value: next };
  agentsStore.upsertMemory(record);
  auditLog({
    action: "business_memory.update",
    resource: "business_memory",
    resourceId: record.id,
    organizationId,
    actorUserId: input.actorId,
    metadata: {
      status: next.status,
      provenance: next.provenance,
      conflict: String(next.conflict),
      previousStatus: previous.status,
    },
  });
  return record;
}

export function listBusinessMemory(input: {
  readonly organizationId: string;
  readonly subjectType?: BusinessMemorySubject;
  readonly subjectId?: string;
  readonly status?: BusinessMemoryStatus;
  readonly memoryType?: BusinessMemoryType;
}): readonly MemoryRecord[] {
  const organizationId = assertTenant(input.organizationId);
  return recordsFor(organizationId).filter((record) => {
    if (!isBusinessMemoryValue(record.value)) return false;
    const value = record.value;
    if (input.subjectType && value.subjectType !== input.subjectType) return false;
    if (input.subjectId && value.subjectId !== input.subjectId) return false;
    if (input.status && value.status !== input.status) return false;
    if (input.memoryType && value.memoryType !== input.memoryType) return false;
    return true;
  });
}

export function authoritativeBusinessMemory(input: {
  readonly organizationId: string;
  readonly customerId?: string;
}): readonly MemoryRecord[] {
  return listBusinessMemory({ organizationId: input.organizationId, status: "VERIFIED" }).filter((record) => {
    if (!isBusinessMemoryValue(record.value)) return false;
    const value = record.value;
    if (value.conflict) return false;
    if (value.subjectType === "organization") return true;
    if (value.subjectType === "customer") return Boolean(input.customerId) && value.subjectId === input.customerId;
    return false;
  });
}

export function customerBusinessContext(input: {
  readonly organizationId: string;
  readonly customerId: string;
}): { readonly memories: readonly MemoryRecord[]; readonly edges: readonly BusinessGraphEdge[] } {
  const organizationId = assertTenant(input.organizationId);
  const customerId = input.customerId.trim();
  const memories = listBusinessMemory({ organizationId, subjectType: "customer", subjectId: customerId });
  return {
    memories,
    edges: [
      { organizationId, type: "BELONGS_TO", fromId: customerId, toId: organizationId },
      ...memories.map((record) => ({
        organizationId,
        type: "HAS_MEMORY" as const,
        fromId: customerId,
        toId: record.id,
      })),
      ...memories.map((record) => ({
        organizationId,
        type: "ABOUT_CUSTOMER" as const,
        fromId: record.id,
        toId: customerId,
      })),
    ],
  };
}

export function organizationBusinessContext(organizationId: string): {
  readonly memories: readonly MemoryRecord[];
  readonly edges: readonly BusinessGraphEdge[];
} {
  const tenant = assertTenant(organizationId);
  const memories = listBusinessMemory({ organizationId: tenant, subjectType: "organization" });
  return {
    memories,
    edges: memories.map((record) => ({
      organizationId: tenant,
      type: "HAS_MEMORY" as const,
      fromId: tenant,
      toId: record.id,
    })),
  };
}

export function goalBusinessContext(input: {
  readonly organizationId: string;
  readonly goalId: string;
}): { readonly memories: readonly MemoryRecord[]; readonly edges: readonly BusinessGraphEdge[] } {
  const organizationId = assertTenant(input.organizationId);
  const goal = (agentsStore.getSnapshot().businessGoals ?? []).find(
    (item) => item.id === input.goalId && item.organizationId === organizationId,
  );
  if (!goal) return { memories: [], edges: [] };
  const memories = listBusinessMemory({ organizationId }).filter((record) => {
    if (!isBusinessMemoryValue(record.value)) return false;
    if (record.value.subjectType === "goal") return record.value.subjectId === goal.id;
    if (record.value.subjectType === "customer") return record.value.subjectId === goal.customerId;
    return record.value.subjectType === "organization";
  });
  return {
    memories,
    edges: memories
      .filter((record) => isBusinessMemoryValue(record.value) && record.value.provenance === "VERIFIED_EXECUTION")
      .map((record) => ({
        organizationId,
        type: "RESULT_OF" as const,
        fromId: record.id,
        toId: goal.id,
      })),
  };
}
