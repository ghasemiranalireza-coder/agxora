import type { Campaign } from "../campaigns/types";
import { evaluateCampaignReadiness } from "../campaigns/readiness";
import type { GrowthBusinessProfile } from "../growth/types";
import type { SocialAccount } from "../social/types";
import type { WebsiteProject } from "../website/types";
import type { ExecutionJob } from "./jobs";

export interface CampaignOperationsReadiness {
  readonly campaignId?: string;
  readonly score: number;
  readonly ready: boolean;
  readonly readyTasks: number;
  readonly blockedTasks: number;
  readonly pendingApprovals: number;
  readonly failedTasks: number;
  readonly warnings: readonly string[];
  readonly blockers: readonly string[];
  readonly completedChecks: readonly string[];
}

export function evaluateCampaignOperationsReadiness(input: {
  readonly profile: GrowthBusinessProfile;
  readonly campaign?: Campaign;
  readonly accounts: readonly SocialAccount[];
  readonly website?: WebsiteProject;
  readonly jobs: readonly ExecutionJob[];
}): CampaignOperationsReadiness {
  const base = evaluateCampaignReadiness({
    profile: input.profile,
    campaign: input.campaign,
    accounts: input.accounts,
    website: input.website,
  });
  const campaignJobs = input.jobs.filter(
    (job) => job.campaignId === input.campaign?.id,
  );
  const tasks = input.campaign?.tasks ?? [];
  const blockedByJob = new Set(
    campaignJobs
      .filter((job) => job.status === "BLOCKED")
      .map((job) => job.campaignTaskId)
      .filter((id): id is string => typeof id === "string"),
  );
  const failedByJob = campaignJobs.filter((job) => job.status === "FAILED").length;
  const pendingApprovals = campaignJobs.filter(
    (job) => job.status === "WAITING_FOR_APPROVAL",
  ).length;
  const blockedTasks =
    tasks.filter((task) => task.status === "blocked").length +
    tasks.filter((task) => task.status !== "blocked" && blockedByJob.has(task.id)).length;
  const readyTasks = tasks.filter((task) => task.status === "completed").length;
  const requiredBlocked =
    campaignJobs.some(
      (job) => job.status === "BLOCKED" && job.requiresApproval,
    ) || base.blockers.length > 0;
  return {
    campaignId: input.campaign?.id,
    score: base.score,
    ready: base.ready && !requiredBlocked && pendingApprovals === 0 && failedByJob === 0,
    readyTasks,
    blockedTasks,
    pendingApprovals,
    failedTasks: failedByJob,
    warnings: base.warnings,
    blockers: base.blockers,
    completedChecks: base.completedChecks,
  };
}
