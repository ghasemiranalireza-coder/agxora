import { beforeEach, describe, expect, it } from "vitest";
import { canUseCapability } from "@/app/lib/billing/entitlements";
import { decideGovernedExecution } from "@/app/lib/billing/executionPolicy";
import { authorizeCapabilityExecution, getCapability } from "@/features/agents/capabilities/registry";
import { createMemoryCrmBridge, setCrmBridgeProvider } from "@/features/agents/crm";
import { resetGovernedExecutionMemory } from "@/features/agents/evidence/governedExecution";
import { isBusinessMemoryValue } from "@/features/agents/memory/businessContext";
import {
  handleMarketingTool,
  setMarketingTransportForTests,
  type MarketingTransport,
} from "@/features/agents/marketing/handlers";
import { asksToPublishOrAdvertise, isMarketingPlanGoal } from "@/features/agents/marketing/intent";
import {
  modelIsSimulated,
  parseModelMarketingProposal,
  requiredMarketingFacts,
  validateStoredMarketingPlan,
  type MarketingPlanDocument,
  type MarketingProjection,
} from "@/features/agents/marketing/planSchema";
import { normalizeBusinessGoalIntent } from "@/features/agents/orchestration/goalPlanner";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { normalizeState } from "@/features/agents/repositories/state";
import { capabilitiesForRole, createWorker } from "@/features/agents/workforce/workers";

const ORG = "org_phase22";
const OTHER = "org_phase22_other";
const OFFER = "Mittagsmenü";
const STATEMENT = "Ich möchte diesen Monat mehr Kunden für mein Restaurant gewinnen.";

function projection(overrides?: Partial<MarketingProjection>): MarketingProjection {
  return {
    goalStatement: STATEMENT,
    organizationName: "Casa Ada",
    offer: OFFER,
    facts: [{ key: "organization_name", text: "Business name: Casa Ada." }],
    contextRecordIds: ["mem_1"],
    narrowedFromPublish: false,
    ...overrides,
  };
}

function modelPayload(overrides?: Record<string, unknown>) {
  return {
    strategy: "Invite nearby guests to the weekday lunch menu.",
    audience: "People who work near the restaurant.",
    offer: OFFER,
    channelIntent: "instagram",
    contentThemes: ["lunch", "welcome"],
    contentItems: [1, 2, 3, 4, 5, 6, 7].map((day) => ({
      day,
      theme: `Theme ${day}`,
      draftCopy: `Draft copy for day ${day}.`,
      callToAction: "Reserve a table",
    })),
    ...overrides,
  };
}

function planFromModel(): MarketingPlanDocument {
  const parsed = parseModelMarketingProposal(modelPayload(), projection(), "gpt-4.1");
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.plan;
}

function runtime() {
  agentOsService.ensureWorkspace(ORG);
  const found = agentOsService.listRuntimes(ORG).find((item) => item.agentId === "crm_assistant");
  if (!found) throw new Error("missing runtime");
  return found;
}

function transport(plan: MarketingPlanDocument, calls: { record: number; prepare: number }): MarketingTransport {
  return {
    async loadContext() {
      return {
        ok: true,
        verified: true,
        organizationName: "Casa Ada",
        facts: [{ key: "organization_name", text: "Business name: Casa Ada." }],
        contextRecordIds: ["mem_1"],
        missingFacts: [],
      };
    },
    async prepare() {
      calls.prepare += 1;
      return { ok: true, simulated: false, modelId: "gpt-4.1", plan };
    },
    async record() {
      calls.record += 1;
      return { ok: true, stored: true, planRecordId: "plan_record_1", plan: { ...plan, status: "approved_stored" } };
    },
    async verify() {
      return { ok: true, verified: true, planRecordId: "plan_record_1", evidenceId: "evidence_1" };
    },
  };
}

