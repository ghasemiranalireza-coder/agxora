/**
 * Customer-confirmed business facts.
 * A model draft, plan, or image prompt cannot become a verified fact.
 */

import { createHash } from "node:crypto";
import { createMemoryRecord } from "@/features/agents/memory";
import {
  BUSINESS_FACT_CATEGORIES,
  isBusinessMemoryValue,
  type BusinessFactCategory,
  type BusinessFactDetails,
  type BusinessMemoryProvenance,
  type BusinessMemoryStatus,
  type BusinessMemoryValue,
} from "@/features/agents/memory/businessContext";
import type { MemoryRecord } from "@/features/agents/types";

export const BUSINESS_FACT_CAPABILITY = "MARKETING_RECORD_BUSINESS_FACT";

export interface ConfirmedBusinessFact {
  readonly category: BusinessFactCategory;
  readonly statement: string;
  readonly allowedForMarketing: boolean;
}

export function normalizeBusinessFactStatement(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isBusinessFactCategory(value: unknown): value is BusinessFactCategory {
  return typeof value === "string" && (BUSINESS_FACT_CATEGORIES as readonly string[]).includes(value);
}

export function businessFactHash(fact: ConfirmedBusinessFact): string {
  const statement = normalizeBusinessFactStatement(fact.statement);
  const payload = `${fact.category}\n${fact.allowedForMarketing ? "1" : "0"}\n${statement}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function businessFactIdempotencyKey(organizationId: string, factHash: string): string {
  return `bizfact:v1:${organizationId}:${factHash}`;
}

/** Synchronous claim decision. Production uniqueness is the governed-execution row. */
export function decideFactClaim(
  status: "COMPLETED" | "FAILED" | "RESERVED" | "EXECUTING" | "AMBIGUOUS" | null,
): "replay" | "retry" | "in_progress" | "reserve" {
  if (status === "COMPLETED") return "replay";
  if (status === "FAILED") return "retry";
  if (status === null) return "reserve";
  return "in_progress";
}

export function parseBusinessFactConfirmation(
  body: {
    readonly action?: unknown;
    readonly category?: unknown;
    readonly statement?: unknown;
    readonly allowedForMarketing?: unknown;
    readonly organizationId?: unknown;
    readonly workerId?: unknown;
    readonly status?: unknown;
    readonly provenance?: unknown;
    readonly verified?: unknown;
    readonly actorId?: unknown;
  } | null,
):
  | { readonly ok: true; readonly fact: ConfirmedBusinessFact }
  | { readonly ok: false; readonly status: 400; readonly error: string } {
  void body?.organizationId;
  void body?.workerId;
  void body?.status;
  void body?.provenance;
  void body?.verified;
  void body?.actorId;
  if (body?.action !== "confirm") {
    return { ok: false, status: 400, error: "Confirm the fact before it can be saved." };
  }
  if (!isBusinessFactCategory(body.category)) {
    return { ok: false, status: 400, error: "Choose a business fact category." };
  }
  if (typeof body.allowedForMarketing !== "boolean") {
    return { ok: false, status: 400, error: "Say whether marketing may use this fact." };
  }
  const statement = typeof body.statement === "string" ? normalizeBusinessFactStatement(body.statement) : "";
  if (!statement) {
    return { ok: false, status: 400, error: "Enter the fact in your own words." };
  }
  if (statement.length > 500) {
    return { ok: false, status: 400, error: "A business fact must be 500 characters or fewer." };
  }
  return {
    ok: true,
    fact: {
      category: body.category,
      statement,
      allowedForMarketing: body.allowedForMarketing,
    },
  };
}

function details(fact: ConfirmedBusinessFact): BusinessFactDetails {
  return {
    category: fact.category,
    statement: normalizeBusinessFactStatement(fact.statement),
    allowedForMarketing: fact.allowedForMarketing,
    source: "customer_confirmation",
  };
}

export function isAuthoritativeBusinessFact(
  record: MemoryRecord,
  organizationId: string,
): boolean {
  if (record.organizationId !== organizationId || record.scope !== "business") return false;
  if (!isBusinessMemoryValue(record.value)) return false;
  const value = record.value;
  return value.memoryType === "BUSINESS_FACT"
    && value.subjectType === "organization"
    && value.status === "VERIFIED"
    && value.provenance === "USER_INPUT"
    && value.conflict !== true
    && value.fact?.source === "customer_confirmation"
    && value.fact.statement === value.content;
}

export function authoritativeBusinessFacts(
  memories: readonly MemoryRecord[],
  organizationId: string,
): readonly MemoryRecord[] {
  return memories.filter((record) => isAuthoritativeBusinessFact(record, organizationId));
}

export interface BusinessFactHistoryView {
  readonly statement: string;
  readonly status: BusinessMemoryStatus;
  readonly recordedAt: string;
}

/** Read model for one stored organization business fact. Client fields are not inputs. */
export interface BusinessFactView {
  readonly memoryId: string;
  readonly category: string | null;
  readonly statement: string;
  readonly allowedForMarketing: boolean;
  readonly status: BusinessMemoryStatus;
  readonly provenance: BusinessMemoryProvenance;
  readonly authoritative: boolean;
  readonly conflict: boolean;
  readonly updatedAt: string;
  readonly verifiedAt: string | null;
  readonly previous: BusinessFactHistoryView | null;
}

function isOrganizationBusinessFact(record: MemoryRecord, organizationId: string): boolean {
  if (record.organizationId !== organizationId || record.scope !== "business") return false;
  if (!isBusinessMemoryValue(record.value)) return false;
  return record.value.memoryType === "BUSINESS_FACT" && record.value.subjectType === "organization";
}

function previousHistory(value: BusinessMemoryValue): BusinessFactHistoryView | null {
  const previous = value.history.at(-1);
  if (!previous) return null;
  return {
    statement: previous.content,
    status: previous.status,
    recordedAt: previous.recordedAt,
  };
}

function toBusinessFactView(record: MemoryRecord, organizationId: string): BusinessFactView {
  const value = record.value as BusinessMemoryValue;
  return {
    memoryId: record.id,
    category: value.fact?.category ?? null,
    statement: value.content,
    allowedForMarketing: value.fact?.allowedForMarketing === true,
    status: value.status,
    provenance: value.provenance,
    authoritative: isAuthoritativeBusinessFact(record, organizationId),
    conflict: value.conflict === true,
    updatedAt: value.updatedAt,
    verifiedAt: typeof value.verifiedAt === "string" ? value.verifiedAt : null,
    previous: previousHistory(value),
  };
}

/**
 * Split stored organization business facts into the set the claim gate can use
 * and the set it withholds. Authoritative uses the existing predicate only.
 */
export function projectBusinessFactRead(
  memories: readonly MemoryRecord[],
  organizationId: string,
): { readonly facts: readonly BusinessFactView[]; readonly needsAttention: readonly BusinessFactView[] } {
  const facts: BusinessFactView[] = [];
  const needsAttention: BusinessFactView[] = [];
  for (const record of memories) {
    if (!isOrganizationBusinessFact(record, organizationId)) continue;
    const view = toBusinessFactView(record, organizationId);
    if (view.authoritative) facts.push(view);
    else needsAttention.push(view);
  }
  return { facts, needsAttention };
}

function sameFact(value: BusinessMemoryValue, fact: ConfirmedBusinessFact): boolean {
  const next = details(fact);
  return Boolean(
    value.fact
    && value.fact.category === next.category
    && value.fact.statement === next.statement
    && value.fact.allowedForMarketing === next.allowedForMarketing
    && value.content === next.statement,
  );
}

function categorySlot(
  memories: readonly MemoryRecord[],
  organizationId: string,
  category: BusinessFactCategory,
): MemoryRecord | undefined {
  return memories.find((record) => {
    if (record.organizationId !== organizationId || record.scope !== "business") return false;
    if (!isBusinessMemoryValue(record.value)) return false;
    return record.value.memoryType === "BUSINESS_FACT"
      && record.value.fact?.category === category
      && record.value.provenance === "USER_INPUT";
  });
}

export interface AppliedBusinessFact {
  readonly memories: readonly MemoryRecord[];
  readonly memoryId: string;
  readonly created: boolean;
  readonly conflict: boolean;
  readonly authoritative: boolean;
  readonly statement: string;
}

/**
 * Store one confirmed fact.
 * The same normalized fact does not create a second memory.
 * A different statement in the same category keeps history and withholds both
 * from authoritative context, matching the existing conflict flag.
 */
export function applyConfirmedBusinessFact(input: {
  readonly memories: readonly MemoryRecord[];
  readonly organizationId: string;
  readonly fact: ConfirmedBusinessFact;
  readonly sourceReference: string;
  readonly now?: string;
}): AppliedBusinessFact {
  const now = input.now ?? new Date().toISOString();
  const fact = details(input.fact);
  const existing = categorySlot(input.memories, input.organizationId, fact.category);
  if (existing && isBusinessMemoryValue(existing.value) && sameFact(existing.value, input.fact)) {
    const authoritative = isAuthoritativeBusinessFact(existing, input.organizationId);
    return {
      memories: input.memories,
      memoryId: existing.id,
      created: false,
      conflict: existing.value.conflict === true,
      authoritative,
      statement: fact.statement,
    };
  }
  if (existing && isBusinessMemoryValue(existing.value)) {
    const previous = existing.value;
    const next: BusinessMemoryValue = {
      ...previous,
      content: fact.statement,
      status: "VERIFIED",
      provenance: "USER_INPUT",
      sourceReference: input.sourceReference,
      verifiedAt: now,
      conflict: true,
      fact,
      history: [
        ...previous.history,
        {
          content: previous.content,
          status: previous.status,
          provenance: previous.provenance,
          recordedAt: previous.updatedAt,
        },
      ],
      updatedAt: now,
    };
    const record: MemoryRecord = { ...existing, value: next };
    return {
      memories: input.memories.map((item) => item.id === record.id ? record : item),
      memoryId: record.id,
      created: false,
      conflict: true,
      authoritative: false,
      statement: fact.statement,
    };
  }
  const value: BusinessMemoryValue = {
    kind: "business_memory",
    subjectType: "organization",
    memoryType: "BUSINESS_FACT",
    content: fact.statement,
    status: "VERIFIED",
    provenance: "USER_INPUT",
    sourceReference: input.sourceReference,
    conflict: false,
    history: [],
    verifiedAt: now,
    updatedAt: now,
    fact,
  };
  const record = createMemoryRecord({
    organizationId: input.organizationId,
    scope: "business",
    key: `memory:BUSINESS_FACT:organization:${fact.category}:${businessFactHash(input.fact)}`,
    value,
  });
  return {
    memories: [...input.memories, record],
    memoryId: record.id,
    created: true,
    conflict: false,
    authoritative: true,
    statement: fact.statement,
  };
}

export function businessFactPlannerLine(record: MemoryRecord): string | null {
  if (!isBusinessMemoryValue(record.value) || !record.value.fact) return null;
  const fact = record.value.fact;
  const use = fact.allowedForMarketing ? "allowed" : "not allowed";
  return `Verified business fact. Category: ${fact.category}. Statement: ${fact.statement}. Marketing: ${use}.`;
}
