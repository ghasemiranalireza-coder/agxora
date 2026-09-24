import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyCustomerDraft } from "@/features/agents/crm/adapter";
import {
  createMemoryCrmBridge,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
} from "@/features/agents/crm";
import { handleFinanceTool } from "@/features/agents/finance/handlers";
import { createMemoryRecord } from "@/features/agents/memory";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { resolveBusinessGoalPlannerContext } from "@/features/agents/orchestration/plannerContext";
import { startBusinessGoal } from "@/features/agents/orchestration/goalService";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory";

const ORG_A = "org_phase11_a";
const ORG_B = "org_phase11_b";

function customerDraft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return emptyCustomerDraft({
    companyName: "AGXORA E2E Test Customer",
    contactName: "Ada",
    email: "ada@e2e.test",
    phone: "+49 30 100",
    address: "Teststrasse 1",
    city: "Berlin",
    country: "DE",
    status: "active",
    owner: "tester",
    ...partial,
  });
}

function runtime(organizationId: string) {
  agentOsService.ensureWorkspace(organizationId);
  const found = agentOsService
    .listRuntimes(organizationId)
    .find((item) => item.agentId === "crm_assistant");
  if (!found) throw new Error("missing runtime");
  return found;
}

describe("Phase 11 business goal context", () => {
  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  it("keeps business goals off the legacy AgentRun API", () => {
    const source = readFileSync(
      new URL("../../../features/agents/orchestration/goalService.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/from ["'].*business-agent\/runs["']/);
    expect(source).not.toMatch(/fetch\(["']\/api\/v1\/agent-runs/);
  });

  it("loads tenant customer context and ignores a client organization id", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const customer = await provider.createCustomer(ORG_A, customerDraft());
    const context = await resolveBusinessGoalPlannerContext({
      organizationId: ORG_A,
      clientOrganizationId: ORG_B,
      statement: "Prepare a CRM follow-up for this customer.",
      customerId: customer.id,
    });
    expect(context.organizationId).toBe(ORG_A);
    expect(context.customerId).toBe(customer.id);
    expect(context.available).toBe(true);
    expect(context.facts.some((fact) => fact.provenance === "CRM" && fact.text.includes("AGXORA E2E Test Customer"))).toBe(true);
    expect(context.facts.some((fact) => fact.key === "note_count" && fact.text === "CRM notes on file: 0.")).toBe(true);
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
  });

  it("fails closed when the customer is missing and excludes unverified memory", async () => {
    const missing = await resolveBusinessGoalPlannerContext({
      organizationId: ORG_A,
      statement: "Prepare a CRM follow-up for this customer.",
    });
    expect(missing.available).toBe(false);
    expect(missing.facts.some((fact) => fact.provenance === "UNAVAILABLE" && fact.key === "customer")).toBe(true);

    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const customer = await provider.createCustomer(ORG_A, customerDraft());
    agentsStore.pushMemory(
      createMemoryRecord({
        organizationId: ORG_A,
        scope: "business",
        key: "goal:failed",
        value: {
          kind: "business_goal_outcome",
          goalId: "goal_failed",
          planId: "plan_failed",
          statement: "failed",
          customerId: customer.id,
          verified: false,
          recordedAt: "2026-09-24T00:00:00.000Z",
        },
      }),
    );
    agentsStore.pushMemory(
      createMemoryRecord({
        organizationId: ORG_B,
        scope: "business",
        key: "goal:other",
        value: {
          kind: "business_goal_outcome",
          goalId: "goal_other",
          planId: "plan_other",
          statement: "other",
          customerId: customer.id,
          noteId: "note_other",
          verified: true,
          recordedAt: "2026-09-24T00:00:00.000Z",
        },
      }),
    );
    const context = await resolveBusinessGoalPlannerContext({
      organizationId: ORG_A,
      statement: "Prepare a CRM follow-up for this customer.",
      customerId: customer.id,
    });
    expect(context.memoryIds).toEqual([]);
    expect(context.facts.some((fact) => fact.provenance === "BUSINESS_MEMORY")).toBe(false);
    expect(context.facts.some((fact) => fact.key === "previous_outcome" && fact.provenance === "UNAVAILABLE")).toBe(true);
  });

  it("includes verified memory in the plan before any mutation", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const customer = await provider.createCustomer(ORG_A, customerDraft());
    agentsStore.pushMemory(
      createMemoryRecord({
        organizationId: ORG_A,
        scope: "business",
        key: "goal:previous",
        value: {
          kind: "business_goal_outcome",
          goalId: "goal_previous",
          planId: "plan_previous",
          statement: "Prepare a CRM follow-up for this customer.",
          customerId: customer.id,
          noteId: "note_previous",
          verified: true,
          recordedAt: "2026-09-24T00:00:00.000Z",
        },
      }),
    );
    const goal = await startBusinessGoal({
      organizationId: ORG_A,
      clientOrganizationId: ORG_B,
      agentInstanceId: runtime(ORG_A).instanceId,
      statement: "Prepare a CRM follow-up for this customer.",
      customerId: customer.id,
    });
    expect(goal.organizationId).toBe(ORG_A);
    const plan = agentsStore.getSnapshot().plans.find((item) => item.id === goal.planId);
    expect(plan?.plannerContext?.resolvedAt).toBeTruthy();
    expect(plan?.plannerContext?.memoryIds).toHaveLength(1);
    expect(plan?.plannerContext?.facts.some((fact) => fact.provenance === "BUSINESS_MEMORY")).toBe(true);
    const prepare = plan?.steps.find((step) => step.presentationKey === "prepare");
    const prepared = (prepare?.result as { draft?: { body?: string; context?: string } } | undefined)?.draft;
    expect(prepared?.context).toContain("Previous verified CRM goal: note created and verified.");
    expect(prepared?.body).toBe("Prepare a CRM follow-up for this customer.");
    expect(plan?.steps.find((step) => step.presentationKey === "execute")?.status).toBe("blocked");
    expect(await provider.listNotes(customer.id)).toHaveLength(0);
  });

  it("still rejects unsupported goals and blocks finance mutation", async () => {
    const found = runtime(ORG_A);
    await expect(
      startBusinessGoal({
        organizationId: ORG_A,
        agentInstanceId: found.instanceId,
        statement: "Plan my Instagram for the next 30 days.",
      }),
    ).rejects.toThrow(/unsupported/);
    const finance = await handleFinanceTool({
      organizationId: ORG_A,
      agentInstanceId: found.instanceId,
      taskId: "task",
      params: { action: "create_invoice_from_eligible_delivery_notes" },
    });
    expect(finance.output).toMatchObject({ blocked: true, billed: false });
  });
});
