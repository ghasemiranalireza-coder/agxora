/**
 * First governed marketing result.
 * Decides the next step from existing records. It does not call a model,
 * approve a plan, or create a second memory system.
 */

import { randomUUID } from "node:crypto";
import { canUseCapability, type PaidAccess } from "@/app/lib/billing/entitlements";
import type { PlanCode } from "@/app/lib/billing/catalog";
import { isBusinessMemoryValue, type BusinessFactCategory } from "@/features/agents/memory/businessContext";
import { buildMarketingPlan } from "@/features/agents/orchestration/goalPlan";
import { isMarketingChannelIntent, MARKETING_CHANNEL_INTENTS, type MarketingChannelIntent } from "@/features/agents/marketing/planSchema";
import type { AgentsPersistedState } from "@/features/agents/repositories";
import type { BusinessGoal, WorkforceWorker } from "@/features/agents/types";
import { authoritativeBusinessFacts } from "./businessFact";
import { buildActivationMarketingWorker } from "./workerRecord";

export const FIRST_MARKETING_GOAL_STATEMENT = "Prepare a 7-day marketing plan";

export const FIRST_RESULT_FACT_CATEGORIES = [
  "BUSINESS_NAME",
  "BUSINESS_DESCRIPTION",
  "OFFER",
  "SERVICE_AREA",
] as const satisfies readonly BusinessFactCategory[];

export type FirstResultFactCategory = (typeof FIRST_RESULT_FACT_CATEGORIES)[number];

export const FIRST_RESULT_STEPS = [
  "business",
  "confirm",
  "goal",
  "prepare",
  "review",
  "approve",
  "verified",
] as const;

export type FirstResultStep = (typeof FIRST_RESULT_STEPS)[number];

export interface FirstResultFactDraft {
  readonly category: FirstResultFactCategory;
  readonly statement: string;
  readonly allowedForMarketing: true;
}

export function marketingChannelChoices(): readonly MarketingChannelIntent[] {
  return MARKETING_CHANNEL_INTENTS;
}

export function marketingAccessDecision(input: {
  readonly planCode: PlanCode | null;
  readonly access: PaidAccess;
}):
  | { readonly allowed: true; readonly code: "allowed" }
  | { readonly allowed: false; readonly code: "base" | "none" | "unpaid" } {
  const allowed = canUseCapability({
    planCode: input.planCode,
    capabilityId: "MARKETING_RECORD_PLAN",
    access: input.access,
  });
  if (allowed) return { allowed: true, code: "allowed" };
  if (input.access === "unpaid") return { allowed: false, code: "unpaid" };
  if (input.planCode === "agxora_base") return { allowed: false, code: "base" };
  return { allowed: false, code: "none" };
}

export function draftFirstResultFacts(input: {
  readonly businessName: string;
  readonly businessType: string;
  readonly offer: string;
  readonly location: string;
}):
  | { readonly ok: true; readonly facts: readonly FirstResultFactDraft[] }
  | { readonly ok: false; readonly missing: readonly FirstResultFactCategory[] } {
  const rows: readonly { category: FirstResultFactCategory; statement: string }[] = [
    { category: "BUSINESS_NAME", statement: input.businessName },
    { category: "BUSINESS_DESCRIPTION", statement: input.businessType },
    { category: "OFFER", statement: input.offer },
    { category: "SERVICE_AREA", statement: input.location },
  ];
  const facts: FirstResultFactDraft[] = [];
  const missing: FirstResultFactCategory[] = [];
  for (const row of rows) {
    const statement = row.statement.trim().replace(/\s+/g, " ");
    if (!statement || statement.length > 500) missing.push(row.category);
    else facts.push({ category: row.category, statement, allowedForMarketing: true });
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, facts };
}

export interface ConfirmedFactRef {
  readonly category: string;
  readonly statement: string;
  readonly allowedForMarketing: boolean;
}

export function confirmedFactRefs(
  state: AgentsPersistedState,
  organizationId: string,
): readonly ConfirmedFactRef[] {
  return authoritativeBusinessFacts(state.memories, organizationId).flatMap((record) => {
    if (!isBusinessMemoryValue(record.value) || !record.value.fact) return [];
    return [{
      category: record.value.fact.category,
      statement: record.value.fact.statement,
      allowedForMarketing: record.value.fact.allowedForMarketing,
    }];
  });
}

