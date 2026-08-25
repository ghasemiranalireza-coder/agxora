/**
 * Phase 49.0 — Growth CRM Lead Prioritization & Action Queue.
 *
 * Read-only deterministic projection over existing GrowthCrmLink +
 * GrowthCrmFollowUp + Phase 48 next-action signals.
 * No ML scoring, fake analytics, persistence, or second CRM/Agent engine.
 */

import { nowIso } from "../growth/ids";
import { agentsStore } from "../store";
import type { CrmCustomerStatus } from "@/app/lib/crm/directory";
import { evaluateCrmLeadNextAction, getCrmLinkedLeadState } from "./followUp";
import { nextAllowedCrmStatus } from "./status";
import { listGrowthCrmLinks } from "./sync";
import type {
  CrmLeadPriority,
  GrowthCrmFollowUp,
  GrowthCrmLink,
  LeadActionItem,
  LeadActionQueue,
  LeadPriorityReason,
  LeadRecommendedAction,
} from "./types";

/** Inclusive window (days) for "pending due soon" elevation. */
export const LEAD_PRIORITY_DUE_SOON_DAYS = 3;

const PRIORITY_RANK: Record<CrmLeadPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

/**
 * Deterministic score bands (documented in agent-growth-phase49.md):
 * CRITICAL 100–90 | HIGH 89–70 | MEDIUM 69–40 | LOW 39–10 | NONE 0
 */
const SCORE: Record<CrmLeadPriority, number> = {
  CRITICAL: 100,
  HIGH: 80,
  MEDIUM: 50,
  LOW: 20,
  NONE: 0,
};

function dayKey(iso?: string): string | undefined {
  if (!iso) return undefined;
  return iso.slice(0, 10);
}

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isOverdue(followUp: GrowthCrmFollowUp, today: string): boolean {
  const due = dayKey(followUp.dueAt);
  return Boolean(due && due < today);
}

function isDueSoon(followUp: GrowthCrmFollowUp, today: string): boolean {
  const due = dayKey(followUp.dueAt);
  if (!due || due < today) return false;
  return due <= addDays(today, LEAD_PRIORITY_DUE_SOON_DAYS);
}

function isWeakLink(link: GrowthCrmLink): boolean {
  return (
    link.outcome === "blocked" ||
    link.outcome === "error" ||
    link.outcome === "unavailable" ||
    !link.customerId
  );
}

function earliestDueKey(items: readonly GrowthCrmFollowUp[]): string {
  let earliest = "9999-12-31";
  for (const item of items) {
    const due = dayKey(item.dueAt);
    if (due && due < earliest) earliest = due;
  }
  return earliest;
}

export interface LeadPriorityEvaluation {
  readonly priority: CrmLeadPriority;
  readonly score: number;
  readonly reasons: readonly LeadPriorityReason[];
  readonly recommendedAction: LeadRecommendedAction;
  readonly followUp?: GrowthCrmFollowUp;
}

/**
 * Deterministic priority for one lead. Same inputs → same priority/score/action.
 */
