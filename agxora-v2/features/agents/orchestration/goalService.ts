/**
 * Start a business goal through the existing Agent OS task runner.
 */

import { agentCrmCustomerIdErrorMessage, agentCrmCustomerIdIssue } from "@/app/lib/workspace/firstCustomerAgentCrm";
import { getAgentDefinition } from "../catalog";
import { agentOsService } from "../services/agentOsService";
import { assertWorkspaceIsolation } from "../security";
import { agentsStore } from "../store";
import type { BusinessGoal } from "../types";
import {
  buildCrmFollowUpPlan,
  buildCustomerReplyPlan,
  isCrmFollowUpGoal,
  isCustomerReplyGoal,
} from "./goalPlan";

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export async function startBusinessGoal(input: {
  readonly organizationId: string;
  readonly agentInstanceId: string;
  readonly statement: string;
  readonly customerId?: string | null;
}): Promise<BusinessGoal> {
  const statement = input.statement.trim();
  if (!statement) {
    throw new Error("agents.businessGoal.errors.required");
  }
  const emailGoal = isCustomerReplyGoal(statement);
  if (!emailGoal && !isCrmFollowUpGoal(statement)) {
    throw new Error("agents.businessGoal.errors.unsupported");
  }

  let customerId: string | undefined;
  const requested = input.customerId?.trim() ?? "";
  if (requested) {
    const issue = agentCrmCustomerIdIssue(requested);
    if (issue) throw new Error(agentCrmCustomerIdErrorMessage(issue));
    customerId = requested;
  }

  agentOsService.ensureWorkspace(input.organizationId);
  const runtime = agentsStore
    .getSnapshot()
    .runtimes.find((item) => item.instanceId === input.agentInstanceId);
  if (!runtime) throw new Error("Agent instance not found");
  assertWorkspaceIsolation(input.organizationId, runtime.organizationId);
  const definition = getAgentDefinition(runtime.agentId);
  if (!definition?.tools.includes("crm")) {
    throw new Error("agents.businessGoal.errors.noCrm");
  }
  if (emailGoal && !definition.tools.includes("email")) {
    throw new Error("agents.businessGoal.errors.noEmail");
  }

  const now = nowIso();
  const goal: BusinessGoal = {
    id: createId("goal"),
    organizationId: input.organizationId,
    statement,
    status: "active",
    customerId,
    createdAt: now,
    updatedAt: now,
  };
  const plan = emailGoal
    ? buildCustomerReplyPlan({ goal, agentInstanceId: runtime.instanceId })
    : buildCrmFollowUpPlan({ goal, agentInstanceId: runtime.instanceId });
  const stored: BusinessGoal = { ...goal, planId: plan.id };
  agentsStore.upsertBusinessGoal(stored);

  const task = await agentOsService.enqueueTask({
    organizationId: input.organizationId,
    agentInstanceId: runtime.instanceId,
    title: statement,
    goal: statement,
    plan,
    maxAttempts: 1,
    payload: {
      businessGoalId: stored.id,
      ...(customerId ? { customerId } : {}),
    },
  });

  return (
    (agentsStore.getSnapshot().businessGoals ?? []).find(
      (item) => item.id === stored.id,
    ) ?? {
      ...stored,
      taskId: task.id,
      executionId: task.executionId,
      status: task.status === "failed" ? "failed" : stored.status,
      error: task.error,
      updatedAt: nowIso(),
    }
  );
}