export function missingFirstResultFacts(
  facts: readonly ConfirmedFactRef[],
): readonly FirstResultFactCategory[] {
  return FIRST_RESULT_FACT_CATEGORIES.filter((category) => {
    const match = facts.find((fact) => fact.category === category);
    return !match || !match.allowedForMarketing || match.statement.trim().length === 0;
  });
}

export function offerFromConfirmedFacts(facts: readonly ConfirmedFactRef[]): string {
  return facts.find((fact) => fact.category === "OFFER" && fact.allowedForMarketing)?.statement.trim() ?? "";
}

export function findFirstMarketingGoal(
  goals: readonly BusinessGoal[] | undefined,
  organizationId: string,
): BusinessGoal | null {
  const matches = (goals ?? []).filter(
    (goal) =>
      goal.organizationId === organizationId &&
      goal.goalType === "marketing_plan" &&
      goal.statement.trim() === FIRST_MARKETING_GOAL_STATEMENT,
  );
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null;
}

function activeMarketingWorker(
  workers: readonly WorkforceWorker[] | undefined,
  organizationId: string,
): WorkforceWorker | null {
  return (
    (workers ?? []).find(
      (worker) =>
        worker.organizationId === organizationId &&
        worker.role === "MARKETING" &&
        worker.status === "ACTIVE",
    ) ?? null
  );
}

function pausedMarketingWorker(
  workers: readonly WorkforceWorker[] | undefined,
  organizationId: string,
): WorkforceWorker | null {
  return (
    (workers ?? []).find(
      (worker) =>
        worker.organizationId === organizationId &&
        worker.role === "MARKETING" &&
        worker.status !== "ACTIVE",
    ) ?? null
  );
}

export interface PlaceFirstGoalInput {
  readonly organizationId: string;
  readonly actorId: string;
  readonly channelIntent: string;
  readonly now?: string;
}

export type PlaceFirstGoalResult =
  | {
      readonly ok: true;
      readonly created: boolean;
      readonly reused: boolean;
      readonly changed: boolean;
      readonly goalId: string;
      readonly state: AgentsPersistedState;
    }
  | {
      readonly ok: false;
      readonly code: "worker_paused" | "missing_facts" | "missing_runtime" | "runtime_paused" | "invalid_channel";
      readonly missingFacts?: readonly FirstResultFactCategory[];
      readonly changed: false;
      readonly state: AgentsPersistedState;
    };

/**
 * Insert at most one first marketing goal. An existing goal is returned unchanged,
 * including when a second caller asks for a different channel.
 */
export function placeFirstMarketingGoal(
  state: AgentsPersistedState,
  input: PlaceFirstGoalInput,
): PlaceFirstGoalResult {
  const organizationId = input.organizationId.trim();
  const now = input.now ?? new Date().toISOString();
  if (!isMarketingChannelIntent(input.channelIntent)) {
    return { ok: false, code: "invalid_channel", changed: false, state };
  }
  const existingGoal = findFirstMarketingGoal(state.businessGoals, organizationId);
  const active = activeMarketingWorker(state.workers, organizationId);
  const paused = pausedMarketingWorker(state.workers, organizationId);
  if (!active && paused) {
    return { ok: false, code: "worker_paused", changed: false, state };
  }
  const facts = confirmedFactRefs(state, organizationId);
  const missingFacts = missingFirstResultFacts(facts);
  if (!existingGoal && missingFacts.length > 0) {
    return { ok: false, code: "missing_facts", missingFacts, changed: false, state };
  }
  const runtime = (state.runtimes ?? []).find(
    (item) => item.organizationId === organizationId && item.agentId === "crm_assistant",
  );
  if (!existingGoal && (!runtime || !runtime.enabled)) {
    return { ok: false, code: "missing_runtime", changed: false, state };
  }
  if (!existingGoal && runtime && runtime.status === "paused") {
    return { ok: false, code: "runtime_paused", changed: false, state };
  }

  let nextWorkers = state.workers ?? [];
  let changed = false;
  let worker = active;
  if (!worker) {
    worker = buildActivationMarketingWorker(organizationId, now);
    nextWorkers = [...nextWorkers, worker];
    changed = true;
  }
  if (existingGoal) {
    return {
      ok: true,
      created: false,
      reused: true,
      changed,
      goalId: existingGoal.id,
      state: changed ? { ...state, workers: nextWorkers } : state,
    };
  }

  const offer = offerFromConfirmedFacts(facts);
  const goal: BusinessGoal = {
    id: `goal_${randomUUID()}`,
    organizationId,
    statement: FIRST_MARKETING_GOAL_STATEMENT,
    goalType: "marketing_plan",
    requestedOutcome: "Approved 7-day marketing plan stored and read back. Nothing is published.",
    status: "active",
    workerId: worker.id,
    actorId: input.actorId,
    marketingOffer: offer,
    marketingNarrowed: false,
    channelIntent: input.channelIntent,
    createdAt: now,
    updatedAt: now,
  };
  const plan = buildMarketingPlan({
    goal,
    agentInstanceId: runtime!.instanceId,
    plannerContext: {
      resolvedAt: now,
      organizationId,
      available: false,
      facts: facts.map((fact) => ({
        provenance: "BUSINESS_MEMORY" as const,
        key: fact.category,
        text: fact.statement,
      })),
      memoryIds: [],
    },
  });
  const stored: BusinessGoal = { ...goal, planId: plan.id };
  return {
    ok: true,
    created: true,
    reused: false,
    changed: true,
    goalId: stored.id,
    state: {
      ...state,
      workers: nextWorkers,
      businessGoals: [...(state.businessGoals ?? []), stored],
      plans: [...state.plans, plan],
    },
  };
}

