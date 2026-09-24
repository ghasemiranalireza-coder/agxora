/**
 * Postgres reservation for one governed mutation.
 * Uniqueness is (organizationId, idempotencyKey). Client organization ids are ignored.
 */

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { emailAttemptDecision } from "@/features/agents/evidence/governedExecution";

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

export type EmailAttempt =
  | { readonly kind: "send" }
  | { readonly kind: "replay"; readonly outcome: Readonly<Record<string, unknown>> }
  | { readonly kind: "in_progress" }
  | { readonly kind: "ambiguous" }
  | { readonly kind: "mismatch" };

function outcomeRecord(outcome: unknown): Record<string, unknown> {
  return outcome && typeof outcome === "object" && !Array.isArray(outcome)
    ? (outcome as Record<string, unknown>)
    : {};
}

export async function beginGovernedEmailAttempt(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly businessGoalId?: string;
  readonly planId?: string;
  readonly stepId?: string;
  readonly capabilityId: string;
  readonly workerId?: string;
  readonly actorId: string;
  readonly now?: Date;
}): Promise<EmailAttempt> {
  const now = input.now ?? new Date();
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
        approvalRequired: true,
        approvalGranted: true,
        status: "EXECUTING",
        attemptStartedAt: now,
      },
    });
    return { kind: "send" };
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
    const outcome = outcomeRecord(existing.outcome);
    if (existing.status === "COMPLETED" || (existing.status === "FAILED" && outcome.mutated === true)) {
      return { kind: "replay", outcome };
    }
    if (existing.status === "AMBIGUOUS") return { kind: "ambiguous" };
    const decision = emailAttemptDecision({
      status: existing.status,
      mutated: outcome.mutated === true,
      attemptStartedAt: (existing.attemptStartedAt ?? existing.createdAt).toISOString(),
      now: now.toISOString(),
    });
    if (decision === "replay") return { kind: "replay", outcome };
    if (decision === "reopen") {
      const reopened = await prisma.agentGovernedExecution.updateMany({
        where: { id: existing.id, status: "FAILED" },
        data: {
          status: "EXECUTING",
          attemptStartedAt: now,
          verificationStatus: "pending",
          outcome: {},
          actorId: input.actorId,
          workerId: input.workerId,
          executionId: input.executionId,
          capabilityId: input.capabilityId,
        },
      });
      return reopened.count === 1 ? { kind: "send" } : { kind: "in_progress" };
    }
    if (decision === "in_progress") return { kind: "in_progress" };
    const marked = await prisma.agentGovernedExecution.updateMany({
      where: { id: existing.id, status: existing.status },
      data: { status: "AMBIGUOUS", verificationStatus: "ambiguous", outcome: { mutated: false, ambiguous: true } },
    });
    if (marked.count === 1) {
      await appendGovernedEvidenceDb({
        organizationId: input.organizationId,
        executionId: input.executionId,
        businessGoalId: input.businessGoalId,
        planId: input.planId,
        stepId: input.stepId,
        capabilityId: input.capabilityId,
        workerId: input.workerId,
        actorId: input.actorId,
        action: "execution.result",
        status: "ambiguous",
        metadata: { idempotencyKey: input.idempotencyKey },
      });
    }
    return { kind: "ambiguous" };
  }
}

export async function completeGovernedEmailAttempt(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly outcome: Readonly<Record<string, unknown>>;
}): Promise<boolean> {
  const updated = await prisma.agentGovernedExecution.updateMany({
    where: {
      organizationId: input.organizationId,
      idempotencyKey: input.idempotencyKey,
      status: { in: ["EXECUTING", "AMBIGUOUS"] },
    },
    data: {
      status: "COMPLETED",
      verificationStatus: "pending",
      outcome: { ...input.outcome, mutated: true } as Prisma.InputJsonValue,
    },
  });
  return updated.count === 1;
}

export async function failGovernedEmailAttempt(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
}): Promise<void> {
  await prisma.agentGovernedExecution.updateMany({
    where: {
      organizationId: input.organizationId,
      idempotencyKey: input.idempotencyKey,
      status: "EXECUTING",
    },
    data: {
      status: "FAILED",
      verificationStatus: "failed",
      outcome: { mutated: false },
    },
  });
}

export async function ambiguousGovernedEmailAttempt(input: {
  readonly organizationId: string;
  readonly idempotencyKey: string;
}): Promise<void> {
  await prisma.agentGovernedExecution.updateMany({
    where: {
      organizationId: input.organizationId,
      idempotencyKey: input.idempotencyKey,
      status: "EXECUTING",
    },
    data: {
      status: "AMBIGUOUS",
      verificationStatus: "ambiguous",
      outcome: { mutated: false, ambiguous: true },
    },
  });
}

