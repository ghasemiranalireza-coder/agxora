import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agentsStore } from "@/features/agents/store";
import { growthService } from "@/features/agents/growth/service";
import { operationsService } from "@/features/agents/execution/service";
import { normalizeState } from "@/features/agents/repositories";
import {
  createMemoryCrmBridge,
  createUnavailableCrmBridge,
  evaluateLeadPriority,
  isLeadExecutableAction,
  listCrmFollowUps,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  validateLeadAction,
  type CrmBridgeProvider,
  type GrowthCrmFollowUp,
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

describe("Phase 54 CRM follow-up lifecycle control", () => {
  const organizationId = "org_phase54_test";

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
    const followUp = listCrmFollowUps(organizationId).find(
      (item) => item.profileId === seeded.profile.id,
    )!;
    expect(followUp.status).toBe("pending");
    return { ...seeded, followUp };
  }

  function markFollowUp(
    followUp: GrowthCrmFollowUp,
    status: GrowthCrmFollowUp["status"],
  ) {
    agentsStore.upsertGrowthCrmFollowUp({
      ...followUp,
      status,
      outcome:
        status === "blocked"
          ? "unavailable"
          : status === "failed"
            ? "error"
            : followUp.outcome,
      updatedAt: new Date().toISOString(),
    });
    return growthService.getCrmFollowUp(organizationId, followUp.id)!;
  }

  it("exposes Phase 54 executables without aliasing pending/blocked to overdue", () => {
    expect(isLeadExecutableAction("COMPLETE_PENDING_FOLLOW_UP")).toBe(true);
    expect(isLeadExecutableAction("REVIEW_BLOCKED_FOLLOW_UP")).toBe(true);
    expect(isLeadExecutableAction("CANCEL_FOLLOW_UP")).toBe(true);
    expect(isLeadExecutableAction("COMPLETE_OVERDUE_FOLLOW_UP")).toBe(true);
    expect(isLeadExecutableAction("RETRY_FAILED_FOLLOW_UP")).toBe(true);
  });

  it("requires approval and does not mutate before approval for pending complete", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Pending Approval Gate",
      "2026-08-30",
    );
    const createNoteId = followUp.noteId;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(result.execution.jobId).toBeTruthy();
    const before = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(before.status).toBe("pending");
    expect(before.completionNoteId).toBeUndefined();
    expect(before.noteId).toBe(createNoteId);
  });

  it("completes a pending follow-up through approval → COMPLETED", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Pending Complete Success",
      "2026-08-30",
    );
    const createNoteId = followUp.noteId;
    const notesBefore = (
      await createMemoryCrmBridge().listNotes(followUp.customerId)
    ).length;
    void notesBefore;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result?.success).toBe(true);
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("completed");
    expect(updated.noteId).toBe(createNoteId);
    expect(updated.completionNoteId).toBeTruthy();
    expect(updated.completionNoteId).not.toBe(createNoteId);
    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.openFollowUpCount).toBe(0);
    expect(item?.recommendedAction).not.toBe("COMPLETE_PENDING_FOLLOW_UP");
  });

  it("blocks pending complete when approval is rejected (no mutation)", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Pending Reject",
      "2026-08-30",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await rejectPending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("BLOCKED");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("pending");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.completionNoteId,
    ).toBeUndefined();
  });

  it("reviews a blocked follow-up with CRM available → COMPLETED + note", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Blocked Review Ok",
      "2026-08-30",
    );
    const createNoteId = followUp.noteId;
    markFollowUp(followUp, "blocked");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REVIEW_BLOCKED_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("completed");
    expect(updated.noteId).toBe(createNoteId);
    expect(updated.completionNoteId).toBeTruthy();
    expect(updated.completionNoteId).not.toBe(createNoteId);
  });

  it("blocks blocked-review when CRM is unavailable", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Blocked Review Unavailable",
      "2026-08-30",
    );
    markFollowUp(followUp, "blocked");
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REVIEW_BLOCKED_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("BLOCKED");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("blocked");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.completionNoteId,
    ).toBeUndefined();
  });

  it("cancels a blocked follow-up → cancelled and leaves open queue", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Blocked Cancel",
      "2026-08-30",
    );
    const createNoteId = followUp.noteId;
    markFollowUp(followUp, "blocked");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CANCEL_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result?.message).toBe("cancelled");
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("cancelled");
    expect(updated.noteId).toBe(createNoteId);
    expect(updated.completionNoteId).toBeUndefined();
    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.openFollowUpCount).toBe(0);
    expect(item?.recommendedAction).not.toBe("REVIEW_BLOCKED_FOLLOW_UP");
  });

  it("cancels a pending follow-up → cancelled", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Pending Cancel",
      "2026-08-30",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CANCEL_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("cancelled");
  });

  it("cancels a failed follow-up → cancelled", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Failed Cancel",
      "2026-08-30",
    );
    markFollowUp(followUp, "failed");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CANCEL_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("cancelled");
  });

  it("rejects invalid followUpId without enqueueing", async () => {
    const { profile } = await seedLinkedProfile("Missing FollowUp");
    const beforeJobs = operationsService.list(organizationId).length;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: "cfu_missing",
    });
    expect(result.execution.status).toBe("INVALID");
    expect(result.execution.message).toBe("crm_follow_up_missing");
    expect(operationsService.list(organizationId).length).toBe(beforeJobs);
  });

  it("enforces org/profile isolation for follow-up actions", async () => {
    const { profile, followUp } = await seedOpenFollowUp(
      "Isolation Owner",
      "2026-08-30",
    );
    const otherOrg = "org_phase54_other";
    const otherProfile = growthService.saveProfile({
      organizationId: otherOrg,
      seedFromBusinessOs: false,
      draft: { companyName: "Other Org Co", services: ["ops"] },
    });
    const wrongOrg = await validateLeadAction({
      organizationId: otherOrg,
      profileId: otherProfile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
    });
    expect(wrongOrg.ok).toBe(false);
    expect(wrongOrg.code).toBe("follow_up_not_found");

    const wrongProfile = await validateLeadAction({
      organizationId,
      profileId: "profile_other",
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
    });
    expect(wrongProfile.ok).toBe(false);
    expect(wrongProfile.code).toBe("follow_up_not_found");
    void profile;
  });

  it("rejects wrong follow-up status for pending/blocked/cancel actions", async () => {
    const { profile, followUp } = await seedOpenFollowUp(
      "Wrong Status",
      "2026-08-30",
    );
    const pendingAsBlocked = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "REVIEW_BLOCKED_FOLLOW_UP",
      followUpId: followUp.id,
    });
    expect(pendingAsBlocked.ok).toBe(false);
    expect(pendingAsBlocked.code).toBe("not_blocked");

    markFollowUp(followUp, "blocked");
    const blockedAsPending = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
    });
    expect(blockedAsPending.ok).toBe(false);
    expect(blockedAsPending.code).toBe("not_pending");

    markFollowUp(followUp, "completed");
    const completedCancel = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "CANCEL_FOLLOW_UP",
      followUpId: followUp.id,
    });
    expect(completedCancel.ok).toBe(false);
    expect(completedCancel.code).toBe("not_cancellable");
  });

  it("fails on stale/concurrent status change and never reports false COMPLETED", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Stale Concurrent",
      "2026-08-30",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    // Concurrent mutation before approval settles.
    agentsStore.upsertGrowthCrmFollowUp({
      ...followUp,
      status: "completed",
      outcome: "completed",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.success).not.toBe(true);
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("completed");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.completionNoteId,
    ).toBeUndefined();
  });

  it("does not alias pending/blocked recommendations to overdue-complete", async () => {
    const { profile, followUp } = await seedOpenFollowUp(
      "No Alias Pending",
      "2026-08-30",
    );
    const queuePending = await growthService.getLeadActionQueue(organizationId);
    const pendingItem = queuePending.items.find(
      (row) => row.profileId === profile.id,
    );
    expect(pendingItem?.recommendedAction).toBe("COMPLETE_PENDING_FOLLOW_UP");
    expect(pendingItem?.recommendedAction).not.toBe(
      "COMPLETE_OVERDUE_FOLLOW_UP",
    );

    markFollowUp(followUp, "blocked");
    const queueBlocked = await growthService.getLeadActionQueue(organizationId);
    const blockedItem = queueBlocked.items.find(
      (row) => row.profileId === profile.id,
    );
    expect(blockedItem?.recommendedAction).toBe("REVIEW_BLOCKED_FOLLOW_UP");
    expect(blockedItem?.recommendedAction).not.toBe(
      "COMPLETE_OVERDUE_FOLLOW_UP",
    );

    const link = growthService.getCrmLink(organizationId);
    const priority = evaluateLeadPriority({
      link: link ?? null,
      openFollowUps: listCrmFollowUps(organizationId).filter(
        (item) => item.profileId === profile.id && item.status === "blocked",
      ),
      completedFollowUps: [],
      today: "2026-08-26",
    });
    expect(priority.recommendedAction).toBe("REVIEW_BLOCKED_FOLLOW_UP");
  });

  it("recomputes the queue after complete and cancel", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Queue Recompute",
      "2026-08-30",
    );
    const before = await growthService.getLeadActionQueue(organizationId);
    expect(
      before.items.find((row) => row.profileId === profile.id)?.openFollowUpCount,
    ).toBe(1);

    const complete = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, complete.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    const afterComplete = await growthService.getLeadActionQueue(organizationId);
    expect(
      afterComplete.items.find((row) => row.profileId === profile.id)
        ?.openFollowUpCount,
    ).toBe(0);

    const second = await seedOpenFollowUp("Queue Cancel Recompute", "2026-08-30");
    const cancel = await growthService.executeLeadAction(organizationId, {
      profileId: second.profile.id,
      action: "CANCEL_FOLLOW_UP",
      followUpId: second.followUp.id,
      campaignId: second.campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, cancel.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    const afterCancel = await growthService.getLeadActionQueue(organizationId);
    expect(
      afterCancel.items.find((row) => row.profileId === second.profile.id)
        ?.openFollowUpCount,
    ).toBe(0);
  });

  it("does not create duplicate CRM notes when completing pending", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "No Dup Notes",
      "2026-08-30",
    );
    const createNoteId = followUp.noteId!;
    const notesBefore = (await memory.listNotes(followUp.customerId)).length;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_PENDING_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    const notesAfter = (await memory.listNotes(followUp.customerId)).length;
    expect(notesAfter).toBe(notesBefore + 1);
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.noteId).toBe(createNoteId);
    expect(updated.completionNoteId).toBeTruthy();
    expect(updated.completionNoteId).not.toBe(createNoteId);
  });

  it("preserves overdue COMPLETE_OVERDUE_FOLLOW_UP and failed RETRY", async () => {
    const overdue = await seedOpenFollowUp("Overdue Preserve", "2026-08-01");
    const overdueQueue = await growthService.getLeadActionQueue(organizationId);
    expect(
      overdueQueue.items.find((row) => row.profileId === overdue.profile.id)
        ?.recommendedAction,
    ).toBe("COMPLETE_OVERDUE_FOLLOW_UP");
    const overdueResult = await growthService.executeLeadAction(organizationId, {
      profileId: overdue.profile.id,
      action: "COMPLETE_OVERDUE_FOLLOW_UP",
      followUpId: overdue.followUp.id,
      campaignId: overdue.campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, overdueResult.execution.jobId!)
        ?.status,
    ).toBe("COMPLETED");

    const failed = await seedOpenFollowUp("Failed Retry Preserve", "2026-08-30");
    markFollowUp(failed.followUp, "failed");
    const failedResult = await growthService.executeLeadAction(organizationId, {
      profileId: failed.profile.id,
      action: "RETRY_FAILED_FOLLOW_UP",
      followUpId: failed.followUp.id,
      campaignId: failed.campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, failedResult.execution.jobId!)
        ?.status,
    ).toBe("COMPLETED");
  });

  it("keeps Agent OS persistence at v7", () => {
    const state = normalizeState(agentsStore.getSnapshot());
    expect(state.version).toBe(7);
    expect(Array.isArray(state.crmFollowUps)).toBe(true);
  });

  it("fails blocked review when CRM note mutation fails (no false COMPLETED)", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Blocked Note Fail",
      "2026-08-30",
    );
    markFollowUp(followUp, "blocked");
    setCrmBridgeProvider(createNoteFailCrmBridge(memory));
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REVIEW_BLOCKED_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.success).not.toBe(true);
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.status,
    ).toBe("failed");
  });
});
