import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { authorizeGovernedMutation } from "@/features/agents/evidence/governedAuthorization";
import { parseModelMarketingProposal } from "@/features/agents/marketing/planSchema";
import { emptyAgentsState, type AgentsPersistedState } from "@/features/agents/repositories";
import type { AgentRuntime, BusinessGoal, MemoryRecord } from "@/features/agents/types";
import { applyConfirmedBusinessFact } from "./businessFact";
import { buildActivationMarketingWorker } from "./workerRecord";
import {
  FIRST_MARKETING_GOAL_STATEMENT,
  confirmedFactRefs,
  deriveFirstResult,
  draftFirstResultFacts,
  findFirstMarketingGoal,
  marketingAccessDecision,
  missingFirstResultFacts,
  parseFirstResultStart,
  ensureCrmAssistantRuntime,
  persistFirstMarketingDraft,
  placeFirstMarketingGoal,
  preparedDraftFromState,
} from "./firstResult";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ROOT = path.resolve(__dirname, "../../..");
const NOW = "2026-10-01T12:00:00.000Z";

const DRAFTS = draftFirstResultFacts({
  businessName: "Restaurant Menzel",
  businessType: "Restaurant",
  offer: "Daily changing lunch menu",
  location: "Düsseldorf",
});

function runtime(organizationId: string, status: AgentRuntime["status"] = "active"): AgentRuntime {
  return {
    instanceId: `inst_${organizationId.slice(0, 8)}`,
    organizationId,
    agentId: "crm_assistant",
    status,
    health: "healthy",
    enabled: true,
    queueDepth: 0,
    lastHeartbeatAt: NOW,
    analytics: { tasksCompleted: 0, tasksFailed: 0, avgExecutionMs: 0, usageCount: 0, errorRate: 0 },
    config: {},
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function withConfirmedFacts(organizationId: string): AgentsPersistedState {
  if (!DRAFTS.ok) throw new Error("drafts");
  let memories: readonly MemoryRecord[] = [];
  for (const fact of DRAFTS.facts) {
    memories = applyConfirmedBusinessFact({
      memories,
      organizationId,
      fact,
      sourceReference: "test",
      now: NOW,
    }).memories;
  }
  return { ...emptyAgentsState(), memories: [...memories], runtimes: [runtime(organizationId)] };
}

function place(state: AgentsPersistedState, organizationId = ORG, channel = "website") {
  return placeFirstMarketingGoal(state, {
    organizationId,
    actorId: "user_1",
    channelIntent: channel,
    now: NOW,
  });
}

describe("phase 27 first governed result", () => {
  it("registers one CRM assistant runtime when the workspace has none", () => {
    const bare = { ...withConfirmedFacts(ORG), runtimes: [] };
    const ensured = ensureCrmAssistantRuntime(bare, ORG, NOW);
    expect(ensured.changed).toBe(true);
    expect(ensured.state.runtimes.filter((item) => item.agentId === "crm_assistant")).toHaveLength(1);
    const placed = place(ensured.state);
    expect(placed.ok).toBe(true);
    const again = ensureCrmAssistantRuntime(ensured.state, ORG, NOW);
    expect(again.changed).toBe(false);
    expect(again.state.runtimes).toHaveLength(1);
    const paused = {
      ...withConfirmedFacts(ORG),
      runtimes: [{ ...runtime(ORG), status: "paused" as const }],
    };
    expect(ensureCrmAssistantRuntime(paused, ORG, NOW).changed).toBe(false);
    const blocked = place(paused);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("runtime_paused");
  });

  it("requires confirmation before facts become authoritative", () => {
    const drafts = draftFirstResultFacts({
      businessName: "Restaurant Menzel",
      businessType: "Restaurant",
      offer: "Daily changing lunch menu",
      location: "Düsseldorf",
    });
    expect(drafts.ok).toBe(true);
    const empty = emptyAgentsState();
    expect(confirmedFactRefs(empty, ORG)).toEqual([]);
    expect(missingFirstResultFacts([])).toEqual([
      "BUSINESS_NAME",
      "BUSINESS_DESCRIPTION",
      "OFFER",
      "SERVICE_AREA",
    ]);
    const blocked = place(empty);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("missing_facts");
    expect(empty.businessGoals ?? []).toHaveLength(0);
  });

  it("does not treat a conflicting edit as authoritative", () => {
    const state = withConfirmedFacts(ORG);
    const edited = applyConfirmedBusinessFact({
      memories: state.memories,
      organizationId: ORG,
      fact: { category: "OFFER", statement: "A different offer", allowedForMarketing: true },
      sourceReference: "edit",
      now: NOW,
    });
    expect(edited.conflict).toBe(true);
    expect(edited.authoritative).toBe(false);
    const next = { ...state, memories: [...edited.memories] };
    const placed = place(next);
    expect(placed.ok).toBe(false);
    if (!placed.ok) expect(placed.missingFacts).toContain("OFFER");
    expect(next.businessGoals ?? []).toHaveLength(0);
  });

  it("blocks Base and allows Business and Professional", () => {
    expect(marketingAccessDecision({ planCode: "agxora_base", access: "paid" })).toEqual({
      allowed: false,
      code: "base",
    });
    expect(marketingAccessDecision({ planCode: null, access: "legacy" }).allowed).toBe(false);
    expect(marketingAccessDecision({ planCode: "agxora_business", access: "unpaid" }).code).toBe("unpaid");
    expect(marketingAccessDecision({ planCode: "agxora_business", access: "paid" }).allowed).toBe(true);
    expect(marketingAccessDecision({ planCode: "agxora_professional", access: "paid" }).allowed).toBe(true);
  });

  it("reuses an active Marketing Worker and does not create a duplicate", () => {
    const worker = buildActivationMarketingWorker(ORG, NOW);
    expect(worker.allowedCapabilities).not.toContain("SOCIAL_PUBLISH");
    expect(worker.allowedCapabilities).toContain("MARKETING_PREPARE_PLAN");
    expect(worker.allowedCapabilities).not.toContain("MARKETING_VIDEO_CREATION");
    const state = { ...withConfirmedFacts(ORG), workers: [worker] };
    const first = place(state);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.workers?.filter((item) => item.role === "MARKETING")).toHaveLength(1);
    expect(first.state.workers?.find((item) => item.role === "MARKETING")?.id).toBe(worker.id);
    const second = place(first.state, ORG, "instagram");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.reused).toBe(true);
    expect(second.created).toBe(false);
    expect(second.goalId).toBe(first.goalId);
    expect(findFirstMarketingGoal(second.state.businessGoals, ORG)?.channelIntent).toBe("website");
    expect(second.state.businessGoals?.filter((goal) => goal.goalType === "marketing_plan")).toHaveLength(1);
    expect(second.state.workers?.filter((item) => item.role === "MARKETING")).toHaveLength(1);
  });

  it("does not create a worker when the Marketing Worker is paused", () => {
    const paused = { ...buildActivationMarketingWorker(ORG, NOW), status: "PAUSED" as const };
    const state = { ...withConfirmedFacts(ORG), workers: [paused] };
    const placed = place(state);
    expect(placed.ok).toBe(false);
    if (!placed.ok) expect(placed.code).toBe("worker_paused");
    expect(state.workers).toHaveLength(1);
  });

  it("keeps the first goal idempotent under a second and overlapping activation", () => {
    const state = withConfirmedFacts(ORG);
    const first = place(state);
    expect(first.ok && first.created).toBe(true);
    if (!first.ok) return;
    const again = place(first.state);
    const overlap = place(first.state);
    expect(again.ok && again.reused).toBe(true);
    expect(overlap.ok && overlap.reused).toBe(true);
    if (!again.ok || !overlap.ok) return;
    expect(again.goalId).toBe(overlap.goalId);
    expect(again.state.plans.filter((plan) => plan.organizationId === ORG)).toHaveLength(1);
  });

  it("isolates the goal to the signed-in organization", () => {
    const foreignGoal: BusinessGoal = {
      id: "goal_foreign",
      organizationId: OTHER,
      statement: FIRST_MARKETING_GOAL_STATEMENT,
      goalType: "marketing_plan",
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    };
    const state = { ...withConfirmedFacts(ORG), businessGoals: [foreignGoal] };
    const placed = place(state);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.goalId).not.toBe("goal_foreign");
    expect(findFirstMarketingGoal(placed.state.businessGoals, OTHER)?.id).toBe("goal_foreign");
    expect(findFirstMarketingGoal(placed.state.businessGoals, ORG)?.id).toBe(placed.goalId);
  });

  it("ignores forged organization, price, offer, and approval fields", () => {
    const parsed = parseFirstResultStart({
      channelIntent: "linkedin",
      organizationId: OTHER,
      offer: "forged offer",
      amount: 1,
      priceId: "price_forged",
      approvalGranted: true,
      claimGatePassed: true,
      draftHash: "forged",
      factContextHash: "forged",
      checkId: "forged",
      authoritative: true,
      status: "VERIFIED",
      provenance: "SYSTEM",
    });
    expect(parsed).toEqual({ ok: true, channelIntent: "linkedin" });
    expect(parseFirstResultStart({ channelIntent: "sms" }).ok).toBe(false);
  });

  it("keeps the claim gate and approval mandatory", () => {
    const waiting = deriveFirstResult({
      accessAllowed: true,
      blockCode: "allowed",
      missingFacts: [],
      workerPaused: false,
      goalStatus: "active",
      draftReady: true,
      claimResult: null,
      approvalGranted: false,
      stored: false,
      verified: false,
      failed: false,
    });
    expect(waiting.next).toBe("review");
    const blocked = deriveFirstResult({ ...waitingInput(), claimResult: "BLOCKED" });
    expect(blocked.next).toBe("review");
    const edit = deriveFirstResult({ ...waitingInput(), claimResult: "EDIT_REQUIRED" });
    expect(edit.next).toBe("review");
    const forgedStore = deriveFirstResult({
      ...waitingInput(),
      claimResult: "PASS",
      approvalGranted: false,
      stored: true,
      verified: true,
    });
    expect(forgedStore.next).not.toBe("verified");
    const approved = deriveFirstResult({
      ...waitingInput(),
      claimResult: "PASS",
      approvalGranted: true,
      stored: true,
      verified: true,
    });
    expect(approved.next).toBe("verified");
    const unverified = deriveFirstResult({
      ...waitingInput(),
      claimResult: "PASS",
      approvalGranted: true,
      stored: true,
      verified: false,
    });
    expect(unverified.next).not.toBe("verified");
  });

  it("stores one draft on the prepare step and waits for approval", () => {
    const placed = place(withConfirmedFacts(ORG));
    if (!placed.ok) throw new Error(placed.code);
    const first = persistFirstMarketingDraft(placed.state, {
      organizationId: ORG,
      actorId: "user_1",
      plan: samplePlan(),
      now: NOW,
    });
    if (!first.ok) throw new Error(first.code);
    expect(first.created).toBe(true);
    expect(first.approvalState).toBe("REQUIRES_APPROVAL");
    expect(preparedDraftFromState(first.state, ORG)?.strategy).toContain("weekday lunch");
    expect(first.state.tasks).toHaveLength(1);
    expect(first.state.executions).toHaveLength(1);
    expect(first.state.approvals).toHaveLength(1);
    expect(first.state.plans).toHaveLength(1);
    const record = first.state.plans[0]?.steps.find((step) => step.capabilityId === "MARKETING_RECORD_PLAN");
    const blocked = authorizeGovernedMutation({
      organizationId: ORG,
      actorId: "user_1",
      capabilityId: "MARKETING_RECORD_PLAN",
      idempotencyKey: record?.idempotencyKey ?? "",
      executionId: first.executionId,
      stepId: first.recordStepId,
      state: first.state,
    });
    expect(blocked.ok).toBe(false);

    const approvedState = {
      ...first.state,
      approvals: first.state.approvals.map((item) => ({ ...item, state: "APPROVED" as const })),
    };
    const allowed = authorizeGovernedMutation({
      organizationId: ORG,
      actorId: "user_1",
      capabilityId: "MARKETING_RECORD_PLAN",
      idempotencyKey: record?.idempotencyKey ?? "",
      executionId: first.executionId,
      stepId: first.recordStepId,
      state: approvedState,
    });
    expect(allowed.ok).toBe(true);

    const second = persistFirstMarketingDraft(first.state, {
      organizationId: ORG,
      actorId: "user_1",
      plan: samplePlan("A different strategy that must not replace the stored draft."),
      now: NOW,
    });
    if (!second.ok) throw new Error(second.code);
    expect(second.reused).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.state.tasks).toHaveLength(1);
    expect(second.state.executions).toHaveLength(1);
    expect(second.state.approvals).toHaveLength(1);
    expect(preparedDraftFromState(second.state, ORG)?.strategy).toContain("weekday lunch");
    const foreign = persistFirstMarketingDraft(first.state, {
      organizationId: OTHER,
      actorId: "user_2",
      plan: samplePlan(),
      now: NOW,
    });
    expect(foreign.ok).toBe(false);
  });

  it("does not store an invalid or paused-worker draft", () => {
    const placed = place(withConfirmedFacts(ORG));
    if (!placed.ok) throw new Error(placed.code);
    const invalid = persistFirstMarketingDraft(placed.state, {
      organizationId: ORG,
      actorId: "user_1",
      plan: { ...samplePlan(), simulated: true },
      now: NOW,
    });
    expect(invalid.ok).toBe(false);
    const paused = {
      ...placed.state,
      workers: (placed.state.workers ?? []).map((worker) => ({ ...worker, status: "PAUSED" as const })),
    };
    const blocked = persistFirstMarketingDraft(paused, {
      organizationId: ORG,
      actorId: "user_1",
      plan: samplePlan(),
      now: NOW,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("worker_paused");
  });

  it("keeps the route from trusting client authority", () => {
    const route = readFileSync(path.join(ROOT, "app/api/v1/marketing/first-result/route.ts"), "utf8");
    const server = readFileSync(path.join(ROOT, "app/lib/marketing/firstResultServer.ts"), "utf8");
    expect(route).toContain('void url.searchParams.get("organizationId")');
    expect(route).toContain('void url.searchParams.get("claimGatePassed")');
    expect(route).toContain("parseFirstResultStart");
    expect(server).toContain("pg_advisory_xact_lock");
    expect(server).toContain("actor.organizationId");
    expect(server).toContain("persistFirstMarketingDraft");
    expect(server).toContain("draftMarketingPlan");
    expect(server).not.toContain("body.organizationId");
    expect(server).not.toContain('state: "APPROVED"');
    const claim = readFileSync(path.join(ROOT, "app/lib/marketing/claimGate.ts"), "utf8");
    expect(claim).toContain("CLAIM_GATE_VERSION");
  });
});

function samplePlan(strategy = "Invite guests to the weekday lunch menu.") {
  const parsed = parseModelMarketingProposal(
    {
      strategy,
      audience: "",
      offer: "Daily changing lunch menu",
      channelIntent: "website",
      contentThemes: ["lunch"],
      contentItems: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
        day,
        theme: "Lunch",
        draftCopy: `Day ${day} lunch.`,
        callToAction: "Visit",
      })),
    },
    {
      goalStatement: FIRST_MARKETING_GOAL_STATEMENT,
      organizationName: "Restaurant Menzel",
      offer: "Daily changing lunch menu",
      facts: [],
      contextRecordIds: [],
      narrowedFromPublish: false,
    },
    "gpt-4.1",
  );
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.plan;
}

function waitingInput() {
  return {
    accessAllowed: true as const,
    blockCode: "allowed" as const,
    missingFacts: [] as readonly string[],
    workerPaused: false,
    goalStatus: "active",
    draftReady: true,
    claimResult: null as null,
    approvalGranted: false,
    stored: false,
    verified: false,
    failed: false,
  };
}
