/**
 * Phase 50–55 — Lead Action Execution workflow.
 *
 * Validates deterministic Lead Queue actions and routes them through the
 * existing Agent OS / Operations / CRM paths.
 * No second execution engine. No persistence version bump.
 */

import type { CrmCustomerStatus } from "@/app/lib/crm/directory";
import { createGrowthId, nowIso } from "../growth/ids";
import { agentsStore } from "../store";
import { operationsService } from "../execution/service";
import type { ExecutionJob } from "../execution/jobs";
import {
  defaultFollowUpDueAt,
  getCrmFollowUp,
  getCrmLinkedLeadState,
  listCrmFollowUps,
  normalizeFollowUpDueAt,
} from "./followUp";
import { buildLeadActionQueue } from "./prioritize";
import { getCrmBridgeProvider } from "./adapter";
import {
  loadCrmStatusesForOrganization,
  nextAllowedCrmStatus,
  resolveAdvanceTarget,
  resolveDispositionTarget,
  resolveReactivateTarget,
} from "./status";
import { getGrowthCrmLink } from "./sync";
import type {
  LeadActionExecution,
  LeadActionExecutionRef,
  LeadActionExecutionStatus,
  LeadExecutableAction,
} from "./types";

const EXECUTABLE: ReadonlySet<string> = new Set([
  "CREATE_FOLLOW_UP",
  "COMPLETE_OVERDUE_FOLLOW_UP",
  "COMPLETE_PENDING_FOLLOW_UP",
  "REVIEW_BLOCKED_FOLLOW_UP",
  "RESCHEDULE_FOLLOW_UP",
  "CANCEL_FOLLOW_UP",
  "RETRY_FAILED_FOLLOW_UP",
  "REVIEW_CRM_LINK",
  "ADVANCE_CRM_STATUS",
  "DISPOSE_CRM_STATUS",
  "REACTIVATE_CRM_STATUS",
]);

function dayKey(iso?: string): string | undefined {
  if (!iso) return undefined;
  return iso.slice(0, 10);
}

function isOverdue(dueAt: string | undefined, today: string): boolean {
  const due = dayKey(dueAt);
  return Boolean(due && due < today);
}

function mapJobStatus(status: ExecutionJob["status"]): LeadActionExecutionStatus {
  return status;
}

function blockerMessage(job: ExecutionJob): string | undefined {
  return job.blocker?.code ?? job.result?.message;
}

function findApprovalId(organizationId: string, taskId?: string): string | undefined {
  if (!taskId) return undefined;
  return agentsStore
    .getSnapshot()
    .approvals.find(
      (item) =>
        item.organizationId === organizationId &&
        item.taskId === taskId &&
        item.state === "REQUIRES_APPROVAL",
    )?.id;
}

export function isLeadExecutableAction(
  action: string,
): action is LeadExecutableAction {
  return EXECUTABLE.has(action);
}

async function readLiveCrmStatus(input: {
  readonly organizationId: string;
  readonly customerId: string;
}): Promise<
  | { readonly ok: true; readonly status: CrmCustomerStatus }
  | { readonly ok: false; readonly code: string; readonly message: string }
> {
  const bridge = getCrmBridgeProvider();
  if (!bridge.available) {
    return {
      ok: false,
      code: "crm_unavailable",
      message: "crm_bridge_unavailable",
    };
  }
  try {
    const customer = await bridge.getCustomer(input.customerId);
    if (!customer) {
      return {
        ok: false,
        code: "missing_customer",
        message: "crm_customer_missing",
      };
    }
    if (customer.organizationId !== input.organizationId) {
      return {
        ok: false,
        code: "org_mismatch",
        message: "crm_customer_org_mismatch",
      };
    }
    return { ok: true, status: customer.status };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "CrmBridgeUnavailableError" ||
        error.message.includes("_unavailable"))
    ) {
      return {
        ok: false,
        code: "crm_unavailable",
        message: "crm_bridge_unavailable",
      };
    }
    return {
      ok: false,
      code: "crm_read_failed",
      message: error instanceof Error ? error.message : "crm_customer_read_failed",
    };
  }
}

