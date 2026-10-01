/**
 * Server activation for the first marketing result.
 * Organization, actor, entitlement, and facts come from the server.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { isPlanCode } from "@/app/lib/billing/catalog";
import { isMissingBillingSchema } from "@/app/lib/billing/schemaGuard";
import { hasPaidAccess } from "@/app/lib/billing/subscriptionState";
import { prisma } from "@/app/lib/db/prisma";
import { requireFirstCustomerProductionReady } from "@/app/lib/production/requireReady";
import { emptyAgentsState, filterStateForOrganization, normalizeState, type AgentsPersistedState, type LegacyAgentsPersistedState } from "@/features/agents/repositories/state";
import { validateStoredMarketingPlan, type MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import type { Actor } from "@/app/lib/tenancy/types";
import type { MarketingChannelIntent } from "@/features/agents/marketing/planSchema";
import {
  confirmedFactRefs,
  deriveFirstResult,
  findFirstMarketingGoal,
  marketingAccessDecision,
  missingFirstResultFacts,
  placeFirstMarketingGoal,
  type FirstResultStep,
} from "./firstResult";

const SCHEMA_VERSION = 7;
const BLOCKED_MESSAGE = "Marketing Workforce requires Business or Professional.";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function readAccess(organizationId: string) {
  try {
    const row = await prisma.commercialSubscription.findUnique({ where: { organizationId } });
    if (!row || !isPlanCode(row.planCode)) {
      return marketingAccessDecision({ planCode: null, access: "legacy" });
    }
    const paid = hasPaidAccess(row, new Date());
    return marketingAccessDecision({ planCode: row.planCode, access: paid ? "paid" : "unpaid" });
  } catch (error) {
    if (isMissingBillingSchema(error)) {
      return marketingAccessDecision({ planCode: null, access: "legacy" });
    }
    throw error;
  }
}

function readState(payload: unknown, organizationId: string): AgentsPersistedState {
  const normalized = normalizeState(payload as LegacyAgentsPersistedState);
  return filterStateForOrganization(normalized ?? emptyAgentsState(), organizationId);
}

function proposalFromState(state: AgentsPersistedState, planId: string | undefined, organizationId: string): MarketingPlanDocument | null {
  if (!planId) return null;
  const plan = state.plans.find((item) => item.id === planId && item.organizationId === organizationId);
  const result = plan?.steps.find((step) => step.capabilityId === "MARKETING_PREPARE_PLAN")?.result;
  const record = asRecord(result);
  const validated = validateStoredMarketingPlan(record?.plan);
  return validated.ok ? validated.plan : null;
}

async function claimResultForPlan(organizationId: string, planId: string | undefined) {
  if (!planId) return null;
  const rows = await prisma.agentGovernedExecution.findMany({
    where: { organizationId, capabilityId: "MARKETING_PREPARE_PLAN", status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  for (const row of rows) {
    const outcome = asRecord(row.outcome);
    if (outcome?.planId !== planId) continue;
    if (outcome.result === "PASS" || outcome.result === "BLOCKED" || outcome.result === "EDIT_REQUIRED") {
      return outcome.result;
    }
  }
  return null;
}

export async function loadFirstResultStatus(actor: Actor) {
  requireFirstCustomerProductionReady();
  const access = await readAccess(actor.organizationId);
  const row = await prisma.agentOsState.findUnique({ where: { organizationId: actor.organizationId } });
  const state = row ? readState(row.payload, actor.organizationId) : emptyAgentsState();
  const facts = confirmedFactRefs(state, actor.organizationId);
  const missingFacts = missingFirstResultFacts(facts);
  const worker = (state.workers ?? []).find(
    (item) => item.organizationId === actor.organizationId && item.role === "MARKETING",
  );
  const workerPaused = Boolean(worker && worker.status !== "ACTIVE");
  const goal = findFirstMarketingGoal(state.businessGoals, actor.organizationId);
  const proposal = proposalFromState(state, goal?.planId, actor.organizationId);
  const claimResult = await claimResultForPlan(actor.organizationId, goal?.planId);
  const approval = goal
    ? await prisma.agentGovernedEvidence.findFirst({
        where: {
          organizationId: actor.organizationId,
          businessGoalId: goal.id,
          capabilityId: "MARKETING_RECORD_PLAN",
          action: "approval.granted",
          status: "APPROVED",
        },
        select: { id: true },
      })
    : null;
  const storedRow = goal
    ? await prisma.agentGovernedExecution.findFirst({
        where: {
          organizationId: actor.organizationId,
          businessGoalId: goal.id,
          capabilityId: "MARKETING_RECORD_PLAN",
          status: "COMPLETED",
        },
      })
    : null;
  const verified = storedRow
    ? await prisma.agentGovernedEvidence.findFirst({
        where: {
          organizationId: actor.organizationId,
          executionId: storedRow.executionId,
          action: "marketing.plan.readback",
          status: "verified",
        },
        select: { id: true },
      })
    : null;
  const derived = deriveFirstResult({
    accessAllowed: access.allowed,
    blockCode: access.code,
    missingFacts,
    workerPaused,
    goalStatus: goal?.status ?? null,
    draftReady: Boolean(proposal),
    claimResult,
    approvalGranted: Boolean(approval),
    stored: Boolean(storedRow),
    verified: Boolean(verified),
    failed: goal?.status === "failed",
  });
  return {
    ok: true as const,
    access: access.allowed ? ("allowed" as const) : ("blocked" as const),
    blockCode: access.code,
    message: access.allowed ? null : BLOCKED_MESSAGE,
    facts,
    missingFacts,
    worker: !worker ? ("missing" as const) : worker.status === "ACTIVE" ? ("active" as const) : ("paused" as const),
    goal: goal
      ? {
          id: goal.id,
          status: goal.status,
          channelIntent: goal.channelIntent ?? null,
          error: goal.error ?? null,
        }
      : null,
    proposal,
    claimResult,
    approvalGranted: Boolean(approval),
    stored: Boolean(storedRow),
    verified: Boolean(verified),
    next: derived.next,
    steps: derived.steps,
  };
}

export type FirstResultStatus = Awaited<ReturnType<typeof loadFirstResultStatus>>;

export async function beginFirstMarketingGoal(
  actor: Actor,
  channelIntent: MarketingChannelIntent,
): Promise<
  | { readonly ok: true; readonly created: boolean; readonly reused: boolean; readonly goalId: string; readonly next: FirstResultStep | "blocked" | "failed" }
  | { readonly ok: false; readonly status: number; readonly code: string; readonly error: string; readonly missingFacts?: readonly string[] }
> {
  requireFirstCustomerProductionReady();
  const access = await readAccess(actor.organizationId);
  if (!access.allowed) {
    return { ok: false, status: 403, code: access.code, error: BLOCKED_MESSAGE };
  }
  const lockKey = `first-marketing:${actor.organizationId}`;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;
    const row = await tx.agentOsState.findUnique({ where: { organizationId: actor.organizationId } });
    const state = row ? readState(row.payload, actor.organizationId) : emptyAgentsState();
    const placed = placeFirstMarketingGoal(state, {
      organizationId: actor.organizationId,
      actorId: actor.userId,
      channelIntent,
    });
    if (!placed.ok) {
      const error =
        placed.code === "worker_paused"
          ? "The Marketing Worker is paused. Resume it before AGXORA can prepare the plan."
          : placed.code === "missing_facts"
            ? "Confirm the business facts AGXORA may use."
            : placed.code === "runtime_paused"
              ? "The marketing assistant is paused."
              : placed.code === "missing_runtime"
                ? "The workspace is still opening. Try again."
                : "Choose a channel to plan for. Nothing is published.";
      return {
        ok: false as const,
        status: placed.code === "missing_facts" || placed.code === "invalid_channel" ? 422 : 409,
        code: placed.code,
        error,
        missingFacts: placed.missingFacts,
      };
    }
    if (placed.changed) {
      const payload = { ...placed.state, version: SCHEMA_VERSION } as unknown as Prisma.InputJsonValue;
      await tx.agentOsState.upsert({
        where: { organizationId: actor.organizationId },
        create: {
          id: randomUUID(),
          organizationId: actor.organizationId,
          schemaVersion: SCHEMA_VERSION,
          payload,
        },
        update: { schemaVersion: SCHEMA_VERSION, payload },
      });
    }
    return {
      ok: true as const,
      created: placed.created,
      reused: placed.reused,
      goalId: placed.goalId,
      next: "prepare" as const,
    };
  });
}
