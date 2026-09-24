/**
 * Deterministic business-goal planner.
 * It selects only registry-authorized capabilities. It does not call an LLM
 * and it does not execute steps.
 */

import { authorizeCapabilityExecution, listCapabilities } from "../capabilities/registry";
import { agentsStore } from "../store";
import type { AgentPlan, BusinessGoal } from "../types";
import {
  buildCrmFollowUpPlan,
  buildCustomerReplyPlan,
  buildFollowUpAndRecordPlan,
  isCrmFollowUpGoal,
  isCustomerReplyGoal,
} from "./goalPlan";

export type BusinessGoalType = "crm_follow_up" | "customer_reply" | "follow_up_and_record";

export interface NormalizedBusinessGoal {
  readonly goalType: BusinessGoalType;
  readonly objective: string;
  readonly requestedOutcome: string;
  readonly capabilityIds: readonly string[];
}

const PLAN_CAPABILITIES: Record<BusinessGoalType, readonly string[]> = {
  crm_follow_up: [
    "CRM_LOAD_CUSTOMER",
    "CRM_PREPARE_NOTE",
    "CRM_CREATE_NOTE",
    "CRM_VERIFY_NOTE",
  ],
  customer_reply: [
    "COMMUNICATION_LOAD_CUSTOMER",
    "COMMUNICATION_PREPARE_EMAIL",
    "COMMUNICATION_SEND_EMAIL",
    "COMMUNICATION_VERIFY_EMAIL",
  ],
  follow_up_and_record: [
    "COMMUNICATION_LOAD_CUSTOMER",
    "COMMUNICATION_PREPARE_EMAIL",
    "COMMUNICATION_SEND_EMAIL",
    "COMMUNICATION_VERIFY_EMAIL",
    "CRM_PREPARE_NOTE",
    "CRM_CREATE_NOTE",
    "CRM_VERIFY_NOTE",
  ],
};

export function normalizeBusinessGoalIntent(
  statement: string,
): NormalizedBusinessGoal | null {
  const objective = statement.trim();
  if (!objective) return null;
  const reply = isCustomerReplyGoal(objective);
  const followUp = isCrmFollowUpGoal(objective) || /record the result/i.test(objective);
  if (reply && followUp) {
    return {
      goalType: "follow_up_and_record",
      objective,
      requestedOutcome: "Email accepted and queued, then the CRM note is recorded and verified.",
      capabilityIds: PLAN_CAPABILITIES.follow_up_and_record,
    };
  }
  if (reply) {
    return {
      goalType: "customer_reply",
      objective,
      requestedOutcome: "Provider accepted the email and queued it. Inbox delivery is not claimed.",
      capabilityIds: PLAN_CAPABILITIES.customer_reply,
    };
  }
  if (isCrmFollowUpGoal(objective)) {
    return {
      goalType: "crm_follow_up",
      objective,
      requestedOutcome: "CRM follow-up note recorded and verified.",
      capabilityIds: PLAN_CAPABILITIES.crm_follow_up,
    };
  }
  return null;
}

export function assertPlanCapabilities(input: {
  readonly goalType: BusinessGoalType;
  readonly organizationId: string;
}): void {
  for (const capabilityId of PLAN_CAPABILITIES[input.goalType]) {
    const decision = authorizeCapabilityExecution({
      capabilityId,
      organizationId: input.organizationId,
    });
    if (!decision.ok) {
      throw new Error(
        `capabilityUnavailable: ${capabilityId} ${decision.failure.availability} ${decision.failure.reason}`,
      );
    }
    const contract = decision.capability;
    if (contract.mode === "WRITE") {
      if (!contract.approval.required || !contract.verification.required || !contract.execution.idempotencyRequired) {
        throw new Error(`Capability ${capabilityId} is not safe to plan.`);
      }
    }
  }
}

export function planAuthorizedBusinessGoal(input: {
  readonly goal: BusinessGoal;
  readonly agentInstanceId: string;
  readonly plannerContext?: AgentPlan["plannerContext"];
}): AgentPlan {
  const intent = normalizeBusinessGoalIntent(input.goal.statement);
  if (!intent) throw new Error("agents.businessGoal.errors.unsupported");
  assertPlanCapabilities({
    goalType: intent.goalType,
    organizationId: input.goal.organizationId,
  });
  const built =
    intent.goalType === "follow_up_and_record"
      ? buildFollowUpAndRecordPlan(input)
      : intent.goalType === "customer_reply"
        ? buildCustomerReplyPlan(input)
        : buildCrmFollowUpPlan(input);
  for (const step of built.steps) {
    if (!step.capabilityId || !listCapabilities().some((item) => item.id === step.capabilityId)) {
      throw new Error(`Unsupported capability: ${step.capabilityId ?? "unknown"}`);
    }
    if (step.approvalRequired) {
      const contract = listCapabilities().find((item) => item.id === step.capabilityId);
      if (!contract?.approval.required || contract.mode !== "WRITE") {
        throw new Error(`Capability ${step.capabilityId} approval does not match the plan.`);
      }
    }
  }
  return built;
}

/**
 * Keep the failed plan unchanged and store a non-executing revision.
 * The revision does not repeat a send or a CRM write.
 */
export function reviseFailedBusinessGoal(input: {
  readonly organizationId: string;
  readonly goalId: string;
}): AgentPlan {
  const goal = (agentsStore.getSnapshot().businessGoals ?? []).find(
    (item) => item.id === input.goalId && item.organizationId === input.organizationId,
  );
  if (!goal?.planId) throw new Error("Goal not found");
  const plan = agentsStore.getSnapshot().plans.find(
    (item) => item.id === goal.planId && item.organizationId === input.organizationId,
  );
  if (!plan || plan.goalId !== goal.id) throw new Error("Plan not found");
  const failed = plan.steps.find((step) => step.status === "failed");
  if (!failed) throw new Error("No failed step to revise");
  const now = new Date().toISOString();
  const revision: AgentPlan = {
    ...plan,
    id: `plan_revision_${plan.id}`,
    previousPlanId: plan.id,
    status: "failed",
    updatedAt: now,
    steps: plan.steps.map((step) => ({
      ...step,
      status: step.id === failed.id || step.status === "failed" ? "failed" : step.status === "completed" ? "completed" : "cancelled",
      approvalRequired: false,
    })),
  };
  agentsStore.upsertPlan(revision);
  agentsStore.upsertBusinessGoal({
    ...goal,
    status: "failed",
    error: failed.error ?? goal.error ?? "A required step failed. Downstream work was not retried.",
    updatedAt: now,
  });
  return revision;
}
