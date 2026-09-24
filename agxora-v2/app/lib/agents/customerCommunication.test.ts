import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyCustomerDraft } from "@/features/agents/crm/adapter";
import {
  createMemoryCrmBridge,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
} from "@/features/agents/crm";
import { nextExecutableSteps } from "@/features/agents/planning";
import {
  filterStateForOrganization,
  MemoryAgentsRepository,
  normalizeState,
} from "@/features/agents/repositories";
import { agentOsService } from "@/features/agents/services";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { getCapability } from "@/features/agents/capabilities/registry";
import {
  setCustomerEmailSenderForTests,
  type CustomerEmailSendInput,
} from "@/features/agents/communication/handlers";
import {
  buildCustomerReplyPlan,
  isCustomerReplyGoal,
} from "@/features/agents/orchestration/goalPlan";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import type { BusinessGoal } from "@/features/agents/types";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory";

const ORG_A = "org_day10_a";
const ORG_B = "org_day10_b";

function draft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return emptyCustomerDraft({
    companyName: "AGXORA E2E TEST",
    contactName: "Ada Lovelace",
    email: "ada@e2e.test",
    phone: "+49 30 100",
    address: "Invalidenstrasse 1",
    city: "Berlin",
    country: "DE",
    status: "active",
    owner: "tester",
    ...partial,
  });
}

function crmRuntime(organizationId: string) {
  agentOsService.ensureWorkspace(organizationId);
  const runtime = agentOsService
    .listRuntimes(organizationId)
    .find((item) => item.agentId === "crm_assistant");
  if (!runtime) throw new Error("missing crm runtime");
  return runtime;
}

describe("Day 10 customer communication", () => {
  const sends: CustomerEmailSendInput[] = [];

  beforeEach(() => {
    sends.length = 0;
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
    setCustomerEmailSenderForTests(async (input) => {
      sends.push(input);
      return { ok: true, delivery: "queued", recipient: "ada@e2e.test" };
    });
  });

  afterEach(() => {
    resetCrmBridgeProvider();
    setCustomerEmailSenderForTests(null);
  });

  it("builds an ordered email plan with one approval gate", () => {
    expect(isCustomerReplyGoal("Reply to this customer's email.")).toBe(true);
    expect(isCustomerReplyGoal("Prepare a CRM follow-up for this customer.")).toBe(false);
    const goal: BusinessGoal = {
      id: "goal_mail",
      organizationId: ORG_A,
      statement: "Reply to this customer's email.",
      status: "draft",
      createdAt: "2026-09-24T00:00:00.000Z",
      updatedAt: "2026-09-24T00:00:00.000Z",
    };
    const plan = buildCustomerReplyPlan({ goal, agentInstanceId: "agent_1" });
    expect(plan.steps.map((step) => step.capabilityId)).toEqual([
      "COMMUNICATION_LOAD_CUSTOMER",
      "COMMUNICATION_PREPARE_EMAIL",
      "COMMUNICATION_SEND_EMAIL",
      "COMMUNICATION_VERIFY_EMAIL",
    ]);
    expect(plan.steps[1]?.dependsOn).toEqual([plan.steps[0]?.id]);
    expect(plan.steps[2]?.dependsOn).toEqual([plan.steps[1]?.id]);
    expect(plan.steps[3]?.dependsOn).toEqual([plan.steps[2]?.id]);
    expect(plan.steps.map((step) => step.approvalRequired)).toEqual([false, false, true, false]);
    expect(getCapability("COMMUNICATION_SEND_EMAIL")?.mutating).toBe(true);
    expect(getCapability("COMMUNICATION_SEND_EMAIL")?.approvalRequired).toBe(true);
    expect(nextExecutableSteps(plan).map((step) => step.presentationKey)).toEqual(["customer"]);
  });

  it("does not send before approval and verifies one queued send after approval", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: "Reply to this customer's email.",
    });
    expect(sends).toHaveLength(0);
    expect(goal.status).toBe("active");
    const waiting = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(waiting?.status).toBe("waiting_for_approval");
    expect(waiting?.steps.find((step) => step.presentationKey === "send")?.status).toBe("blocked");
    const draftStep = waiting?.steps.find((step) => step.presentationKey === "draft");
    const prepared = (draftStep?.result as { draft?: { to?: string } } | undefined)?.draft;
    expect(prepared?.to).toBe("ada@e2e.test");

    const approval = agentOsService.listApprovals(ORG_A).find((item) => item.taskId === goal.taskId);
    expect(approval?.state).toBe("REQUIRES_APPROVAL");
    expect(approval?.toolId).toBe("email");
    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester-again",
    });

    expect(sends).toHaveLength(1);
    expect(sends[0]?.idempotencyKey).toContain(":send");
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    expect(finished?.status).toBe("completed");
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(plan?.status).toBe("completed");
    const verify = plan?.steps.find((step) => step.capabilityId === "COMMUNICATION_VERIFY_EMAIL");
    expect(verify?.verification).toBe("verified");
    expect((verify?.result as { delivery?: string } | undefined)?.delivery).toBe("queued");
  });

  it("fails the goal when the provider rejects the send", async () => {
    setCustomerEmailSenderForTests(async () => ({
      ok: false,
      delivery: "not_configured",
      error: "provider_rejected",
    }));
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: "Prepare a response to this customer.",
    });
    const approval = agentOsService.listApprovals(ORG_A).find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    expect(finished?.status).toBe("failed");
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(plan?.status).not.toBe("completed");
    expect(plan?.steps.find((step) => step.presentationKey === "confirm")?.status).not.toBe("completed");
  });

  it("does not ask for approval when the customer has no email", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    await provider.createCustomer(ORG_A, draft({ email: "" }));
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: "Reply to this customer's email.",
    });
    expect(sends).toHaveLength(0);
    expect(agentOsService.listApprovals(ORG_A)).toHaveLength(0);
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    expect(finished?.status).toBe("failed");
    expect(finished?.error).toMatch(/valid customer email/i);
  });

  it("does not send to a customer in another organization", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const foreign = await provider.createCustomer(ORG_B, draft({ email: "foreign@other.test" }));
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: "Reply to this customer's email.",
      customerId: foreign.id,
    });
    expect(sends).toHaveLength(0);
    expect(goal.status === "failed" || goal.status === "active").toBe(true);
    const stored = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    expect(stored?.status).not.toBe("completed");
    expect(agentOsService.listApprovals(ORG_A).some((item) => item.state === "APPROVED")).toBe(false);
  });

  it("keeps the completed email goal after the org state is reloaded", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: "Reply to this customer's email.",
    });
    const approval = agentOsService.listApprovals(ORG_A)[0];
    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const saved = filterStateForOrganization(agentsStore.getSnapshot(), ORG_A);
    const repo = new MemoryAgentsRepository();
    repo.save(saved);
    setAgentsRepository(repo);
    agentsStore.hydrate({ force: true, organizationId: ORG_A });
    const reloaded = (agentsStore.getSnapshot().businessGoals ?? []).find((item) => item.id === goal.id);
    expect(reloaded?.status).toBe("completed");
    const plan = normalizeState(saved)?.plans.find((item) => item.id === goal.planId);
    expect(plan?.status).toBe("completed");
    expect(plan?.steps.find((step) => step.presentationKey === "confirm")?.verification).toBe("verified");
  });
});
