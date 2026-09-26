/**
 * Load Phase 19 activation from the session actor and existing rows.
 */

import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import {
  getAgentOsStateForActor,
  putAgentOsStateForActor,
} from "@/app/lib/agents/persistence";
import type { Actor } from "@/app/lib/tenancy/types";
import type { AgentsPersistedState } from "@/features/agents/repositories";
import type { WorkforceWorker } from "@/features/agents/types";
import { ACTIVATION_CRM_FOLLOW_UP_STATEMENT } from "./statement";
import {
  deriveActivation,
  isActivationCommunicationWorker,
  type ActivationCustomerInput,
  type ActivationExecutionInput,
  type DerivedActivation,
} from "./derive";
import { buildActivationCommunicationWorker } from "./workerRecord";

export interface ActivationStatus extends DerivedActivation {
  readonly ok: true;
  readonly organizationId: string;
  readonly actorId: string;
  readonly customers: readonly ActivationCustomerInput[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export async function loadActivationStatus(actor: Actor): Promise<ActivationStatus> {
  const [customers, state, approval, completedRow] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId: actor.organizationId, isSample: false },
      select: { id: true, companyName: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    getAgentOsStateForActor(actor),
    prisma.agentGovernedEvidence.findFirst({
      where: {
        organizationId: actor.organizationId,
        capabilityId: "CRM_CREATE_NOTE",
        action: "approval.granted",
        status: "APPROVED",
      },
      select: { executionId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentGovernedExecution.findFirst({
      where: {
        organizationId: actor.organizationId,
        capabilityId: "CRM_CREATE_NOTE",
        status: "COMPLETED",
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const verification = completedRow
    ? await prisma.agentGovernedEvidence.findFirst({
        where: {
          organizationId: actor.organizationId,
          executionId: completedRow.executionId,
          capabilityId: "CRM_CREATE_NOTE",
          action: "verification.result",
          status: "verified",
        },
        select: { executionId: true },
      })
    : null;

  const outcome = asRecord(completedRow?.outcome);
  const completed: ActivationExecutionInput | null =
    completedRow && readString(outcome, "noteId") && readString(outcome, "customerId")
      ? {
          executionId: completedRow.executionId,
          noteId: readString(outcome, "noteId"),
          customerId: readString(outcome, "customerId"),
          workerId: completedRow.workerId,
          actorId: completedRow.actorId,
        }
      : null;

  const followUpStarted = (state.businessGoals ?? []).some((goal) => {
    if (goal.organizationId !== actor.organizationId) return false;
    return (
      goal.goalType === "crm_follow_up" ||
      goal.statement.trim() === ACTIVATION_CRM_FOLLOW_UP_STATEMENT
    );
  });

  const derived = deriveActivation({
    organizationId: actor.organizationId,
    customers,
    workers: state.workers ?? [],
    followUpStarted,
    approvedExecutionIds: approval ? [approval.executionId] : [],
    completed,
    verifiedExecutionIds: verification ? [verification.executionId] : [],
  });

  return {
    ok: true,
    organizationId: actor.organizationId,
    actorId: actor.userId,
    customers,
    ...derived,
  };
}

export async function activateCommunicationWorkerForActor(
  actor: Actor,
): Promise<WorkforceWorker> {
  const state = await getAgentOsStateForActor(actor);
  const workers = state.workers ?? [];
  const existing = workers.find((worker) =>
    isActivationCommunicationWorker(worker, actor.organizationId),
  );
  if (existing) return existing;

  const replacement = buildActivationCommunicationWorker(actor.organizationId);
  const previous = workers.find(
    (worker) =>
      worker.organizationId === actor.organizationId &&
      worker.role === "CUSTOMER_COMMUNICATION",
  );
  const nextWorker: WorkforceWorker = previous
    ? {
        ...replacement,
        id: previous.id,
        createdAt: previous.createdAt,
      }
    : replacement;
  const nextWorkers = [
    ...workers.filter((worker) => worker.id !== nextWorker.id),
    nextWorker,
  ];
  const next: AgentsPersistedState = {
    ...state,
    workers: nextWorkers,
  };
  await putAgentOsStateForActor(actor, next);
  return nextWorker;
}
