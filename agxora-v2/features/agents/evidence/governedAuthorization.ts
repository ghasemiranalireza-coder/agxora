/**
 * Server-side gate for a governed mutation.
 * Identity and approval come from the session and the persisted Agent OS document.
 * Request JSON cannot grant approval or choose the actor, worker, or organization.
 */

import { authorizeCapabilityExecution } from "../capabilities/registry";

export interface GovernedApprovalRecord {
  readonly organizationId: string;
  readonly executionId: string;
  readonly stepId: string;
  readonly state: string;
}

export interface GovernedExecutionRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly planId?: string;
  readonly workerId?: string;
  readonly actorId?: string;
}

export interface GovernedPlanStepRecord {
  readonly id: string;
  readonly capabilityId?: string;
  readonly idempotencyKey?: string;
}

export interface GovernedPlanRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly goalId?: string;
  readonly steps: readonly GovernedPlanStepRecord[];
}

export interface GovernedGoalRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly planId?: string;
  readonly workerId?: string;
  readonly actorId?: string;
}

export interface GovernedWorkerRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly status: string;
  readonly allowedCapabilities: readonly string[];
}

export interface GovernedOsSnapshot {
  readonly approvals: readonly GovernedApprovalRecord[];
  readonly executions: readonly GovernedExecutionRecord[];
  readonly plans: readonly GovernedPlanRecord[];
  readonly businessGoals?: readonly GovernedGoalRecord[];
  readonly workers?: readonly GovernedWorkerRecord[];
}

export interface GovernedMutationContext {
  readonly organizationId: string;
  readonly actorId: string;
  readonly workerId?: string;
  readonly businessGoalId?: string;
  readonly planId: string;
  readonly stepId: string;
  readonly executionId: string;
  readonly capabilityId: string;
  readonly idempotencyKey: string;
  readonly approvalState: "APPROVED";
}

export type GovernedAuthorization =
  | { readonly ok: true; readonly context: GovernedMutationContext }
  | { readonly ok: false; readonly status: 400 | 403 | 422; readonly message: string };

export function authorizeGovernedMutation(input: {
  readonly organizationId: string;
  readonly actorId: string;
  readonly capabilityId: string;
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly stepId: string;
  readonly state: GovernedOsSnapshot;
}): GovernedAuthorization {
  const idempotencyKey = input.idempotencyKey.trim();
  const executionId = input.executionId.trim();
  const stepId = input.stepId.trim();
  if (!idempotencyKey || !executionId || !stepId) {
    return {
      ok: false,
      status: 422,
      message: "A governed execution requires an idempotency key, execution, and step.",
    };
  }
  if (!input.organizationId.trim() || !input.actorId.trim()) {
    return { ok: false, status: 403, message: "Tenant and actor are required." };
  }

  const decision = authorizeCapabilityExecution({
    capabilityId: input.capabilityId,
    organizationId: input.organizationId,
  });
  if (!decision.ok) {
    return { ok: false, status: 403, message: decision.failure.reason };
  }
  if (decision.capability.execution.idempotencyRequired && !idempotencyKey) {
    return { ok: false, status: 422, message: "Idempotency key is required." };
  }
  if (decision.capability.approvalRequired !== true && decision.capability.mutating) {
    return { ok: false, status: 403, message: "Write capabilities require approval." };
  }

  const execution = input.state.executions.find(
    (item) => item.id === executionId && item.organizationId === input.organizationId,
  );
  if (!execution?.planId) {
    return { ok: false, status: 403, message: "Governed execution was not found for this organization." };
  }
  const plan = input.state.plans.find(
    (item) => item.id === execution.planId && item.organizationId === input.organizationId,
  );
  const step = plan?.steps.find((item) => item.id === stepId);
  if (!plan || !step || step.capabilityId !== input.capabilityId || step.idempotencyKey !== idempotencyKey) {
    return { ok: false, status: 403, message: "The governed step does not match this execution." };
  }
  const goal = (input.state.businessGoals ?? []).find(
    (item) => item.id === plan.goalId && item.organizationId === input.organizationId,
  );
  const approval = input.state.approvals.find(
    (item) =>
      item.organizationId === input.organizationId &&
      item.executionId === executionId &&
      item.stepId === stepId,
  );
  if (!approval || approval.state !== "APPROVED") {
    return { ok: false, status: 403, message: "This governed step is not approved." };
  }

  const workerId = execution.workerId || goal?.workerId;
  let resolvedWorker: string | undefined;
  if (workerId) {
    const worker = (input.state.workers ?? []).find((item) => item.id === workerId);
    if (!worker || worker.organizationId !== input.organizationId) {
      return { ok: false, status: 403, message: "Worker was not found in this organization." };
    }
    if (worker.status !== "ACTIVE" || !worker.allowedCapabilities.includes(input.capabilityId)) {
      return { ok: false, status: 403, message: "Worker is not allowed to use this capability." };
    }
    resolvedWorker = worker.id;
  }

  const governedActor = execution.actorId || goal?.actorId;
  if (governedActor && governedActor !== input.actorId) {
    return { ok: false, status: 403, message: "Actor does not match the governed execution." };
  }

  return {
    ok: true,
    context: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      workerId: resolvedWorker,
      businessGoalId: goal?.id,
      planId: plan.id,
      stepId,
      executionId,
      capabilityId: input.capabilityId,
      idempotencyKey,
      approvalState: "APPROVED",
    },
  };
}
