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
  /** Note created when the follow-up was opened (Phase 47). */
  readonly noteId?: string;
  /** Optional completion note id — never overwrites `noteId`. */
  readonly completionNoteId?: string;
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

/** Deterministic next action for a CRM-linked Growth lead (no fake analytics). */
export type CrmLeadNextActionCode =
  | "link_to_crm"
  | "create_follow_up"
  | "complete_overdue_follow_up"
  | "complete_open_follow_up"
  | "none";

export interface CrmLeadNextAction {
  readonly code: CrmLeadNextActionCode;
  readonly followUpId?: string;
  readonly dueAt?: string;
}

/** Read-model for CRM-linked lead state inside Agent Operations. */
export interface CrmLinkedLeadState {
  readonly link: GrowthCrmLink | null;
  readonly customerId?: string;
  readonly companyName?: string;
  readonly href?: string;
  readonly openFollowUps: readonly GrowthCrmFollowUp[];
  readonly completedFollowUps: readonly GrowthCrmFollowUp[];
  readonly overdueFollowUps: readonly GrowthCrmFollowUp[];
  readonly nextAction: CrmLeadNextAction;
}

/**
 * Phase 49 deterministic lead priority categories (no ML / analytics).
 * Same input state always yields the same category.
 */
export type CrmLeadPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

/** Explainable reason codes for why a lead was prioritized. */
export type LeadPriorityReason =
  | "overdue_follow_up"
  | "failed_follow_up"
  | "blocked_follow_up"
  | "pending_due_soon"
  | "pending_follow_up"
  | "no_follow_up_after_link"
  | "recently_completed"
  | "weak_crm_link"
  | "missing_crm_link"
  | "no_action_needed";

/**
 * Deterministic recommended next action for the Lead Action Queue.
 * Maps onto existing Phase 46–48 operations when an action button is shown.
 */
export type LeadRecommendedAction =
  | "COMPLETE_OVERDUE_FOLLOW_UP"
  | "RETRY_FAILED_FOLLOW_UP"
  | "REVIEW_BLOCKED_FOLLOW_UP"
  | "COMPLETE_PENDING_FOLLOW_UP"
  | "CREATE_FOLLOW_UP"
  | "REVIEW_CRM_LINK"
  | "NO_ACTION";

/** Single prioritized lead projection — references only, never CRM payloads. */
export interface LeadActionItem {
  readonly id: string;
  readonly organizationId: string;
  readonly profileId: string;
  readonly linkId?: string;
  readonly customerId?: string;
  readonly companyName: string;
  readonly href?: string;
  readonly priority: CrmLeadPriority;
  /** Deterministic integer score — see docs/agent-growth-phase49.md formula. */
  readonly score: number;
  readonly reasons: readonly LeadPriorityReason[];
  readonly recommendedAction: LeadRecommendedAction;
  readonly followUpStatus?: CrmFollowUpStatus;
  readonly followUpId?: string;
  readonly dueAt?: string;
  readonly linkOutcome?: GrowthCrmLinkOutcome;
  readonly openFollowUpCount: number;
  readonly overdueFollowUpCount: number;
  readonly failedFollowUpCount: number;
  readonly blockedFollowUpCount: number;
  readonly pendingFollowUpCount: number;
  readonly completedFollowUpCount: number;
  /** Phase 48 next-action projection for interoperability. */
  readonly phase48NextAction: CrmLeadNextAction;
  readonly sortKey: string;
}

/** Org-scoped Lead Action Queue — computed read-model, not persisted. */
export interface LeadActionQueue {
  readonly organizationId: string;
  readonly generatedAt: string;
  readonly today: string;
  readonly items: readonly LeadActionItem[];
  readonly counts: {
    readonly critical: number;
    readonly high: number;
    readonly medium: number;
    readonly low: number;
    readonly none: number;
    readonly total: number;
  };
}