export async function validateLeadAction(input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly action: string;
  readonly followUpId?: string;
  readonly targetCrmStatus?: CrmCustomerStatus;
  readonly dueAt?: string;
  readonly today?: string;
}): Promise<{
  readonly ok: boolean;
  readonly code?: string;
  readonly message?: string;
  readonly followUpId?: string;
  readonly dueAt?: string;
  readonly fromCrmStatus?: CrmCustomerStatus;
  readonly toCrmStatus?: CrmCustomerStatus;
}> {
  if (!isLeadExecutableAction(input.action)) {
    return {
      ok: false,
      code: "invalid_action",
      message: "unsupported_lead_action",
    };
  }

  const today = input.today ?? nowIso().slice(0, 10);
  const link = getGrowthCrmLink(input.organizationId, input.profileId);

  if (input.action === "REVIEW_CRM_LINK") {
    return { ok: true };
  }

  if (input.action === "ADVANCE_CRM_STATUS") {
    if (!link || !link.customerId) {
      return {
        ok: false,
        code: "missing_crm_link",
        message: "crm_link_required_before_status_advance",
      };
    }
    const live = await readLiveCrmStatus({
      organizationId: input.organizationId,
      customerId: link.customerId,
    });
    if (!live.ok) {
      if (live.code === "crm_unavailable") {
        const fallbackTarget =
          input.targetCrmStatus ?? nextAllowedCrmStatus("lead") ?? "prospect";
        return {
          ok: true,
          code: "crm_unavailable",
          message: live.message,
          fromCrmStatus: undefined,
          toCrmStatus: fallbackTarget,
        };
      }
      return {
        ok: false,
        code: live.code,
        message: live.message,
      };
    }
    const resolved = resolveAdvanceTarget({
      current: live.status,
      requested: input.targetCrmStatus,
    });
    if (!resolved.ok || !resolved.target) {
      return {
        ok: false,
        code: resolved.code ?? "invalid_transition",
        message: resolved.message ?? "crm_status_transition_not_allowed",
        fromCrmStatus: live.status,
        toCrmStatus: input.targetCrmStatus,
      };
    }
    return {
      ok: true,
      fromCrmStatus: live.status,
      toCrmStatus: resolved.target,
    };
  }

  if (input.action === "DISPOSE_CRM_STATUS") {
    if (!link || !link.customerId) {
      return {
        ok: false,
        code: "missing_crm_link",
        message: "crm_link_required_before_status_disposition",
      };
    }
    const live = await readLiveCrmStatus({
      organizationId: input.organizationId,
      customerId: link.customerId,
    });
    if (!live.ok) {
      if (live.code === "crm_unavailable") {
        if (!input.targetCrmStatus) {
          return {
            ok: false,
            code: "explicit_target_required",
            message: "crm_status_explicit_target_required",
          };
        }
        return {
          ok: true,
          code: "crm_unavailable",
          message: live.message,
          fromCrmStatus: undefined,
          toCrmStatus: input.targetCrmStatus,
        };
      }
      return {
        ok: false,
        code: live.code,
        message: live.message,
      };
    }
    const resolved = resolveDispositionTarget({
      current: live.status,
      requested: input.targetCrmStatus,
    });
    if (!resolved.ok || !resolved.target) {
      return {
        ok: false,
        code: resolved.code ?? "invalid_transition",
        message: resolved.message ?? "crm_status_transition_not_allowed",
        fromCrmStatus: live.status,
        toCrmStatus: input.targetCrmStatus,
      };
    }
    return {
      ok: true,
      fromCrmStatus: live.status,
      toCrmStatus: resolved.target,
    };
  }

  if (input.action === "REACTIVATE_CRM_STATUS") {
    if (!link || !link.customerId) {
      return {
        ok: false,
        code: "missing_crm_link",
        message: "crm_link_required_before_status_reactivation",
      };
    }
    const live = await readLiveCrmStatus({
      organizationId: input.organizationId,
      customerId: link.customerId,
    });
    if (!live.ok) {
      if (live.code === "crm_unavailable") {
        if (!input.targetCrmStatus) {
          return {
            ok: false,
            code: "explicit_target_required",
            message: "crm_status_explicit_target_required",
          };
        }
        return {
          ok: true,
          code: "crm_unavailable",
          message: live.message,
          fromCrmStatus: undefined,
          toCrmStatus: input.targetCrmStatus,
        };
      }
      return {
        ok: false,
        code: live.code,
        message: live.message,
      };
    }
    const resolved = resolveReactivateTarget({
      current: live.status,
      requested: input.targetCrmStatus,
    });
    if (!resolved.ok || !resolved.target) {
      return {
        ok: false,
        code: resolved.code ?? "invalid_transition",
        message: resolved.message ?? "crm_status_transition_not_allowed",
        fromCrmStatus: live.status,
        toCrmStatus: input.targetCrmStatus,
      };
    }
    return {
      ok: true,
      fromCrmStatus: live.status,
      toCrmStatus: resolved.target,
    };
  }

  if (input.action === "CREATE_FOLLOW_UP") {
    if (!link) {
      return {
        ok: false,
        code: "missing_crm_link",
        message: "crm_link_required_before_follow_up",
      };
    }
    const open = listCrmFollowUps(input.organizationId, { linkId: link.id }).filter(
      (item) =>
        item.status === "pending" ||
        item.status === "blocked" ||
        item.status === "failed",
    );
    if (open.length > 0) {
      return {
        ok: false,
        code: "active_follow_up_exists",
        message: "open_follow_up_blocks_create",
        followUpId: open[0]?.id,
      };
    }
    return { ok: true };
  }

  const followUpId = input.followUpId;
  if (!followUpId) {
    return {
      ok: false,
      code: "missing_follow_up",
      message: "follow_up_id_required",
    };
  }
  const followUp = getCrmFollowUp(input.organizationId, followUpId);
  if (!followUp || followUp.profileId !== input.profileId) {
    return {
      ok: false,
      code: "follow_up_not_found",
      message: "crm_follow_up_missing",
    };
  }

  if (input.action === "RETRY_FAILED_FOLLOW_UP") {
    if (followUp.status !== "failed") {
      return {
        ok: false,
        code: "not_failed",
        message: "follow_up_not_failed",
        followUpId,
      };
    }
    return { ok: true, followUpId };
  }

  if (input.action === "COMPLETE_PENDING_FOLLOW_UP") {
    if (followUp.status !== "pending") {
      return {
        ok: false,
        code: "not_pending",
        message: "follow_up_not_pending",
        followUpId,
      };
    }
    return { ok: true, followUpId };
  }

  if (input.action === "REVIEW_BLOCKED_FOLLOW_UP") {
    if (followUp.status !== "blocked") {
      return {
        ok: false,
        code: "not_blocked",
        message: "follow_up_not_blocked",
        followUpId,
      };
    }
    return { ok: true, followUpId };
  }

  if (input.action === "CANCEL_FOLLOW_UP") {
    if (
      followUp.status !== "pending" &&
      followUp.status !== "blocked" &&
      followUp.status !== "failed"
    ) {
      return {
        ok: false,
        code: "not_cancellable",
        message: "follow_up_not_cancellable",
        followUpId,
      };
    }
    return { ok: true, followUpId };
  }

  if (input.action === "RESCHEDULE_FOLLOW_UP") {
    if (
      followUp.status !== "pending" &&
      followUp.status !== "blocked" &&
      followUp.status !== "failed"
    ) {
      return {
        ok: false,
        code: "not_reschedulable",
        message: "follow_up_not_reschedulable",
        followUpId,
      };
    }
    const dueAt = normalizeFollowUpDueAt(input.dueAt);
    if (!dueAt) {
      return {
        ok: false,
        code: "missing_due_at",
        message: "follow_up_due_at_required",
        followUpId,
      };
    }
    return { ok: true, followUpId, dueAt };
  }

  // COMPLETE_OVERDUE_FOLLOW_UP — pending / overdue / failed / blocked are valid.
  if (
    followUp.status !== "pending" &&
    followUp.status !== "failed" &&
    followUp.status !== "blocked"
  ) {
    return {
      ok: false,
      code: "follow_up_not_completable",
      message: "follow_up_not_open",
      followUpId,
    };
  }

  if (
    followUp.status === "pending" &&
    followUp.dueAt &&
    !isOverdue(followUp.dueAt, today) &&
    input.action === "COMPLETE_OVERDUE_FOLLOW_UP"
  ) {
    // Completing a non-overdue pending is still valid (operator chose complete).
  }

  return { ok: true, followUpId };
}

