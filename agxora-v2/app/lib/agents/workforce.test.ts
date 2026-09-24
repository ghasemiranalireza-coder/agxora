import { beforeEach, describe, expect, it } from "vitest";
import { auditLogger } from "@/app/lib/backend/audit/logger";
import { authorizeCapabilityExecution } from "@/features/agents/capabilities/registry";
import { createMemoryCrmBridge, setCrmBridgeProvider } from "@/features/agents/crm";
import { emptyCustomerDraft } from "@/features/agents/crm/adapter";
import { normalizeState } from "@/features/agents/repositories/state";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import { resolveBusinessGoalPlannerContext } from "@/features/agents/orchestration/plannerContext";
import {
  assertWorkerCanStart,
  assertWorkerCapability,
  capabilitiesForRole,
  createWorker,
  updateWorker,
} from "@/features/agents/workforce/workers";

const ORG = "org_phase15";
const OTHER = "org_phase15_other";

function runtime() {
  agentOsService.ensureWorkspace(ORG);
  const found = agentOsService.listRuntimes(ORG).find((item) => item.agentId === "crm_assistant");
  if (!found) throw new Error("missing runtime");
  return found;
}

async function customer() {
  const provider = createMemoryCrmBridge();
  const created = await provider.createCustomer(ORG, emptyCustomerDraft({
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
  return created;
}

describe("Phase 15 AI workforce foundation", () => {
  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  it("creates an organization worker and keeps it after reload", () => {
    const worker = createWorker({
      organizationId: ORG,
      actorId: "user_1",
      role: "CUSTOMER_COMMUNICATION",
      name: "Customer Communication Worker",
    });
    expect(worker.organizationId).toBe(ORG);
    expect(worker.status).toBe("ACTIVE");
    expect(worker.allowedCapabilities).toContain("COMMUNICATION_SEND_EMAIL");
    expect(worker.allowedCapabilities).not.toContain("FINANCE_CREATE_INVOICE");
    const reloaded = normalizeState(JSON.parse(JSON.stringify(agentsStore.getSnapshot())));
    expect(reloaded?.workers?.find((item) => item.id === worker.id)?.name).toBe("Customer Communication Worker");
    expect(auditLogger.list().some((event) => event.action === "worker.created" && event.resourceId === worker.id)).toBe(true);
    expect(() => createWorker({ organizationId: " ", actorId: "user_1", role: "SALES" })).toThrow(/Tenant/);
  });

  it("blocks paused, disabled, foreign, and self-granted workers", async () => {
    const paused = createWorker({ organizationId: ORG, actorId: "user_1", role: "CUSTOMER_COMMUNICATION", status: "PAUSED" });
    const person = await customer();
    await expect(startBusinessGoal({
      organizationId: ORG,
      agentInstanceId: runtime().instanceId,
      statement: `Prepare a CRM follow-up for this customer. ${person.id}`,
      workerId: paused.id,
      actorId: "user_1",
    })).rejects.toThrow(/not active/);
    updateWorker({ organizationId: ORG, actorId: "user_1", workerId: paused.id, status: "DISABLED" });
    expect(() => assertWorkerCanStart(ORG, paused.id)).toThrow(/not active/);
    expect(() => assertWorkerCanStart(OTHER, paused.id)).toThrow(/not found/);
    const active = createWorker({ organizationId: ORG, actorId: "user_1", role: "CUSTOMER_COMMUNICATION" });
    const escalated = updateWorker({
      organizationId: ORG,
      actorId: "user_1",
      workerId: active.id,
      role: "CUSTOMER_COMMUNICATION",
      ...({ allowedCapabilities: ["FINANCE_CREATE_INVOICE"] } as object),
    });
    expect(escalated.allowedCapabilities).not.toContain("FINANCE_CREATE_INVOICE");
    expect(capabilitiesForRole("FINANCE")).toEqual([]);
    expect(authorizeCapabilityExecution({ capabilityId: "FINANCE_CREATE_INVOICE", organizationId: ORG }).ok).toBe(false);
    expect(() => assertWorkerCapability(active, "FINANCE_CREATE_INVOICE")).toThrow(/not allowed/);
  });

  it("assigns a communication worker without bypassing approval, verification, or memory", async () => {
    const person = await customer();
    const worker = createWorker({
      organizationId: ORG,
      actorId: "user_1",
      role: "CUSTOMER_COMMUNICATION",
      name: "Customer Communication Worker",
    });
    const goal = await startBusinessGoal({
      organizationId: ORG,
      clientOrganizationId: OTHER,
      agentInstanceId: runtime().instanceId,
      statement: `Prepare a CRM follow-up for this customer. ${person.id}`,
      workerId: worker.id,
      actorId: "user_1",
    });
    expect(goal.workerId).toBe(worker.id);
    expect(goal.actorId).toBe("user_1");
    expect(goal.organizationId).toBe(ORG);
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    const write = plan?.steps.find((step) => step.capabilityId === "CRM_CREATE_NOTE");
    expect(write?.approvalRequired).toBe(true);
    expect(write?.status).toBe("blocked");
    expect(write?.idempotencyKey).toBe(`${goal.id}:execute`);
    expect(plan?.steps.find((step) => step.capabilityId === "CRM_VERIFY_NOTE")).toBeTruthy();
    const task = agentsStore.getSnapshot().tasks.find((item) => item.id === goal.taskId);
    const execution = agentsStore.getSnapshot().executions.find((item) => item.id === goal.executionId);
    expect(task?.input.workerId).toBe(worker.id);
    expect(task?.input.actorId).toBe("user_1");
    expect(task?.input.businessGoalId).toBe(goal.id);
    expect(execution?.workerId).toBe(worker.id);
    expect(execution?.actorId).toBe("user_1");
    expect(plan?.plannerContext?.facts.some((fact) => fact.provenance === "WORKER" && fact.text.includes("Customer Communication Worker"))).toBe(true);
    const context = await resolveBusinessGoalPlannerContext({
      organizationId: ORG,
      statement: goal.statement,
      customerId: person.id,
      worker,
    });
    expect(context.organizationId).toBe(ORG);
    expect(context.facts.some((fact) => fact.provenance === "WORKER")).toBe(true);
    expect(auditLogger.list().some((event) => event.action === "worker.goal_assigned" && event.metadata?.goalId === goal.id)).toBe(true);
    expect(auditLogger.list().some((event) => event.action === "worker.execution_started" && event.metadata?.executionId === execution?.id)).toBe(true);
  });
});