export function evaluateLeadPriority(input: {
  readonly link: GrowthCrmLink | null;
  readonly openFollowUps: readonly GrowthCrmFollowUp[];
  readonly completedFollowUps?: readonly GrowthCrmFollowUp[];
  readonly today?: string;
  /** Live CRM status — when lead/prospect with no open FU, prefer ADVANCE. */
  readonly crmStatus?: CrmCustomerStatus;
}): LeadPriorityEvaluation {
  const today = input.today ?? nowIso().slice(0, 10);
  const open = [...input.openFollowUps].sort((a, b) => {
    const aDue = dayKey(a.dueAt) ?? "9999-12-31";
    const bDue = dayKey(b.dueAt) ?? "9999-12-31";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return a.createdAt.localeCompare(b.createdAt);
  });
  const completed = input.completedFollowUps ?? [];
  const reasons: LeadPriorityReason[] = [];

  if (!input.link) {
    reasons.push("missing_crm_link");
    return {
      priority: "LOW",
      score: SCORE.LOW,
      reasons,
      recommendedAction: "REVIEW_CRM_LINK",
    };
  }

  if (isWeakLink(input.link)) {
    reasons.push("weak_crm_link");
  }

  const overdue = open.filter((item) => isOverdue(item, today));
  const failed = open.filter((item) => item.status === "failed");
  const blocked = open.filter((item) => item.status === "blocked");
  const pending = open.filter((item) => item.status === "pending");
  const dueSoon = pending.filter((item) => isDueSoon(item, today));

  if (overdue.length > 0) {
    reasons.push("overdue_follow_up");
    if (failed.length > 0) reasons.push("failed_follow_up");
    if (blocked.length > 0) reasons.push("blocked_follow_up");
    if (pending.length > 0) reasons.push("pending_follow_up");
    return {
      priority: "CRITICAL",
      score: SCORE.CRITICAL,
      reasons,
      recommendedAction: "COMPLETE_OVERDUE_FOLLOW_UP",
      followUp: overdue[0],
    };
  }

  if (failed.length > 0) {
    reasons.push("failed_follow_up");
    if (blocked.length > 0) reasons.push("blocked_follow_up");
    if (pending.length > 0) reasons.push("pending_follow_up");
    return {
      priority: "HIGH",
      score: SCORE.HIGH,
      reasons,
      recommendedAction: "RETRY_FAILED_FOLLOW_UP",
      followUp: failed[0],
    };
  }

  if (blocked.length > 0) {
    reasons.push("blocked_follow_up");
    if (pending.length > 0) reasons.push("pending_follow_up");
    return {
      priority: "HIGH",
      score: SCORE.HIGH - 5,
      reasons,
      recommendedAction: "REVIEW_BLOCKED_FOLLOW_UP",
      followUp: blocked[0],
    };
  }

  if (dueSoon.length > 0) {
    reasons.push("pending_due_soon");
    reasons.push("pending_follow_up");
    return {
      priority: "HIGH",
      score: SCORE.HIGH - 10,
      reasons,
      recommendedAction: "COMPLETE_PENDING_FOLLOW_UP",
      followUp: dueSoon[0],
    };
  }

  if (pending.length > 0) {
    reasons.push("pending_follow_up");
    return {
      priority: "MEDIUM",
      score: SCORE.MEDIUM,
      reasons,
      recommendedAction: "COMPLETE_PENDING_FOLLOW_UP",
      followUp: pending[0],
    };
  }

  if (
    open.length === 0 &&
    (input.link.outcome === "linked" ||
      input.link.outcome === "created" ||
      input.link.outcome === "already-linked")
  ) {
    const advanceTarget =
      input.crmStatus === "lead" || input.crmStatus === "prospect"
        ? nextAllowedCrmStatus(input.crmStatus)
        : undefined;
    if (advanceTarget) {
      reasons.push("ready_for_status_advance");
      if (completed.length > 0) reasons.push("recently_completed");
      if (open.length === 0) reasons.push("no_follow_up_after_link");
      return {
        priority: completed.length > 0 ? "LOW" : "MEDIUM",
        score: completed.length > 0 ? SCORE.LOW : SCORE.MEDIUM - 5,
        reasons,
        recommendedAction: "ADVANCE_CRM_STATUS",
      };
    }

    if (completed.length > 0) {
      reasons.push("recently_completed");
      reasons.push("no_follow_up_after_link");
      return {
        priority: "LOW",
        score: SCORE.LOW,
        reasons,
        recommendedAction: "CREATE_FOLLOW_UP",
      };
    }
    reasons.push("no_follow_up_after_link");
    if (reasons.includes("weak_crm_link")) {
      return {
        priority: "LOW",
        score: SCORE.LOW - 5,
        reasons,
        recommendedAction: "REVIEW_CRM_LINK",
      };
    }
    return {
      priority: "MEDIUM",
      score: SCORE.MEDIUM - 5,
      reasons,
      recommendedAction: "CREATE_FOLLOW_UP",
    };
  }

  if (reasons.includes("weak_crm_link")) {
    return {
      priority: "LOW",
      score: SCORE.LOW,
      reasons,
      recommendedAction: "REVIEW_CRM_LINK",
    };
  }

  reasons.push("no_action_needed");
  return {
    priority: "NONE",
    score: SCORE.NONE,
    reasons,
    recommendedAction: "NO_ACTION",
  };
}

export function crmLeadPriorityRank(priority: CrmLeadPriority): number {
  return PRIORITY_RANK[priority];
}

function buildItemFromLink(
  organizationId: string,
  link: GrowthCrmLink,
  today: string,
  crmStatuses?: ReadonlyMap<string, CrmCustomerStatus>,
): LeadActionItem {
  const lead = getCrmLinkedLeadState(organizationId, link.profileId);
  const open = lead.openFollowUps;
  const crmStatus =
    (link.customerId ? crmStatuses?.get(link.customerId) : undefined) ??
    (lead.customerId ? crmStatuses?.get(lead.customerId) : undefined);
  const evaluation = evaluateLeadPriority({
    link: lead.link ?? link,
    openFollowUps: open,
    completedFollowUps: lead.completedFollowUps,
    today,
    crmStatus,
  });
  const overdueFollowUps = open.filter((item) => isOverdue(item, today));
  const phase48NextAction = evaluateCrmLeadNextAction({
    link: lead.link ?? link,
    openFollowUps: open,
    today,
    crmStatus,
  });
  const targetCrmStatus =
    phase48NextAction.targetCrmStatus ??
    (crmStatus ? nextAllowedCrmStatus(crmStatus) : undefined);
  const companyName = lead.companyName ?? link.companyName;
  const dueKey = earliestDueKey(open);
  const sortKey = [
    String(PRIORITY_RANK[evaluation.priority]),
    String(1000 - evaluation.score).padStart(4, "0"),
    dueKey,
    companyName.toLowerCase(),
    link.profileId,
    link.id,
  ].join("|");

  return {
    id: `link:${link.id}`,
    organizationId,
    profileId: link.profileId,
    linkId: link.id,
    customerId: lead.customerId ?? link.customerId,
    companyName,
    href: lead.href ?? link.href,
    priority: evaluation.priority,
    score: evaluation.score,
    reasons: evaluation.reasons,
    recommendedAction: evaluation.recommendedAction,
    followUpStatus: evaluation.followUp?.status,
    followUpId: evaluation.followUp?.id ?? phase48NextAction.followUpId,
    dueAt: evaluation.followUp?.dueAt ?? phase48NextAction.dueAt,
    linkOutcome: link.outcome,
    crmStatus,
    targetCrmStatus:
      evaluation.recommendedAction === "ADVANCE_CRM_STATUS"
        ? targetCrmStatus
        : undefined,
    openFollowUpCount: open.length,
    overdueFollowUpCount: overdueFollowUps.length,
    failedFollowUpCount: open.filter((item) => item.status === "failed").length,
    blockedFollowUpCount: open.filter((item) => item.status === "blocked").length,
    pendingFollowUpCount: open.filter((item) => item.status === "pending").length,
    completedFollowUpCount: lead.completedFollowUps.length,
    phase48NextAction,
    sortKey,
  };
}

