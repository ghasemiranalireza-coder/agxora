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
  getCrmBridgeProvider,
  getGrowthCrmLink,
  listCrmFollowUps,
  nextAllowedCrmStatus,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  validateLeadAction,
  type CrmBridgeProvider,
} from "@/features/agents/crm";
import type { CrmCustomerDraft } from "@/app/lib/crm/directory";

function createUpdateFailCrmBridge(
  base: CrmBridgeProvider,
  message = "crm_status_update_failed",
): CrmBridgeProvider {
  return {
    available: true,
    listCustomers: (organizationId) => base.listCustomers(organizationId),
    getCustomer: (customerId) => base.getCustomer(customerId),
    createCustomer: (organizationId, draft) =>
      base.createCustomer(organizationId, draft),
    async updateCustomer() {
      throw new Error(message);
    },
    listContacts: (customerId) => base.listContacts(customerId),
    createContact: (organizationId, customerId, draft) =>
      base.createContact(organizationId, customerId, draft),
    createNote: (organizationId, customerId, draft) =>
      base.createNote(organizationId, customerId, draft),
    listNotes: (customerId) => base.listNotes(customerId),
  };
}

describe("Phase 51 growth CRM lead status advancement", () => {
  const organizationId = "org_phase51_test";

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

  it("advances lead → prospect through AgentApproval", async () => {
    const { profile, campaign } = await seedLinkedProfile("Lead To Prospect");
    const link = getGrowthCrmLink(organizationId, profile.id)!;
    const liveBefore = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(liveBefore?.status).toBe("lead");

    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "prospect",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(result.execution.approvalId).toBeTruthy();
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("lead"); // no mutation before approval

    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("COMPLETED");
    const after = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(after?.status).toBe("prospect");

    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.crmStatus).toBe("prospect");
    expect(item?.recommendedAction).toBe("ADVANCE_CRM_STATUS");
    expect(item?.targetCrmStatus).toBe("active");
  });

  it("advances prospect → active", async () => {
    const { profile, campaign } = await seedLinkedProfile("Prospect To Active");
    const first = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, first.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    const second = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, second.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    const link = getGrowthCrmLink(organizationId, profile.id)!;
    const customer = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(customer?.status).toBe("active");

    const next = evaluateCrmLeadNextAction({
      link,
      openFollowUps: listCrmFollowUps(organizationId, { linkId: link.id }),
      crmStatus: "active",
    });
    expect(next.code).not.toBe("advance_crm_status");
  });

  it("rejects invalid / arbitrary status jumps", async () => {
    const { profile } = await seedLinkedProfile("Invalid Jump");
    const jump = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      targetCrmStatus: "active",
    });
    expect(jump.ok).toBe(false);
    expect(jump.code).toBe("invalid_transition");

    const vip = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      targetCrmStatus: "vip",
    });
    expect(vip.ok).toBe(false);

    expect(nextAllowedCrmStatus("lead")).toBe("prospect");
    expect(nextAllowedCrmStatus("active")).toBeUndefined();
  });

  it("fails when CRM link is missing", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "No Link Co" },
    });
    const profile = growthService.getProfile(organizationId)!;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
    });
    expect(result.execution.status).toBe("INVALID");
    expect(result.execution.message).toMatch(/crm_link/);
  });

  it("blocks when CRM is unavailable", async () => {
    const { profile, campaign } = await seedLinkedProfile("Unavailable CRM");
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
    });
    // validation fails before enqueue when unavailable during live read
    expect(["INVALID", "WAITING_FOR_APPROVAL", "BLOCKED"]).toContain(
      result.execution.status,
    );
    if (result.execution.status === "WAITING_FOR_APPROVAL") {
      await approvePending();
      const job = operationsService.get(organizationId, result.execution.jobId!);
      expect(job?.status).toBe("BLOCKED");
    } else {
      expect(result.execution.status).toBe("INVALID");
      expect(result.execution.message).toMatch(/unavailable|crm_/);
    }
  });

  it("fails when CRM mutation throws", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { profile, campaign } = await seedLinkedProfile("Mutation Fail");
    setCrmBridgeProvider(createUpdateFailCrmBridge(memory));
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    await approvePending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("FAILED");
  });

  it("blocks on approval rejection without mutating status", async () => {
    const { profile, campaign } = await seedLinkedProfile("Reject Advance");
    const link = getGrowthCrmLink(organizationId, profile.id)!;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    await rejectPending();
    const job = operationsService.get(organizationId, result.execution.jobId!);
    expect(job?.status).toBe("BLOCKED");
    const customer = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(customer?.status).toBe("lead");
  });

  it("requires approval before mutation", async () => {
    const { profile, campaign } = await seedLinkedProfile("Approval Gate");
    const link = getGrowthCrmLink(organizationId, profile.id)!;
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    const mid = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(mid?.status).toBe("lead");
    await approvePending();
    const after = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(after?.status).toBe("prospect");
  });

  it("re-reads live status and rejects stale concurrent advance", async () => {
    const { profile, campaign } = await seedLinkedProfile("Stale Concurrent");
    const link = getGrowthCrmLink(organizationId, profile.id)!;
    const bridge = getCrmBridgeProvider();
    const customer = await bridge.getCustomer(link.customerId);
    expect(customer).toBeTruthy();
    const draft: CrmCustomerDraft = {
      companyName: customer!.companyName,
      contactName: customer!.contactName,
      email: customer!.email,
      phone: customer!.phone,
      website: customer!.website,
      industry: customer!.industry,
      country: customer!.country,
      city: customer!.city,
      address: customer!.address,
      taxNumber: customer!.taxNumber,
      status: "prospect",
      owner: customer!.owner,
      tags: "",
    };
    // Enqueue advance for lead→prospect while status already changed externally
    await bridge.updateCustomer(organizationId, customer!.id, draft);
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "prospect",
    });
    // Live read sees prospect; requested prospect is not the next allowed (active)
    expect(result.execution.status).toBe("INVALID");
    expect(result.execution.message).toMatch(/not_allowed|no_allowed|transition/);
  });

  it("does not recommend endless create-follow-up when advance is correct", async () => {
    const { profile } = await seedLinkedProfile("No Endless Create");
    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.recommendedAction).toBe("ADVANCE_CRM_STATUS");
    expect(item?.recommendedAction).not.toBe("CREATE_FOLLOW_UP");
    expect(item?.crmStatus).toBe("lead");
    expect(item?.targetCrmStatus).toBe("prospect");
  });

  it("isolates organizations and profiles", async () => {
    const a = await seedLinkedProfile("Org A Co");
    const otherOrg = "org_phase51_other";
    growthService.saveProfile({
      organizationId: otherOrg,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Org B Co",
        contactInformation: { email: "b@example.com" },
      },
    });
    const otherCampaign = await growthService.planCampaign(otherOrg);
    await growthService.requestCrmSync(otherOrg, otherCampaign.id);
    const otherApproval = growthService
      .snapshot(otherOrg)
      .approvals.find((item) => item.state === "REQUIRES_APPROVAL");
    await growthService.resolveApproval({
      approvalId: otherApproval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });

    const result = await growthService.executeLeadAction(organizationId, {
      profileId: a.profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: a.campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    const otherQueue = await growthService.getLeadActionQueue(otherOrg);
    const otherItem = otherQueue.items.find(
      (item) => item.companyName === "Org B Co",
    );
    expect(otherItem?.crmStatus).toBe("lead");
  });

  it("does not double-mutate when advance completes once", async () => {
    const { profile, campaign } = await seedLinkedProfile("No Duplicate");
    const link = getGrowthCrmLink(organizationId, profile.id)!;
    const first = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, first.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    const mid = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(mid?.status).toBe("prospect");

    // Second identical target is invalid now
    const second = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "ADVANCE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "prospect",
    });
    expect(second.execution.status).toBe("INVALID");
    const after = await getCrmBridgeProvider().getCustomer(link.customerId);
    expect(after?.status).toBe("prospect");
  });

  it("keeps Agent OS persistence at version 7", () => {
    const normalized = normalizeState({
      version: 6,
      growthCrmLinks: [],
      campaignCrmSyncs: [],
    });
    expect(normalized?.version).toBe(7);
  });

  it("exposes ADVANCE_CRM_STATUS on the lead actions API", async () => {
    registerLocalDataHandlers();
    const { profile, campaign } = await seedLinkedProfile("Api Advance");
    const response = await localDataProvider.request({
      method: "POST",
      path: `/agents/growth/crm/leads/${encodeURIComponent(profile.id)}/actions`,
      body: {
        organizationId,
        action: "ADVANCE_CRM_STATUS",
        campaignId: campaign.id,
        targetCrmStatus: "prospect",
      },
    });
    expect(response.status).toBe(201);
    const body = response.data as {
      execution: { status: string; approvalId?: string };
    };
    expect(body.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(body.execution.approvalId).toBeTruthy();
  });
});
