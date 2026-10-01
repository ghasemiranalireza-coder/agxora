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
import { createApproval, createExecution } from "@/features/agents/execution";
import { validateStoredMarketingPlan, isMarketingChannelIntent, MARKETING_CHANNEL_INTENTS, type MarketingChannelIntent, type MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import type { AgentsPersistedState } from "@/features/agents/repositories";
import { EMPTY_ANALYTICS, type AgentApproval, type AgentExecution, type AgentPlan, type AgentRuntime, type AgentTask, type BusinessGoal, type PlanStep, type WorkforceWorker } from "@/features/agents/types";
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
 * The marketing plan is attached to the existing CRM assistant runtime.
 * A missing runtime is registered once, the same way the workspace registers it.
 * A paused runtime is left paused.
 */
export function ensureCrmAssistantRuntime(
  state: AgentsPersistedState,
  organizationId: string,
  now = new Date().toISOString(),
): { readonly state: AgentsPersistedState; readonly changed: boolean } {
  const tenant = organizationId.trim();
  const existing = (state.runtimes ?? []).find(
    (item) => item.organizationId === tenant && item.agentId === "crm_assistant",
  );
  if (existing) return { state, changed: false };
  const runtime: AgentRuntime = {
    instanceId: `ainst_${randomUUID()}`,
    organizationId: tenant,
    agentId: "crm_assistant",
    status: "active",
    health: "healthy",
    enabled: true,
    queueDepth: 0,
    lastHeartbeatAt: now,
    analytics: { ...EMPTY_ANALYTICS },
    config: {},
    createdAt: now,
    updatedAt: now,
  };
  return { state: { ...state, runtimes: [...(state.runtimes ?? []), runtime] }, changed: true };
}

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** The draft the claim gate reads from the prepare step. A client payload is not accepted here. */
export function preparedDraftFromState(
  state: AgentsPersistedState,
  organizationId: string,
): MarketingPlanDocument | null {
  const goal = findFirstMarketingGoal(state.businessGoals, organizationId);
  if (!goal?.planId) return null;
  const plan = state.plans.find((item) => item.id === goal.planId && item.organizationId === organizationId);
  const result = asRecord(plan?.steps.find((step) => step.capabilityId === "MARKETING_PREPARE_PLAN")?.result);
  const validated = validateStoredMarketingPlan(result?.plan);
  return validated.ok ? validated.plan : null;
}

export interface PersistDraftInput {
  readonly organizationId: string;
  readonly actorId: string;
  readonly plan: MarketingPlanDocument;
  readonly now?: string;
}

export type PersistDraftResult =
  | {
      readonly ok: true;
      readonly created: boolean;
      readonly reused: boolean;
      readonly changed: boolean;
      readonly planId: string;
      readonly executionId: string;
      readonly recordStepId: string;
      readonly approvalState: AgentApproval["state"];
      readonly state: AgentsPersistedState;
    }
  | {
      readonly ok: false;
      readonly code: "missing_goal" | "missing_plan" | "invalid_plan" | "worker_paused";
      readonly changed: false;
      readonly state: AgentsPersistedState;
    };

function patchStep(plan: AgentPlan, stepId: string, patch: Partial<PlanStep>, now: string): AgentPlan {
  return {
    ...plan,
    updatedAt: now,
    steps: plan.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
  };
}

/**
 * Store one model draft on the existing prepare step and leave the record step waiting.
 * Does not approve, record, or verify. A second call keeps the first draft and the first execution.
 */
export function persistFirstMarketingDraft(
  state: AgentsPersistedState,
  input: PersistDraftInput,
): PersistDraftResult {
  const organizationId = input.organizationId.trim();
  const now = input.now ?? new Date().toISOString();
  const goal = findFirstMarketingGoal(state.businessGoals, organizationId);
  if (!goal?.planId) return { ok: false, code: "missing_goal", changed: false, state };
  const plan = state.plans.find((item) => item.id === goal.planId && item.organizationId === organizationId);
  if (!plan) return { ok: false, code: "missing_plan", changed: false, state };
  const validated = validateStoredMarketingPlan(input.plan);
  if (!validated.ok) return { ok: false, code: "invalid_plan", changed: false, state };
  const active = activeMarketingWorker(state.workers, organizationId);
  const stored = preparedDraftFromState(state, organizationId);
  if (!stored && !active) return { ok: false, code: "worker_paused", changed: false, state };

  const context = plan.steps.find((step) => step.capabilityId === "MARKETING_LOAD_BUSINESS_CONTEXT");
  const prepare = plan.steps.find((step) => step.capabilityId === "MARKETING_PREPARE_PLAN");
  const record = plan.steps.find((step) => step.capabilityId === "MARKETING_RECORD_PLAN");
  if (!context || !prepare || !record) return { ok: false, code: "missing_plan", changed: false, state };

  let nextPlan = plan;
  let changed = false;
  if (!stored) {
    nextPlan = patchStep(nextPlan, context.id, {
      status: "completed",
      result: { action: "load_business_context", readOnly: true, mutated: false, verified: true },
    }, now);
    nextPlan = patchStep(nextPlan, prepare.id, {
      status: "completed",
      result: {
        action: "prepare_marketing_plan",
        readOnly: true,
        mutated: false,
        simulated: false,
        modelId: validated.plan.modelId,
        plan: validated.plan,
      },
    }, now);
    nextPlan = patchStep(nextPlan, record.id, { status: "blocked" }, now);
    changed = true;
  } else if (record.status === "pending") {
    nextPlan = patchStep(nextPlan, record.id, { status: "blocked" }, now);
    changed = true;
  }

  const tasks = state.tasks ?? [];
  const existingTask = tasks.find((item) => item.id === goal.taskId && item.organizationId === organizationId)
    ?? tasks.find((item) => item.organizationId === organizationId && item.input.businessGoalId === goal.id);
  const executions = state.executions ?? [];
  const existingExecution = existingTask
    ? executions.find((item) => item.id === existingTask.executionId && item.organizationId === organizationId)
      ?? executions.find((item) => item.taskId === existingTask.id && item.organizationId === organizationId)
    : undefined;
  const approvals = state.approvals ?? [];
  const existingApproval = approvals.find(
    (item) =>
      item.organizationId === organizationId &&
      item.planId === plan.id &&
      item.stepId === record.id,
  );

  const workerId = goal.workerId ?? active?.id;
  const actorId = goal.actorId || input.actorId.trim();
  let task: AgentTask = existingTask ?? {
    id: `atask_${randomUUID()}`,
    organizationId,
    agentInstanceId: plan.agentInstanceId,
    title: goal.statement,
    status: "blocked",
    priority: 1,
    planId: plan.id,
    input: {
      goal: goal.statement,
      businessGoalId: goal.id,
      workerId,
      actorId,
      marketingOffer: goal.marketingOffer,
      marketingNarrowed: goal.marketingNarrowed === true,
      channelIntent: goal.channelIntent,
    },
    attempt: 1,
    maxAttempts: 1,
    createdAt: now,
  };
  let execution: AgentExecution = existingExecution ?? {
    ...createExecution({
      organizationId,
      agentInstanceId: plan.agentInstanceId,
      taskId: task.id,
      goal: goal.statement,
      lifecycle: "WAITING_FOR_APPROVAL",
      workerId,
      actorId,
    }),
    planId: plan.id,
    currentStepId: record.id,
    blockedReason: "This marketing plan needs approval before it is stored.",
  };
  if (!existingExecution) changed = true;
  if (execution.planId !== plan.id || execution.currentStepId !== record.id) {
    execution = { ...execution, planId: plan.id, currentStepId: record.id, updatedAt: now };
    changed = true;
  }
  if (task.executionId !== execution.id || task.planId !== plan.id || task.status !== "blocked") {
    task = { ...task, executionId: execution.id, planId: plan.id, status: existingApproval?.state === "APPROVED" ? task.status : "blocked" };
    if (!existingTask || existingTask.executionId !== execution.id) changed = true;
  }

  const approval: AgentApproval = existingApproval ?? createApproval({
    organizationId,
    agentInstanceId: plan.agentInstanceId,
    executionId: execution.id,
    taskId: task.id,
    planId: plan.id,
    stepId: record.id,
    toolId: record.toolId,
    action: record.title,
    reason: "Store the approved marketing plan. Nothing is published.",
  });
  if (!existingApproval) changed = true;
  if (approval.state === "APPROVED") {
    // A granted approval stays granted. This function never creates one.
  }

  const nextGoal: BusinessGoal = goal.taskId === task.id && goal.executionId === execution.id
    ? goal
    : { ...goal, taskId: task.id, executionId: execution.id, planId: plan.id, updatedAt: now };
  if (nextGoal !== goal) changed = true;

  if (!changed) {
    return {
      ok: true,
      created: false,
      reused: true,
      changed: false,
      planId: plan.id,
      executionId: execution.id,
      recordStepId: record.id,
      approvalState: approval.state,
      state,
    };
  }

  return {
    ok: true,
    created: !stored,
    reused: Boolean(stored),
    changed: true,
    planId: plan.id,
    executionId: execution.id,
    recordStepId: record.id,
    approvalState: approval.state,
    state: {
      ...state,
      plans: state.plans.map((item) => (item.id === nextPlan.id ? nextPlan : item)),
      tasks: existingTask ? tasks.map((item) => (item.id === task.id ? task : item)) : [...tasks, task],
      executions: existingExecution
        ? executions.map((item) => (item.id === execution.id ? execution : item))
        : [...executions, execution],
      approvals: existingApproval ? approvals : [...approvals, approval],
      businessGoals: (state.businessGoals ?? []).map((item) => (item.id === goal.id ? nextGoal : item)),
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
