import { beforeEach, describe, expect, it } from "vitest";
import {
  authorizeCapabilityExecution,
  simulatedExecutionFailure,
  toolAvailability,
} from "@/features/agents/capabilities/registry";
import {
  createMemoryCrmBridge,
  setCrmBridgeProvider,
} from "@/features/agents/crm";
import { emptyCustomerDraft } from "@/features/agents/crm/adapter";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import {
  buildCrmFollowUpPlan,
  buildFollowUpAndRecordPlan,
} from "@/features/agents/orchestration/goalPlan";
import {
  normalizeBusinessGoalIntent,
  planAuthorizedBusinessGoal,
  reviseFailedBusinessGoal,
} from "@/features/agents/orchestration/goalPlanner";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import type { BusinessGoal } from "@/features/agents/types";

const ORG = "org_phase13";

function runtime() {
  agentOsService.ensureWorkspace(ORG);
  const found = agentOsService.listRuntimes(ORG).find((item) => item.agentId === "crm_assistant");
  if (!found) throw new Error("missing runtime");
  return found;
}

describe("Phase 13 business goal planning", () => {
  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  it("normalizes a CRM follow-up and keeps write steps behind approval", () => {
    const intent = normalizeBusinessGoalIntent("Prepare a CRM follow-up for this customer.");
    expect(intent?.goalType).toBe("crm_follow_up");
    expect(intent?.requestedOutcome).toMatch(/verified/);
    const goal: BusinessGoal = {
      id: "goal_plan",
      organizationId: ORG,
      statement: intent!.objective,
      goalType: intent!.goalType,
      requestedOutcome: intent!.requestedOutcome,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const plan = planAuthorizedBusinessGoal({ goal, agentInstanceId: "instance" });
    expect(plan.steps.map((step) => step.capabilityId)).toEqual([
      "CRM_LOAD_CUSTOMER",
      "CRM_PREPARE_NOTE",
      "CRM_CREATE_NOTE",
      "CRM_VERIFY_NOTE",
    ]);
    const write = plan.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE");
    expect(write?.approvalRequired).toBe(true);
    expect(write?.dependsOn).toEqual(["goal_plan:prepare"]);
    expect(write?.idempotencyKey).toBe("goal_plan:execute");
    expect(plan.steps.find((step) => step.capabilityId === "CRM_LOAD_CUSTOMER")?.approvalRequired).toBe(false);
  });

  it("plans email before the CRM record and blocks the record on email verification", () => {
    const intent = normalizeBusinessGoalIntent("Reply to this customer and record the result.");
    expect(intent?.goalType).toBe("follow_up_and_record");
    const goal: BusinessGoal = {
      id: "goal_both",
      organizationId: ORG,
      statement: intent!.objective,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const plan = buildFollowUpAndRecordPlan({ goal, agentInstanceId: "instance" });
    const verifyEmail = plan.steps.find((step) => step.capabilityId === "COMMUNICATION_VERIFY_EMAIL");
    const create = plan.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE");
    expect(create?.dependsOn[0]).toBe(plan.steps.find((step) => step.capabilityId === "CRM_PREPARE_NOTE")?.id);
    expect(plan.steps.find((step) => step.capabilityId === "CRM_PREPARE_NOTE")?.dependsOn).toEqual([verifyEmail?.id]);
    expect(plan.steps.filter((step) => step.approvalRequired).map((step) => step.capabilityId)).toEqual([
      "COMMUNICATION_SEND_EMAIL",
      "CRM_CREATE_NOTE",
    ]);
  });

  it("refuses blocked, simulated, future, and unknown capabilities", () => {
    expect(authorizeCapabilityExecution({ capabilityId: "FINANCE_CREATE_INVOICE", organizationId: ORG }).ok).toBe(false);
    expect(authorizeCapabilityExecution({ capabilityId: "SOCIAL_PUBLISH", organizationId: ORG }).ok).toBe(false);
    expect(toolAvailability("projects")).toBe("SIMULATED");
    expect(simulatedExecutionFailure("projects").availability).toBe("SIMULATED");
    expect(toolAvailability("website")).toBe("FUTURE");
    expect(authorizeCapabilityExecution({ capabilityId: "CRM_CREATE_NOTE", organizationId: " " }).ok).toBe(false);
  });

  it("does not run a CRM write when email verification already failed", async () => {
    const provider = createMemoryCrmBridge();
    const customer = await provider.createCustomer(ORG, emptyCustomerDraft({
      companyName: "Ada",
      contactName: "Ada",
      email: "ada@example.com",
      phone: "+49",
      address: "1",
      city: "Berlin",
      country: "DE",
      status: "active",
      owner: "tester",
    }));
    setCrmBridgeProvider(provider);
    const instance = runtime();
    const goal: BusinessGoal = {
      id: "goal_fail_dep",
      organizationId: ORG,
      statement: "Reply to this customer and record the result.",
      customerId: customer.id,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const plan = buildFollowUpAndRecordPlan({ goal, agentInstanceId: instance.instanceId });
    const failed = {
      ...plan,
      steps: plan.steps.map((step) => {
        if (step.capabilityId === "COMMUNICATION_VERIFY_EMAIL") {
          return { ...step, status: "failed" as const, error: "Email acceptance was not verified." };
        }
        if (step.presentationKey === "customer" || step.presentationKey === "draft" || step.presentationKey === "send") {
          return { ...step, status: "completed" as const };
        }
        return step;
      }),
    };
    agentsStore.upsertBusinessGoal({ ...goal, planId: failed.id });
    const task = await agentOsService.enqueueTask({
      organizationId: ORG,
      agentInstanceId: instance.instanceId,
      title: goal.statement,
      goal: goal.statement,
      plan: failed,
      maxAttempts: 1,
      payload: { businessGoalId: goal.id, customerId: customer.id },
    });
    expect(task.status).toBe("failed");
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
    const stored = agentsStore.getSnapshot().plans.find((item) => item.id === failed.id);
    expect(stored?.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE")?.status).not.toBe("completed");
  });

  it("revises a failed plan without authorizing another mutation", () => {
    const instance = runtime();
    const goal: BusinessGoal = {
      id: "goal_revise",
      organizationId: ORG,
      statement: "Prepare a CRM follow-up for this customer.",
      status: "failed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const plan = buildCrmFollowUpPlan({ goal, agentInstanceId: instance.instanceId });
    const failed = {
      ...plan,
      steps: plan.steps.map((step) =>
        step.capabilityId === "CRM_VERIFY_NOTE"
          ? { ...step, status: "failed" as const, error: "CRM note was not verified." }
          : step,
      ),
    };
    agentsStore.upsertPlan(failed);
    agentsStore.upsertBusinessGoal({ ...goal, planId: failed.id });
    const revision = reviseFailedBusinessGoal({ organizationId: ORG, goalId: goal.id });
    expect(revision.previousPlanId).toBe(failed.id);
    expect(revision.id).not.toBe(failed.id);
    expect(agentsStore.getSnapshot().plans.find((item) => item.id === failed.id)?.steps.find((step) => step.capabilityId === "CRM_VERIFY_NOTE")?.status).toBe("failed");
    expect(revision.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE")?.approvalRequired).toBe(false);
    expect(revision.steps.find((step) => step.capabilityId === "CRM_VERIFY_NOTE")?.status).toBe("failed");
  });

  it("stores the normalized goal from the session organization", async () => {
    const provider = createMemoryCrmBridge();
    const customer = await provider.createCustomer(ORG, emptyCustomerDraft({
      companyName: "Ada",
      contactName: "Ada",
      email: "ada@example.com",
      phone: "+49",
      address: "1",
      city: "Berlin",
      country: "DE",
      status: "active",
      owner: "tester",
    }));
    setCrmBridgeProvider(provider);
    const goal = await startBusinessGoal({
      organizationId: ORG,
      clientOrganizationId: "org_other",
      agentInstanceId: runtime().instanceId,
      statement: `Prepare a CRM follow-up for this customer. ${customer.id}`,
    });
    expect(goal.organizationId).toBe(ORG);
    expect(goal.goalType).toBe("crm_follow_up");
    expect(goal.customerId).toBe(customer.id);
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
  });
});
