import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import { agentsStore } from "@/features/agents/store";
import { growthService } from "@/features/agents/growth/service";
import { operationsService } from "@/features/agents/execution/service";
import { normalizeState } from "@/features/agents/repositories";
import {
  createMemoryCrmBridge,
  createUnavailableCrmBridge,
  evaluateCrmLeadNextAction,
  listCrmFollowUps,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  type CrmBridgeProvider,
} from "@/features/agents/crm";

function createNoteFailCrmBridge(
  base: CrmBridgeProvider,
  message = "crm_completion_note_failed",
): CrmBridgeProvider {
  return {
    available: true,
    listCustomers: (organizationId) => base.listCustomers(organizationId),
    getCustomer: (customerId) => base.getCustomer(customerId),
    createCustomer: (organizationId, draft) =>
      base.createCustomer(organizationId, draft),
    updateCustomer: (organizationId, customerId, draft) =>
      base.updateCustomer(organizationId, customerId, draft),
    listContacts: (customerId) => base.listContacts(customerId),
    createContact: (organizationId, customerId, draft) =>
      base.createContact(organizationId, customerId, draft),
    async createNote() {
      throw new Error(message);
    },
    listNotes: (customerId) => base.listNotes(customerId),
  };
}

describe("Phase 48 growth CRM follow-up completion", () => {
  const organizationId = "org_phase48_test";

  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  async function approvePending() {
    const approval = growthService
      .snapshot(organizationId)
      .approvals.find((item) => item.state === "REQUIRES_APPROVAL");
    expect(approval).toBeTruthy();
    await growthService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    return approval!;
  }

  async function seedOpenFollowUp(companyName: string, dueAt?: string) {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName,
        services: ["consulting"],
        contactInformation: {
          email: `${companyName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        },
      },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    await growthService.requestCrmFollowUp(organizationId, {
      campaignId: campaign.id,
      kind: "call",
      dueAt,
      summary: "Call the lead",
    });
    await approvePending();
    const followUp = listCrmFollowUps(organizationId)[0]!;
    expect(followUp.status).toBe("pending");
    return { campaign, followUp };
  }

  it("completes an open follow-up through Ops + approval", async () => {
    const { campaign, followUp } = await seedOpenFollowUp("Complete Via Ops");
    const createNoteId = followUp.noteId;
    const requested = await growthService.requestCrmFollowUpComplete(
      organizationId,
      {
        followUpId: followUp.id,
        campaignId: campaign.id,
        completionNote: "Spoke with the lead.",
      },
    );
    expect(requested.job.status).toBe("WAITING_FOR_APPROVAL");
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result?.success).toBe(true);
    expect(job?.result?.externalEffect).toBe(false);
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("completed");
    expect(updated.outcome).toBe("completed");
    expect(updated.noteId).toBe(createNoteId);
    expect(updated.completionNoteId).toBeTruthy();
    expect(updated.completionNoteId).not.toBe(createNoteId);
    const lead = growthService.getCrmLinkedLead(organizationId);
    expect(lead.openFollowUps.length).toBe(0);
    expect(lead.completedFollowUps.length).toBe(1);
    expect(lead.nextAction.code).toBe("create_follow_up");
  });

  it("blocks follow-up completion when CRM is unavailable", async () => {
    const { followUp } = await seedOpenFollowUp("Blocked Complete");
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const requested = await growthService.requestCrmFollowUpComplete(
      organizationId,
      {
        followUpId: followUp.id,
        completionNote: "Would complete",
      },
    );
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("BLOCKED");
    expect(job?.blocker?.code).toBe("crm.unavailable");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("blocked");
  });

  it("fails follow-up completion when CRM note mutation fails", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { followUp } = await seedOpenFollowUp("Fail Complete");
    const createNoteId = followUp.noteId;
    setCrmBridgeProvider(createNoteFailCrmBridge(memory));
    const requested = await growthService.requestCrmFollowUpComplete(
      organizationId,
      {
        followUpId: followUp.id,
        completionNote: "This note will fail",
      },
    );
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.success).toBe(false);
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("failed");
    expect(updated.noteId).toBe(createNoteId);
    expect(updated.outcome).toBe("error");
  });

  it("does not let a prior successful create result force COMPLETED after a failed complete", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { followUp } = await seedOpenFollowUp("Stale Override");
    expect(followUp.result?.success).toBe(true);
    expect(followUp.result?.outcome).toBe("created");
    setCrmBridgeProvider(createNoteFailCrmBridge(memory, "stale_must_not_win"));
    const requested = await growthService.requestCrmFollowUpComplete(
      organizationId,
      {
        followUpId: followUp.id,
        completionNote: "fail me",
      },
    );
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.message).toContain("stale_must_not_win");
  });

  it("fails when completing a missing follow-up id", async () => {
    await seedOpenFollowUp("Missing Id Org");
    const requested = await growthService.requestCrmFollowUpComplete(
      organizationId,
      { followUpId: "cfu_does_not_exist" },
    );
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("FAILED");
  });

  it("recommends overdue completion as the next action", () => {
    const action = evaluateCrmLeadNextAction({
      link: {
        id: "link_1",
        organizationId,
        profileId: "prof_1",
        customerId: "cust_1",
        href: "/dashboard/crm/cust_1",
        companyName: "Acme",
        outcome: "created",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        lastSyncedAt: "2026-01-01T00:00:00.000Z",
      },
      openFollowUps: [
        {
          id: "cfu_overdue",
          organizationId,
          profileId: "prof_1",
          linkId: "link_1",
          customerId: "cust_1",
          kind: "call",
          title: "Overdue call",
          summary: "Call",
          dueAt: "2020-01-01",
          status: "pending",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      today: "2026-08-25",
    });
    expect(action.code).toBe("complete_overdue_follow_up");
    expect(action.followUpId).toBe("cfu_overdue");
  });

  it("recommends link_to_crm when no GrowthCrmLink exists", () => {
    const action = evaluateCrmLeadNextAction({
      link: null,
      openFollowUps: [],
    });
    expect(action.code).toBe("link_to_crm");
  });

  it("exposes complete API on /agents/growth/crm/follow-ups/:id/complete", async () => {
    registerLocalDataHandlers();
    const { followUp } = await seedOpenFollowUp("Api Complete");
    const response = await localDataProvider.request({
      method: "POST",
      path: `/agents/growth/crm/follow-ups/${encodeURIComponent(followUp.id)}/complete`,
      body: {
        organizationId,
        completionNote: "API completion",
      },
    });
    expect(response.ok).toBe(true);
    await approvePending();
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("completed");
  });

  it("normalizes prior Agent OS versions into current v7 shape", () => {
    const normalized = normalizeState({
      version: 6,
      crmFollowUps: [],
    });
    expect(normalized?.version).toBe(7);
    expect(normalized?.crmFollowUps).toEqual([]);
  });

  it("never lets a stale create outcome force COMPLETED on a complete job", async () => {
    const { followUp } = await seedOpenFollowUp("Stale Create Outcome");
    expect(followUp.outcome).toBe("created");
    expect(followUp.status).toBe("pending");

    const { registerToolHandler } = await import("@/features/agents/tools");
    const { handleCrmTool } = await import("@/features/agents/crm/handlers");
    registerToolHandler("crm", async () => ({
      ok: true,
      output: {
        action: "complete_follow_up",
        // Deliberately do not mutate the follow-up record — stale create remains.
        crmSuccess: true,
      },
      durationMs: 1,
    }));

    try {
      const requested = await growthService.requestCrmFollowUpComplete(
        organizationId,
        { followUpId: followUp.id },
      );
      await approvePending();
      const job = operationsService.get(organizationId, requested.job.id);
      expect(job?.status).toBe("FAILED");
      expect(job?.result?.success).toBe(false);
      expect(
        growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
      ).toBe("pending");
    } finally {
      registerToolHandler("crm", handleCrmTool);
    }
  });

  it("idempotent re-complete does not create another CRM completion note", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const { campaign, followUp } = await seedOpenFollowUp("Idempotent Complete");
    const beforeNotes = await provider.listNotes(followUp.customerId);

    await growthService.requestCrmFollowUpComplete(organizationId, {
      followUpId: followUp.id,
      campaignId: campaign.id,
      completionNote: "First completion note",
    });
    await approvePending();
    const afterFirst = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(afterFirst.status).toBe("completed");
    expect(afterFirst.completionNoteId).toBeTruthy();
    const midNotes = await provider.listNotes(followUp.customerId);
    expect(midNotes.length).toBe(beforeNotes.length + 1);

    await growthService.requestCrmFollowUpComplete(organizationId, {
      followUpId: followUp.id,
      campaignId: campaign.id,
      completionNote: "Should not create another note",
    });
    await approvePending();
    const afterSecond = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(afterSecond.status).toBe("completed");
    expect(afterSecond.completionNoteId).toBe(afterFirst.completionNoteId);
    expect(afterSecond.noteId).toBe(afterFirst.noteId);
    const endNotes = await provider.listNotes(followUp.customerId);
    expect(endNotes.length).toBe(midNotes.length);
    const job = operationsService
      .list(organizationId)
      .filter((item) => item.params.growthAction === "crm_follow_up_complete")
      .at(0);
    // Latest complete job should be COMPLETED via idempotent path
    const latest = operationsService
      .list(organizationId)
      .filter((item) => item.params.growthAction === "crm_follow_up_complete")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    expect(latest?.status).toBe("COMPLETED");
    void job;
  });

  it("keeps failed follow-ups actionable in next-action and lead state", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { followUp } = await seedOpenFollowUp("Failed Remains Open");
    setCrmBridgeProvider(createNoteFailCrmBridge(memory));
    await growthService.requestCrmFollowUpComplete(organizationId, {
      followUpId: followUp.id,
      completionNote: "will fail",
    });
    await approvePending();
    const lead = growthService.getCrmLinkedLead(organizationId);
    expect(lead.openFollowUps.some((item) => item.id === followUp.id)).toBe(true);
    expect(lead.nextAction.code).toBe("complete_open_follow_up");
    expect(lead.nextAction.followUpId).toBe(followUp.id);
  });

  it("blocks completion when approval is rejected", async () => {
    const { followUp } = await seedOpenFollowUp("Reject Complete");
    const requested = await growthService.requestCrmFollowUpComplete(
      organizationId,
      { followUpId: followUp.id },
    );
    const approval = growthService
      .snapshot(organizationId)
      .approvals.find((item) => item.state === "REQUIRES_APPROVAL");
    await growthService.resolveApproval({
      approvalId: approval!.id,
      state: "REJECTED",
      decidedBy: "tester",
    });
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("BLOCKED");
    expect(job?.blocker?.code).toBe("approval.rejected");
    expect(job?.result?.success).toBe(false);
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("pending");
  });
});
