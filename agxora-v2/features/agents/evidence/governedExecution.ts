/**
 * In-process governed execution identity.
 * Production mutations also reserve the same key in Postgres.
 * This store keeps orchestration tests deterministic without a database.
 */

export type GovernedExecutionStatus = "RESERVED" | "COMPLETED" | "FAILED";

export interface GovernedExecutionClaim {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly businessGoalId?: string;
  readonly planId?: string;
  readonly stepId?: string;
  readonly capabilityId: string;
  readonly workerId?: string;
  readonly actorId: string;
  readonly approvalRequired: boolean;
  readonly approvalGranted: boolean;
}

export interface GovernedEvidenceInput {
  readonly organizationId: string;
  readonly executionId: string;
  readonly businessGoalId?: string;
  readonly planId?: string;
  readonly stepId?: string;
  readonly capabilityId?: string;
  readonly workerId?: string;
  readonly actorId?: string;
  readonly action: string;
  readonly status: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface GovernedEvidenceRecord extends GovernedEvidenceInput {
  readonly id: string;
  readonly createdAt: string;
}

export type GovernedClaimResult =
  | { readonly kind: "reserved" }
  | { readonly kind: "replay"; readonly outcome: Readonly<Record<string, unknown>>; readonly status: GovernedExecutionStatus }
  | { readonly kind: "in_progress" };

interface Row {
  claim: GovernedExecutionClaim;
  status: GovernedExecutionStatus;
  verificationStatus: string;
  outcome: Record<string, unknown>;
}

const rows = new Map<string, Row>();
const evidence: GovernedEvidenceRecord[] = [];
const chains = new Map<string, Promise<unknown>>();

function keyOf(organizationId: string, idempotencyKey: string): string {
  return `${organizationId}\n${idempotencyKey}`;
}

function lock<T>(key: string, run: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const next = previous.then(run, run);
  chains.set(key, next.then(() => undefined, () => undefined));
  return next;
}

export function resetGovernedExecutionMemory(): void {
  rows.clear();
  evidence.length = 0;
  chains.clear();
}

export function claimGovernedExecution(input: GovernedExecutionClaim): Promise<GovernedClaimResult> {
  const key = keyOf(input.organizationId, input.idempotencyKey);
  return lock(key, async () => {
    const existing = rows.get(key);
    if (!existing) {
      rows.set(key, {
        claim: input,
        status: "RESERVED",
        verificationStatus: "pending",
        outcome: {},
      });
      return { kind: "reserved" };
    }
    if (existing.status === "COMPLETED" || (existing.status === "FAILED" && existing.outcome.mutated === true)) {
      return { kind: "replay", outcome: existing.outcome, status: existing.status };
    }
    if (existing.status === "RESERVED") return { kind: "in_progress" };
    existing.status = "RESERVED";
    existing.claim = input;
    return { kind: "reserved" };
  });
}

export async function completeGovernedExecution(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly outcome: Readonly<Record<string, unknown>>;
  readonly verificationStatus: string;
}): Promise<void> {
  const key = keyOf(input.organizationId, input.idempotencyKey);
  await lock(key, async () => {
    const row = rows.get(key);
    if (!row || row.status === "FAILED") return;
    row.status = "COMPLETED";
    row.verificationStatus = input.verificationStatus;
    row.outcome = { ...input.outcome, mutated: true };
  });
}

export async function failGovernedExecution(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly mutated: boolean;
}): Promise<void> {
  const key = keyOf(input.organizationId, input.idempotencyKey);
  await lock(key, async () => {
    const row = rows.get(key);
    if (!row || row.status === "COMPLETED") return;
    row.status = "FAILED";
    row.verificationStatus = "failed";
    row.outcome = { ...row.outcome, mutated: input.mutated };
  });
}

export function appendGovernedEvidence(input: GovernedEvidenceInput): GovernedEvidenceRecord {
  const record: GovernedEvidenceRecord = {
    ...input,
    id: `gev_${evidence.length + 1}_${input.action}`,
    createdAt: new Date().toISOString(),
  };
  evidence.push(record);
  return record;
}

export function recordGovernedEvidence(input: GovernedEvidenceInput): GovernedEvidenceRecord {
  const record = appendGovernedEvidence(input);
  if (typeof window === "undefined") return record;
  void fetch("/api/v1/agents/governed-evidence", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      executionId: input.executionId,
      businessGoalId: input.businessGoalId,
      planId: input.planId,
      stepId: input.stepId,
      capabilityId: input.capabilityId,
      workerId: input.workerId,
      action: input.action,
      status: input.status,
    }),
  }).catch(() => undefined);
  return record;
}

export function listGovernedEvidence(organizationId: string, executionId?: string): readonly GovernedEvidenceRecord[] {
  return evidence.filter(
    (row) =>
      row.organizationId === organizationId &&
      (!executionId || row.executionId === executionId),
  );
}
