/**
 * Postgres reservation for one governed mutation.
 * Uniqueness is (organizationId, idempotencyKey). Client organization ids are ignored.
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";

export type DbClaimResult =
  | { readonly kind: "reserved" }
  | { readonly kind: "replay"; readonly outcome: Readonly<Record<string, unknown>> }
  | { readonly kind: "in_progress" };

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function claimGovernedExecutionDb(input: {
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
}): Promise<DbClaimResult> {
  try {
    await prisma.agentGovernedExecution.create({
      data: {
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
        executionId: input.executionId,
        businessGoalId: input.businessGoalId,
        planId: input.planId,
        stepId: input.stepId,
        capabilityId: input.capabilityId,
        workerId: input.workerId,
        actorId: input.actorId,
        approvalRequired: input.approvalRequired,
        approvalGranted: input.approvalGranted,
        status: "RESERVED",
      },
    });
    return { kind: "reserved" };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await prisma.agentGovernedExecution.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: input.organizationId,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });
    if (!existing) return { kind: "in_progress" };
    const outcome = existing.outcome;
    const record =
      outcome && typeof outcome === "object" && !Array.isArray(outcome)
        ? (outcome as Record<string, unknown>)
        : {};
    if (existing.status === "COMPLETED" || (existing.status === "FAILED" && record.mutated === true)) {
      return { kind: "replay", outcome: record };
    }
    if (existing.status === "FAILED") {
      const reopened = await prisma.agentGovernedExecution.updateMany({
        where: { id: existing.id, status: "FAILED" },
        data: {
          status: "RESERVED",
          executionId: input.executionId,
          capabilityId: input.capabilityId,
          workerId: input.workerId,
          actorId: input.actorId,
          approvalRequired: input.approvalRequired,
          approvalGranted: input.approvalGranted,
          verificationStatus: "pending",
          outcome: {},
        },
      });
      if (reopened.count === 1) return { kind: "reserved" };
      return { kind: "in_progress" };
    }
    return { kind: "in_progress" };
  }
}

export async function completeGovernedExecutionDb(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly outcome: Readonly<Record<string, unknown>>;
  readonly verificationStatus: string;
}): Promise<void> {
  const existing = await prisma.agentGovernedExecution.findUnique({
    where: {
      organizationId_idempotencyKey: {
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (!existing || existing.status === "FAILED") return;
  await prisma.agentGovernedExecution.update({
    where: { id: existing.id },
    data: {
      status: "COMPLETED",
      verificationStatus: input.verificationStatus,
      outcome: input.outcome as Prisma.InputJsonValue,
    },
  });
}

export async function failGovernedExecutionDb(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly mutated: boolean;
}): Promise<void> {
  const existing = await prisma.agentGovernedExecution.findUnique({
    where: {
      organizationId_idempotencyKey: {
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (!existing || existing.status === "COMPLETED") return;
  await prisma.agentGovernedExecution.update({
    where: { id: existing.id },
    data: {
      status: "FAILED",
      verificationStatus: "failed",
      outcome: { mutated: input.mutated },
    },
  });
}

export async function appendGovernedEvidenceDb(input: {
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
}): Promise<void> {
  await prisma.agentGovernedEvidence.create({
    data: {
      organizationId: input.organizationId,
      executionId: input.executionId,
      businessGoalId: input.businessGoalId,
      planId: input.planId,
      stepId: input.stepId,
      capabilityId: input.capabilityId,
      workerId: input.workerId,
      actorId: input.actorId,
      action: input.action,
      status: input.status,
      metadata: input.metadata ?? {},
    },
  });
}
