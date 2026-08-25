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
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
} from "@/features/agents/crm";
import { completeCrmFollowUp, listCrmFollowUps } from "@/features/agents/crm/followUp";

describe("Phase 47 growth CRM follow-up operations", () => {
  const organizationId = "org_phase47_test";

  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  async function seedLinkedCampaign(companyName: string, email?: string) {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName,
        services: ["consulting"],
        contactInformation: email
          ? { email, phone: "+1 555 0100" }
          : {
              email: `${companyName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
            },
      },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    return campaign;
  }

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

  it("creates a CRM follow-up note for a linked Growth lead", async () => {
    const campaign = await seedLinkedCampaign("Follow Co", "follow@example.com");
    const requested = await growthService.requestCrmFollowUp(organizationId, {
      campaignId: campaign.id,
      kind: "call",
      summary: "Call the lead about the campaign offer.",
    });
    expect(requested.job.status).toBe("WAITING_FOR_APPROVAL");
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result?.success).toBe(true);
    expect(job?.result?.externalEffect).toBe(false);
    const followUps = listCrmFollowUps(organizationId, { campaignId: campaign.id });
    expect(followUps.length).toBe(1);
    expect(followUps[0]?.status).toBe("pending");
    expect(followUps[0]?.outcome).toBe("created");
    expect(followUps[0]?.noteId).toBeTruthy();
    expect(followUps[0]?.kind).toBe("call");
    const updated = growthService.getCampaign(organizationId, campaign.id);
    expect(
      updated?.tasks.find((task) => task.code === "schedule_crm_follow_up")?.status,
    ).toBe("completed");
  });

  it("fails follow-up when CRM link is missing", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Unlinked Co", services: ["consulting"] },
    });
    await growthService.planCampaign(organizationId);
    const requested = await growthService.requestCrmFollowUp(organizationId, {
      kind: "general",
    });
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.success).toBe(false);
    const followUps = listCrmFollowUps(organizationId);
    expect(followUps[0]?.outcome).toBe("missing_link");
    expect(followUps[0]?.status).toBe("failed");
  });

  it("blocks follow-up when CRM is unavailable", async () => {
    await seedLinkedCampaign("Unavailable Follow", "unavail.follow@example.com");
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const requested = await growthService.requestCrmFollowUp(organizationId, {
      kind: "meeting",
    });
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("BLOCKED");
    expect(job?.blocker?.code).toBe("crm.unavailable");
    expect(listCrmFollowUps(organizationId)[0]?.status).toBe("blocked");
  });

  it("exposes CRM-linked lead state with open follow-ups", async () => {
    const campaign = await seedLinkedCampaign("Lead State Co", "lead.state@example.com");
    await growthService.requestCrmFollowUp(organizationId, {
      campaignId: campaign.id,
      kind: "email_draft",
      summary: "Draft follow-up email — not sent.",
    });
    await approvePending();
    const lead = growthService.getCrmLinkedLead(organizationId);
    expect(lead.link?.customerId).toBeTruthy();
    expect(lead.openFollowUps.length).toBe(1);
    expect(lead.openFollowUps[0]?.kind).toBe("email_draft");
    expect(lead.completedFollowUps.length).toBe(0);
    expect(lead.href).toMatch(/^\/dashboard\/crm\//);
  });

  it("completes an open follow-up and records optional CRM note", async () => {
    const campaign = await seedLinkedCampaign("Complete Follow", "complete.fu@example.com");
    await growthService.requestCrmFollowUp(organizationId, {
      campaignId: campaign.id,
      kind: "general",
    });
    await approvePending();
    const open = listCrmFollowUps(organizationId)[0]!;
    const { result, followUp } = await completeCrmFollowUp({
      organizationId,
      followUpId: open.id,
      completionNote: "Spoke with the lead; next step agreed.",
    });
    expect(result.success).toBe(true);
    expect(followUp?.status).toBe("completed");
    expect(followUp?.outcome).toBe("completed");
    expect(followUp?.noteId).toBeTruthy();
    const lead = growthService.getCrmLinkedLead(organizationId);
    expect(lead.openFollowUps.length).toBe(0);
    expect(lead.completedFollowUps.length).toBe(1);
  });

  it("never claims email_draft as an external send", async () => {
    const campaign = await seedLinkedCampaign("Draft Only", "draft.only@example.com");
    await growthService.requestCrmFollowUp(organizationId, {
      campaignId: campaign.id,
      kind: "email_draft",
    });
    await approvePending();
    const followUp = listCrmFollowUps(organizationId)[0]!;
    expect(followUp.kind).toBe("email_draft");
    const job = operationsService
      .list(organizationId)
      .find((item) => item.params.growthAction === "crm_follow_up");
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result?.externalEffect).toBe(false);
    expect(job?.result?.success).toBe(true);
  });

  it("plans schedule_crm_follow_up campaign task", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Planner Co", services: ["consulting"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    expect(
      campaign.tasks.some((task) => task.code === "schedule_crm_follow_up"),
    ).toBe(true);
  });

  it("persists follow-ups in Agent OS v7 state", async () => {
    const campaign = await seedLinkedCampaign("Persist FU", "persist.fu@example.com");
    await growthService.requestCrmFollowUp(organizationId, {
      campaignId: campaign.id,
    });
    await approvePending();
    const snap = agentsStore.getSnapshot();
    expect(snap.version).toBe(7);
    expect(snap.crmFollowUps.length).toBeGreaterThan(0);
  });

  it("normalizes v6 payloads into v7 with empty follow-ups", () => {
    const normalized = normalizeState({
      version: 6,
      growthCrmLinks: [],
      campaignCrmSyncs: [],
    });
    expect(normalized?.version).toBe(7);
    expect(normalized?.crmFollowUps).toEqual([]);
  });

  it("exposes follow-up APIs on /agents/growth/crm/follow-ups", async () => {
    registerLocalDataHandlers();
    await seedLinkedCampaign("Api Follow", "api.follow@example.com");
    const created = await localDataProvider.request({
      method: "POST",
      path: "/agents/growth/crm/follow-ups",
      body: {
        organizationId,
        kind: "general",
        summary: "API follow-up",
      },
    });
    expect(created.ok).toBe(true);
    await approvePending();
    const listed = await localDataProvider.request<{
      readonly followUps: readonly { readonly id: string }[];
      readonly lead: { readonly openFollowUps: readonly unknown[] };
    }>({
      method: "GET",
      path: `/agents/growth/crm/follow-ups?organizationId=${encodeURIComponent(organizationId)}`,
      body: { organizationId },
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.followUps.length).toBeGreaterThan(0);
    expect(listed.data.lead.openFollowUps.length).toBeGreaterThan(0);
  });
});