function isLeadActionJob(job: ExecutionJob, profileId: string): boolean {
  if (job.toolId !== "crm") return false;
  if (job.params.profileId !== profileId) return false;
  const leadAction = job.params.leadAction;
  if (typeof leadAction === "string" && isLeadExecutableAction(leadAction)) {
    return true;
  }
  const growthAction = job.params.growthAction;
  return (
    growthAction === "crm_follow_up" ||
    growthAction === "crm_follow_up_complete" ||
    growthAction === "crm_follow_up_cancel" ||
    growthAction === "crm_follow_up_reschedule" ||
    growthAction === "crm_status_advance" ||
    growthAction === "lead_action"
  );
}

export function getLatestLeadActionExecution(
  organizationId: string,
  profileId: string,
): LeadActionExecutionRef | undefined {
  const jobs = operationsService
    .list(organizationId)
    .filter((job) => isLeadActionJob(job, profileId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const job = jobs[0];
  if (!job) return undefined;
  const action =
    typeof job.params.leadAction === "string"
      ? job.params.leadAction
      : typeof job.params.growthAction === "string"
        ? job.params.growthAction
        : undefined;
  return {
    jobId: job.id,
    taskId: job.taskId,
    action,
    status: mapJobStatus(job.status),
    updatedAt: job.updatedAt,
    message: job.result?.message ?? blockerMessage(job),
    approvalId: findApprovalId(organizationId, job.taskId),
  };
}

export function attachLeadExecutionsToQueue(
  organizationId: string,
  queue: ReturnType<typeof buildLeadActionQueue>,
): ReturnType<typeof buildLeadActionQueue> {
  return {
    ...queue,
    items: queue.items.map((item) => ({
      ...item,
      execution: getLatestLeadActionExecution(organizationId, item.profileId),
    })),
  };
}

async function buildQueueWithLiveStatus(
  organizationId: string,
  today?: string,
): Promise<ReturnType<typeof buildLeadActionQueue>> {
  const crmStatuses = await loadCrmStatusesForOrganization(organizationId);
  return attachLeadExecutionsToQueue(
    organizationId,
    buildLeadActionQueue(organizationId, { today, crmStatuses }),
  );
}

type FollowUpRequester = (input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly campaignId?: string;
  readonly followUpId?: string;
  readonly kind?: "call" | "email_draft" | "meeting" | "general";
  readonly summary?: string;
  readonly completionNote?: string;
  readonly dueAt?: string;
  readonly leadAction: LeadExecutableAction;
}) => Promise<{
  readonly job: ExecutionJob;
  readonly taskId?: string;
  readonly followUpId?: string;
}>;

type CancelFollowUpRequester = (input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly campaignId?: string;
  readonly followUpId: string;
  readonly leadAction: LeadExecutableAction;
}) => Promise<{
  readonly job: ExecutionJob;
  readonly taskId?: string;
  readonly followUpId?: string;
}>;

