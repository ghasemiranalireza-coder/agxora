/**
 * Business memory extension point.
 *
 * Day 9 stores one outcome record per finished goal under the existing
 * `business` memory scope. Future planners can read these records when
 * customer history, campaigns, decisions, or approved policies should
 * shape a plan. This is not a separate memory system.
 */

export const BUSINESS_GOAL_MEMORY_PREFIX = "goal:";

export const BUSINESS_MEMORY_FUTURE_CONTEXT = [
  "customer_history",
  "previous_conversations",
  "successful_campaigns",
  "previous_agent_decisions",
  "product_performance",
  "business_preferences",
  "approved_policies",
] as const;

export function businessGoalMemoryKey(goalId: string): string {
  return `${BUSINESS_GOAL_MEMORY_PREFIX}${goalId}`;
}

export interface BusinessGoalMemoryValue {
  readonly kind: "business_goal_outcome";
  readonly goalId: string;
  readonly planId: string;
  readonly statement: string;
  readonly customerId?: string;
  readonly noteId?: string;
  readonly recipient?: string;
  readonly delivery?: "queued";
  readonly verified: boolean;
  readonly recordedAt: string;
}

export type BusinessMemoryType =
  | "CUSTOMER_FACT"
  | "CUSTOMER_PREFERENCE"
  | "BUSINESS_FACT"
  | "BUSINESS_RULE"
  | "CUSTOMER_INTERACTION_SUMMARY"
  | "GOAL_OUTCOME"
  | "OPERATIONAL_FACT";

export type BusinessMemoryStatus = "UNVERIFIED" | "VERIFIED" | "STALE" | "REJECTED";

export type BusinessMemoryProvenance =
  | "CRM"
  | "USER_INPUT"
  | "VERIFIED_EXECUTION"
  | "BUSINESS_GOAL"
  | "SYSTEM"
  | "IMPORTED_DATA";

export type BusinessMemorySubject = "organization" | "customer" | "goal";

export interface BusinessMemoryRevision {
  readonly content: string;
  readonly status: BusinessMemoryStatus;
  readonly provenance: BusinessMemoryProvenance;
  readonly recordedAt: string;
}

/** Stored as the value of an existing business-scoped memory record. */
export interface BusinessMemoryValue {
  readonly kind: "business_memory";
  readonly subjectType: BusinessMemorySubject;
  readonly subjectId?: string;
  readonly memoryType: BusinessMemoryType;
  readonly content: string;
  readonly status: BusinessMemoryStatus;
  readonly provenance: BusinessMemoryProvenance;
  readonly sourceReference?: string;
  readonly verifiedAt?: string;
  readonly conflict: boolean;
  readonly history: readonly BusinessMemoryRevision[];
  readonly updatedAt: string;
}

export function isBusinessMemoryValue(value: unknown): value is BusinessMemoryValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as BusinessMemoryValue).kind === "business_memory";
}
