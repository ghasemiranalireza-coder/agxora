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
  syncGrowthProfileToCrm,
  type CrmBridgeProvider,
} from "@/features/agents/crm";
import { getWebsitePublisher, setWebsitePublisher } from "@/features/agents/website/publisher";

function createFailingCrmBridge(
  message = "crm_validation_failed",
): CrmBridgeProvider {
  return {
    available: true,
    async listCustomers() {
      return [];
    },
    async getCustomer() {
      return null;
    },
    async createCustomer() {
      throw new Error(message);
    },
    async listContacts() {
      return [];
    },
    async createContact() {
      throw new Error(message);
    },
    async createNote() {
      throw new Error(message);
    },
  };
}

/** Succeeds for createCustomer/contact, but fails createNote after N successful notes. */
function createNoteFailAfterCrmBridge(
  base: CrmBridgeProvider,
  allowedNotes: number,
  message = "crm_mutation_failed",
): CrmBridgeProvider {
  let notes = 0;
  return {
    available: true,
    listCustomers: (organizationId) => base.listCustomers(organizationId),
    getCustomer: (customerId) => base.getCustomer(customerId),
    createCustomer: (organizationId, draft) =>
      base.createCustomer(organizationId, draft),
    listContacts: (customerId) => base.listContacts(customerId),
    createContact: (organizationId, customerId, draft) =>
      base.createContact(organizationId, customerId, draft),
    async createNote(organizationId, customerId, draft) {
      if (notes >= allowedNotes) {
        throw new Error(message);
      }
      notes += 1;
      return base.createNote(organizationId, customerId, draft);
    },
  };
}

