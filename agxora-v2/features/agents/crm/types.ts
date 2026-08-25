/**
 * Growth ↔ CRM bridge types — Agent OS stores references only.
 * CRM entities remain in the existing CRM directory / persistence stack.
 */

export type GrowthCrmLinkOutcome =
  | "linked"
  | "created"
  | "already-linked"
  | "blocked"
  | "unavailable"
  | "error";

export type CampaignCrmSyncStatus =
  | "pending"
  | "completed"
  | "blocked"
  | "failed";

export interface GrowthCrmLink {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly customerId: string;
  readonly contactId?: string;
  readonly noteId?: string;
  readonly campaignId?: string;
  readonly href: string;
  readonly companyName: string;
  readonly contactName?: string;
  readonly email?: string;
  readonly outcome: GrowthCrmLinkOutcome;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastSyncedAt: string;
  readonly lastError?: string;
}

export interface CrmBridgeResult {
  readonly available: boolean;
  readonly success: boolean;
  readonly outcome: GrowthCrmLinkOutcome;
  readonly message: string;
  readonly linkId?: string;
  readonly customerId?: string;
  readonly contactId?: string;
  readonly noteId?: string;
  readonly href?: string;
  readonly duplicated: boolean;
}

export interface CampaignCrmSync {
  readonly id: string;
  readonly organizationId: string;
  readonly campaignId: string;
  readonly profileId: string;
  readonly linkId?: string;
  readonly customerId?: string;
  readonly contactId?: string;
  readonly noteId?: string;
  readonly href?: string;
  readonly status: CampaignCrmSyncStatus;
  readonly outcome?: GrowthCrmLinkOutcome;
  readonly result?: CrmBridgeResult;
  readonly executionJobId?: string;
  readonly taskId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastError?: string;
}
