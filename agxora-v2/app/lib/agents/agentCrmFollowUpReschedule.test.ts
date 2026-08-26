import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agentsStore } from "@/features/agents/store";
import { growthService } from "@/features/agents/growth/service";
import { operationsService } from "@/features/agents/execution/service";
import { normalizeState } from "@/features/agents/repositories";
import {
  createMemoryCrmBridge,
  defaultFollowUpDueAt,
  evaluateLeadPriority,
  isLeadExecutableAction,
  listCrmFollowUps,
  normalizeFollowUpDueAt,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  validateLeadAction,
  type GrowthCrmFollowUp,
} from "@/features/agents/crm";

describe("Phase 55 CRM follow-up due date & reschedule", () => {
  const organizationId = "org_phase55_test";
  const today = "2026-08-26";

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

  async function seedOpenFollowUp(
    companyName: string,
    dueAt?: string | null,
  ) {
    const seeded = await seedLinkedProfile(companyName);
    await growthService.requestCrmFollowUp(organizationId, {
      campaignId: seeded.campaign.id,
      profileId: seeded.profile.id,
      kind: "call",
      ...(dueAt === null
        ? {}
        : dueAt !== undefined
          ? { dueAt }
          : { dueAt: undefined }),
      summary: "Call the lead",
    });
    await approvePending();
    const followUp = listCrmFollowUps(organizationId).find(
      (item) => item.profileId === seeded.profile.id,
    )!;
    expect(followUp.status).toBe("pending");
    return { ...seeded, followUp };
  }

  function stripDueAt(followUp: GrowthCrmFollowUp) {
    agentsStore.upsertGrowthCrmFollowUp({
      ...followUp,
      dueAt: undefined,
      updatedAt: new Date().toISOString(),
    });
    return growthService.getCrmFollowUp(organizationId, followUp.id)!;
  }

  function markFollowUp(
    followUp: GrowthCrmFollowUp,
    status: GrowthCrmFollowUp["status"],
  ) {
    agentsStore.upsertGrowthCrmFollowUp({
      ...followUp,
      status,
      updatedAt: new Date().toISOString(),
    });
    return growthService.getCrmFollowUp(organizationId, followUp.id)!;
  }

  it("exposes RESCHEDULE_FOLLOW_UP as an executable", () => {
    expect(isLeadExecutableAction("RESCHEDULE_FOLLOW_UP")).toBe(true);
    expect(isLeadExecutableAction("CREATE_FOLLOW_UP")).toBe(true);
    expect(normalizeFollowUpDueAt("2026-09-01")).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(defaultFollowUpDueAt(today)).toBe("2026-09-02T00:00:00.000Z");
  });

  it("applies deterministic dueAt when CREATE_FOLLOW_UP omits dueAt", async () => {
    const { profile, campaign } = await seedLinkedProfile("Create Default Due");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CREATE_FOLLOW_UP",
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    const followUp = listCrmFollowUps(organizationId).find(
      (item) => item.profileId === profile.id,
    )!;
    expect(followUp.dueAt).toBeTruthy();
    expect(followUp.dueAt!.slice(0, 10)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("honors explicit dueAt on CREATE_FOLLOW_UP", async () => {
    const { profile, campaign } = await seedLinkedProfile("Create Explicit Due");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "CREATE_FOLLOW_UP",
      campaignId: campaign.id,
      dueAt: "2026-09-10",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    const followUp = listCrmFollowUps(organizationId).find(
      (item) => item.profileId === profile.id,
    )!;
    expect(followUp.dueAt).toBe("2026-09-10T00:00:00.000Z");
  });

  it("never treats undated follow-ups as overdue", async () => {
    const { profile, followUp } = await seedOpenFollowUp(
      "Undated Not Overdue",
      "2026-08-01",
    );
    stripDueAt(followUp);
    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.overdueFollowUpCount).toBe(0);
    expect(item?.recommendedAction).toBe("RESCHEDULE_FOLLOW_UP");
    expect(item?.recommendedAction).not.toBe("COMPLETE_OVERDUE_FOLLOW_UP");
    expect(item?.reasons).toContain("undated_follow_up");
  });

  it("requires approval and does not mutate before approval for reschedule", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Reschedule Gate",
      "2026-08-30",
    );
    const beforeDue = followUp.dueAt;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
      dueAt: "2026-09-15",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.dueAt,
    ).toBe(beforeDue);
  });

  it("reschedules a pending follow-up → COMPLETED and recomputes priority", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Reschedule Success",
      "2026-08-01",
    );
    expect(
      (await growthService.getLeadActionQueue(organizationId)).items.find(
        (row) => row.profileId === profile.id,
      )?.recommendedAction,
    ).toBe("COMPLETE_OVERDUE_FOLLOW_UP");

    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
      dueAt: "2026-09-20",
    });
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result?.message).toBe("rescheduled");
    const updated = growthService.getCrmFollowUp(organizationId, followUp.id)!;
    expect(updated.status).toBe("pending");
    expect(updated.dueAt).toBe("2026-09-20T00:00:00.000Z");
    expect(updated.outcome).toBe("rescheduled");

    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.recommendedAction).toBe("COMPLETE_PENDING_FOLLOW_UP");
    expect(item?.overdueFollowUpCount).toBe(0);
  });

  it("blocks reschedule when approval is rejected (no mutation)", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Reschedule Reject",
      "2026-08-30",
    );
    const beforeDue = followUp.dueAt;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
      dueAt: "2026-09-15",
    });
    await rejectPending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("BLOCKED");
    expect(
      growthService.getCrmFollowUp(organizationId, followUp.id)?.dueAt,
    ).toBe(beforeDue);
  });

  it("allows reschedule for blocked and failed follow-ups", async () => {
    const blockedSeed = await seedOpenFollowUp("Blocked Reschedule", "2026-08-30");
    markFollowUp(blockedSeed.followUp, "blocked");
    const blocked = await growthService.executeLeadAction(organizationId, {
      profileId: blockedSeed.profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: blockedSeed.followUp.id,
      campaignId: blockedSeed.campaign.id,
      dueAt: "2026-09-12",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, blocked.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      growthService.getCrmFollowUp(organizationId, blockedSeed.followUp.id)
        ?.status,
    ).toBe("blocked");
    expect(
      growthService.getCrmFollowUp(organizationId, blockedSeed.followUp.id)
        ?.dueAt,
    ).toBe("2026-09-12T00:00:00.000Z");

    const failedSeed = await seedOpenFollowUp("Failed Reschedule", "2026-08-30");
    markFollowUp(failedSeed.followUp, "failed");
    const failed = await growthService.executeLeadAction(organizationId, {
      profileId: failedSeed.profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: failedSeed.followUp.id,
      campaignId: failedSeed.campaign.id,
      dueAt: "2026-09-18",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, failed.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      growthService.getCrmFollowUp(organizationId, failedSeed.followUp.id)
        ?.status,
    ).toBe("failed");
  });

  it("rejects missing dueAt and completed/cancelled statuses", async () => {
    const { profile, followUp } = await seedOpenFollowUp(
      "Validate Reschedule",
      "2026-08-30",
    );
    const missingDue = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
    });
    expect(missingDue.ok).toBe(false);
    expect(missingDue.code).toBe("missing_due_at");

    markFollowUp(followUp, "completed");
    const completed = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
      dueAt: "2026-09-01",
    });
    expect(completed.ok).toBe(false);
    expect(completed.code).toBe("not_reschedulable");
  });

  it("fails on stale/concurrent status change and never reports false COMPLETED", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Stale Reschedule",
      "2026-08-30",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
      dueAt: "2026-09-15",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
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
      growthService.getCrmFollowUp(organizationId, followUp.id)?.dueAt,
    ).toBe(followUp.dueAt);
  });

  it("enforces org/profile isolation for reschedule", async () => {
    const { followUp } = await seedOpenFollowUp("Isolation Reschedule", "2026-08-30");
    const otherOrg = "org_phase55_other";
    const otherProfile = growthService.saveProfile({
      organizationId: otherOrg,
      seedFromBusinessOs: false,
      draft: { companyName: "Other Org Co", services: ["ops"] },
    });
    const wrongOrg = await validateLeadAction({
      organizationId: otherOrg,
      profileId: otherProfile.id,
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
      dueAt: "2026-09-01",
    });
    expect(wrongOrg.ok).toBe(false);
    expect(wrongOrg.code).toBe("follow_up_not_found");

    const wrongProfile = await validateLeadAction({
      organizationId,
      profileId: "profile_other",
      action: "RESCHEDULE_FOLLOW_UP",
      followUpId: followUp.id,
      dueAt: "2026-09-01",
    });
    expect(wrongProfile.ok).toBe(false);
    expect(wrongProfile.code).toBe("follow_up_not_found");
  });

  it("does not alias RESCHEDULE to COMPLETE_OVERDUE and preserves overdue complete", async () => {
    const { profile, campaign, followUp } = await seedOpenFollowUp(
      "Overdue Preserve",
      "2026-08-01",
    );
    const queue = await growthService.getLeadActionQueue(organizationId);
    expect(
      queue.items.find((row) => row.profileId === profile.id)
        ?.recommendedAction,
    ).toBe("COMPLETE_OVERDUE_FOLLOW_UP");

    const priority = evaluateLeadPriority({
      link: growthService.getCrmLink(organizationId),
      openFollowUps: [followUp],
      completedFollowUps: [],
      today,
    });
    expect(priority.recommendedAction).toBe("COMPLETE_OVERDUE_FOLLOW_UP");

    const complete = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "COMPLETE_OVERDUE_FOLLOW_UP",
      followUpId: followUp.id,
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, complete.execution.jobId!)?.status,
    ).toBe("COMPLETED");
  });

  it("keeps Agent OS persistence at v7", () => {
    const state = normalizeState(agentsStore.getSnapshot());
    expect(state.version).toBe(7);
    expect(Array.isArray(state.crmFollowUps)).toBe(true);
  });
});
