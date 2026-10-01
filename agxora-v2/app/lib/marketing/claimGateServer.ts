/**
 * Evaluate a marketing draft against the signed-in organization's verified facts.
 * The client cannot choose the organization, the facts, or a PASS result.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { assertMarketingWorkforceAllowed } from "@/app/lib/billing/enforce";
import { prisma } from "@/app/lib/db/prisma";
import { getAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { appendGovernedEvidenceDb } from "@/app/lib/agents/governedExecutionDb";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { BUSINESS_FACT_CAPABILITY } from "@/app/lib/marketing/businessFact";
import { validateStoredMarketingPlan, type MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import {
  CLAIM_GATE_RECHECK_MESSAGE,
  CLAIM_GATE_VERSION,
  assessClaimGateApproval,
  claimContentHash,
  claimGateCheckId,
  claimGateIdempotencyKey,
  evaluateMarketingClaims,
  factContextHash,
  factContextRefs,
  supportConfirmedByProofs,
  type ClaimGateDecision,
  type ConfirmedFactProof,
  type ClaimGateEvaluation,
  type CheckedClaim,
  type StoredClaimGateCheck,
} from "./claimGate";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function publicClaimGate(evaluation: ClaimGateEvaluation, replayed = false) {
  return {
    result: evaluation.result,
    contentHash: evaluation.contentHash,
    supportFactIds: evaluation.supportFactIds,
    customerMessage: evaluation.customerMessage,
    claims: evaluation.claims
      .filter((claim) => claim.customerReason)
      .map((claim) => ({
        text: claim.text,
        reason: claim.customerReason,
        action: "Edit claim",
      })),
    replayed,
    verification: "The claim gate checked this plan against the authoritative business context.",
  };
}

function isDecision(value: unknown): value is ClaimGateDecision {
  return value === "PASS" || value === "BLOCKED" || value === "EDIT_REQUIRED";
}

function storedEvaluation(outcome: Record<string, unknown> | null, fresh: ClaimGateEvaluation): ClaimGateEvaluation {
  if (!outcome || outcome.contentHash !== fresh.contentHash || !isDecision(outcome.result)) return fresh;
  const claims: CheckedClaim[] = Array.isArray(outcome.claims)
    ? outcome.claims.flatMap((item) => {
      const claim = asRecord(item);
      if (!claim || typeof claim.text !== "string" || typeof claim.kind !== "string") return [];
      return [{
        text: claim.text,
        kind: claim.kind as CheckedClaim["kind"],
        supportFactIds: Array.isArray(claim.supportFactIds) ? claim.supportFactIds.filter((id) => typeof id === "string") : [],
        customerReason: typeof claim.customerReason === "string" ? claim.customerReason : null,
      }];
    })
    : [...fresh.claims];
  return {
    version: typeof outcome.gateVersion === "string" ? outcome.gateVersion : fresh.version,
    result: outcome.result,
    contentHash: fresh.contentHash,
    supportFactIds: Array.isArray(outcome.supportFactIds)
      ? outcome.supportFactIds.filter((id) => typeof id === "string")
      : fresh.supportFactIds,
    claims: claims.length > 0 ? claims : fresh.claims,
    customerMessage: outcome.result === "PASS" ? "Claims checked." : "Some statements need your attention.",
  };
}

async function confirmedFactProofs(organizationId: string): Promise<ConfirmedFactProof[]> {
  const rows = await prisma.agentGovernedExecution.findMany({
    where: { organizationId, capabilityId: BUSINESS_FACT_CAPABILITY, status: "COMPLETED" },
    select: { outcome: true },
  });
  return rows.flatMap((row) => {
    const outcome = asRecord(row.outcome);
    if (!outcome || typeof outcome.memoryId !== "string" || typeof outcome.statement !== "string") return [];
    if (typeof outcome.category !== "string" || typeof outcome.allowedForMarketing !== "boolean") return [];
    return [{
      memoryId: outcome.memoryId,
      statement: outcome.statement,
      category: outcome.category,
      allowedForMarketing: outcome.allowedForMarketing,
      authoritative: outcome.authoritative === true,
      status: outcome.status === "VERIFIED" ? "VERIFIED" : "",
    }];
  });
}

async function loadContext(actor: Actor, plan: Pick<MarketingPlanDocument, "strategy" | "audience" | "offer" | "contentThemes" | "contentItems">, planId: string) {
  const state = await getAgentOsStateForActor(actor);
  const support = supportConfirmedByProofs(
    state.memories,
    actor.organizationId,
    await confirmedFactProofs(actor.organizationId),
  );
  const organization = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
    select: { name: true },
  });
  const organizationName = organization?.name ?? "";
  const evaluation = evaluateMarketingClaims({ plan, support, organizationName });
  const factsHash = factContextHash(factContextRefs(support), organizationName);
  const checkId = claimGateCheckId(evaluation.contentHash, factsHash);
  return { state, support, evaluation, factsHash, checkId, planId };
}

function marketingDraftFromState(state: { plans?: readonly { id: string; organizationId?: string; steps: readonly { capabilityId?: string; result?: unknown }[] }[] }, planId: string, organizationId: string): unknown {
  const plan = state.plans?.find((item) => item.id === planId && item.organizationId === organizationId);
  const prepare = plan?.steps.find((step) => step.capabilityId === "MARKETING_PREPARE_PLAN");
  const result = asRecord(prepare?.result);
  return result?.plan ?? null;
}

function parseStoredCheck(organizationId: string, outcome: Record<string, unknown> | null): StoredClaimGateCheck | null {
  if (!outcome) return null;
  if (typeof outcome.planId !== "string" || typeof outcome.checkId !== "string") return null;
  if (typeof outcome.contentHash !== "string" || typeof outcome.factContextHash !== "string") return null;
  if (typeof outcome.result !== "string" || typeof outcome.gateVersion !== "string") return null;
  return {
    organizationId,
    planId: outcome.planId,
    result: outcome.result,
    version: outcome.gateVersion,
    draftHash: outcome.contentHash,
    factContextHash: outcome.factContextHash,
    checkId: outcome.checkId,
    invalidated: outcome.invalidated === true,
  };
}

async function serverDraft(actor: Actor, planId: string, submittedPlan?: unknown) {
  const state = await getAgentOsStateForActor(actor);
  const validated = validateStoredMarketingPlan(marketingDraftFromState(state, planId, actor.organizationId));
  if (!validated.ok) return { ok: false as const, status: 422, error: CLAIM_GATE_RECHECK_MESSAGE };
  if (submittedPlan !== undefined) {
    const submitted = validateStoredMarketingPlan(submittedPlan);
    if (!submitted.ok || claimContentHash(submitted.plan) !== claimContentHash(validated.plan)) {
      return { ok: false as const, status: 422, error: CLAIM_GATE_RECHECK_MESSAGE };
    }
  }
  return { ok: true as const, plan: validated.plan };
}

/** Read-only claim check. Does not store a result and does not approve the draft. */
export async function previewMarketingClaimGate(
  actor: Actor,
  plan: Pick<MarketingPlanDocument, "strategy" | "audience" | "offer" | "contentThemes" | "contentItems">,
): Promise<ClaimGateEvaluation> {
  const checked = await loadContext(actor, plan, "preview");
  return checked.evaluation;
}

