import { beforeEach, describe, expect, it } from "vitest";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { growthService } from "@/features/agents/growth/service";
import { normalizeState } from "@/features/agents/repositories";
import { getWebsitePublisher, setWebsitePublisher } from "@/features/agents/website/publisher";

describe("Phase 43 AI growth agent foundation", () => {
  const organizationId = "org_phase43_test";

  beforeEach(() => {
    agentsStore.reset();
    setWebsitePublisher(getWebsitePublisher());
  });

  it("generates a website from an incomplete profile", async () => {
    const profile = growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "" },
    });
    expect(profile.companyName).toBe("");

    const project = await growthService.generateWebsite(organizationId);
    const kinds = project.pages.map((page) => page.kind);
    expect(kinds).toEqual(expect.arrayContaining(["home", "about", "services", "contact"]));
    expect(project.pages.some((page) => page.sections.length > 0)).toBe(true);
    expect(project.status).toBe("PREVIEW");
    expect(project.status).not.toBe("PUBLISHED");
  });

  it("keeps website preview lifecycle off PUBLISHED without a publisher", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Northwind Cleaning",
        industry: "cleaning",
        services: ["office cleaning", "deep clean"],
        targetAudience: "property managers",
      },
    });
    const project = await growthService.generateWebsite(organizationId);
    expect(project.status).toBe("PREVIEW");

    const attempt = await growthService.requestWebsitePublish(organizationId);
    expect(attempt.task.status).toBe("blocked");
    expect(attempt.project.status).not.toBe("PUBLISHED");

    const approval = agentOsService.listApprovals(organizationId)[0];
    expect(approval?.state).toBe("REQUIRES_APPROVAL");

    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });

    const after = growthService.listWebsiteProjects(organizationId)[0];
    expect(after.publishResult?.available).toBe(false);
    expect(after.publishResult?.published).toBe(false);
    expect(after.status).not.toBe("PUBLISHED");
  });

  it("rejects website publishing and never publishes", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Rejected Co", services: ["consulting"] },
    });
    await growthService.generateWebsite(organizationId);
    await growthService.requestWebsitePublish(organizationId);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "REJECTED",
      decidedBy: "tester",
    });
    const project = growthService.listWebsiteProjects(organizationId)[0];
    expect(project.approvalState).toBe("REJECTED");
    expect(project.status).toBe("NEEDS_CHANGES");
    expect(project.status).not.toBe("PUBLISHED");
    await expect(growthService.requestWebsitePublish(organizationId)).rejects.toThrow(
      /cannot be published/i,
    );
  });

  it("generates social strategy, calendar, and content", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Harbor Fitness",
        industry: "fitness",
        services: ["personal training", "group classes"],
        preferredPlatforms: ["instagram", "tiktok"],
      },
    });
    const strategy = await growthService.generateSocialStrategy(organizationId);
    expect(strategy.pillars.length).toBeGreaterThan(0);
    const calendar = await growthService.generateCalendar(organizationId);
    expect(calendar.entries.length).toBeGreaterThan(0);
    expect(calendar.entries.every((entry) => entry.status !== "PUBLISHED")).toBe(true);
    const content = await growthService.generateContent(organizationId);
    expect(content.length).toBeGreaterThan(0);
    expect(content.some((item) => item.contentType === "POST")).toBe(true);
    expect(content.some((item) => item.contentType === "STORY")).toBe(true);
    expect(growthService.listAccounts(organizationId).every((item) => item.state === "DISCONNECTED")).toBe(
      true,
    );
  });

  it("requires approval before social publish and stays unpublished", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Social Co", services: ["brand"] },
    });
    await growthService.generateContent(organizationId);
    const attempt = await growthService.requestSocialPublish(organizationId);
    expect(attempt.task.status).toBe("blocked");
    expect(attempt.content.status).not.toBe("PUBLISHED");
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const content = growthService.listContent(organizationId)[0];
    expect(content.publishResult?.available).toBe(false);
    expect(content.status).not.toBe("PUBLISHED");
  });

  it("blocks rejected social content from publishing", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Blocked Social" },
    });
    await growthService.generateContent(organizationId);
    await growthService.requestSocialPublish(organizationId);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "REJECTED",
      decidedBy: "tester",
    });
    const content = growthService.listContent(organizationId)[0];
    expect(content.status).toBe("BLOCKED");
    await expect(growthService.requestSocialPublish(organizationId, content.id)).rejects.toThrow(
      /cannot be published/i,
    );
  });

  it("exposes growth handlers through local dispatch", async () => {
    registerLocalDataHandlers();
    const created = await localDataProvider.request<{ readonly id: string }>({
      method: "POST",
      path: "/agents/growth/business-profile",
      body: {
        organizationId,
        companyName: "API Cleaning",
        services: ["windows"],
      },
    });
    expect(created.ok).toBe(true);
    const generated = await localDataProvider.request<{
      readonly pages: readonly { kind: string }[];
      readonly status: string;
    }>({
      method: "POST",
      path: "/agents/growth/website/generate",
      body: { organizationId },
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(generated.data.pages.map((page) => page.kind)).toEqual(
      expect.arrayContaining(["home", "about", "services", "contact"]),
    );
    expect(generated.data.status).toBe("PREVIEW");
  });

  it("normalizes version-2 persistence into the current Agent OS version", () => {
    const normalized = normalizeState({
      version: 2,
      runtimes: [],
      tasks: [],
      executions: [],
      approvals: [],
      stepExecutions: [],
      memories: [],
      knowledge: [],
      plans: [],
      traces: [],
      messages: [],
      contexts: [],
      settings: [],
      toolInvocationCount24h: 4,
    });
    expect(normalized?.version).toBe(4);
    expect(normalized?.growthProfiles).toEqual([]);
    expect(normalized?.websiteProjects).toEqual([]);
    expect(normalized?.socialAccounts).toEqual([]);
    expect(normalized?.socialContent).toEqual([]);
    expect(normalized?.campaigns).toEqual([]);
    expect(normalized?.growthInsights).toEqual([]);
    expect(normalized?.toolInvocationCount24h).toBe(4);
  });
});
