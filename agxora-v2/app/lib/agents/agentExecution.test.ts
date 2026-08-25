import { beforeEach, describe, expect, it } from "vitest";
import { auditLogger } from "@/app/lib/backend/audit/logger";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import { agentOsService } from "@/features/agents/services";
import { agentsStore } from "@/features/agents/store";
import { growthService } from "@/features/agents/growth/service";
import { operationsService } from "@/features/agents/execution/service";
import { canRetryJob } from "@/features/agents/execution/jobs";
import { normalizeState } from "@/features/agents/repositories";

describe("Phase 45 growth execution operations center", () => {
  const organizationId = "org_phase45_test";

  beforeEach(() => {
    agentsStore.reset();
  });

  it("creates an execution job", () => {
    const job = operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
      title: "Plan campaign",
    });
    expect(job.id).toMatch(/^ejob_/);
    expect(job.status).toBe("QUEUED");
    expect(job.attempts).toEqual([]);
    expect(operationsService.get(organizationId, job.id)?.id).toBe(job.id);
  });

  it("orders the queue deterministically", () => {
    const first = operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
      title: "First",
      priority: "NORMAL",
    });
    const second = operationsService.enqueue({
      organizationId,
      toolId: "campaign_readiness",
      title: "Second",
      priority: "NORMAL",
    });
    const queue = operationsService.queue(organizationId);
    expect(queue.map((job) => job.id)).toEqual([first.id, second.id]);
    expect(first.queueSeq).toBeLessThan(second.queueSeq);
  });

  it("orders higher priority jobs first", () => {
    operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
      title: "Low",
      priority: "LOW",
    });
    operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
      title: "Urgent",
      priority: "URGENT",
    });
    operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
      title: "High",
      priority: "HIGH",
    });
    expect(operationsService.queue(organizationId).map((job) => job.priority)).toEqual([
      "URGENT",
      "HIGH",
      "LOW",
    ]);
  });

  it("waits for approval when the tool requires it", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Wait Co", services: ["ops"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    const job = operationsService.enqueue({
      organizationId,
      toolId: "campaign_execute",
      campaignId: campaign.id,
      title: "Publish campaign",
    });
    expect(job.requiresApproval).toBe(true);
    const started = await operationsService.start(organizationId, job.id);
    expect(started.status).toBe("WAITING_FOR_APPROVAL");
    expect(started.approvalId).toBeTruthy();
  });

  it("reuses existing AgentApproval", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Approval Co", services: ["legal"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    const attempt = await growthService.requestCampaignApproval(organizationId, campaign.id);
    expect(attempt.task.status).toBe("blocked");
    const approval = agentOsService.listApprovals(organizationId)[0];
    expect(approval?.state).toBe("REQUIRES_APPROVAL");
    const job = operationsService.list(organizationId).find((item) => item.toolId === "campaign_execute");
    expect(job?.approvalId).toBe(approval.id);
  });

  it("lets an approved job execute", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Approved Job", services: ["growth"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const job = operationsService.list(organizationId).find((item) => item.toolId === "campaign_execute")!;
    expect(job.status).not.toBe("WAITING_FOR_APPROVAL");
    expect(job.status === "BLOCKED" || job.status === "COMPLETED").toBe(true);
    expect(job.result).toBeDefined();
  });

  it("blocks execution after a rejected approval", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Rejected Job", services: ["research"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "REJECTED",
      decidedBy: "tester",
    });
    const job = operationsService.list(organizationId).find((item) => item.toolId === "campaign_execute")!;
    expect(job.status).toBe("BLOCKED");
    expect(job.result?.status).toBe("rejected");
    expect(job.result?.success).toBe(false);
    expect(canRetryJob(job)).toBe(false);
  });

  it("marks a successful internal operation completed", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Internal Co", services: ["bookkeeping"] },
    });
    const job = operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
      title: "Plan internally",
    });
    const completed = await operationsService.start(organizationId, job.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.result?.success).toBe(true);
    expect(completed.result?.externalEffect).toBe(true);
  });

  it("blocks when an external adapter is unavailable", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Unavailable Co", services: ["support"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const job = operationsService.list(organizationId).find((item) => item.toolId === "campaign_execute")!;
    expect(job.status).toBe("BLOCKED");
    expect(job.result?.status).toBe("unavailable");
  });

  it("never marks an unavailable adapter completed", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "No Fake Success", services: ["support"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const job = operationsService.list(organizationId).find((item) => item.toolId === "campaign_execute")!;
    expect(job.status).not.toBe("COMPLETED");
    expect(job.result?.success).toBe(false);
    expect(growthService.getCampaign(organizationId, campaign.id)?.status).not.toBe("COMPLETED");
  });

  it("sets externalEffect false when publishing is unavailable", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Effect Co", services: ["ads"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const job = operationsService.list(organizationId).find((item) => item.toolId === "campaign_execute")!;
    expect(job.result?.externalEffect).toBe(false);
  });

  it("retries retryable failures and preserves attempt history", async () => {
    const job = operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
      title: "Retryable plan",
    });
    const failed = await operationsService.start(organizationId, job.id);
    expect(failed.status).toBe("FAILED");
    expect(canRetryJob(failed)).toBe(true);
    expect(failed.attempts.length).toBe(1);
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Retry Co", services: ["tax"] },
    });
    const retried = await operationsService.retry(organizationId, failed.id);
    expect(retried.status).toBe("COMPLETED");
    expect(retried.attempts.length).toBe(2);
    expect(
      agentsStore.getSnapshot().executionAttempts.filter((item) => item.executionJobId === job.id)
        .length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("does not let retry bypass approval", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "No Bypass", services: ["legal"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    const job = operationsService.enqueue({
      organizationId,
      toolId: "campaign_execute",
      campaignId: campaign.id,
    });
    const waiting = await operationsService.start(organizationId, job.id);
    expect(waiting.status).toBe("WAITING_FOR_APPROVAL");
    await expect(operationsService.retry(organizationId, waiting.id)).rejects.toThrow(/not retryable/i);
    expect(operationsService.get(organizationId, waiting.id)?.status).toBe("WAITING_FOR_APPROVAL");
  });

  it("does not retry non-retryable blockers", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Blocked Retry", services: ["ops"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const job = operationsService.list(organizationId).find((item) => item.toolId === "campaign_execute")!;
    expect(job.status).toBe("BLOCKED");
    expect(canRetryJob(job)).toBe(false);
    await expect(operationsService.retry(organizationId, job.id)).rejects.toThrow(/not retryable/i);
  });

  it("records execution events", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Events Co", services: ["content"] },
    });
    const job = operationsService.enqueue({
      organizationId,
      toolId: "campaign_plan",
    });
    await operationsService.start(organizationId, job.id);
    const types = operationsService
      .events(organizationId)
      .filter((event) => event.executionJobId === job.id)
      .map((event) => event.type);
    expect(types).toEqual(expect.arrayContaining(["QUEUED", "STARTED", "COMPLETED"]));
  });

  it("writes execution transitions to the existing audit log", async () => {
    const job = operationsService.enqueue({
      organizationId,
      toolId: "campaign_readiness",
      title: "Audit job",
    });
    const actions = auditLogger.list()
      .filter((event) => event.resourceId === job.id)
      .map((event) => event.action);
    expect(actions).toContain("agent.operations.job_created");
  });

  it("reflects blocked execution on the campaign", async () => {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: { companyName: "Campaign Block", services: ["web"] },
    });
    const campaign = await growthService.planCampaign(organizationId);
    await growthService.requestCampaignApproval(organizationId, campaign.id);
    const approval = agentOsService.listApprovals(organizationId)[0];
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "tester",
    });
    const after = growthService.getCampaign(organizationId, campaign.id)!;
    expect(after.status).toBe("BLOCKED");
    expect(after.tasks.some((task) => task.externalSideEffect && task.status === "blocked")).toBe(
      true,
    );
    expect(after.status).not.toBe("COMPLETED");
  });

  it("normalizes version 4 persistence into version 7", () => {
    const normalized = normalizeState({
      version: 4,
      campaigns: [],
      growthInsights: [],
      growthProfiles: [],
    });
    expect(normalized?.version).toBe(7);
    expect(normalized?.executionJobs).toEqual([]);
    expect(normalized?.growthCrmLinks).toEqual([]);
    expect(normalized?.campaignCrmSyncs).toEqual([]);
    expect(normalized?.crmFollowUps).toEqual([]);
    expect(normalized?.executionAttempts).toEqual([]);
    expect(normalized?.executionEvents).toEqual([]);
    expect(normalized?.campaigns).toEqual([]);
  });

  it("exposes operations through the existing /agents prefix", async () => {
    registerLocalDataHandlers();
    const created = await localDataProvider.request<{ readonly id: string; readonly status: string }>({
      method: "POST",
      path: "/agents/operations/enqueue",
      body: {
        organizationId,
        toolId: "campaign_plan",
        title: "API job",
        priority: "HIGH",
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.status).toBe("QUEUED");
    const listed = await localDataProvider.request<{
      readonly counts: { readonly queued: number };
    }>({
      method: "GET",
      path: `/agents/operations?organizationId=${organizationId}`,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.counts.queued).toBeGreaterThan(0);
  });
});
