import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import type { CrmCustomerDraft, CrmCustomerStatus } from "@/app/lib/crm/directory";
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
  resolveDispositionTarget,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  validateLeadAction,
  type CrmBridgeProvider,
} from "@/features/agents/crm";

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

describe("Phase 52 growth CRM status disposition", () => {
  const organizationId = "org_phase52_test";

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

  async function setCustomerStatus(
    customerId: string,
    status: CrmCustomerStatus,
  ) {
    const bridge = getCrmBridgeProvider();
    const customer = await bridge.getCustomer(customerId);
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
      status,
      owner: customer!.owner,
      tags: "",
    };
    await bridge.updateCustomer(organizationId, customerId, draft);
  }

  async function seedAtStatus(companyName: string, status: CrmCustomerStatus) {
    const seeded = await seedLinkedProfile(companyName);
    const link = getGrowthCrmLink(organizationId, seeded.profile.id)!;
    await setCustomerStatus(link.customerId, status);
    return { ...seeded, link };
  }

  it("allows active → vip through AgentApproval", async () => {
    const { profile, campaign, link } = await seedAtStatus("Active To Vip", "active");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "vip",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("active");
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("vip");
  });

  it("allows active → inactive", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Active To Inactive",
      "active",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "inactive",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("inactive");
  });

  it("allows inactive → archived", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Inactive To Archived",
      "inactive",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "archived",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("archived");
  });

  it("allows lead → inactive and prospect → inactive", async () => {
    const leadSeed = await seedAtStatus("Lead Dispose", "lead");
    const leadResult = await growthService.executeLeadAction(organizationId, {
      profileId: leadSeed.profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: leadSeed.campaign.id,
      targetCrmStatus: "inactive",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, leadResult.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
    const prospectSeed = await seedAtStatus("Prospect Dispose", "prospect");
    const prospectResult = await growthService.executeLeadAction(organizationId, {
      profileId: prospectSeed.profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: prospectSeed.campaign.id,
      targetCrmStatus: "inactive",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, prospectResult.execution.jobId!)
        ?.status,
    ).toBe("COMPLETED");
  });

  it("requires explicit target for active disposition", async () => {
    const { profile } = await seedAtStatus("Active Needs Target", "active");
    const missing = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
    });
    expect(missing.ok).toBe(false);
    expect(missing.code).toBe("explicit_target_required");

    expect(
      resolveDispositionTarget({ current: "active" }).ok,
    ).toBe(false);
  });

  it("rejects invalid transitions and skipped jumps", async () => {
    const { profile } = await seedAtStatus("Invalid Jump", "lead");
    const jump = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      targetCrmStatus: "archived",
    });
    expect(jump.ok).toBe(false);
    expect(jump.code).toBe("invalid_transition");

    const activeToArchived = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      targetCrmStatus: "active",
    });
    expect(activeToArchived.ok).toBe(false);

    const { profile: activeProfile } = await seedAtStatus(
      "Active Skip",
      "active",
    );
    const skip = await validateLeadAction({
      organizationId,
      profileId: activeProfile.id,
      action: "DISPOSE_CRM_STATUS",
      targetCrmStatus: "archived",
    });
    expect(skip.ok).toBe(false);
  });

  it("requires approval before mutation and blocks on rejection", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Reject Dispose",
      "active",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "vip",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("active");
    await rejectPending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("BLOCKED");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("active");
  });

  it("blocks when CRM is unavailable", async () => {
    const { profile, campaign } = await seedAtStatus("Unavailable Dispose", "active");
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "inactive",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("BLOCKED");
  });

  it("fails when CRM mutation throws", async () => {
    const memory = createMemoryCrmBridge();
    setCrmBridgeProvider(memory);
    const { profile, campaign } = await seedAtStatus("Mutation Fail Dispose", "active");
    setCrmBridgeProvider(createUpdateFailCrmBridge(memory));
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "vip",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("FAILED");
  });

  it("rejects stale concurrent disposition safely", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Stale Dispose",
      "active",
    );
    await setCustomerStatus(link.customerId, "inactive");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "vip",
    });
    expect(result.execution.status).toBe("INVALID");
  });

  it("recomputs queue after disposition and avoids endless create", async () => {
    const { profile, campaign } = await seedAtStatus("Queue Dispose", "active");
    const before = await growthService.getLeadActionQueue(organizationId);
    const beforeItem = before.items.find((row) => row.profileId === profile.id);
    expect(beforeItem?.recommendedAction).toBe("DISPOSE_CRM_STATUS");
    expect(beforeItem?.dispositionTargets).toEqual(["vip", "inactive"]);

    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "vip",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    const after = await growthService.getLeadActionQueue(organizationId);
    const afterItem = after.items.find((row) => row.profileId === profile.id);
    // vip → NO_ACTION and filtered from default queue (priority NONE)
    expect(afterItem).toBeUndefined();
    expect(
      evaluateCrmLeadNextAction({
        link: getGrowthCrmLink(organizationId, profile.id)!,
        openFollowUps: listCrmFollowUps(organizationId),
        crmStatus: "vip",
      }).code,
    ).toBe("none");
  });

  it("archived becomes NO_ACTION", async () => {
    const { profile, campaign } = await seedAtStatus("Archive Path", "inactive");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "DISPOSE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "archived",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    const queue = await growthService.getLeadActionQueue(organizationId);
    expect(queue.items.find((row) => row.profileId === profile.id)).toBeUndefined();
    expect(
      evaluateCrmLeadNextAction({
        link: getGrowthCrmLink(organizationId, profile.id)!,
        openFollowUps: [],
        crmStatus: "archived",
      }).code,
    ).toBe("none");
  });

  it("isolates organizations", async () => {
    const a = await seedAtStatus("Org A Dispose", "active");
    const otherOrg = "org_phase52_other";
    growthService.saveProfile({
      organizationId: otherOrg,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Org B Dispose",
        contactInformation: { email: "b.dispose@example.com" },
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
      action: "DISPOSE_CRM_STATUS",
      campaignId: a.campaign.id,
      targetCrmStatus: "inactive",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    const otherQueue = await growthService.getLeadActionQueue(otherOrg);
    const otherItem = otherQueue.items.find(
      (item) => item.companyName === "Org B Dispose",
    );
    expect(otherItem?.crmStatus).toBe("lead");
  });

  it("keeps Agent OS persistence at version 7", () => {
    const normalized = normalizeState({
      version: 6,
      growthCrmLinks: [],
      campaignCrmSyncs: [],
    });
    expect(normalized?.version).toBe(7);
  });

  it("exposes DISPOSE_CRM_STATUS on the lead actions API", async () => {
    registerLocalDataHandlers();
    const { profile, campaign } = await seedAtStatus("Api Dispose", "active");
    const response = await localDataProvider.request({
      method: "POST",
      path: `/agents/growth/crm/leads/${encodeURIComponent(profile.id)}/actions`,
      body: {
        organizationId,
        action: "DISPOSE_CRM_STATUS",
        campaignId: campaign.id,
        targetCrmStatus: "vip",
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