export async function evaluatePlanForActor(actor: Actor, input: { planId: string; submittedPlan?: unknown }) {
  const loaded = await serverDraft(actor, input.planId, input.submittedPlan);
  if (!loaded.ok) return loaded;
  try {
    await assertMarketingWorkforceAllowed(actor.organizationId);
  } catch (error) {
    if (error instanceof PersistenceError) {
      return { ok: false as const, status: error.status, error: error.message };
    }
    throw error;
  }
  const worker = (await getAgentOsStateForActor(actor)).workers?.find((item) =>
    item.organizationId === actor.organizationId && item.role === "MARKETING" && item.status === "ACTIVE",
  );
  const checked = await loadContext(actor, loaded.plan, input.planId);
  const evaluation = checked.evaluation;
  const idempotencyKey = claimGateIdempotencyKey(actor.organizationId, input.planId, checked.checkId);
  const existing = await prisma.agentGovernedExecution.findUnique({
    where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey } },
  });
  const existingOutcome = asRecord(existing?.outcome);
  if (
    existing?.status === "COMPLETED"
    && existingOutcome?.contentHash === evaluation.contentHash
    && existingOutcome.factContextHash === checked.factsHash
    && existingOutcome.planId === input.planId
    && existingOutcome.gateVersion === CLAIM_GATE_VERSION
    && existingOutcome.checkId === checked.checkId
  ) {
    return {
      ok: true as const,
      replayed: true,
      evaluation: storedEvaluation(asRecord(existing.outcome), evaluation),
      executionId: existing.executionId,
    };
  }
  if (existing && existing.status !== "FAILED") {
    return { ok: false as const, status: 409, error: "This plan is already being checked." };
  }
  const executionId = randomUUID();
  try {
    await prisma.agentGovernedExecution.create({
      data: {
        organizationId: actor.organizationId,
        idempotencyKey,
        executionId,
        capabilityId: "MARKETING_PREPARE_PLAN",
        workerId: worker?.id ?? null,
        actorId: actor.userId,
        approvalRequired: false,
        approvalGranted: false,
        status: "COMPLETED",
        verificationStatus: evaluation.result === "PASS" ? "verified" : "withheld",
        outcome: {
          contentHash: evaluation.contentHash,
          result: evaluation.result,
          supportFactIds: [...evaluation.supportFactIds],
          claims: evaluation.claims.map((claim) => ({
            text: claim.text,
            kind: claim.kind,
            supportFactIds: [...claim.supportFactIds],
            customerReason: claim.customerReason,
          })),
          gateVersion: CLAIM_GATE_VERSION,
          factContextHash: checked.factsHash,
          checkId: checked.checkId,
          planId: input.planId,
          evaluatedAt: new Date().toISOString(),
          invalidated: false,
          facts: factContextRefs(checked.support).map((fact) => ({
            id: fact.id,
            status: fact.status,
            updatedAt: fact.updatedAt,
            contentHash: fact.contentHash,
          })),
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.agentGovernedExecution.findUnique({
        where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey } },
      });
      const winnerOutcome = asRecord(winner?.outcome);
      if (
        winner?.status === "COMPLETED"
        && winnerOutcome?.contentHash === evaluation.contentHash
        && winnerOutcome.factContextHash === checked.factsHash
        && winnerOutcome.planId === input.planId
        && winnerOutcome.gateVersion === CLAIM_GATE_VERSION
        && winnerOutcome.checkId === checked.checkId
      ) {
        return {
          ok: true as const,
          replayed: true,
          evaluation: storedEvaluation(winnerOutcome, evaluation),
          executionId: winner.executionId,
        };
      }
      return { ok: false as const, status: 409, error: "This plan is already being checked." };
    }
    throw error;
  }
  await appendGovernedEvidenceDb({
    organizationId: actor.organizationId,
    executionId,
    capabilityId: "MARKETING_PREPARE_PLAN",
    workerId: worker?.id,
    actorId: actor.userId,
    action: "marketing.claim_gate",
    status: evaluation.result,
    metadata: {
      contentHash: evaluation.contentHash,
      factContextHash: checked.factsHash,
      checkId: checked.checkId,
      planId: input.planId,
      result: evaluation.result,
      supportFactIds: evaluation.supportFactIds.join(","),
      blockedClaims: evaluation.claims.filter((claim) => claim.customerReason).map((claim) => claim.text).join(" | ").slice(0, 500),
    },
  });
  return { ok: true as const, replayed: false, evaluation, executionId };
}

export async function requirePassingClaimGate(actor: Actor, planId: string, submittedPlan?: unknown) {
  const loaded = await serverDraft(actor, planId, submittedPlan);
  if (!loaded.ok) return loaded;
  const checked = await loadContext(actor, loaded.plan, planId);
  const idempotencyKey = claimGateIdempotencyKey(actor.organizationId, planId, checked.checkId);
  const existing = await prisma.agentGovernedExecution.findUnique({
    where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey } },
  });
  const stored = existing?.status === "COMPLETED"
    ? parseStoredCheck(actor.organizationId, asRecord(existing.outcome))
    : null;
  const decision = assessClaimGateApproval({
    organizationId: actor.organizationId,
    planId,
    draftHash: checked.evaluation.contentHash,
    factContextHash: checked.factsHash,
    stored,
  });
  if (!decision.ok) return { ok: false as const, status: 422, error: decision.error };
  return {
    ok: true as const,
    draftHash: checked.evaluation.contentHash,
    factContextHash: checked.factsHash,
    checkId: checked.checkId,
    supportFactIds: checked.evaluation.supportFactIds.join(","),
    result: checked.evaluation.result,
  };
}
