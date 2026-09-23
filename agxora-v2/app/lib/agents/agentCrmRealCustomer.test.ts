import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agentsStore } from "@/features/agents/store";
import { operationsService } from "@/features/agents/execution/service";
import { agentOsService } from "@/features/agents/services";
import { getToolDefinition } from "@/features/agents/tools";
import {
  createMemoryCrmBridge,
  createUnavailableCrmBridge,
  getCrmBridgeProvider,
  handleCrmTool,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  syncGrowthProfileToCrm,
} from "@/features/agents/crm";
import { emptyCustomerDraft } from "@/features/agents/crm/adapter";
import type { CrmCustomerDraft, CrmCustomerRecord, CrmNoteRecord } from "@/app/lib/crm/directory";
import { growthService } from "@/features/agents/growth/service";
import {
  agentCrmHonestyKind,
  parseRealCustomerId,
} from "@/app/lib/workspace/firstCustomerAgentCrm";
import { can } from "@/app/lib/tenancy/authorize";
import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { readFileSync } from "node:fs";
import path from "node:path";

const ORG_A = "org_day6_a";
const ORG_B = "org_day6_b";
const REAL_MISSING = "00000000-0000-4000-8000-000000000099";

function draft(partial?: Partial<CrmCustomerDraft>): CrmCustomerDraft {
  return emptyCustomerDraft({
    companyName: "Acme GmbH",
    contactName: "Ada Lovelace",
    email: "ada@acme.test",
    phone: "+49 30 100",
    address: "Invalidenstrasse 1",
    city: "Berlin",
    country: "DE",
    status: "active",
    owner: "tester",
    ...partial,
  });
}

function ctx(organizationId: string, params: Record<string, unknown>) {
  return {
    organizationId,
    agentInstanceId: "inst_day6",
    taskId: "task_day6",
    params,
  };
}

