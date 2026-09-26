/**
 * Safe support view of append-only governed evidence.
 * Organization scope is applied by the caller. This projection never returns
 * email bodies, tokens, or the raw outcome document.
 */

import { redactSecrets } from "./redact";

export interface SafeExecutionOutcome {
  readonly mutated: boolean | null;
  readonly ambiguous: boolean;
  readonly delivery: string | null;
  readonly customerId: string | null;
  readonly noteId: string | null;
  readonly replayed: boolean;
}

export interface SafeGovernedEvidence {
  readonly id: string;
  readonly organizationId: string;
  readonly workerId: string | null;
  readonly actorId: string | null;
  readonly businessGoalId: string | null;
  readonly planId: string | null;
  readonly stepId: string | null;
  readonly executionId: string;
  readonly capabilityId: string | null;
  readonly action: string;
  readonly status: string;
  readonly createdAt: string;
  readonly idempotencyKey: string | null;
  readonly customerId: string | null;
  readonly noteId: string | null;
  readonly deliveryState: string | null;
  readonly approvalStatus: string | null;
  readonly verificationStatus: string | null;
  readonly executionStatus: string | null;
  readonly executionUpdatedAt: string | null;
  readonly outcome: SafeExecutionOutcome;
}

export interface EvidenceSourceRow {
  readonly id: string;
  readonly organizationId: string;
  readonly executionId: string;
  readonly businessGoalId: string | null;
  readonly planId: string | null;
  readonly stepId: string | null;
  readonly capabilityId: string | null;
  readonly workerId: string | null;
  readonly actorId: string | null;
  readonly action: string;
  readonly status: string;
  readonly metadata: unknown;
  readonly createdAt: Date;
}

export interface ExecutionSourceRow {
  readonly executionId: string;
  readonly idempotencyKey: string;
  readonly status: string;
  readonly approvalGranted: boolean;
  readonly approvalRequired: boolean;
  readonly verificationStatus: string;
  readonly outcome: unknown;
  readonly updatedAt: Date;
  readonly customerId?: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function projectExecutionOutcome(outcome: unknown): SafeExecutionOutcome {
  const safe = asRecord(redactSecrets(outcome));
  const delivery = text(safe.delivery);
  return {
    mutated: typeof safe.mutated === "boolean" ? safe.mutated : null,
    ambiguous: safe.ambiguous === true,
    delivery,
    customerId: text(safe.customerId),
    noteId: text(safe.noteId),
    replayed: safe.replayed === true,
  };
}

export function projectGovernedEvidence(
  row: EvidenceSourceRow,
  execution: ExecutionSourceRow | null,
): SafeGovernedEvidence {
  const metadata = asRecord(redactSecrets(row.metadata));
  const outcome = projectExecutionOutcome(execution?.outcome);
  const approvalFromMetadata = text(metadata.approval);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workerId: row.workerId,
    actorId: row.actorId,
    businessGoalId: row.businessGoalId,
    planId: row.planId,
    stepId: row.stepId,
    executionId: row.executionId,
    capabilityId: row.capabilityId,
    action: row.action,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    idempotencyKey: execution?.idempotencyKey ?? text(metadata.idempotencyKey),
    customerId: outcome.customerId ?? text(metadata.customerId),
    noteId: outcome.noteId ?? text(metadata.noteId),
    deliveryState: outcome.delivery,
    approvalStatus: approvalFromMetadata ?? (execution ? (execution.approvalGranted ? "APPROVED" : execution.approvalRequired ? "REQUIRED" : null) : null),
    verificationStatus: execution?.verificationStatus ?? text(metadata.verificationStatus),
    executionStatus: execution?.status ?? null,
    executionUpdatedAt: execution ? execution.updatedAt.toISOString() : null,
    outcome,
  };
}
