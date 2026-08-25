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
  /** Present for campaign-scoped syncs; omitted for profile-only CRM syncs. */
  readonly campaignId?: string;
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

/** Structured follow-up kinds — email is draft-only (never claimed as sent). */
export type CrmFollowUpKind = "call" | "email_draft" | "meeting" | "general";

export type CrmFollowUpStatus =
  | "pending"
  | "completed"
  | "blocked"
  | "failed"
  | "cancelled";

export type CrmFollowUpOutcome =
  | "created"
  | "completed"
  | "blocked"
  | "unavailable"
  | "error"
  | "missing_link";

export interface CrmFollowUpResult {
  readonly available: boolean;
  readonly success: boolean;
  readonly outcome: CrmFollowUpOutcome;
  readonly message: string;
  readonly noteId?: string;
  readonly href?: string;
  readonly duplicated: boolean;
}

/**
 * Agent OS follow-up record — stores metadata + CRM note refs only.
 * The durable CRM artifact is a real note created via existing CRM mutations.
 */
export interface GrowthCrmFollowUp {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly linkId: string;
  readonly customerId: string;
  readonly contactId?: string;
  readonly campaignId?: string;
  readonly noteId?: string;
  readonly href?: string;
  readonly kind: CrmFollowUpKind;
  readonly title: string;
  readonly summary: string;
  readonly dueAt?: string;
  readonly status: CrmFollowUpStatus;
  readonly outcome?: CrmFollowUpOutcome;
  readonly result?: CrmFollowUpResult;
  readonly executionJobId?: string;
  readonly taskId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
  readonly lastError?: string;
}

/** Read-model for CRM-linked lead state inside Agent Operations. */
export interface CrmLinkedLeadState {
  readonly link: GrowthCrmLink | null;
  readonly customerId?: string;
  readonly companyName?: string;
  readonly href?: string;
  readonly openFollowUps: readonly GrowthCrmFollowUp[];
  readonly completedFollowUps: readonly GrowthCrmFollowUp[];
}