describe("Day 6 real CRM Agent loop", () => {
  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  it("reads a real UUID customer and reports success only after the record is returned", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const created = await provider.createCustomer(ORG_A, draft());
    expect(parseRealCustomerId(created.id)).toBe(created.id);

    const result = await handleCrmTool(
      ctx(ORG_A, { action: "get_customer", customerId: created.id }),
    );
    expect(result.ok).toBe(true);
    const output = result.output as {
      crmSuccess: boolean;
      customer: CrmCustomerRecord;
    };
    expect(output.crmSuccess).toBe(true);
    expect(output.customer.id).toBe(created.id);
    expect(output.customer.companyName).toBe("Acme GmbH");
    expect(output.customer.email).toBe("ada@acme.test");
    expect(output.customer).not.toHaveProperty("organizationId");
  });

  it("rejects mock cus_* IDs without falling back to another customer", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const created = await provider.createCustomer(ORG_A, draft());

    const result = await handleCrmTool(
      ctx(ORG_A, { action: "get_customer", customerId: "cus_123" }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Mock customer/i);
    const output = result.output as {
      crmSuccess: boolean;
      invalidCustomerId: boolean;
      issue: string;
    };
    expect(output.crmSuccess).toBe(false);
    expect(output.invalidCustomerId).toBe(true);
    expect(output.issue).toBe("mock");
    const still = await provider.getCustomer(created.id);
    expect(still?.id).toBe(created.id);
  });

  it("hides cross-tenant customers as not found", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const foreign = await provider.createCustomer(
      ORG_B,
      draft({ email: "b@other.test" }),
    );

    const result = await handleCrmTool(
      ctx(ORG_A, {
        action: "get_customer",
        customerId: foreign.id,
        organizationId: ORG_B,
        workspaceId: "ws_b",
        tenantId: "ten_b",
        actorId: "act_b",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Customer not found");
    const output = result.output as { crmSuccess: boolean };
    expect(output.crmSuccess).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/other\.test/i);
  });

  it("does not report a fake success when CRM is unavailable", async () => {
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const result = await handleCrmTool(
      ctx(ORG_A, { action: "get_customer", customerId: REAL_MISSING }),
    );
    expect(result.ok).toBe(false);
    const output = result.output as {
      crmAvailable: boolean;
      crmSuccess: boolean;
    };
    expect(output.crmAvailable).toBe(false);
    expect(output.crmSuccess).toBe(false);
    expect(
      agentCrmHonestyKind({
        jobStatus: "BLOCKED",
        resultSuccess: false,
        crmAvailable: false,
      }),
    ).toBe("unavailable");
  });

  it("persists an authorized CRM mutation and keeps notes intact", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const created = await provider.createCustomer(ORG_A, draft());
    const updated = await provider.updateCustomer(ORG_A, created.id, {
      ...draft(),
      companyName: "Acme Robotics",
    });
    expect(updated.companyName).toBe("Acme Robotics");
    const note = await provider.createNote(ORG_A, created.id, {
      title: "Kickoff",
      body: "Follow up next week",
      author: "tester",
    });
    expect(note.customerId).toBe(created.id);
    const notes = await provider.listNotes(created.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.title).toBe("Kickoff");
    const again = await provider.getCustomer(created.id);
    expect(again?.companyName).toBe("Acme Robotics");

    await expect(
      provider.updateCustomer(ORG_B, created.id, draft({ companyName: "Hacked" })),
    ).rejects.toThrow(/crm_customer_org_mismatch/);
    const unchanged = await provider.getCustomer(created.id);
    expect(unchanged?.companyName).toBe("Acme Robotics");
  });

  it("does not execute a CRM tool before approval", async () => {
    expect(getToolDefinition("crm")?.requiresApproval).toBe(true);
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const created = await provider.createCustomer(ORG_A, draft());
    const job = operationsService.enqueue({
      organizationId: ORG_A,
      toolId: "crm",
      title: "Read CRM customer",
      params: { action: "get_customer", customerId: created.id },
    });
    expect(job.requiresApproval).toBe(true);
    const started = await operationsService.start(ORG_A, job.id);
    expect(started.status).toBe("WAITING_FOR_APPROVAL");
    expect(started.approvalId).toBeTruthy();
    expect(started.result?.success).not.toBe(true);
    const steps = agentsStore
      .getSnapshot()
      .stepExecutions.filter((item) => item.taskId === started.taskId);
    expect(
      steps.some(
        (item) => item.toolId === "crm" && item.status === "WAITING_FOR_APPROVAL",
      ),
    ).toBe(true);
    expect(
      steps.some((item) => item.toolId === "crm" && item.status === "COMPLETED"),
    ).toBe(false);
    const still = await provider.getCustomer(created.id);
    expect(still?.companyName).toBe("Acme GmbH");
  });

  it("fails closed on a stale mock CRM link instead of creating another customer", async () => {
    const profile = growthService.saveProfile({
      organizationId: ORG_A,
      seedFromBusinessOs: false,
      draft: { companyName: "Linked Co", services: ["crm"] },
    });
    const now = new Date().toISOString();
    agentsStore.upsertGrowthCrmLink({
      id: "glink_stale",
      organizationId: ORG_A,
      profileId: profile.id,
      customerId: "cus_stale",
      href: "/dashboard/crm/cus_stale",
      companyName: "Linked Co",
      outcome: "linked",
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
    });
    const before = (await getCrmBridgeProvider().listCustomers(ORG_A)).length;
    const { result } = await syncGrowthProfileToCrm({
      organizationId: ORG_A,
      profile,
      attachNote: false,
    });
    expect(result.success).toBe(false);
    expect(result.message).toBe("crm_customer_id_invalid");
    const after = (await getCrmBridgeProvider().listCustomers(ORG_A)).length;
    expect(after).toBe(before);
  });

  it("rejects unauthenticated actor resolution and preserves CRM permission ranks", () => {
    const api = readFileSync(
      path.join(process.cwd(), "app/api/v1/crm/customers/[id]/route.ts"),
      "utf8",
    );
    expect(api).toContain("requireCurrentActor");
    expect(api).toContain("getCustomerForActor");
    expect(api).toContain("updateCustomerForActor");
    const member = { role: "MEMBER" } as Actor;
    const owner = { role: "OWNER" } as Actor;
    expect(can(member, "customer.read")).toBe(true);
    expect(can(member, "customer.update")).toBe(true);
    expect(can(member, "customer.delete")).toBe(false);
    expect(can(owner, "customer.delete")).toBe(true);
    const unauthorized = new PersistenceError(
      "unauthorized",
      "Authentication required",
    );
    expect(unauthorized.status).toBe(401);
  });
});

