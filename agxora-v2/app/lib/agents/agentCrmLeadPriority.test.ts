import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import { agentsStore } from "@/features/agents/store";
import { growthService } from "@/features/agents/growth/service";
import { createGrowthProfile } from "@/features/agents/growth/profile";
import { normalizeState } from "@/features/agents/repositories";
import {
  buildLeadActionQueue,
  createMemoryCrmBridge,
  evaluateLeadPriority,
  listCrmFollowUps,
  resetCrmBridgeProvider,
  setCrmBridgeProvider,
  type GrowthCrmFollowUp,
  type GrowthCrmLink,
} from "@/features/agents/crm";

function baseLink(overrides?: Partial<GrowthCrmLink>): GrowthCrmLink {
  return {
    id: "link_1",
    organizationId: "org_phase49_test",
    profileId: "profile_1",
    customerId: "cust_1",
    href: "/dashboard/crm/cust_1",
    companyName: "Acme Growth",
    outcome: "linked",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    lastSyncedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseFollowUp(overrides?: Partial<GrowthCrmFollowUp>): GrowthCrmFollowUp {
  return {
    id: "cfu_1",
    organizationId: "org_phase49_test",
    profileId: "profile_1",
    linkId: "link_1",
    customerId: "cust_1",
    kind: "call",
    title: "Call lead",
    summary: "Follow up",
    status: "pending",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Phase 49 growth CRM lead prioritization & action queue", () => {
  const organizationId = "org_phase49_test";
  const otherOrg = "org_phase49_other";
  const today = "2026-08-20";

  beforeEach(() => {
    agentsStore.reset();
    setCrmBridgeProvider(createMemoryCrmBridge());
  });

  afterEach(() => {
    resetCrmBridgeProvider();
  });

  async function approvePending(org = organizationId) {
    const approval = growthService
      .snapshot(org)
      .approvals.find((item) => item.state === "REQUIRES_APPROVAL");
    expect(approval).toBeTruthy();
    await growthService.resolveApproval({
      approvalId: approval!.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    return approval!;
  }

  async function seedLinkedLead(companyName: string, dueAt?: string) {
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
    return { campaign, followUp: listCrmFollowUps(organizationId)[0]! };
  }

  it("is deterministic for identical input state", () => {
    const input = {
      link: baseLink(),
      openFollowUps: [baseFollowUp({ dueAt: "2026-08-10T00:00:00.000Z" })],
      today,
    };
    expect(evaluateLeadPriority(input)).toEqual(evaluateLeadPriority(input));
  });

  it("marks overdue follow-ups CRITICAL with COMPLETE_OVERDUE_FOLLOW_UP", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [baseFollowUp({ dueAt: "2026-08-01T00:00:00.000Z" })],
      today,
    });
    expect(result.priority).toBe("CRITICAL");
    expect(result.score).toBe(100);
    expect(result.reasons).toContain("overdue_follow_up");
    expect(result.recommendedAction).toBe("COMPLETE_OVERDUE_FOLLOW_UP");
  });

  it("maps failed follow-ups to HIGH + RETRY_FAILED_FOLLOW_UP", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [
        baseFollowUp({
          status: "failed",
          dueAt: "2026-08-25T00:00:00.000Z",
          outcome: "created",
          result: {
            available: true,
            success: true,
            outcome: "created",
            message: "historical create",
            duplicated: false,
          },
        }),
      ],
      today,
    });
    expect(result.priority).toBe("HIGH");
    expect(result.recommendedAction).toBe("RETRY_FAILED_FOLLOW_UP");
    expect(result.reasons).toContain("failed_follow_up");
  });

  it("maps blocked follow-ups to HIGH + REVIEW_BLOCKED_FOLLOW_UP", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [
        baseFollowUp({ status: "blocked", dueAt: "2026-08-25T00:00:00.000Z" }),
      ],
      today,
    });
    expect(result.priority).toBe("HIGH");
    expect(result.recommendedAction).toBe("REVIEW_BLOCKED_FOLLOW_UP");
    expect(result.reasons).toContain("blocked_follow_up");
  });

  it("elevates pending due-soon follow-ups to HIGH", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [
        baseFollowUp({ status: "pending", dueAt: "2026-08-22T00:00:00.000Z" }),
      ],
      today,
    });
    expect(result.priority).toBe("HIGH");
    expect(result.reasons).toContain("pending_due_soon");
    expect(result.recommendedAction).toBe("COMPLETE_PENDING_FOLLOW_UP");
  });

  it("keeps non-urgent pending follow-ups at MEDIUM", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [
        baseFollowUp({ status: "pending", dueAt: "2026-09-15T00:00:00.000Z" }),
      ],
      today,
    });
    expect(result.priority).toBe("MEDIUM");
    expect(result.recommendedAction).toBe("COMPLETE_PENDING_FOLLOW_UP");
  });

  it("recommends CREATE_FOLLOW_UP when linked with no open follow-ups", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [],
      completedFollowUps: [],
      today,
    });
    expect(result.priority).toBe("MEDIUM");
    expect(result.recommendedAction).toBe("CREATE_FOLLOW_UP");
    expect(result.reasons).toContain("no_follow_up_after_link");
  });

  it("lowers priority after completed follow-ups (no false CRITICAL)", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [],
      completedFollowUps: [
        baseFollowUp({
          status: "completed",
          dueAt: "2026-08-01T00:00:00.000Z",
          completedAt: "2026-08-19T00:00:00.000Z",
        }),
      ],
      today,
    });
    expect(result.priority).toBe("LOW");
    expect(result.reasons).toContain("recently_completed");
    expect(result.reasons).not.toContain("overdue_follow_up");
    expect(result.recommendedAction).toBe("CREATE_FOLLOW_UP");
  });

  it("handles missing CRM link with REVIEW_CRM_LINK", () => {
    const result = evaluateLeadPriority({
      link: null,
      openFollowUps: [],
      today,
    });
    expect(result.priority).toBe("LOW");
    expect(result.reasons).toEqual(["missing_crm_link"]);
    expect(result.recommendedAction).toBe("REVIEW_CRM_LINK");
  });

  it("orders equal-priority leads stably by due date then company", () => {
    agentsStore.upsertGrowthCrmLink(
      baseLink({
        id: "link_b",
        profileId: "profile_b",
        customerId: "cust_b",
        companyName: "Beta Co",
        href: "/dashboard/crm/cust_b",
      }),
    );
    agentsStore.upsertGrowthCrmLink(
      baseLink({
        id: "link_a",
        profileId: "profile_a",
        customerId: "cust_a",
        companyName: "Alpha Co",
        href: "/dashboard/crm/cust_a",
      }),
    );
    agentsStore.upsertGrowthCrmFollowUp(
      baseFollowUp({
        id: "cfu_b",
        linkId: "link_b",
        profileId: "profile_b",
        customerId: "cust_b",
        dueAt: "2026-09-10T00:00:00.000Z",
      }),
    );
    agentsStore.upsertGrowthCrmFollowUp(
      baseFollowUp({
        id: "cfu_a",
        linkId: "link_a",
        profileId: "profile_a",
        customerId: "cust_a",
        dueAt: "2026-09-05T00:00:00.000Z",
      }),
    );
    const first = buildLeadActionQueue(organizationId, { today });
    const second = buildLeadActionQueue(organizationId, { today });
    expect(first.items.map((item) => item.companyName)).toEqual(
      second.items.map((item) => item.companyName),
    );
    expect(first.items.map((item) => item.companyName)).toEqual([
      "Alpha Co",
      "Beta Co",
    ]);
    expect(first.items.every((item) => item.priority === "MEDIUM")).toBe(true);
  });

  it("never invents fake scoring fields or analytics", () => {
    const result = evaluateLeadPriority({
      link: baseLink(),
      openFollowUps: [baseFollowUp({ dueAt: "2026-09-01T00:00:00.000Z" })],
      today,
    });
    expect(result).not.toHaveProperty("conversionProbability");
    expect(result).not.toHaveProperty("revenue");
    expect(result).not.toHaveProperty("lifetimeValue");
    expect(result).not.toHaveProperty("aiConfidence");
    expect(typeof result.score).toBe("number");
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it("queue GET is read-only and does not mutate Agent OS follow-ups", async () => {
    registerLocalDataHandlers();
    await seedLinkedLead("Readonly Queue Co", "2026-08-10");
    const before = agentsStore.getSnapshot().crmFollowUps.length;
    const response = await localDataProvider.request({
      method: "GET",
      path: `/agents/growth/crm/leads/priority?organizationId=${encodeURIComponent(organizationId)}`,
      body: { organizationId },
    });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    const body = response.data as {
      readOnly: boolean;
      queue: {
        items: readonly { companyName: string; priority: string }[];
      };
    };
    expect(body.readOnly).toBe(true);
    expect(body.queue.items.some((item) => item.companyName === "Readonly Queue Co")).toBe(
      true,
    );
    expect(agentsStore.getSnapshot().crmFollowUps.length).toBe(before);
  });

  it("isolates queue items by organization", async () => {
    await seedLinkedLead("Org A Lead", "2026-08-10");
    growthService.saveProfile({
      organizationId: otherOrg,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Org B Lead",
        services: ["sales"],
        contactInformation: { email: "org.b@example.com" },
      },
    });
    const campaignB = await growthService.planCampaign(otherOrg);
    await growthService.requestCrmSync(otherOrg, campaignB.id);
    await approvePending(otherOrg);

    const queueA = buildLeadActionQueue(organizationId, { today });
    const queueB = buildLeadActionQueue(otherOrg, { today });
    expect(queueA.items.every((item) => item.organizationId === organizationId)).toBe(
      true,
    );
    expect(queueB.items.every((item) => item.organizationId === otherOrg)).toBe(true);
    expect(queueA.items.some((item) => item.companyName === "Org B Lead")).toBe(false);
    expect(queueB.items.some((item) => item.companyName === "Org A Lead")).toBe(false);
  });

  it("keeps Agent OS persistence at version 7 (no new collections)", () => {
    const normalized = normalizeState({
      version: 6,
      growthCrmLinks: [],
      campaignCrmSyncs: [],
    });
    expect(normalized?.version).toBe(7);
    expect(Array.isArray(normalized?.crmFollowUps)).toBe(true);
  });

  it("sorts CRITICAL ahead of HIGH and MEDIUM/LOW", () => {
    agentsStore.upsertGrowthCrmLink(
      baseLink({
        id: "link_critical",
        profileId: "profile_critical",
        customerId: "cust_critical",
        companyName: "Critical Co",
        href: "/dashboard/crm/cust_critical",
      }),
    );
    agentsStore.upsertGrowthCrmLink(
      baseLink({
        id: "link_high",
        profileId: "profile_high",
        customerId: "cust_high",
        companyName: "High Co",
        href: "/dashboard/crm/cust_high",
      }),
    );
    agentsStore.upsertGrowthCrmFollowUp(
      baseFollowUp({
        id: "cfu_critical",
        profileId: "profile_critical",
        linkId: "link_critical",
        customerId: "cust_critical",
        dueAt: "2026-08-01T00:00:00.000Z",
      }),
    );
    agentsStore.upsertGrowthCrmFollowUp(
      baseFollowUp({
        id: "cfu_high",
        profileId: "profile_high",
        linkId: "link_high",
        customerId: "cust_high",
        status: "failed",
        dueAt: "2026-08-28T00:00:00.000Z",
      }),
    );
    agentsStore.upsertGrowthProfile(
      createGrowthProfile({
        organizationId,
        draft: { companyName: "Unlinked Co", services: ["ops"] },
      }),
    );

    const queue = buildLeadActionQueue(organizationId, { today });
    expect(queue.items[0]?.priority).toBe("CRITICAL");
    expect(queue.items.map((item) => item.priority)).toEqual([
      "CRITICAL",
      "HIGH",
      "LOW",
    ]);
  });
});