describe("Phase 22 marketing plan", () => {
  beforeEach(() => {
    agentsStore.reset();
    resetGovernedExecutionMemory();
    setCrmBridgeProvider(createMemoryCrmBridge());
    setMarketingTransportForTests(null);
  });

  it("recognizes a marketing plan and narrows publish requests", () => {
    expect(isMarketingPlanGoal(STATEMENT)).toBe(true);
    expect(normalizeBusinessGoalIntent(STATEMENT)?.goalType).toBe("marketing_plan");
    expect(normalizeBusinessGoalIntent("Prepare a CRM follow-up for this customer.")?.goalType).toBe("crm_follow_up");
    expect(normalizeBusinessGoalIntent("Reply to this customer.")?.goalType).toBe("customer_reply");
    const publish = normalizeBusinessGoalIntent("Publish an Instagram campaign and buy ads for my restaurant.");
    expect(publish?.goalType).toBe("marketing_plan");
    expect(publish?.narrowedFromPublish).toBe(true);
    expect(asksToPublishOrAdvertise("Publish an Instagram campaign and buy ads for my restaurant.")).toBe(true);
    expect(publish?.requestedOutcome).toMatch(/not available/);
  });

  it("rejects unknown model fields, tools, metrics, and a mismatched offer", () => {
    expect(requiredMarketingFacts("")).toEqual(["offer"]);
    expect(requiredMarketingFacts(OFFER)).toEqual([]);
    expect(parseModelMarketingProposal(modelPayload({ impressions: 10 }), projection(), "gpt-4.1").ok).toBe(false);
    expect(parseModelMarketingProposal(modelPayload({ tools: ["social_publish"] }), projection(), "gpt-4.1").ok).toBe(false);
    expect(parseModelMarketingProposal(modelPayload({ offer: "Invented offer" }), projection(), "gpt-4.1").ok).toBe(false);
    expect(parseModelMarketingProposal(modelPayload({ channelIntent: "tiktok" }), projection(), "gpt-4.1").ok).toBe(false);
    const extra = modelPayload();
    (extra as { publishStatus?: string }).publishStatus = "published";
    expect(parseModelMarketingProposal(extra, projection(), "gpt-4.1").ok).toBe(false);
    expect(modelIsSimulated({ modelId: "gpt-placeholder", simulated: false })).toBe(true);
    expect(parseModelMarketingProposal(modelPayload(), projection(), "openai-stub").ok).toBe(false);
  });

  it("keeps future marketing capabilities future and entitles only Business and Professional", () => {
    expect(getCapability("MARKETING_RECORD_PLAN")?.availability.status).toBe("LIVE");
    expect(getCapability("MARKETING_RECORD_PLAN")?.approval.required).toBe(true);
    expect(getCapability("MARKETING_PREPARE_PLAN")?.mutating).toBe(false);
    expect(getCapability("SOCIAL_PUBLISH")?.availability.status).toBe("FUTURE");
    expect(getCapability("MARKETING_CAMPAIGN")?.availability.status).toBe("FUTURE");
    expect(authorizeCapabilityExecution({ capabilityId: "SOCIAL_PUBLISH", organizationId: ORG }).ok).toBe(false);
    expect(getCapability("MARKETING_IMAGE_CREATION")?.availability.status).toBe("FUTURE");
    expect(capabilitiesForRole("MARKETING")).toEqual([
      "MARKETING_LOAD_BUSINESS_CONTEXT",
      "MARKETING_PREPARE_PLAN",
      "MARKETING_RECORD_PLAN",
      "MARKETING_VERIFY_PLAN",
      "MARKETING_CREATE_IMAGE",
      "MARKETING_RECORD_BUSINESS_FACT",
    ]);
    expect(canUseCapability({ planCode: "agxora_base", capabilityId: "MARKETING_RECORD_PLAN", access: "paid" })).toBe(false);
    expect(canUseCapability({ planCode: "agxora_business", capabilityId: "MARKETING_RECORD_PLAN", access: "paid" })).toBe(true);
    expect(canUseCapability({ planCode: "agxora_professional", capabilityId: "MARKETING_PREPARE_PLAN", access: "paid" })).toBe(true);
    expect(canUseCapability({ planCode: null, capabilityId: "MARKETING_RECORD_PLAN", access: "legacy" })).toBe(false);
    const business = {
      organizationId: "org-a",
      planCode: "agxora_business" as const,
      status: "ACTIVE" as const,
      currentPeriodEnd: new Date("2026-10-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
    };
    expect(decideGovernedExecution({
      organizationId: "org-a",
      subscription: business,
      capabilityId: "MARKETING_RECORD_PLAN",
      registryStatus: "LIVE",
      counted: 0,
      now: new Date("2026-09-26T12:00:00.000Z"),
      replaying: false,
    }).allow).toBe(true);
    expect(decideGovernedExecution({
      organizationId: "org-a",
      subscription: { ...business, planCode: "agxora_base" },
      capabilityId: "MARKETING_RECORD_PLAN",
      registryStatus: "LIVE",
      counted: 0,
      now: new Date("2026-09-26T12:00:00.000Z"),
      replaying: false,
    }).reason).toBe("plan_denied");
  });

  it("stores one approved plan, verifies it, and keeps it after reload", async () => {
    const calls = { record: 0, prepare: 0 };
    const notes = { created: 0 };
    const provider = createMemoryCrmBridge();
    provider.createNote = async (...args) => {
      notes.created += 1;
      return createMemoryCrmBridge().createNote(...args);
    };
    setCrmBridgeProvider(provider);
    setMarketingTransportForTests(transport(planFromModel(), calls));
    const worker = createWorker({ organizationId: ORG, actorId: "user_1", role: "MARKETING" });
    const goal = await startBusinessGoal({
      organizationId: ORG,
      clientOrganizationId: OTHER,
      agentInstanceId: runtime().instanceId,
      statement: STATEMENT,
      workerId: worker.id,
      actorId: "user_1",
      marketingOffer: OFFER,
    });
    expect(goal.organizationId).toBe(ORG);
    expect(goal.goalType).toBe("marketing_plan");
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    const record = plan?.steps.find((step) => step.capabilityId === "MARKETING_RECORD_PLAN");
    expect(record?.status).toBe("blocked");
    expect(record?.approvalRequired).toBe(true);
    expect(calls.record).toBe(0);
    expect(calls.prepare).toBe(1);
    const approval = agentOsService.listApprovals(ORG).find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({ approvalId: approval!.id, state: "APPROVED", decidedBy: "user_1" });
    await agentOsService.resolveApproval({ approvalId: approval!.id, state: "APPROVED", decidedBy: "user_1" });
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    expect(finished?.status).toBe("completed");
    expect(calls.record).toBe(1);
    expect(notes.created).toBe(0);
    const stored = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(stored?.steps.find((step) => step.capabilityId === "MARKETING_VERIFY_PLAN")?.verification).toBe("verified");
    const outcomes = agentsStore.getSnapshot().memories.filter((recordItem) => {
      return isBusinessMemoryValue(recordItem.value) && recordItem.value.memoryType === "GOAL_OUTCOME" && recordItem.value.status === "VERIFIED";
    });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0] && isBusinessMemoryValue(outcomes[0].value) ? outcomes[0].value.content : "").toMatch(/Approved marketing plan/);
    expect(outcomes[0] && isBusinessMemoryValue(outcomes[0].value) ? outcomes[0].value.provenance : "").toBe("VERIFIED_EXECUTION");
    const reloaded = normalizeState(JSON.parse(JSON.stringify(agentsStore.getSnapshot())));
    expect(reloaded?.businessGoals?.find((item) => item.id === goal.id)?.status).toBe("completed");
    if (finished?.taskId) await agentOsService.executeTask(finished.taskId);
    expect(calls.record).toBe(1);
  });

  it("does not verify a rejected plan and fails closed on a simulated model", async () => {
    const calls = { record: 0, prepare: 0 };
    setMarketingTransportForTests(transport(planFromModel(), calls));
    const worker = createWorker({ organizationId: ORG, actorId: "user_1", role: "MARKETING" });
    const goal = await startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: STATEMENT,
      workerId: worker.id,
      actorId: "user_1",
      marketingOffer: OFFER,
    });
    const approval = agentOsService.listApprovals(ORG).find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({ approvalId: approval!.id, state: "REJECTED", decidedBy: "user_1" });
    expect(calls.record).toBe(0);
    const rejected = agentsStore.getSnapshot().memories.filter((recordItem) => {
      return isBusinessMemoryValue(recordItem.value) && recordItem.value.status === "VERIFIED" && recordItem.value.content.includes("Approved marketing plan");
    });
    expect(rejected).toHaveLength(0);
    const kept = agentsStore.getSnapshot().memories.find((recordItem) => {
      return isBusinessMemoryValue(recordItem.value) && recordItem.value.status === "REJECTED";
    });
    expect(kept && isBusinessMemoryValue(kept.value) ? kept.value.content : "").toMatch(/Rejected marketing plan/);
    expect((agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id)?.status).toBe("cancelled");

    setMarketingTransportForTests({
      ...transport(planFromModel(), calls),
      async prepare() {
        return { ok: false, simulated: true, error: "The marketing model result is simulated." };
      },
    });
    await expect(startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: "Plan my Instagram for this month.",
      workerId: worker.id,
      actorId: "user_1",
      marketingOffer: OFFER,
    })).resolves.toMatchObject({ status: "failed" });
    const simulated = validateStoredMarketingPlan({ ...planFromModel(), simulated: true });
    expect(simulated.ok).toBe(false);
  });

  it("blocks approval bypass, a foreign worker, and a plan without an offer", async () => {
    const calls = { record: 0, prepare: 0 };
    setMarketingTransportForTests(transport(planFromModel(), calls));
    await expect(startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: STATEMENT,
      actorId: "user_1",
      marketingOffer: OFFER,
    })).rejects.toThrow(/Marketing Worker/);
    const foreign = createWorker({ organizationId: OTHER, actorId: "user_2", role: "MARKETING" });
    await expect(startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: STATEMENT,
      workerId: foreign.id,
      actorId: "user_1",
      marketingOffer: OFFER,
    })).rejects.toThrow(/not found/);
    const worker = createWorker({ organizationId: ORG, actorId: "user_1", role: "MARKETING" });
    await expect(startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: STATEMENT,
      workerId: worker.id,
      actorId: "user_1",
    })).rejects.toThrow(/offer/);
    setMarketingTransportForTests({
      ...transport(planFromModel(), calls),
      async record() {
        return { ok: false, stored: false, error: "This marketing plan is not approved." };
      },
    });
    const blocked = await handleMarketingTool({
      organizationId: ORG,
      agentInstanceId: "instance",
      taskId: "task",
      params: { action: "record_marketing_plan", goal: STATEMENT, marketingPlan: planFromModel() },
    });
    expect(blocked.ok).toBe(false);
    expect(calls.record).toBe(0);
    expect(getCapability("MARKETING_CREATE_POST")).toBeUndefined();
    expect(getCapability("MARKETING_PUBLISH_CONTENT")).toBeUndefined();
  });
});