describe("Day 8 first-customer CRM Agent execution", () => {
  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  it("records a real CRM note on default sync without a Growth profile", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const created = await provider.createCustomer(ORG_A, draft());

    const result = await handleCrmTool(
      ctx(ORG_A, {
        action: "sync",
        goal: "Record a CRM follow-up note",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    const output = result.output as {
      action: string;
      crmAvailable: boolean;
      crmSuccess: boolean;
      customer: { id: string };
      note: CrmNoteRecord;
    };
    expect(output.action).toBe("create_note");
    expect(output.crmAvailable).toBe(true);
    expect(output.crmSuccess).toBe(true);
    expect(output.customer.id).toBe(created.id);
    expect(output.note.customerId).toBe(created.id);
    expect(output.note.author).toBe("CRM Assistant");
    const notes = await provider.listNotes(created.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.id).toBe(output.note.id);
    expect(notes[0]?.body).toMatch(/CRM follow-up note/);
    expect(agentsStore.getSnapshot().growthProfiles).toHaveLength(0);
  });

  it("does not mutate CRM before approval and mutates only after approval", async () => {
    expect(getToolDefinition("crm")?.requiresApproval).toBe(true);
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const created = await provider.createCustomer(ORG_A, draft());
    agentOsService.ensureWorkspace(ORG_A);
    const runtime = agentOsService
      .listRuntimes(ORG_A)
      .find((item) => item.agentId === "crm_assistant");
    expect(runtime).toBeTruthy();

    const task = await agentOsService.enqueueTask({
      organizationId: ORG_A,
      agentInstanceId: runtime!.instanceId,
      title: "Record a CRM note for Acme",
      goal: "Record a CRM note for Acme",
    });
    expect(task.status).toBe("blocked");
    expect(task.error).toBeUndefined();
    expect(await provider.listNotes(created.id)).toHaveLength(0);

    const approval = agentOsService
      .listApprovals(ORG_A)
      .find((item) => item.taskId === task.id);
    expect(approval?.state).toBe("REQUIRES_APPROVAL");
    expect(approval?.toolId).toBe("crm");

    await agentOsService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });

    const completed = agentsStore
      .getSnapshot()
      .tasks.find((item) => item.id === task.id);
    expect(completed?.status).toBe("completed");
    expect(completed?.error).toBeUndefined();
    const notes = await provider.listNotes(created.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.author).toBe("CRM Assistant");
    expect(notes[0]?.body).toMatch(/Record a CRM note for Acme/);
    const tools = completed?.output as { tools?: readonly unknown[] } | undefined;
    expect(JSON.stringify(tools)).toMatch(/"crmSuccess":true/);
    expect(JSON.stringify(completed)).not.toMatch(/simulated":true/);
  });

  it("returns a real failure and does not mark the task completed when CRM is unavailable", async () => {
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const unavailable = await handleCrmTool(
      ctx(ORG_A, {
        action: "sync",
        goal: "Record a CRM note",
      }),
    );
    expect(unavailable.ok).toBe(false);
    expect((unavailable.output as { crmSuccess: boolean }).crmSuccess).toBe(
      false,
    );
    expect(unavailable.error).toMatch(/unavailable/i);

    const base = createMemoryCrmBridge();
    const created = await base.createCustomer(ORG_A, draft());
    setCrmBridgeProvider({
      ...base,
      async createNote() {
        throw new Error("crm_note_write_failed");
      },
    });
    agentOsService.ensureWorkspace(ORG_A);
    const runtime = agentOsService
      .listRuntimes(ORG_A)
      .find((item) => item.agentId === "crm_assistant");

    const task = await agentOsService.enqueueTask({
      organizationId: ORG_A,
      agentInstanceId: runtime!.instanceId,
      title: "Record a CRM note",
      goal: "Record a CRM note",
    });
    expect(task.status).toBe("blocked");
    expect(await base.listNotes(created.id)).toHaveLength(0);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = agentsStore
        .getSnapshot()
        .tasks.find((item) => item.id === task.id);
      if (current?.status !== "blocked") break;
      const approval = agentOsService
        .listApprovals(ORG_A)
        .find(
          (item) =>
            item.taskId === task.id && item.state === "REQUIRES_APPROVAL",
        );
      if (!approval) break;
      await agentOsService.resolveApproval({
        approvalId: approval.id,
        state: "APPROVED",
        decidedBy: "tester",
      });
    }

    const finished = agentsStore
      .getSnapshot()
      .tasks.find((item) => item.id === task.id);
    expect(finished?.status).toBe("failed");
    expect(finished?.error).toMatch(/crm_note_write_failed|unavailable|CRM/i);
    expect(finished?.status).not.toBe("completed");
    expect(await base.listNotes(created.id)).toHaveLength(0);
    expect(JSON.stringify(finished)).not.toMatch(/"crmSuccess":true/);
    expect(
      agentCrmHonestyKind({
        jobStatus: "FAILED",
        resultSuccess: false,
      }),
    ).toBe("failed");
  });

  it("does not report success when no CRM customer can be resolved", async () => {
    const result = await handleCrmTool(
      ctx(ORG_A, { action: "sync", goal: "Record a CRM note" }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/CRM customer is required/i);
    const output = result.output as { crmSuccess: boolean; issue: string };
    expect(output.crmSuccess).toBe(false);
    expect(output.issue).toBe("none");
  });

  it("hides a foreign customer and does not write a note", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const foreign = await provider.createCustomer(
      ORG_B,
      draft({ email: "hidden@other.test" }),
    );
    const own = await provider.createCustomer(ORG_A, draft());

    const result = await handleCrmTool(
      ctx(ORG_A, {
        action: "create_note",
        customerId: foreign.id,
        organizationId: ORG_B,
        workspaceId: "ws_b",
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Customer not found");
    const output = result.output as { crmSuccess: boolean };
    expect(output.crmSuccess).toBe(false);
    expect(await provider.listNotes(foreign.id)).toHaveLength(0);
    expect(await provider.listNotes(own.id)).toHaveLength(0);
    expect(JSON.stringify(result)).not.toMatch(/other\.test/i);
  });

  it("keeps database-backed CRM as the only real mutation path", () => {
    const adapter = readFileSync(
      path.join(process.cwd(), "features/agents/crm/adapter.ts"),
      "utf8",
    );
    const handlers = readFileSync(
      path.join(process.cwd(), "features/agents/crm/handlers.ts"),
      "utf8",
    );
    expect(adapter).toContain("isCrmDatabaseMode()");
    expect(adapter).toContain("createDirectoryCrmBridge");
    expect(adapter).not.toContain("localStorage");
    expect(handlers).toContain("getCrmBridgeProvider()");
    expect(handlers).toContain("provider.createNote");
    expect(handlers).toContain("provider.listNotes");
    expect(handlers).not.toContain("localStorage");
  });

  it("still requires a Growth profile for Growth CRM sync and follow-up", async () => {
    const syncWithoutProfile = await handleCrmTool(
      ctx(ORG_A, { action: "create_follow_up" }),
    );
    expect(syncWithoutProfile.ok).toBe(false);
    expect(syncWithoutProfile.error).toMatch(/Growth profile is required/i);

    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const profile = growthService.saveProfile({
      organizationId: ORG_A,
      seedFromBusinessOs: false,
      draft: { companyName: "Growth Co", services: ["crm"] },
    });
    const before = (await provider.listCustomers(ORG_A)).length;
    const result = await handleCrmTool(
      ctx(ORG_A, { action: "sync", profileId: profile.id }),
    );
    expect(result.ok).toBe(true);
    const output = result.output as {
      action: string;
      crmSuccess: boolean;
    };
    expect(output.action).toBe("sync");
    expect(output.crmSuccess).toBe(true);
    const after = await provider.listCustomers(ORG_A);
    expect(after.length).toBe(before + 1);
    expect(after[0]?.companyName).toBe("Growth Co");
    expect(after[0]?.owner).toBe("Growth Agent");
  });
});