type RescheduleFollowUpRequester = (input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly campaignId?: string;
  readonly followUpId: string;
  readonly dueAt: string;
  readonly leadAction: LeadExecutableAction;
}) => Promise<{
  readonly job: ExecutionJob;
  readonly taskId?: string;
  readonly followUpId?: string;
}>;

type StatusAdvanceRequester = (input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly campaignId?: string;
  readonly targetCrmStatus: CrmCustomerStatus;
  readonly fromCrmStatus?: CrmCustomerStatus;
  readonly leadAction: LeadExecutableAction;
}) => Promise<{
  readonly job: ExecutionJob;
  readonly taskId?: string;
}>;

/**
 * Execute a validated lead action through existing Agent OS operations.
 * REVIEW_CRM_LINK is read-only and never enqueues work.
 * ADVANCE_CRM_STATUS re-reads live CRM status before enqueue and on execute.
 */
export async function executeLeadAction(input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly action: string;
  readonly followUpId?: string;
  readonly campaignId?: string;
  readonly summary?: string;
  readonly completionNote?: string;
  readonly dueAt?: string;
  readonly targetCrmStatus?: CrmCustomerStatus;
  readonly today?: string;
  readonly requestCreateFollowUp: FollowUpRequester;
  readonly requestCompleteFollowUp: FollowUpRequester;
  readonly requestCancelFollowUp: CancelFollowUpRequester;
  readonly requestRescheduleFollowUp: RescheduleFollowUpRequester;
  readonly requestAdvanceCrmStatus: StatusAdvanceRequester;
}): Promise<{
  readonly execution: LeadActionExecution;
  readonly queue: ReturnType<typeof buildLeadActionQueue>;
}> {
  const now = nowIso();
  const validation = await validateLeadAction({
    organizationId: input.organizationId,
    profileId: input.profileId,
    action: input.action,
    followUpId: input.followUpId,
    targetCrmStatus: input.targetCrmStatus,
    dueAt: input.dueAt,
    today: input.today,
  });

  if (!validation.ok || !isLeadExecutableAction(input.action)) {
    const execution: LeadActionExecution = {
      id: createGrowthId("lax"),
      organizationId: input.organizationId,
      profileId: input.profileId,
      followUpId: input.followUpId,
      action: input.action,
      status: "INVALID",
      createdAt: now,
      updatedAt: now,
      message: validation.message ?? "unsupported_lead_action",
      readOnly: true,
      fromCrmStatus: validation.fromCrmStatus,
      toCrmStatus: validation.toCrmStatus,
    };
    return {
      execution,
      queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
    };
  }

  const action = input.action;
  const lead = getCrmLinkedLeadState(input.organizationId, input.profileId);

  if (action === "REVIEW_CRM_LINK") {
    const link = getGrowthCrmLink(input.organizationId, input.profileId);
    const execution: LeadActionExecution = {
      id: createGrowthId("lax"),
      organizationId: input.organizationId,
      profileId: input.profileId,
      action,
      status: "REVIEWED",
      createdAt: now,
      updatedAt: now,
      message: link ? "crm_link_ready_for_review" : "crm_link_missing",
      href: link?.href ?? lead.href,
      customerId: link?.customerId ?? lead.customerId,
      companyName: link?.companyName ?? lead.companyName,
      readOnly: true,
    };
    return {
      execution,
      queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
    };
  }

  if (
    action === "ADVANCE_CRM_STATUS" ||
    action === "DISPOSE_CRM_STATUS" ||
    action === "REACTIVATE_CRM_STATUS"
  ) {
    const toCrmStatus =
      validation.toCrmStatus ??
      input.targetCrmStatus ??
      (action === "ADVANCE_CRM_STATUS" && validation.fromCrmStatus
        ? nextAllowedCrmStatus(validation.fromCrmStatus)
        : undefined);
    if (!toCrmStatus) {
      const execution: LeadActionExecution = {
        id: createGrowthId("lax"),
        organizationId: input.organizationId,
        profileId: input.profileId,
        action,
        status: "INVALID",
        createdAt: now,
        updatedAt: now,
        message:
          action === "DISPOSE_CRM_STATUS" || action === "REACTIVATE_CRM_STATUS"
            ? "crm_status_explicit_target_required"
            : "crm_status_has_no_allowed_advance",
        readOnly: true,
        fromCrmStatus: validation.fromCrmStatus,
      };
      return {
        execution,
        queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
      };
    }
    const requested = await input.requestAdvanceCrmStatus({
      organizationId: input.organizationId,
      profileId: input.profileId,
      campaignId: input.campaignId,
      targetCrmStatus: toCrmStatus,
      fromCrmStatus: validation.fromCrmStatus,
      leadAction: action,
    });
    const execution = executionFromJob({
      organizationId: input.organizationId,
      profileId: input.profileId,
      action,
      job: requested.job,
      now,
      fromCrmStatus: validation.fromCrmStatus,
      toCrmStatus,
    });
    return {
      execution,
      queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
    };
  }

  if (action === "CREATE_FOLLOW_UP") {
    const dueAt =
      normalizeFollowUpDueAt(input.dueAt) ??
      defaultFollowUpDueAt(input.today);
    const requested = await input.requestCreateFollowUp({
      organizationId: input.organizationId,
      profileId: input.profileId,
      campaignId: input.campaignId,
      kind: "general",
      summary: input.summary ?? "Lead Action Queue: create CRM follow-up",
      dueAt,
      leadAction: action,
    });
    const execution = executionFromJob({
      organizationId: input.organizationId,
      profileId: input.profileId,
      action,
      job: requested.job,
      followUpId: requested.followUpId,
      now,
    });
    return {
      execution,
      queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
    };
  }

  const followUpId = validation.followUpId ?? input.followUpId!;

  if (action === "RESCHEDULE_FOLLOW_UP") {
    const dueAt = validation.dueAt ?? normalizeFollowUpDueAt(input.dueAt);
    if (!dueAt) {
      const execution: LeadActionExecution = {
        id: createGrowthId("lax"),
        organizationId: input.organizationId,
        profileId: input.profileId,
        followUpId,
        action,
        status: "INVALID",
        createdAt: now,
        updatedAt: now,
        message: "follow_up_due_at_required",
        readOnly: true,
      };
      return {
        execution,
        queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
      };
    }
    const requested = await input.requestRescheduleFollowUp({
      organizationId: input.organizationId,
      profileId: input.profileId,
      campaignId: input.campaignId,
      followUpId,
      dueAt,
      leadAction: action,
    });
    const execution = executionFromJob({
      organizationId: input.organizationId,
      profileId: input.profileId,
      action,
      job: requested.job,
      followUpId,
      now,
    });
    return {
      execution,
      queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
    };
  }

  if (action === "CANCEL_FOLLOW_UP") {
    const requested = await input.requestCancelFollowUp({
      organizationId: input.organizationId,
      profileId: input.profileId,
      campaignId: input.campaignId,
      followUpId,
      leadAction: action,
    });
    const execution = executionFromJob({
      organizationId: input.organizationId,
      profileId: input.profileId,
      action,
      job: requested.job,
      followUpId,
      now,
    });
    return {
      execution,
      queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
    };
  }

  // COMPLETE_OVERDUE | COMPLETE_PENDING | REVIEW_BLOCKED | RETRY_FAILED
  const defaultNote =
    action === "RETRY_FAILED_FOLLOW_UP"
      ? "Lead Action Queue: retry failed follow-up"
      : action === "REVIEW_BLOCKED_FOLLOW_UP"
        ? "Lead Action Queue: review blocked follow-up"
        : action === "COMPLETE_PENDING_FOLLOW_UP"
          ? "Lead Action Queue: complete pending follow-up"
          : "Lead Action Queue: complete follow-up";
  const requested = await input.requestCompleteFollowUp({
    organizationId: input.organizationId,
    profileId: input.profileId,
    campaignId: input.campaignId,
    followUpId,
    completionNote: input.completionNote ?? defaultNote,
    leadAction: action,
  });
  const execution = executionFromJob({
    organizationId: input.organizationId,
    profileId: input.profileId,
    action,
    job: requested.job,
    followUpId,
    now,
  });
  return {
    execution,
    queue: await buildQueueWithLiveStatus(input.organizationId, input.today),
  };
}

function executionFromJob(input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly action: LeadExecutableAction;
  readonly job: ExecutionJob;
  readonly followUpId?: string;
  readonly now: string;
  readonly fromCrmStatus?: CrmCustomerStatus;
  readonly toCrmStatus?: CrmCustomerStatus;
}): LeadActionExecution {
  const approvalId = findApprovalId(input.organizationId, input.job.taskId);
  return {
    id: input.job.id,
    organizationId: input.organizationId,
    profileId: input.profileId,
    followUpId: input.followUpId,
    action: input.action,
    taskId: input.job.taskId,
    jobId: input.job.id,
    approvalId,
    status: mapJobStatus(input.job.status),
    createdAt: input.job.createdAt ?? input.now,
    updatedAt: input.job.updatedAt ?? input.now,
    message: input.job.result?.message ?? blockerMessage(input.job),
    readOnly: false,
    fromCrmStatus: input.fromCrmStatus,
    toCrmStatus: input.toCrmStatus,
  };
}
