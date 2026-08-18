import type { ApprovalState } from "../types";

export type CampaignChannelId =
  | "WEBSITE"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TIKTOK"
  | "LINKEDIN"
  | "YOUTUBE";

export type CampaignStatus =
  | "DRAFT"
  | "PLANNING"
  | "READY_FOR_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type CampaignTaskStatus = "pending" | "completed" | "blocked";

export type GrowthInsightType = "PRIORITY" | "OPPORTUNITY" | "RISK" | "ACTION";

export type GrowthInsightSeverity = "low" | "medium" | "high";

export interface CampaignObjective {
  readonly statement: string;
  readonly metric: string;
}

export interface CampaignAudience {
  readonly description: string;
  readonly location?: string;
}

export interface CampaignChannel {
  readonly id: CampaignChannelId;
  readonly enabled: boolean;
}

export interface CampaignAsset {
  readonly id: string;
  readonly kind: "website" | "social_content" | "calendar" | "strategy";
  readonly refId: string;
  readonly label: string;
}

export interface CampaignTask {
  readonly id: string;
  readonly code: string;
  readonly status: CampaignTaskStatus;
  readonly externalSideEffect: boolean;
  readonly requiresApproval: boolean;
}

export interface CampaignMilestone {
  readonly id: string;
  readonly code: string;
  readonly dueOffsetDays: number;
}

export interface CampaignExecutionResult {
  readonly available: boolean;
  readonly published: boolean;
  readonly status: "unavailable" | "completed" | "blocked";
  readonly reason?: string;
}

export interface Campaign {
  readonly id: string;
  readonly organizationId: string;
  readonly businessProfileId: string;
  readonly name: string;
  readonly objective: CampaignObjective;
  readonly audience: CampaignAudience;
  readonly offer: string;
  readonly coreMessage: string;
  readonly websiteCta: string;
  readonly socialThemes: readonly string[];
  readonly channels: readonly CampaignChannel[];
  readonly startDate: string;
  readonly endDate: string;
  readonly status: CampaignStatus;
  readonly strategy: string;
  readonly assets: readonly CampaignAsset[];
  readonly tasks: readonly CampaignTask[];
  readonly milestones: readonly CampaignMilestone[];
  readonly approvalState?: ApprovalState;
  readonly websiteProjectId?: string;
  readonly socialStrategyId?: string;
  readonly calendarId?: string;
  readonly contentIds: readonly string[];
  readonly executionResult?: CampaignExecutionResult;
  readonly executionId?: string;
  readonly taskId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CampaignReadiness {
  readonly campaignId?: string;
  readonly ready: boolean;
  readonly score: number;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly completedChecks: readonly string[];
}

export interface GrowthInsight {
  readonly id: string;
  readonly organizationId: string;
  readonly campaignId?: string;
  readonly type: GrowthInsightType;
  readonly code: string;
  readonly severity: GrowthInsightSeverity;
  readonly source: string;
  readonly relatedEntityId?: string;
  readonly params?: Readonly<Record<string, string>>;
  readonly createdAt: string;
}

export interface CampaignPlanInput {
  readonly organizationId: string;
  readonly objective?: string;
  readonly audience?: string;
  readonly offer?: string;
  readonly channels?: readonly CampaignChannelId[];
}

export const CAMPAIGN_CHANNELS: readonly CampaignChannelId[] = [
  "WEBSITE",
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "YOUTUBE",
];

export function isSocialCampaignChannel(
  id: CampaignChannelId,
): id is Exclude<CampaignChannelId, "WEBSITE"> {
  return id !== "WEBSITE";
}
