import { beforeEach, describe, expect, it } from "vitest";
import {
  authorizeCapabilityExecution,
  listCapabilities,
  simulatedExecutionFailure,
  toolAvailability,
} from "@/features/agents/capabilities/registry";
import { handleFinanceTool } from "@/features/agents/finance/handlers";
import {
  buildCrmFollowUpPlan,
  capabilityExecutionContext,
} from "@/features/agents/orchestration/goalPlan";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import type { BusinessGoal } from "@/features/agents/types";
import {
  createMemoryCrmBridge,
  setCrmBridgeProvider,
} from "@/features/agents/crm";

const LIVE = [
  "CRM_LOAD_CUSTOMER",
  "CRM_PREPARE_NOTE",
  "CRM_CREATE_NOTE",
  "CRM_VERIFY_NOTE",
  "COMMUNICATION_LOAD_CUSTOMER",
  "COMMUNICATION_PREPARE_EMAIL",
  "COMMUNICATION_SEND_EMAIL",
  "COMMUNICATION_VERIFY_EMAIL",
] as const;

describe("Phase 12 capability contracts", () => {
  beforeEach(() => {
    agentsStore.reset();
  });

  it("gives every live capability one explicit contract", () => {
    for (const id of LIVE) {
      const capability = listCapabilities().find((item) => item.id === id);
      expect(capability?.availability.status).toBe("LIVE");
      expect(capability?.security.tenantScoped).toBe(true);
      expect(capability?.description.length).toBeGreaterThan(0);
      expect(capability?.mode === "WRITE").toBe(capability?.mutating);
      expect(capability?.approval.required).toBe(capability?.approvalRequired);
    }
  });

  it("requires approval for write capabilities and not for reads", () => {
    for (const capability of listCapabilities()) {
      if (capability.mode === "WRITE") {
        expect(capability.approval.required).toBe(true);
      } else {
        expect(capability.approval.required).toBe(false);
        expect(capability.mutating).toBe(false);
      }
    }
  });

  it("fails closed for blocked, simulated, and unknown capabilities", () => {
    const finance = authorizeCapabilityExecution({
      capabilityId: "FINANCE_CREATE_INVOICE",
      organizationId: "org_a",
    });
    expect(finance.ok).toBe(false);
    if (!finance.ok) {
      expect(finance.failure.code).toBe("capabilityUnavailable");
      expect(finance.failure.availability).toBe("BLOCKED");
      expect(finance.failure.retryable).toBe(false);
    }
    const future = authorizeCapabilityExecution({
      capabilityId: "SOCIAL_PUBLISH",
      organizationId: "org_a",
    });
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.failure.availability).toBe("FUTURE");
    const unknown = authorizeCapabilityExecution({
      capabilityId: "NOT_A_CAPABILITY",
      organizationId: "org_a",
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.failure.availability).toBe("UNKNOWN");
    expect(toolAvailability("projects")).toBe("SIMULATED");
    expect(toolAvailability("workflow")).toBe("SIMULATED");
    expect(toolAvailability("mcp")).toBe("SIMULATED");
    const simulated = simulatedExecutionFailure("projects");
    expect(simulated.code).toBe("capabilityUnavailable");
    expect(simulated.availability).toBe("SIMULATED");
    expect(toolAvailability("finance")).toBe("BLOCKED");
  });

  it("requires tenant context and ignores a client organization id", () => {
    const missing = authorizeCapabilityExecution({
      capabilityId: "CRM_CREATE_NOTE",
      organizationId: "  ",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.failure.reason).toMatch(/Tenant context/);
    const goal: BusinessGoal = {
      id: "goal_contract",
      organizationId: "org_session",
      statement: "Prepare a CRM follow-up.",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const plan = buildCrmFollowUpPlan({ goal, agentInstanceId: "instance" });
    const step = plan.steps.find((item) => item.capabilityId === "CRM_CREATE_NOTE");
    const capability = listCapabilities().find((item) => item.id === "CRM_CREATE_NOTE");
    const params = capabilityExecutionContext({
      goal: goal.statement,
      step: step!,
      plan,
      capability: capability!,
      taskInput: {
        organizationId: "org_client",
        workspaceId: "ws_client",
        tenantId: "tenant_client",
        actorId: "actor_client",
        userId: "user_client",
        customerId: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(params.organizationId).toBeUndefined();
    expect(params.workspaceId).toBeUndefined();
    expect(params.tenantId).toBeUndefined();
    expect(params.actorId).toBeUndefined();
    expect(params.userId).toBeUndefined();
    expect(params.customerId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("declares verification and idempotency for live mutations", () => {
    const note = listCapabilities().find((item) => item.id === "CRM_CREATE_NOTE");
    const email = listCapabilities().find((item) => item.id === "COMMUNICATION_SEND_EMAIL");
    expect(note?.verification.required).toBe(true);
    expect(note?.verification.evidenceType).toBe("persisted_note_and_readback");
    expect(note?.execution.idempotencyRequired).toBe(true);
    expect(email?.verification.required).toBe(true);
    expect(email?.verification.evidenceType).toContain("queued");
    expect(email?.execution.idempotencyRequired).toBe(true);
    expect(email?.description.toLowerCase()).not.toContain("inbox");
  });

  it("does not execute a blocked finance capability or bill", async () => {
    const provider = createMemoryCrmBridge();
    let creates = 0;
    setCrmBridgeProvider({
      ...provider,
      async createNote(...args) {
        creates += 1;
        return provider.createNote(...args);
      },
    });
    agentOsService.ensureWorkspace("org_contract");
    const runtime = agentOsService
      .listRuntimes("org_contract")
      .find((item) => item.agentId === "crm_assistant");
    const goal: BusinessGoal = {
      id: "goal_finance_block",
      organizationId: "org_contract",
      statement: "Prepare a CRM follow-up.",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const plan = buildCrmFollowUpPlan({
      goal,
      agentInstanceId: runtime!.instanceId,
    });
    plan.steps[0] = { ...plan.steps[0], capabilityId: "FINANCE_CREATE_INVOICE" };
    agentsStore.upsertBusinessGoal({ ...goal, planId: plan.id });
    const task = await agentOsService.enqueueTask({
      organizationId: "org_contract",
      agentInstanceId: runtime!.instanceId,
      title: goal.statement,
      goal: goal.statement,
      plan,
      maxAttempts: 1,
      payload: { businessGoalId: goal.id },
    });
    expect(task.status).toBe("failed");
    expect(task.error).toMatch(/capabilityUnavailable/);
    expect(task.error).toMatch(/BLOCKED/);
    expect(creates).toBe(0);
    const finance = await handleFinanceTool({
      organizationId: "org_contract",
      agentInstanceId: runtime!.instanceId,
      taskId: "task",
      params: { action: "create_invoice_from_eligible_delivery_notes" },
    });
    expect(finance.output).toMatchObject({ blocked: true, billed: false });
  });
});
