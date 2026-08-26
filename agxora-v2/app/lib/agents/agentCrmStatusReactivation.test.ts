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
  resolveReactivateTarget,
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

describe("Phase 53 growth CRM status reactivation", () => {
  const organizationId = "org_phase53_test";

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

  it("allows vip → active through AgentApproval", async () => {
    const { profile, campaign, link } = await seedAtStatus("Vip To Active", "vip");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("vip");
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("active");
  });

  it("allows vip → inactive", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Vip To Inactive",
      "vip",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
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

  it("allows inactive → active", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Inactive To Active",
      "inactive",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("active");
  });

  it("allows archived → inactive (unarchive)", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Archived Unarchive",
      "archived",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
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

  it("requires explicit target for vip reactivation", async () => {
    const { profile } = await seedAtStatus("Vip Needs Target", "vip");
    const missing = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
    });
    expect(missing.ok).toBe(false);
    expect(missing.code).toBe("explicit_target_required");
    expect(resolveReactivateTarget({ current: "vip" }).ok).toBe(false);
  });

  it("rejects invalid transitions including archived → active skip", async () => {
    const { profile } = await seedAtStatus("Invalid Reactivate", "archived");
    const skip = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      targetCrmStatus: "active",
    });
    expect(skip.ok).toBe(false);
    expect(skip.code).toBe("invalid_transition");

    const vipToArchived = await validateLeadAction({
      organizationId,
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      targetCrmStatus: "vip",
    });
    expect(vipToArchived.ok).toBe(false);

    const { profile: inactiveProfile } = await seedAtStatus(
      "Inactive No Prospect",
      "inactive",
    );
    const reverse = await validateLeadAction({
      organizationId,
      profileId: inactiveProfile.id,
      action: "REACTIVATE_CRM_STATUS",
      targetCrmStatus: "prospect",
    });
    expect(reverse.ok).toBe(false);
  });

  it("requires approval before mutation and blocks on rejection", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Reject Reactivate",
      "vip",
    );
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
    });
    expect(result.execution.status).toBe("WAITING_FOR_APPROVAL");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("vip");
    await rejectPending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("BLOCKED");
    expect(
      (await getCrmBridgeProvider().getCustomer(link.customerId))?.status,
    ).toBe("vip");
  });

  it("blocks when CRM is unavailable", async () => {
    const { profile, campaign } = await seedAtStatus(
      "Unavailable Reactivate",
      "vip",
    );
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
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
    const { profile, campaign } = await seedAtStatus(
      "Mutation Fail Reactivate",
      "vip",
    );
    setCrmBridgeProvider(createUpdateFailCrmBridge(memory));
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("FAILED");
  });

  it("rejects stale concurrent reactivation safely", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "Stale Reactivate",
      "vip",
    );
    await setCustomerStatus(link.customerId, "active");
    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "inactive",
    });
    expect(result.execution.status).toBe("INVALID");
  });

  it("recomputs queue after reactivation without endless create", async () => {
    const { profile, campaign } = await seedAtStatus("Queue Reactivate", "vip");
    const before = await growthService.getLeadActionQueue(organizationId);
    const beforeItem = before.items.find((row) => row.profileId === profile.id);
    expect(beforeItem?.recommendedAction).toBe("REACTIVATE_CRM_STATUS");
    expect(beforeItem?.reactivationTargets).toEqual(["active", "inactive"]);

    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    const after = await growthService.getLeadActionQueue(organizationId);
    const afterItem = after.items.find((row) => row.profileId === profile.id);
    expect(afterItem?.crmStatus).toBe("active");
    expect(afterItem?.recommendedAction).toBe("DISPOSE_CRM_STATUS");
    expect(afterItem?.recommendedAction).not.toBe("CREATE_FOLLOW_UP");
  });

  it("archived recommends unarchive only (not active)", async () => {
    const { profile } = await seedAtStatus("Archive Queue", "archived");
    const queue = await growthService.getLeadActionQueue(organizationId);
    const item = queue.items.find((row) => row.profileId === profile.id);
    expect(item?.recommendedAction).toBe("REACTIVATE_CRM_STATUS");
    expect(item?.targetCrmStatus).toBe("inactive");
    expect(item?.reactivationTargets).toEqual(["inactive"]);
    expect(
      evaluateCrmLeadNextAction({
        link: getGrowthCrmLink(organizationId, profile.id)!,
        openFollowUps: listCrmFollowUps(organizationId),
        crmStatus: "archived",
      }).code,
    ).toBe("reactivate_crm_status");
  });

  it("isolates organizations", async () => {
    const a = await seedAtStatus("Org A Reactivate", "vip");
    const otherOrg = "org_phase53_other";
    growthService.saveProfile({
      organizationId: otherOrg,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Org B Reactivate",
        contactInformation: { email: "b.reactivate@example.com" },
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
      action: "REACTIVATE_CRM_STATUS",
      campaignId: a.campaign.id,
      targetCrmStatus: "active",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");

    const otherQueue = await growthService.getLeadActionQueue(otherOrg);
    const otherItem = otherQueue.items.find(
      (item) => item.companyName === "Org B Reactivate",
    );
    expect(otherItem?.crmStatus).toBe("lead");
  });

  it("does not duplicate status mutation when already completed", async () => {
    const { profile, campaign, link } = await seedAtStatus(
      "No Duplicate Reactivate",
      "vip",
    );
    const bridge = getCrmBridgeProvider();
    let updateCount = 0;
    const counting: CrmBridgeProvider = {
      ...bridge,
      async updateCustomer(organizationIdArg, customerId, draft) {
        updateCount += 1;
        return bridge.updateCustomer(organizationIdArg, customerId, draft);
      },
    };
    setCrmBridgeProvider(counting);

    const result = await growthService.executeLeadAction(organizationId, {
      profileId: profile.id,
      action: "REACTIVATE_CRM_STATUS",
      campaignId: campaign.id,
      targetCrmStatus: "active",
    });
    await approvePending();
    expect(
      operationsService.get(organizationId, result.execution.jobId!)?.status,
    ).toBe("COMPLETED");
    expect(updateCount).toBe(1);
    expect((await counting.getCustomer(link.customerId))?.status).toBe("active");
  });

  it("keeps Agent OS persistence at version 7", () => {
    const normalized = normalizeState({
      version: 6,
      growthCrmLinks: [],
      campaignCrmSyncs: [],
    });
    expect(normalized?.version).toBe(7);
  });

  it("exposes REACTIVATE_CRM_STATUS on the lead actions API", async () => {
    registerLocalDataHandlers();
    const { profile, campaign } = await seedAtStatus("Api Reactivate", "vip");
    const response = await localDataProvider.request({
      method: "POST",
      path: `/agents/growth/crm/leads/${encodeURIComponent(profile.id)}/actions`,
      body: {
        organizationId,
        action: "REACTIVATE_CRM_STATUS",
        campaignId: campaign.id,
        targetCrmStatus: "active",
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