function buildItemForUnlinkedProfile(
  organizationId: string,
  profile: { readonly id: string; readonly companyName: string },
  today: string,
): LeadActionItem {
  const evaluation = evaluateLeadPriority({
    link: null,
    openFollowUps: [],
    completedFollowUps: [],
    today,
  });
  const companyName = profile.companyName.trim() || profile.id;
  const phase48NextAction = evaluateCrmLeadNextAction({
    link: null,
    openFollowUps: [],
    today,
  });
  const sortKey = [
    String(PRIORITY_RANK[evaluation.priority]),
    String(1000 - evaluation.score).padStart(4, "0"),
    "9999-12-31",
    companyName.toLowerCase(),
    profile.id,
    "",
  ].join("|");

  return {
    id: `profile:${profile.id}`,
    organizationId,
    profileId: profile.id,
    companyName,
    priority: evaluation.priority,
    score: evaluation.score,
    reasons: evaluation.reasons,
    recommendedAction: evaluation.recommendedAction,
    openFollowUpCount: 0,
    overdueFollowUpCount: 0,
    failedFollowUpCount: 0,
    blockedFollowUpCount: 0,
    pendingFollowUpCount: 0,
    completedFollowUpCount: 0,
    phase48NextAction,
    sortKey,
  };
}

function sortItems(items: readonly LeadActionItem[]): LeadActionItem[] {
  return [...items].sort((a, b) => {
    const byKey = a.sortKey.localeCompare(b.sortKey);
    if (byKey !== 0) return byKey;
    return a.id.localeCompare(b.id);
  });
}

function countByPriority(items: readonly LeadActionItem[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, none: 0, total: items.length };
  for (const item of items) {
    if (item.priority === "CRITICAL") counts.critical += 1;
    else if (item.priority === "HIGH") counts.high += 1;
    else if (item.priority === "MEDIUM") counts.medium += 1;
    else if (item.priority === "LOW") counts.low += 1;
    else counts.none += 1;
  }
  return counts;
}

/**
 * Build the org-scoped Lead Action Queue (read-only).
 * Linked Growth CRM leads are primary; unlinked profiles surface as missing_crm_link.
 */
export function buildLeadActionQueue(
  organizationId: string,
  options?: {
    readonly today?: string;
    readonly includeUnlinkedProfiles?: boolean;
    readonly includeNone?: boolean;
    /** Live CRM statuses keyed by customerId. */
    readonly crmStatuses?: ReadonlyMap<string, CrmCustomerStatus>;
  },
): LeadActionQueue {
  const today = options?.today ?? nowIso().slice(0, 10);
  const includeUnlinked = options?.includeUnlinkedProfiles !== false;
  const includeNone = options?.includeNone === true;
  const links = listGrowthCrmLinks(organizationId);
  const linkedProfileIds = new Set(links.map((item) => item.profileId));
  const items: LeadActionItem[] = links.map((link) =>
    buildItemFromLink(organizationId, link, today, options?.crmStatuses),
  );

  if (includeUnlinked) {
    const profiles = agentsStore
      .getSnapshot()
      .growthProfiles.filter((item) => item.organizationId === organizationId);
    for (const profile of profiles) {
      if (linkedProfileIds.has(profile.id)) continue;
      items.push(
        buildItemForUnlinkedProfile(
          organizationId,
          { id: profile.id, companyName: profile.companyName },
          today,
        ),
      );
    }
  }

  const sorted = sortItems(items).filter(
    (item) => includeNone || item.priority !== "NONE",
  );

  return {
    organizationId,
    generatedAt: nowIso(),
    today,
    items: sorted,
    counts: countByPriority(sorted),
  };
}