export interface DeriveFirstResultInput {
  readonly accessAllowed: boolean;
  readonly blockCode: "allowed" | "base" | "none" | "unpaid";
  readonly missingFacts: readonly string[];
  readonly workerPaused: boolean;
  readonly goalStatus: string | null;
  readonly draftReady: boolean;
  readonly claimResult: "PASS" | "BLOCKED" | "EDIT_REQUIRED" | null;
  readonly approvalGranted: boolean;
  readonly stored: boolean;
  readonly verified: boolean;
  readonly failed: boolean;
}

export function deriveFirstResult(input: DeriveFirstResultInput): {
  readonly next: FirstResultStep | "blocked" | "failed";
  readonly steps: readonly { readonly id: FirstResultStep; readonly done: boolean }[];
} {
  const factsReady = input.missingFacts.length === 0;
  const goalStarted = Boolean(input.goalStatus);
  const reviewed = input.draftReady;
  const approved = input.approvalGranted && input.claimResult === "PASS";
  const done: Record<FirstResultStep, boolean> = {
    business: factsReady,
    confirm: factsReady,
    goal: goalStarted,
    prepare: input.draftReady,
    review: reviewed && (input.claimResult === "PASS" || input.stored || input.verified),
    approve: approved || input.stored || input.verified,
    verified: input.verified && input.stored,
  };
  const steps = FIRST_RESULT_STEPS.map((id) => ({ id, done: done[id] }));
  const complete = input.verified && input.stored && input.approvalGranted && input.claimResult === "PASS";
  if (complete) return { next: "verified", steps };
  if (!input.accessAllowed || (input.workerPaused && !goalStarted)) return { next: "blocked", steps };
  if (input.failed) return { next: "failed", steps };
  if (!factsReady) return { next: "confirm", steps };
  if (!goalStarted) return { next: "goal", steps };
  if (!input.draftReady) return { next: "prepare", steps };
  if (input.claimResult === "BLOCKED" || input.claimResult === "EDIT_REQUIRED") return { next: "review", steps };
  if (!input.approvalGranted || input.claimResult !== "PASS") return { next: "review", steps };
  if (!input.stored || !input.verified) return { next: "approve", steps };
  return { next: "verified", steps };
}

const IGNORED_START_FIELDS = [
  "organizationId",
  "workerId",
  "actorId",
  "offer",
  "amount",
  "price",
  "priceId",
  "stripePriceId",
  "approvalGranted",
  "claimGatePassed",
  "draftHash",
  "factContextHash",
  "checkId",
  "authoritative",
  "status",
  "provenance",
] as const;

/** Channel intent only. Price, organization, offer, and approval fields are ignored. */
export function parseFirstResultStart(body: Record<string, unknown> | null):
  | { readonly ok: true; readonly channelIntent: MarketingChannelIntent }
  | { readonly ok: false; readonly error: string } {
  if (body) {
    for (const field of IGNORED_START_FIELDS) void body[field];
  }
  const channel = typeof body?.channelIntent === "string" ? body.channelIntent.trim() : "";
  if (!isMarketingChannelIntent(channel)) {
    return { ok: false, error: "Choose a channel to plan for. Nothing is published." };
  }
  return { ok: true, channelIntent: channel };
}
