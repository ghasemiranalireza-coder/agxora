/**
 * Persist one customer-confirmed business fact through governed execution.
 * Organization, actor, provenance, and verification come from the server.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { assertGovernedExecutionAllowed, commercialBillingSchemaReady } from "@/app/lib/billing/enforce";
import { canUseCapability } from "@/app/lib/billing/entitlements";
import { paidAccessFor, type ExecutionSubscription } from "@/app/lib/billing/executionPolicy";
import { isPlanCode } from "@/app/lib/billing/catalog";
import { prisma } from "@/app/lib/db/prisma";
import { getAgentOsStateForActor, putAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { capabilitiesForRole } from "@/features/agents/workforce/workers";
import { isBusinessMemoryValue } from "@/features/agents/memory/businessContext";
import {
  BUSINESS_FACT_CAPABILITY,
  applyConfirmedBusinessFact,
  authoritativeBusinessFacts,
  businessFactHash,
  businessFactIdempotencyKey,
  isAuthoritativeBusinessFact,
  parseBusinessFactConfirmation,
  type AppliedBusinessFact,
  type ConfirmedBusinessFact,
} from "./businessFact";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function entitlement(organizationId: string): Promise<boolean> {
  const row = await prisma.commercialSubscription.findUnique({ where: { organizationId } }).catch(() => null);
  const subscription: ExecutionSubscription | null = row && isPlanCode(row.planCode)
    ? {
        organizationId: row.organizationId,
        planCode: row.planCode,
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      }
    : null;
  const access = paidAccessFor(subscription, new Date());
  return canUseCapability({
    planCode: access === "paid" ? subscription?.planCode ?? null : null,
    capabilityId: BUSINESS_FACT_CAPABILITY,
    access,
  });
}

export async function listBusinessFactsForActor(actor: Actor, memoryId?: string) {
  const state = await getAgentOsStateForActor(actor);
  const facts = authoritativeBusinessFacts(state.memories, actor.organizationId);
  if (memoryId) {
    const one = facts.find((record) => record.id === memoryId);
    if (!one) {
      return { ok: false as const, status: 404, error: "Business fact was not found." };
    }
    return { ok: true as const, facts: [publicFact(one)] };
  }
  return { ok: true as const, facts: facts.map(publicFact) };
}

function publicFact(record: { id: string; value: unknown }) {
  const value = asRecord(record.value);
  const fact = asRecord(value?.fact);
  return {
    memoryId: record.id,
    category: typeof fact?.category === "string" ? fact.category : null,
    statement: typeof value?.content === "string" ? value.content : "",
    allowedForMarketing: fact?.allowedForMarketing === true,
    status: "VERIFIED",
    authoritative: true,
  };
}

export async function confirmBusinessFactForActor(
  actor: Actor,
  body: Parameters<typeof parseBusinessFactConfirmation>[0],
) {
  const parsed = parseBusinessFactConfirmation(body);
  if (!parsed.ok) return parsed;
  const state = await getAgentOsStateForActor(actor);
  const worker = (state.workers ?? []).find((item) =>
    item.organizationId === actor.organizationId && item.role === "MARKETING" && item.status === "ACTIVE",
  );
  if (!worker || !capabilitiesForRole("MARKETING").includes(BUSINESS_FACT_CAPABILITY)) {
    return { ok: false as const, status: 403, error: "An active Marketing Worker is required." };
  }
  if (!(await entitlement(actor.organizationId))) {
    return { ok: false as const, status: 403, error: "This plan cannot save verified business facts." };
  }
  const factHash = businessFactHash(parsed.fact);
  const idempotencyKey = businessFactIdempotencyKey(actor.organizationId, factHash);
  const existing = await prisma.agentGovernedExecution.findUnique({
    where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey } },
  });
  if (existing?.status === "COMPLETED") {
    const outcome = asRecord(existing.outcome);
    const memoryId = typeof outcome?.memoryId === "string" ? outcome.memoryId : "";
    const record = state.memories.find((item) => item.id === memoryId);
    const authoritative = Boolean(record && isAuthoritativeBusinessFact(record, actor.organizationId));
    return {
      ok: true as const,
      replayed: true,
      result: {
        ...publicResult(existing.outcome, parsed.fact, factHash, idempotencyKey),
        authoritative,
        conflict: Boolean(record) && !authoritative,
        verification: authoritative
          ? "The confirmed business fact was durably stored."
          : "The fact was stored and withheld because it conflicts with an earlier confirmed fact.",
      },
    };
  }
  if (existing && existing.status !== "FAILED") {
    return { ok: false as const, status: 409, error: "This fact confirmation is already being saved." };
  }
  const executionId = randomUUID();
  const billingReady = await commercialBillingSchemaReady();
  try {
    await prisma.$transaction(async (tx) => {
      if (billingReady) {
        await assertGovernedExecutionAllowed(tx, {
          organizationId: actor.organizationId,
          capabilityId: BUSINESS_FACT_CAPABILITY,
        });
      }
      if (existing?.status === "FAILED") {
        await tx.agentGovernedExecution.update({
          where: { id: existing.id },
          data: {
            status: "RESERVED",
            executionId,
            capabilityId: BUSINESS_FACT_CAPABILITY,
            workerId: worker.id,
            actorId: actor.userId,
            approvalRequired: true,
            approvalGranted: true,
            verificationStatus: "pending",
            outcome: {},
          },
        });
        return;
      }
      await tx.agentGovernedExecution.create({
        data: {
          organizationId: actor.organizationId,
          idempotencyKey,
          executionId,
          capabilityId: BUSINESS_FACT_CAPABILITY,
          workerId: worker.id,
          actorId: actor.userId,
          approvalRequired: true,
          approvalGranted: true,
          status: "RESERVED",
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, status: 409, error: "This fact confirmation is already being saved." };
    }
    if (error instanceof PersistenceError) {
      return { ok: false as const, status: error.status, error: error.message };
    }
    throw error;
  }
  try {
    let applied: AppliedBusinessFact | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const fresh = await getAgentOsStateForActor(actor);
      const next = applyConfirmedBusinessFact({
        memories: fresh.memories,
        organizationId: actor.organizationId,
        fact: parsed.fact,
        sourceReference: executionId,
      });
      await putAgentOsStateForActor(actor, { ...fresh, memories: [...next.memories] });
      const stored = await getAgentOsStateForActor(actor);
      const record = stored.memories.find((item) => item.id === next.memoryId);
      const value = record && isBusinessMemoryValue(record.value) ? record.value : null;
      if (value && value.content === next.statement && value.fact?.category === parsed.fact.category) {
        applied = next;
        break;
      }
    }
    if (!applied) {
      throw new PersistenceError("conflict", "The confirmed business fact was not durable.");
    }
    const outcome = {
      memoryId: applied.memoryId,
      factHash,
      category: parsed.fact.category,
      statement: applied.statement,
      allowedForMarketing: parsed.fact.allowedForMarketing,
      authoritative: applied.authoritative,
      conflict: applied.conflict,
      provenance: "USER_INPUT",
      status: "VERIFIED",
    };
    await prisma.agentGovernedExecution.update({
      where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey } },
      data: {
        status: "COMPLETED",
        verificationStatus: applied.authoritative ? "verified" : "withheld",
        outcome,
      },
    });
    await prisma.agentGovernedEvidence.create({
      data: {
        organizationId: actor.organizationId,
        executionId,
        capabilityId: BUSINESS_FACT_CAPABILITY,
        workerId: worker.id,
        actorId: actor.userId,
        action: "business_fact.confirmed",
        status: applied.authoritative ? "verified" : "withheld",
        metadata: {
          memoryId: applied.memoryId,
          factHash,
          category: parsed.fact.category,
          authoritative: String(applied.authoritative),
        },
      },
    });
    return {
      ok: true as const,
      replayed: false,
      result: {
        ...outcome,
        idempotencyKey,
        verification: applied.authoritative
          ? "The confirmed business fact was durably stored."
          : "The fact was stored and withheld because it conflicts with an earlier confirmed fact.",
      },
    };
  } catch (error) {
    await prisma.agentGovernedExecution.updateMany({
      where: { organizationId: actor.organizationId, idempotencyKey, status: { in: ["RESERVED", "EXECUTING"] } },
      data: { status: "FAILED", verificationStatus: "failed", outcome: { mutated: false } },
    });
    throw error;
  }
}

function publicResult(
  outcome: unknown,
  fact: ConfirmedBusinessFact,
  factHash: string,
  idempotencyKey: string,
) {
  const value = asRecord(outcome) ?? {};
  return {
    memoryId: typeof value.memoryId === "string" ? value.memoryId : null,
    factHash,
    category: fact.category,
    statement: fact.statement,
    allowedForMarketing: fact.allowedForMarketing,
    authoritative: value.authoritative === true,
    conflict: value.conflict === true,
    provenance: "USER_INPUT",
    status: "VERIFIED",
    idempotencyKey,
    verification: value.authoritative === true
      ? "The confirmed business fact was durably stored."
      : "The fact was stored and withheld because it conflicts with an earlier confirmed fact.",
  };
}
