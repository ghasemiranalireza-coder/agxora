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
  stateContainsForeignOrganization,
} from "@/features/agents/repositories";
import { agentOsService } from "@/features/agents/services";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { getCapability } from "@/features/agents/capabilities/registry";
import { businessGoalMemoryKey } from "@/features/agents/memory/businessContext";
import {
  buildCrmFollowUpPlan,
  isCrmFollowUpGoal,
} from "@/features/agents/orchestration/goalPlan";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import type { AgentPlan, BusinessGoal } from "@/features/agents/types";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory";

const ORG_A = "org_day9_a";
const ORG_B = "org_day9_b";

function draft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return emptyCustomerDraft({
    companyName: "Müller GmbH",
    contactName: "Ada Lovelace",
    email: "ada@mueller.test",
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

function goalStatement(): string {
  return "Prepare a CRM follow-up for this customer.";
}

describe("Day 9 business goal orchestration", () => {
  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  it("builds an ordered multi-step plan with one approval gate", () => {
    expect(isCrmFollowUpGoal(goalStatement())).toBe(true);
    expect(isCrmFollowUpGoal("Record a CRM note for Acme")).toBe(false);
    const goal: BusinessGoal = {
      id: "goal_plan",
      organizationId: ORG_A,
      statement: goalStatement(),
      status: "draft",
      createdAt: "2026-09-23T00:00:00.000Z",
      updatedAt: "2026-09-23T00:00:00.000Z",
    };
    const plan = buildCrmFollowUpPlan({ goal, agentInstanceId: "agent_1" });
    expect(plan.steps.map((step) => step.presentationKey)).toEqual([
      "load",
      "prepare",
      "execute",
      "verify",
    ]);
    expect(plan.steps[1]?.dependsOn).toEqual([plan.steps[0]?.id]);
    expect(plan.steps[2]?.dependsOn).toEqual([plan.steps[1]?.id]);
    expect(plan.steps[3]?.dependsOn).toEqual([plan.steps[2]?.id]);
    expect(plan.steps.map((step) => step.approvalRequired)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(getCapability("CRM_CREATE_NOTE")?.approvalRequired).toBe(true);
    expect(getCapability("CRM_CREATE_NOTE")?.mutating).toBe(true);
    expect(getCapability("NOT_A_TOOL")).toBeUndefined();
    expect(nextExecutableSteps(plan).map((step) => step.presentationKey)).toEqual([
      "load",
    ]);
  });

  it("does not mutate CRM before approval and verifies one note after approval", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const customer = await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);

    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: goalStatement(),
    });

    expect(goal.status).toBe("active");
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
    const waiting = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(waiting?.status).toBe("waiting_for_approval");
    expect(waiting?.steps.find((step) => step.presentationKey === "load")?.status).toBe(
      "completed",
    );
    expect(waiting?.steps.find((step) => step.presentationKey === "prepare")?.status).toBe(
      "completed",
    );
    expect(waiting?.steps.find((step) => step.presentationKey === "execute")?.status).toBe(
      "blocked",
    );
    expect(waiting?.steps.find((step) => step.presentationKey === "verify")?.status).toBe(
      "pending",
    );

    const approval = agentOsService
      .listApprovals(ORG_A)
      .find((item) => item.taskId === goal.taskId);
    expect(approval?.state).toBe("REQUIRES_APPROVAL");
    expect(approval?.toolId).toBe("crm");

    await Promise.all([
      agentOsService.resolveApproval({
        approvalId: approval!.id,
        state: "APPROVED",
        decidedBy: "tester",
      }),
      agentOsService.resolveApproval({
        approvalId: approval!.id,
        state: "APPROVED",
        decidedBy: "tester-again",
      }),
    ]);

    const notes = await provider.listNotes(customer.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.body).toBe(goalStatement());
    expect(notes[0]?.author).toBe("CRM Assistant");
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find(
      (item) => item.id === goal.id,
    );
    expect(finished?.status).toBe("completed");
    expect(finished?.summary).toBe("verified");
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(plan?.status).toBe("completed");
    expect(
      plan?.steps.find((step) => step.presentationKey === "verify")?.verification,
    ).toBe("verified");
    expect(
      plan?.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE")?.verification,
    ).toBe("not_required");
    const task = agentsStore.getSnapshot().tasks.find((item) => item.id === goal.taskId);
    expect(task?.status).toBe("completed");
    expect(
      agentsStore
        .getSnapshot()
        .memories.some(
          (item) =>
            item.organizationId === ORG_A &&
            item.scope === "business" &&
            item.key === businessGoalMemoryKey(goal.id),
        ),
    ).toBe(true);
  });

  it("keeps the goal failed when CRM execution fails and does not run the next step", async () => {
    const provider = createMemoryCrmBridge();
    let creates = 0;
    setCrmBridgeProvider({
      ...provider,
      async createNote() {
        creates += 1;
        throw new Error("crm_note_write_failed");
      },
    });
    const customer = await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: goalStatement(),
    });
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
    const approval = agentOsService
      .listApprovals(ORG_A)
      .find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });

    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find(
      (item) => item.id === goal.id,
    );
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(finished?.status).toBe("failed");
    expect(finished?.status).not.toBe("completed");
    expect(plan?.status).toBe("failed");
    expect(plan?.steps.find((step) => step.presentationKey === "execute")?.status).toBe(
      "failed",
    );
    expect(plan?.steps.find((step) => step.presentationKey === "verify")?.status).toBe(
      "pending",
    );
    expect(creates).toBe(1);
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
    const task = agentsStore.getSnapshot().tasks.find((item) => item.id === goal.taskId);
    expect(task?.status).toBe("failed");
    expect(JSON.stringify(finished)).not.toMatch(/"summary":"verified"/);
  });

  it("does not execute later steps when the customer cannot be resolved", async () => {
    const provider = createMemoryCrmBridge();
    let creates = 0;
    setCrmBridgeProvider({
      ...provider,
      async createNote(...args) {
        creates += 1;
        return provider.createNote(...args);
      },
    });
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: goalStatement(),
    });
    expect(goal.status).toBe("failed");
    expect(creates).toBe(0);
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(plan?.steps.find((step) => step.presentationKey === "load")?.status).toBe(
      "failed",
    );
    expect(plan?.steps.find((step) => step.presentationKey === "prepare")?.status).toBe(
      "pending",
    );
    expect(plan?.steps.find((step) => step.presentationKey === "execute")?.status).toBe(
      "pending",
    );
  });

  it("rejects a foreign customer and does not write a note", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const foreign = await provider.createCustomer(
      ORG_A,
      draft({ email: "hidden@other.test" }),
    );
    const runtime = crmRuntime(ORG_B);
    const goal = await startBusinessGoal({
      organizationId: ORG_B,
      agentInstanceId: runtime.instanceId,
      statement: goalStatement(),
      customerId: foreign.id,
    });
    expect(goal.status).toBe("failed");
    expect(await provider.listNotes(foreign.id)).toHaveLength(0);
    expect(JSON.stringify(goal)).not.toMatch(/other\.test/i);
  });

  it("cancels the goal on rejection and does not write", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const customer = await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: goalStatement(),
    });
    const approval = agentOsService
      .listApprovals(ORG_A)
      .find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "REJECTED",
      decidedBy: "tester",
    });
    const finished = (agentsStore.getSnapshot().businessGoals ?? []).find(
      (item) => item.id === goal.id,
    );
    expect(finished?.status).toBe("cancelled");
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(plan?.status).toBe("cancelled");
    expect(plan?.steps.find((step) => step.presentationKey === "execute")?.status).toBe(
      "cancelled",
    );
  });

  it("refuses an unregistered capability before any CRM write", async () => {
    const provider = createMemoryCrmBridge();
    let creates = 0;
    setCrmBridgeProvider({
      ...provider,
      async createNote(...args) {
        creates += 1;
        return provider.createNote(...args);
      },
    });
    await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);
    const goal: BusinessGoal = {
      id: "goal_evil",
      organizationId: ORG_A,
      statement: goalStatement(),
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const plan: AgentPlan = {
      ...buildCrmFollowUpPlan({ goal, agentInstanceId: runtime.instanceId }),
      steps: buildCrmFollowUpPlan({
        goal,
        agentInstanceId: runtime.instanceId,
      }).steps.map((step) =>
        step.presentationKey === "load"
          ? { ...step, capabilityId: "SOCIAL_PUBLISH" }
          : step,
      ),
    };
    agentsStore.upsertBusinessGoal({ ...goal, planId: plan.id });
    const task = await agentOsService.enqueueTask({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      title: goal.statement,
      goal: goal.statement,
      plan,
      maxAttempts: 1,
      payload: { businessGoalId: goal.id },
    });
    expect(task.status).toBe("failed");
    expect(task.error).toMatch(/Unsupported capability/);
    expect(creates).toBe(0);
  });

  it("persists the goal inside the org-scoped Agent OS state and hides other tenants", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const customer = await provider.createCustomer(ORG_A, draft());
    const runtime = crmRuntime(ORG_A);
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      agentInstanceId: runtime.instanceId,
      statement: goalStatement(),
    });
    const approval = agentOsService
      .listApprovals(ORG_A)
      .find((item) => item.state === "REQUIRES_APPROVAL");
    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });

    const saved = filterStateForOrganization(agentsStore.getSnapshot(), ORG_A);
    expect(saved.businessGoals).toHaveLength(1);
    expect(saved.businessGoals?.[0]?.status).toBe("completed");
    expect(normalizeState(saved)?.businessGoals?.[0]?.planId).toBe(goal.planId);

    const mixed = {
      ...saved,
      businessGoals: [
        ...(saved.businessGoals ?? []),
        {
          ...saved.businessGoals![0]!,
          id: "goal_other",
          organizationId: ORG_B,
        },
      ],
    };
    expect(stateContainsForeignOrganization(mixed, ORG_A)).toBe(true);
    const isolated = filterStateForOrganization(mixed, ORG_A);
    expect(isolated.businessGoals?.map((item) => item.organizationId)).toEqual([ORG_A]);

    const repo = new MemoryAgentsRepository();
    repo.save(isolated);
    setAgentsRepository(repo);
    agentsStore.hydrate({ force: true, organizationId: ORG_A });
    const reloaded = (agentsStore.getSnapshot().businessGoals ?? []).find(
      (item) => item.id === goal.id,
    );
    expect(reloaded?.status).toBe("completed");
    expect(reloaded?.organizationId).toBe(ORG_A);
    expect(await provider.listNotes(customer.id)).toHaveLength(1);
  });
});