export async function commitGovernedCrmNote(input: {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly customerId: string;
  readonly idempotencyKey: string;
  readonly executionId: string;
  readonly businessGoalId?: string;
  readonly planId?: string;
  readonly stepId?: string;
  readonly capabilityId: string;
  readonly workerId?: string;
  readonly actorId: string;
  readonly title: string;
  readonly body: string;
  readonly author: string;
}): Promise<
  | { readonly kind: "created" | "replay"; readonly noteId: string; readonly customerId: string }
  | { readonly kind: "mismatch" | "in_progress" }
> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.agentGovernedExecution.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: input.organizationId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing?.status === "COMPLETED" || (existing?.status === "FAILED" && outcomeRecord(existing.outcome).mutated === true)) {
        const outcome = outcomeRecord(existing.outcome);
        const noteId = typeof outcome.noteId === "string" ? outcome.noteId : "";
        const customerId = typeof outcome.customerId === "string" ? outcome.customerId : "";
        if (!noteId || customerId !== input.customerId) return { kind: "mismatch" };
        return { kind: "replay", noteId, customerId };
      }
      if (existing && existing.status !== "RESERVED" && existing.status !== "FAILED") {
        return { kind: "in_progress" };
      }
      if (existing) {
        const claimed = await tx.agentGovernedExecution.updateMany({
          where: { id: existing.id, status: existing.status },
          data: { status: "EXECUTING", actorId: input.actorId, workerId: input.workerId },
        });
        if (claimed.count !== 1) return { kind: "in_progress" };
      } else {
        await tx.agentGovernedExecution.create({
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
            approvalRequired: true,
            approvalGranted: true,
            status: "EXECUTING",
          },
        });
      }
      const note = await tx.note.create({
        data: {
          organizationId: input.organizationId,
          workspaceId: input.workspaceId,
          customerId: input.customerId,
          title: input.title,
          body: input.body,
          author: input.author,
        },
      });
      const execution = existing
        ? existing
        : await tx.agentGovernedExecution.findUniqueOrThrow({
            where: {
              organizationId_idempotencyKey: {
                organizationId: input.organizationId,
                idempotencyKey: input.idempotencyKey,
              },
            },
          });
      await tx.agentGovernedExecution.update({
        where: { id: execution.id },
        data: {
          status: "COMPLETED",
          verificationStatus: "verified",
          approvalGranted: true,
          outcome: { noteId: note.id, customerId: note.customerId, mutated: true },
        },
      });
      await tx.agentGovernedEvidence.create({
        data: {
          organizationId: input.organizationId,
          executionId: input.executionId,
          businessGoalId: input.businessGoalId,
          planId: input.planId,
          stepId: input.stepId,
          capabilityId: input.capabilityId,
          workerId: input.workerId,
          actorId: input.actorId,
          action: "execution.result",
          status: "completed",
          metadata: { idempotencyKey: input.idempotencyKey, customerId: note.customerId, noteId: note.id, approval: "APPROVED" },
        },
      });
      await tx.agentGovernedEvidence.create({
        data: {
          organizationId: input.organizationId,
          executionId: input.executionId,
          businessGoalId: input.businessGoalId,
          planId: input.planId,
          stepId: input.stepId,
          capabilityId: input.capabilityId,
          workerId: input.workerId,
          actorId: input.actorId,
          action: "verification.result",
          status: "verified",
          metadata: { idempotencyKey: input.idempotencyKey, noteId: note.id },
        },
      });
      return { kind: "created" as const, noteId: note.id, customerId: note.customerId };
    });
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
    const outcome = outcomeRecord(existing?.outcome);
    if (existing?.status === "COMPLETED" && outcome.customerId === input.customerId && typeof outcome.noteId === "string") {
      return { kind: "replay", noteId: outcome.noteId, customerId: input.customerId };
    }
    if (existing?.status === "COMPLETED") return { kind: "mismatch" };
    return { kind: "in_progress" };
  }
}

export async function hasServerGrantedApproval(input: {
  readonly organizationId: string;
  readonly executionId: string;
  readonly stepId: string;
  readonly actorId: string;
  readonly capabilityId: string;
}): Promise<boolean> {
  const row = await prisma.agentGovernedEvidence.findFirst({
    where: {
      organizationId: input.organizationId,
      executionId: input.executionId,
      stepId: input.stepId,
      actorId: input.actorId,
      capabilityId: input.capabilityId,
      action: "approval.granted",
      status: "APPROVED",
    },
  });
  return Boolean(row);
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
