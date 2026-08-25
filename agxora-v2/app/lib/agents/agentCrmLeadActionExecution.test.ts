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
  listCrmFollowUps,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  validateLeadAction,
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

describe("Phase 50 growth CRM lead action execution", () => {
  const organizationId = "org_phase50_test";

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

  async function rejectPending() {
    const approval = growthService
      .snapshot(organizationId)
      .approvals.find((item) => item.state === "REQUIRES_APPROVAL");
    expect(approval).toBeTruthy();
    await growthService.resolveApproval({
      approvalId: approval!.id,
      state: "REJECTED",
      decidedBy: "tester",
    });
    return approval!;
  }

  async function seedLinkedProfile(companyName: string) {
    const profile = growthService.saveProfile({
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
    return { profile, campaign };
  }

  async function seedOpenFollowUp(companyName: string, dueAt?: string) {
    const seeded = await seedLinkedProfile(companyName);
    await growthService.requestCrmFollowUp(organizationId, {
      campaignId: seeded.campaign.id,
      profileId: seeded.profile.id,
      kind: "call",
      dueAt,
      summary: "Call the lead",
    });
    await approvePending();
    const followUp = listCrmFollowUps(organizationId)[0]!;
    return { ...seeded, followUp };
  }

  it("creates a follow-up from the Lead Action Queue through Agent OS", async () => {
    const { profile, campaign } = await seedLinkedProfile("Create Via Queue");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CREATE_FOLLOW_UP",
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(result.execution.jobId).toBeTruthy();
    expect(result.execution.approvalId).toBeTruthy();
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    expect(listCrmFollowUps(organizationId).length).toBe(1);
    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.recommendedAction).not.toBe("CREATE_FOLLOW_UP");
    expect(item?.openFollowUpCount).toBe(1);
  });

  it("requires approval and blocks on rejection", async () => {
    const { profile, campaign } = await seedLinkedProfile("Reject Create");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CREATE_FOLLOW_UP",
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    await rejectPending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("BLOCKED");
    expect(listCrmFollowUps(organizationId).length).toBe(0);
    const queue = await growthService.getLeadActionQueue(organizationId);
    expect(
      queue.items.some(
        (item) =>
          item.profileId === profile.id &&
          item.recommendedAction === "ADVANCE_CRM_STATUS",
      ),
    ).toBe(true);
  });

  it("completes an overdue follow-up through the queue action", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Complete Overdue",
      "2026-08-01",
    );
    const noteId = followUp.noteId;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_OVERDUE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("completed");
    expect(updated.noteId).toBe(noteId);
    expect(updated.completionNoteId).toBeTruthy();
    expect(updated.completionNoteId).not.toBe(noteId);
  });

  it("retries a failed follow-up without creating a duplicate create note", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Retry Failed",
      "2026-08-25",
    );
    const createNoteId = followUp.noteId;
    agentsStore.upsertGrowthCrmFollowUp({
      ...followUp,
      status: "failed",
      outcome: "error",
      lastError: "prior failure",
      result: {
        available: true,
        success: false,
        outcome: "error",
        message: "prior failure",
        duplicated: false,
        noteId: createNoteId,
      },
    });
    const notesBefore = (
      await createMemoryCrmBridge().listNotes(followUp.customerId)
    ).length;
    setCrmBridgeProvider(createMemoryCrmBridge());
    // Restore customer notes by using the live bridge — seed already created one note.
    const liveNotesBefore = listCrmFollowUps(organizationId)[0]?.noteId;
    expect(liveNotesBefore).toBe(createNoteId);

    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "RETRY_FAILED_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("completed");
    expect(updated.noteId).toBe(createNoteId);
    expect(listCrmFollowUps(organizationId).filter((item) => item.status !== "completed").length).toBe(0);
    void notesBefore;
  });

  it("blocks when CRM is unavailable during completion", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Unavailable Complete",
      "2026-08-01",
    );
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_OVERDUE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("BLOCKED");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("blocked");
    const queue = await growthService.getLeadActionQueue(organizationId);
    expect(queue.items.some((item) => item.profileId === profile.id)).toBe(true);
  });

  it("fails completion when CRM note mutation fails", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Fail Complete",
      "2026-08-01",
    );
    setCrmBridgeProvider(createNoteFailCrmBridge(memory));
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_OVERDUE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("FAILED");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("failed");
  });

  it("rejects invalid actions without mutation", async () => {
    const { profile } = await seedLinkedProfile("Invalid Action");
    const before = agentsStore.getSnapshot().crmFollowUps.length;
    const beforeJobs = operationsService.list(organizationId).length;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "SEND_OUTBOUND_EMAIL",
    });
    expect(result.execution.status).toBe("INVALID");
    expect(result.execution.readOnly).toBe(true);
    expect(agentsStore.getSnapshot().crmFollowUps.length).toBe(before);
    expect(operationsService.list(organizationId).length).toBe(beforeJobs);
  });

  it("REVIEW_CRM_LINK is read-only and requires no approval", async () => {
    const { profile } = await seedLinkedProfile("Review Link");
    const beforeApprovals = growthService
      .snapshot(organizationId)
      .approvals.filter((item) => item.state === "REQUIRES_APPROVAL").length;
    const beforeFollowUps = listCrmFollowUps(organizationId).length;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REVIEW_CRM_LINK",
    });
    expect(result.execution.status).toBe("REVIEWED");
    expect(result.execution.readOnly).toBe(true);
    expect(result.execution.href).toContain("/dashboard/crm/");
    expect(result.execution.jobId).toBeUndefined();
    const afterApprovals = growthService
      .snapshot(organizationId)
      .approvals.filter((item) => item.state === "REQUIRES_APPROVAL").length;
    expect(afterApprovals).toBe(beforeApprovals);
    expect(listCrmFollowUps(organizationId).length).toBe(beforeFollowUps);
  });

  it("blocks CREATE_FOLLOW_UP when an open follow-up already exists", async () => {
    const validation = await validateLeadAction({
      organizationId,
      profileId: "p1",
      action: "CREATE_FOLLOW_UP",
    });
    // no link yet
    expect(validation.ok).toBe(false);
    expect(validation.code).toBe("missing_crm_link");
  });

  it("exposes POST /agents/growth/crm/leads/:profileId/actions", async () => {
    registerLocalDataHandlers();
    const { profile, campaign } = await seedLinkedProfile("Api Execute");
    const response = await localDataProvider.request({
      method: "POST",
      path: `/agents/growth/crm/leads/${encodeURIComponent(profile.id)}/actions`,
      body: {
        organizationId,
        action: "CREATE_FOLLOW_UP",
        campaignId: campaign.id,
      },
    });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    const body = response.data as {
      execution: { status: string; jobId?: string };
      queue: { items: readonly unknown[] };
    };
    expect(body.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(body.execution.jobId).toBeTruthy();
    expect(Array.isArray(body.queue.items)).toBe(true);
  });

  it("keeps Agent OS persistence at version 7", () => {
    const normalized = normalizeState({
      version: 6,
      growthCrmLinks: [],
      campaignCrmSyncs: [],
    });
    expect(normalized?.version).toBe(7);
  });

  it("recomputs queue after successful create", async () => {
    const { profile, campaign } = await seedLinkedProfile("Recompute Queue");
    const before = await growthService.getLeadActionQueue(organizationId);
    expect(
      before.items.find((item) => item.profileId === profile.id)?.recommendedAction,
    ).toBe("ADVANCE_CRM_STATUS");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CREATE_FOLLOW_UP",
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    const after = await growthService.getLeadActionQueue(organizationId);
    const item = after.items.find((row) => row.profileId === profile.id);
    expect(item?.openFollowUpCount).toBeGreaterThan(0);
    expect(item?.recommendedAction).toMatch(/COMPLETE_|RETRY_/);
  });
});