describe("Phase 46 growth CRM bridge", () => {
  const organizationId = "org_phase46_test";

  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  async function seedCampaign(companyName: string, email?: string) {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName,
        services: ["consulting"],
        contactInformation: email
          ? { email, phone: "+1 555 0100" }
          : { email: `${companyName.toLowerCase().replace(/\s+/g, ".")}@example.com` },
      },
    });
    return growthService.planCampaign(organizationId);
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

  it("links an existing CRM customer/contact", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const existing = await provider.createCustomer(organizationId, {
      companyName: "Existing Co",
      contactName: "Existing Co",
      email: "existing.co@example.com",
      phone: "",
      website: "",
      industry: "",
      country: "",
      city: "",
      address: "",
      taxNumber: "",
      status: "lead",
      owner: "tester",
      tags: "",
    });
    await provider.createContact(organizationId, existing.id, {
      name: "Existing Co",
      role: "Primary",
      email: "existing.co@example.com",
      phone: "",
      mobile: "",
      notes: "",
    });

    const profile = growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Existing Co",
        services: ["ops"],
        contactInformation: { email: "existing.co@example.com" },
      },
    });
    const { result, link } = await syncGrowthProfileToCrm({
      organizationId,
      profile,
      attachNote: false,
    });
    expect(result.outcome).toBe("linked");
    expect(result.duplicated).toBe(true);
    expect(link?.customerId).toBe(existing.id);
    expect((await provider.listCustomers(organizationId)).length).toBe(1);
  });

  it("creates a new CRM customer/contact when none exists", async () => {
    const campaign = await seedCampaign("New Bridge Co", "new.bridge@example.com");
    const requested = await growthService.requestCrmSync(organizationId, campaign.id);
    expect(requested.job.status).toBe("WAITING_FOR_APPROVAL");
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("COMPLETED");
    const link = growthService.getCrmLink(organizationId);
    expect(link?.customerId).toBeTruthy();
    expect(link?.contactId).toBeTruthy();
    expect(link?.outcome === "created" || link?.outcome === "linked").toBe(true);
  });

  it("does not unnecessarily duplicate CRM records on repeated sync", async () => {
    const campaign = await seedCampaign("Idempotent Co", "idempotent@example.com");
    const first = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const link1 = growthService.getCrmLink(organizationId)!;
    const second = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const link2 = growthService.getCrmLink(organizationId)!;
    expect(link2.customerId).toBe(link1.customerId);
    expect(link2.outcome).toBe("already-linked");
    expect(second.job.id).not.toBe(first.job.id);
  });

  it("persists Growth↔CRM references in Agent OS state", async () => {
    const campaign = await seedCampaign("Persist Co", "persist@example.com");
    await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const snap = agentsStore.getSnapshot();
    expect(snap.version).toBe(6);
    expect(snap.growthCrmLinks.length).toBeGreaterThan(0);
    expect(snap.campaignCrmSyncs.length).toBeGreaterThan(0);
    expect(snap.growthCrmLinks[0]?.href).toMatch(/^\/dashboard\/crm\//);
  });

  it("completes the campaign CRM operation after a successful mutation", async () => {
    const campaign = await seedCampaign("Complete Co", "complete@example.com");
    const requested = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("COMPLETED");
    expect(job?.result?.success).toBe(true);
    expect(job?.result?.externalEffect).toBe(false);
    const sync = growthService.getCrmSync(organizationId, campaign.id);
    expect(sync?.status).toBe("completed");
    const updated = growthService.getCampaign(organizationId, campaign.id);
    expect(
      updated?.tasks.find((task) => task.code === "sync_crm_customer")?.status,
    ).toBe("completed");
  });

  it("blocks when CRM is unavailable", async () => {
    setCrmBridgeProvider(createUnavailableCrmBridge());
    const campaign = await seedCampaign("Blocked Co", "blocked@example.com");
    const requested = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).toBe("BLOCKED");
    expect(job?.blocker?.code).toBe("crm.unavailable");
    expect(job?.result?.success).toBe(false);
    const sync = growthService.getCrmSync(organizationId, campaign.id);
    expect(sync?.status).toBe("blocked");
    expect(sync?.outcome).toBe("unavailable");
  });

  it("does not complete when approval is rejected", async () => {
    const campaign = await seedCampaign("Reject Co", "reject@example.com");
    const requested = await growthService.requestCrmSync(organizationId, campaign.id);
    expect(requested.job.status).toBe("WAITING_FOR_APPROVAL");
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
    expect(job?.result?.status).toBe("rejected");
    expect(growthService.getCrmLink(organizationId)).toBeUndefined();
  });

  it("attaches campaign context through the CRM note mutation path", async () => {
    const provider = createMemoryCrmBridge();
    setCrmBridgeProvider(provider);
    const campaign = await seedCampaign("Note Co", "note.co@example.com");
    await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const link = growthService.getCrmLink(organizationId)!;
    expect(link.noteId).toBeTruthy();
    const sync = growthService.getCrmSync(organizationId, campaign.id);
    expect(sync?.noteId).toBe(link.noteId);
    expect(
      growthService
        .getCampaign(organizationId, campaign.id)
        ?.tasks.find((task) => task.code === "attach_crm_note")?.status,
    ).toBe("completed");
  });

  it("keeps external website/social publishing blocked when unavailable", async () => {
    const previous = getWebsitePublisher();
    setWebsitePublisher({
      async publish() {
        return {
          available: false,
          status: "unavailable",
          published: false,
          reason: "publisher_unavailable",
        };
      },
    });
    try {
      const campaign = await seedCampaign("Publish Still Blocked", "publish@example.com");
      const job = operationsService.enqueue({
        organizationId,
        toolId: "campaign_execute",
        campaignId: campaign.id,
        title: "Execute campaign",
      });
      const started = await operationsService.start(organizationId, job.id);
      expect(started.status).toBe("WAITING_FOR_APPROVAL");
      await approvePending();
      const finished = operationsService.get(organizationId, job.id);
      expect(finished?.status).toBe("BLOCKED");
      expect(finished?.blocker?.code).toBe("publishing.unavailable");
    } finally {
      setWebsitePublisher(previous);
    }
  });

  it("normalizes older persistence versions into version 6", () => {
    for (const version of [1, 2, 3, 4, 5] as const) {
      const normalized = normalizeState({
        version,
        runtimes: [],
        tasks: [],
      });
      expect(normalized?.version).toBe(6);
      expect(normalized?.growthCrmLinks).toEqual([]);
      expect(normalized?.campaignCrmSyncs).toEqual([]);
      expect(normalized?.executionJobs).toEqual([]);
    }
  });

  it("exposes CRM sync through local agent APIs", async () => {
    registerLocalDataHandlers();
    await seedCampaign("Api Co", "api.co@example.com");
    const syncResponse = await localDataProvider.request({
      method: "POST",
      path: "/agents/growth/crm/sync",
      body: { organizationId },
    });
    expect(syncResponse.ok).toBe(true);
    const approval = growthService
      .snapshot(organizationId)
      .approvals.find((item) => item.state === "REQUIRES_APPROVAL");
    await growthService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const linkResponse = await localDataProvider.request({
      method: "GET",
      path: "/agents/growth/crm/link",
      body: { organizationId },
    });
    expect(linkResponse.ok).toBe(true);
    const payload = linkResponse.data as {
      link: { customerId: string } | null;
    };
    expect(payload.link?.customerId).toBeTruthy();
  });

  it("does not complete Operations when CRM validation/provider fails", async () => {
    setCrmBridgeProvider(createFailingCrmBridge("crm_validation_failed"));
    const campaign = await seedCampaign("Validation Fail Co", "validation.fail@example.com");
    const requested = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).not.toBe("COMPLETED");
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.success).toBe(false);
    expect(job?.result?.status).toBe("failed");
    const sync = growthService.getCrmSync(organizationId, campaign.id);
    expect(sync?.status).toBe("failed");
    expect(sync?.outcome).toBe("error");
  });

  it("does not complete Operations when CRM mutation fails", async () => {
    setCrmBridgeProvider(
      createNoteFailAfterCrmBridge(createMemoryCrmBridge(), 0, "crm_mutation_failed"),
    );
    const campaign = await seedCampaign("Mutation Fail Co", "mutation.fail@example.com");
    const requested = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const job = operationsService.get(organizationId, requested.job.id);
    expect(job?.status).not.toBe("COMPLETED");
    expect(job?.status).toBe("FAILED");
    expect(job?.result?.success).toBe(false);
  });

  it("does not let a stale successful GrowthCrmLink override a later failed sync", async () => {
    const shared = createMemoryCrmBridge();
    setCrmBridgeProvider(createNoteFailAfterCrmBridge(shared, 1, "crm_note_failed"));
    const campaign = await seedCampaign("Stale Link Co", "stale.link@example.com");

    const first = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    expect(operationsService.get(organizationId, first.job.id)?.status).toBe("COMPLETED");
    const link = growthService.getCrmLink(organizationId);
    expect(link?.outcome === "created" || link?.outcome === "linked").toBe(true);

    const second = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const secondJob = operationsService.get(organizationId, second.job.id);
    expect(secondJob?.status).not.toBe("COMPLETED");
    expect(secondJob?.status).toBe("FAILED");
    expect(secondJob?.result?.success).toBe(false);
    const sync = growthService.getCrmSync(organizationId, campaign.id);
    expect(sync?.status).toBe("failed");
    expect(sync?.outcome).toBe("error");
    // Historical link may still exist, but must not force COMPLETED.
    expect(growthService.getCrmLink(organizationId)?.customerId).toBe(link?.customerId);
  });

  it("allows a later successful sync to complete after a previous failure", async () => {
    setCrmBridgeProvider(createFailingCrmBridge("crm_first_failure"));
    const campaign = await seedCampaign("Retry Success Co", "retry.success@example.com");
    const first = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    expect(operationsService.get(organizationId, first.job.id)?.status).toBe("FAILED");

    setCrmBridgeProvider(createMemoryCrmBridge());
    const second = await growthService.requestCrmSync(organizationId, campaign.id);
    await approvePending();
    const secondJob = operationsService.get(organizationId, second.job.id);
    expect(secondJob?.status).toBe("COMPLETED");
    expect(secondJob?.result?.success).toBe(true);
    expect(growthService.getCrmSync(organizationId, campaign.id)?.status).toBe("completed");
    expect(growthService.getCrmLink(organizationId)?.customerId).toBeTruthy();
  });
});
