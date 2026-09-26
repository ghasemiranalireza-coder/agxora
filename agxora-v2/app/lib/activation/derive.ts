/**
 * Phase 19 activation is derived from existing records.
 * This module does not read a database and does not create one.
 */

export const ACTIVATION_STEP_IDS = [
  "organization",
  "customer",
  "worker",
  "goal",
  "approval",
  "verification",
] as const;

export type ActivationStepId = (typeof ACTIVATION_STEP_IDS)[number];

export interface ActivationWorkerInput {
  readonly id: string;
  readonly organizationId: string;
  readonly role: string;
  readonly status: string;
  readonly allowedCapabilities: readonly string[];
}

export interface ActivationCustomerInput {
  readonly id: string;
  readonly companyName: string;
}

export interface ActivationExecutionInput {
  readonly executionId: string;
  readonly noteId: string;
  readonly customerId: string;
  readonly workerId?: string | null;
  readonly actorId: string;
}

export interface DeriveActivationInput {
  readonly organizationId: string;
  readonly customers: readonly ActivationCustomerInput[];
  readonly workers: readonly ActivationWorkerInput[];
  readonly followUpStarted: boolean;
  readonly approvedExecutionIds: readonly string[];
  readonly completed: ActivationExecutionInput | null;
  readonly verifiedExecutionIds: readonly string[];
}

export interface ActivationResult {
  readonly customerId: string;
  readonly companyName: string;
  readonly noteId: string;
  readonly executionId: string;
  readonly workerId: string | null;
  readonly actorId: string;
  readonly verified: true;
}

export interface DerivedActivation {
  readonly steps: readonly { readonly id: ActivationStepId; readonly done: boolean }[];
  readonly next: ActivationStepId | "done";
  readonly workerId: string | null;
  readonly result: ActivationResult | null;
}

const FINANCE_CAPABILITY = "FINANCE_CREATE_INVOICE";
const NOTE_CAPABILITY = "CRM_CREATE_NOTE";

export function isActivationCommunicationWorker(
  worker: ActivationWorkerInput,
  organizationId: string,
): boolean {
  return (
    worker.organizationId === organizationId &&
    worker.role === "CUSTOMER_COMMUNICATION" &&
    worker.status === "ACTIVE" &&
    worker.allowedCapabilities.includes(NOTE_CAPABILITY) &&
    !worker.allowedCapabilities.includes(FINANCE_CAPABILITY)
  );
}

export function deriveActivation(input: DeriveActivationInput): DerivedActivation {
  const organizationReady = input.organizationId.trim().length > 0;
  const hasCustomer = input.customers.length > 0;
  const worker = input.workers.find((item) =>
    isActivationCommunicationWorker(item, input.organizationId),
  );
  const approved =
    input.approvedExecutionIds.length > 0 || input.completed !== null;
  const followUpRecorded = input.followUpStarted || approved;
  const verified = Boolean(
    input.completed &&
      input.verifiedExecutionIds.includes(input.completed.executionId),
  );
  const customer = input.completed
    ? input.customers.find((item) => item.id === input.completed?.customerId)
    : undefined;
  const result: ActivationResult | null =
    verified && input.completed && input.completed.noteId && input.completed.customerId
      ? {
          customerId: input.completed.customerId,
          companyName: customer?.companyName ?? "",
          noteId: input.completed.noteId,
          executionId: input.completed.executionId,
          workerId: input.completed.workerId ?? worker?.id ?? null,
          actorId: input.completed.actorId,
          verified: true,
        }
      : null;

  const done: Record<ActivationStepId, boolean> = {
    organization: organizationReady,
    customer: hasCustomer,
    worker: Boolean(worker),
    goal: followUpRecorded,
    approval: approved,
    verification: verified,
  };

  const steps = ACTIVATION_STEP_IDS.map((id) => ({ id, done: done[id] }));
  const next = steps.find((step) => !step.done)?.id ?? "done";
  return { steps, next, workerId: worker?.id ?? null, result };
}
