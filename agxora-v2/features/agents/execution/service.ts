/**
 * Operations jobs — projections over Agent OS tasks, not a second engine.
 */

import { auditLog } from "@/app/lib/backend/audit/logger";
import { agentOsService } from "../services/agentOsService";
import { agentsStore } from "../store";
import { getToolDefinition } from "../tools";
import type { AgentApproval, AgentId, AgentTask, ToolId } from "../types";
import {
  agentIdForTool,
  canRetryJob,
  defaultRetryPolicy,
  isExternalSideEffectTool,
  type ExecutionAttempt,
  type ExecutionBlocker,
  type ExecutionEvent,
  type ExecutionEventType,
  type ExecutionJob,
  type ExecutionJobStatus,
  type ExecutionPriority,
  type ExecutionResult,
} from "./jobs";
import { countJobsByStatus, inspectExecutionQueue, sortExecutionQueue } from "./queue";
import { evaluateCampaignOperationsReadiness } from "./readiness";

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function orgJobs(organizationId: string): ExecutionJob[] {
  return agentsStore
    .getSnapshot()
    .executionJobs.filter((job) => job.organizationId === organizationId);
}

function getJob(organizationId: string, jobId: string): ExecutionJob | undefined {
  return orgJobs(organizationId).find((job) => job.id === jobId);
}

function requireJob(organizationId: string, jobId: string): ExecutionJob {
  const job = getJob(organizationId, jobId);
  if (!job) throw new Error("Execution job not found");
  return job;
}

function auditJob(
  action: string,
  job: ExecutionJob,
  metadata?: Readonly<Record<string, string>>,
): void {
  auditLog({
    action,
    resource: "agent_operations",
    resourceId: job.id,
    organizationId: job.organizationId,
    metadata: {
      status: job.status,
      toolId: job.toolId,
      ...(metadata ?? {}),
    },
  });
}

function pushEvent(
  job: ExecutionJob,
  type: ExecutionEventType,
  actor: string,
  metadata?: Readonly<Record<string, string>>,
): ExecutionEvent {
  const event: ExecutionEvent = {
    id: createId("eevt"),
    organizationId: job.organizationId,
    executionJobId: job.id,
    timestamp: nowIso(),
    type,
    actor,
    message: type,
    metadata,
  };
  agentsStore.pushExecutionEvent(event);
  return event;
}

function persistJob(job: ExecutionJob): ExecutionJob {
  agentsStore.upsertExecutionJob(job);
  return job;
}

function appendAttempt(
  job: ExecutionJob,
  patch: Partial<ExecutionAttempt> & Pick<ExecutionAttempt, "status">,
): ExecutionAttempt {
  const attempt: ExecutionAttempt = {
    id: createId("eatt"),
    executionJobId: job.id,
    attempt: job.attempts.length + 1,
    startedAt: nowIso(),
    status: patch.status,
    completedAt: patch.completedAt,
    result: patch.result,
    error: patch.error,
  };
  agentsStore.pushExecutionAttempt(attempt);
  return attempt;
}

function syncCampaign(job: ExecutionJob): void {
  if (!job.campaignId) return;
  const campaign = agentsStore
    .getSnapshot()
    .campaigns.find((item) => item.id === job.campaignId);
  if (!campaign) return;
  const tasks = campaign.tasks.map((task) => {
    const matchesTask = job.campaignTaskId
      ? task.id === job.campaignTaskId
      : (isExternalSideEffectTool(job.toolId) && task.code === "publish_content") ||
        (job.toolId === "crm" &&
          (task.code === "sync_crm_customer" || task.code === "attach_crm_note"));
    if (!matchesTask) return task;
    if (job.status === "COMPLETED") {
      return { ...task, status: "completed" as const, executionJobId: job.id };
    }
    if (job.status === "BLOCKED" || job.status === "FAILED" || job.status === "CANCELLED") {
      return { ...task, status: "blocked" as const, executionJobId: job.id };
    }
    return { ...task, executionJobId: job.id };
  });
  const requiredBlocked = tasks.some(
    (task) => task.externalSideEffect && task.status === "blocked",
  );
  let nextStatus = campaign.status;
  if (job.status === "RUNNING" || job.status === "WAITING_FOR_APPROVAL" || job.status === "VERIFYING") {
    nextStatus = "IN_PROGRESS";
  }
  if (job.status === "BLOCKED" || requiredBlocked) {
    nextStatus = "BLOCKED";
  }
  if (nextStatus === "COMPLETED" && requiredBlocked) {
    nextStatus = "BLOCKED";
  }
  agentsStore.upsertCampaign({
    ...campaign,
    tasks,
    status: nextStatus,
    updatedAt: nowIso(),
  });
}

function outcomeFromTask(job: ExecutionJob, task: AgentTask): ExecutionResult {
  const campaign = job.campaignId
    ? agentsStore.getSnapshot().campaigns.find((item) => item.id === job.campaignId)
    : undefined;
  const website = agentsStore.getSnapshot().websiteProjects.find(
    (item) => item.taskId === task.id || item.id === campaign?.websiteProjectId,
  );
  const content = agentsStore
    .getSnapshot()
    .socialContent.find((item) => item.taskId === task.id);

  if (isExternalSideEffectTool(job.toolId)) {
    const published =
      campaign?.executionResult?.published === true ||
      website?.publishResult?.published === true ||
      content?.publishResult?.published === true;
    const available =
      campaign?.executionResult?.available === true ||
      website?.publishResult?.available === true ||
      content?.publishResult?.available === true;
    if (published && available) {
      return {
        success: true,
        status: "completed",
        externalEffect: true,
        message: "completed",
        metadata: { toolId: job.toolId },
      };
    }
    return {
      success: false,
      status: "unavailable",
      externalEffect: false,
      message: "publishing_unavailable",
      metadata: { toolId: job.toolId },
    };
  }

  if (job.toolId === "crm") {
    const sync = agentsStore
      .getSnapshot()
      .campaignCrmSyncs.find(
        (item) =>
          item.taskId === task.id ||
          (job.campaignId !== undefined && item.campaignId === job.campaignId),
      );
    const bridge = sync?.result;
    const link = agentsStore
      .getSnapshot()
      .growthCrmLinks.find((item) => item.id === sync?.linkId);

    // Current operation failures always win over any historical GrowthCrmLink.
    if (
      bridge?.outcome === "unavailable" ||
      bridge?.available === false ||
      sync?.status === "blocked"
    ) {
      return {
        success: false,
        status: "unavailable",
        externalEffect: false,
        message: bridge?.message ?? "crm_unavailable",
        metadata: { toolId: job.toolId },
      };
    }

    if (
      bridge?.success === false ||
      bridge?.outcome === "error" ||
      sync?.status === "failed"
    ) {
      return {
        success: false,
        status: "failed",
        externalEffect: false,
        message: bridge?.message ?? task.error ?? "crm_failed",
        metadata: { toolId: job.toolId },
      };
    }

    // Only the CURRENT bridge/sync result may establish COMPLETED.
    // Historical link outcomes are never used as a success fallback.
    if (
      bridge?.success === true ||
      bridge?.outcome === "created" ||
      bridge?.outcome === "linked" ||
      bridge?.outcome === "already-linked"
    ) {
      return {
        success: true,
        status: "completed",
        externalEffect: false,
        message: bridge.outcome ?? "completed",
        metadata: {
          toolId: job.toolId,
          ...(bridge.customerId || link?.customerId
            ? { customerId: bridge.customerId ?? link?.customerId ?? "" }
            : {}),
        },
      };
    }
  }

  if (task.status === "failed") {
    return {
      success: false,
      status: "failed",
      externalEffect: false,
      message: task.error ?? "failed",
      metadata: { toolId: job.toolId },
    };
  }

  return {
    success: task.status === "completed",
    status: task.status === "completed" ? "completed" : "failed",
    externalEffect: task.status === "completed",
    message: task.status === "completed" ? "completed" : (task.error ?? "failed"),
    metadata: { toolId: job.toolId },
  };
}

function applyOutcome(job: ExecutionJob, task: AgentTask, actor: string): ExecutionJob {
  const approval = agentsStore
    .getSnapshot()
    .approvals.find((item) => item.taskId === task.id);
  if (task.status === "blocked" && approval?.state === "REQUIRES_APPROVAL") {
    const next = persistJob({
      ...job,
      taskId: task.id,
      approvalId: approval.id,
      status: "WAITING_FOR_APPROVAL",
      updatedAt: nowIso(),
    });
    pushEvent(next, "APPROVAL_REQUESTED", actor);
    auditJob("agent.operations.approval_requested", next, { approvalId: approval.id });
    syncCampaign(next);
    return next;
  }
  if (task.status === "blocked" && approval?.state === "REJECTED") {
    return finishJob(job, task, actor, {
      success: false,
      status: "rejected",
      externalEffect: false,
      message: "approval_rejected",
      metadata: { toolId: job.toolId },
    });
  }

  const verifying = persistJob({
    ...job,
    taskId: task.id,
    approvalId: approval?.id ?? job.approvalId,
    status: "VERIFYING",
    updatedAt: nowIso(),
  });
  pushEvent(verifying, "VERIFICATION_STARTED", actor);
  return finishJob(verifying, task, actor, outcomeFromTask(verifying, task));
}

function finishJob(
  job: ExecutionJob,
  task: AgentTask,
  actor: string,
  result: ExecutionResult,
): ExecutionJob {
  const blocker: ExecutionBlocker | undefined = result.success
    ? undefined
    : result.status === "unavailable"
      ? {
          code:
            result.message === "crm_unavailable" || job.toolId === "crm"
              ? "crm.unavailable"
              : "publishing.unavailable",
          retryable: false,
        }
      : result.status === "rejected"
        ? { code: "approval.rejected", retryable: false }
        : result.status === "cancelled"
          ? { code: "cancelled", retryable: false }
          : undefined;
  const status: ExecutionJobStatus = result.success
    ? "COMPLETED"
    : result.status === "unavailable" || result.status === "rejected"
      ? "BLOCKED"
      : result.status === "cancelled"
        ? "CANCELLED"
        : "FAILED";
  const attempt = appendAttempt(job, {
    status,
    completedAt: nowIso(),
    result,
    error: result.success ? undefined : result.message,
  });
  const next = persistJob({
    ...job,
    taskId: task.id,
    status,
    result,
    blocker,
    retryable: status === "FAILED" ? job.retryable : false,
    lastError: result.success ? undefined : result.message,
    completedAt: nowIso(),
    attempts: [...job.attempts, attempt],
    updatedAt: nowIso(),
  });
  const eventType =
    status === "COMPLETED"
      ? "COMPLETED"
      : status === "BLOCKED"
        ? "BLOCKED"
        : status === "CANCELLED"
          ? "CANCELLED"
          : "FAILED";
  pushEvent(next, eventType, actor);
  auditJob(
    status === "COMPLETED"
      ? "agent.operations.execution_completed"
      : status === "BLOCKED"
        ? "agent.operations.execution_blocked"
        : status === "CANCELLED"
          ? "agent.operations.execution_cancelled"
          : "agent.operations.execution_failed",
    next,
  );
  syncCampaign(next);
  return next;
}

function runtimeFor(organizationId: string, agentId: AgentId) {
  agentOsService.ensureWorkspace(organizationId);
  const existing = agentOsService
    .listRuntimes(organizationId)
    .find((item) => item.agentId === agentId);
  if (existing) {
    if (existing.status !== "active") {
      return agentOsService.setStatus(existing.instanceId, "active");
    }
    return existing;
  }
  return agentOsService.register(organizationId, agentId, true);
}

export const operationsService = {
  list(organizationId: string): readonly ExecutionJob[] {
    return sortExecutionQueue(orgJobs(organizationId));
  },

  get(organizationId: string, jobId: string): ExecutionJob | undefined {
    return getJob(organizationId, jobId);
  },

  queue(organizationId: string): readonly ExecutionJob[] {
    return inspectExecutionQueue(agentsStore.getSnapshot().executionJobs, organizationId);
  },

  events(organizationId: string): readonly ExecutionEvent[] {
    return agentsStore
      .getSnapshot()
      .executionEvents.filter((event) => event.organizationId === organizationId);
  },

  overview(organizationId: string) {
    const jobs = orgJobs(organizationId);
    return {
      counts: countJobsByStatus(jobs, organizationId),
      jobs: sortExecutionQueue(jobs),
      queue: inspectExecutionQueue(jobs, organizationId),
      events: this.events(organizationId).slice(0, 40),
    };
  },

  enqueue(input: {
    readonly organizationId: string;
    readonly toolId: ToolId;
    readonly title?: string;
    readonly agentId?: AgentId;
    readonly campaignId?: string;
    readonly campaignTaskId?: string;
    readonly priority?: ExecutionPriority;
    readonly params?: Readonly<Record<string, unknown>>;
    readonly actor?: string;
  }): ExecutionJob {
    agentOsService.ensureWorkspace(input.organizationId);
    const tool = getToolDefinition(input.toolId);
    if (!tool) throw new Error("Unknown tool");
    const policy = defaultRetryPolicy(input.toolId);
    const now = nowIso();
    const job: ExecutionJob = {
      id: createId("ejob"),
      organizationId: input.organizationId,
      agentId: input.agentId ?? agentIdForTool(input.toolId),
      campaignId: input.campaignId,
      campaignTaskId: input.campaignTaskId,
      toolId: input.toolId,
      title: input.title ?? tool.name,
      status: "QUEUED",
      priority: input.priority ?? "NORMAL",
      requiresApproval: tool.requiresApproval === true,
      paused: false,
      queueSeq: agentsStore.nextExecutionQueueSeq(),
      attempts: [],
      maxAttempts: policy.maxAttempts,
      retryable: policy.retryable,
      createdAt: now,
      params: input.params ?? {},
      updatedAt: now,
    };
    persistJob(job);
    pushEvent(job, "QUEUED", input.actor ?? "operator");
    auditJob("agent.operations.job_created", job);
    return job;
  },

  pause(organizationId: string, jobId: string): ExecutionJob {
    const job = requireJob(organizationId, jobId);
    if (job.status !== "QUEUED" && job.status !== "READY") {
      throw new Error("Only queued or ready jobs can be paused");
    }
    return persistJob({ ...job, paused: true, updatedAt: nowIso() });
  },

  async start(organizationId: string, jobId: string, actor = "operator"): Promise<ExecutionJob> {
    const current = requireJob(organizationId, jobId);
    if (current.status === "COMPLETED") {
      throw new Error("Completed jobs cannot be started");
    }
    if (
      current.status !== "QUEUED" &&
      current.status !== "READY" &&
      current.status !== "RETRYING"
    ) {
      throw new Error("Job cannot be started from the current status");
    }
    const job = persistJob({
      ...current,
      paused: false,
      status: "RUNNING",
      startedAt: current.startedAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    if (!job.requiresApproval) {
      pushEvent(job, "STARTED", actor);
    }
    auditJob("agent.operations.execution_started", job);
    const runtime = runtimeFor(organizationId, job.agentId);
    try {
      const task = await agentOsService.enqueueTask({
        organizationId,
        agentInstanceId: runtime.instanceId,
        title: job.title,
        goal: job.title,
        toolId: job.toolId,
        payload: {
          ...job.params,
          executionJobId: job.id,
          campaignId: job.campaignId,
          campaignTaskId: job.campaignTaskId,
        },
      });
      return applyOutcome(job, task, actor);
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed";
      const failedTask = {
        id: job.taskId ?? job.id,
        status: "failed" as const,
        error: message,
      } as AgentTask;
      return finishJob(job, failedTask, actor, {
        success: false,
        status: "failed",
        externalEffect: false,
        message,
        metadata: { toolId: job.toolId },
      });
    }
  },

  cancel(organizationId: string, jobId: string, actor = "operator"): ExecutionJob {
    const job = requireJob(organizationId, jobId);
    if (job.status === "COMPLETED") {
      throw new Error("Completed jobs cannot be cancelled");
    }
    if (job.taskId) {
      agentOsService.cancelTask(job.taskId);
    }
    const result: ExecutionResult = {
      success: false,
      status: "cancelled",
      externalEffect: false,
      message: "cancelled",
      metadata: { toolId: job.toolId },
    };
    const attempt = appendAttempt(job, {
      status: "CANCELLED",
      completedAt: nowIso(),
      result,
    });
    const next = persistJob({
      ...job,
      status: "CANCELLED",
      result,
      blocker: { code: "cancelled", retryable: false },
      retryable: false,
      completedAt: nowIso(),
      attempts: [...job.attempts, attempt],
      updatedAt: nowIso(),
    });
    pushEvent(next, "CANCELLED", actor);
    auditJob("agent.operations.execution_cancelled", next);
    syncCampaign(next);
    return next;
  },

  async retry(organizationId: string, jobId: string, actor = "operator"): Promise<ExecutionJob> {
    const job = requireJob(organizationId, jobId);
    if (!canRetryJob(job)) {
      throw new Error("Job is not retryable");
    }
    const retrying = persistJob({
      ...job,
      status: "RETRYING",
      completedAt: undefined,
      lastError: undefined,
      result: undefined,
      blocker: undefined,
      updatedAt: nowIso(),
    });
    pushEvent(retrying, "RETRY_REQUESTED", actor);
    auditJob("agent.operations.retry_requested", retrying, {
      attempt: String(job.attempts.length + 1),
    });
    return this.start(organizationId, retrying.id, actor);
  },

  syncFromApproval(approval: AgentApproval, actor = "operator"): ExecutionJob | undefined {
    const job = orgJobs(approval.organizationId).find(
      (item) => item.approvalId === approval.id || item.taskId === approval.taskId,
    );
    if (!job) return undefined;
    if (approval.state === "REJECTED") {
      const task = agentsStore.getSnapshot().tasks.find((item) => item.id === approval.taskId);
      if (!task) return job;
      pushEvent(job, "REJECTED", actor);
      auditJob("agent.operations.approval_resolved", job, { state: "REJECTED" });
      return finishJob(job, task, actor, {
        success: false,
        status: "rejected",
        externalEffect: false,
        message: "approval_rejected",
        metadata: { toolId: job.toolId },
      });
    }
    pushEvent(job, "APPROVED", actor);
    auditJob("agent.operations.approval_resolved", job, { state: "APPROVED" });
    const ready = persistJob({
      ...job,
      status: "READY",
      updatedAt: nowIso(),
    });
    const task = agentsStore.getSnapshot().tasks.find((item) => item.id === approval.taskId);
    if (!task) return ready;
    const running = persistJob({
      ...ready,
      status: "RUNNING",
      startedAt: ready.startedAt ?? nowIso(),
      updatedAt: nowIso(),
    });
    pushEvent(running, "STARTED", actor);
    return applyOutcome(running, task, actor);
  },

  observeAgentTask(input: {
    readonly organizationId: string;
    readonly task: AgentTask;
    readonly toolId: ToolId;
    readonly campaignId?: string;
    readonly title?: string;
    readonly actor?: string;
    readonly priority?: ExecutionPriority;
  }): ExecutionJob {
    const existing = orgJobs(input.organizationId).find((job) => job.taskId === input.task.id);
    if (existing) {
      return applyOutcome(existing, input.task, input.actor ?? "system");
    }
    const queued = this.enqueue({
      organizationId: input.organizationId,
      toolId: input.toolId,
      title: input.title,
      campaignId: input.campaignId,
      priority: input.priority,
      actor: input.actor ?? "system",
      params: input.task.input,
    });
    const started = persistJob({
      ...queued,
      taskId: input.task.id,
      startedAt: nowIso(),
      status: "RUNNING",
      updatedAt: nowIso(),
    });
    return applyOutcome(started, input.task, input.actor ?? "system");
  },

  operationsReadiness(organizationId: string) {
    const snap = agentsStore.getSnapshot();
    const profile = snap.growthProfiles.find((item) => item.organizationId === organizationId);
    if (!profile) {
      return {
        score: 0,
        ready: false,
        readyTasks: 0,
        blockedTasks: 0,
        pendingApprovals: 0,
        failedTasks: 0,
        warnings: ["profile.incomplete"],
        blockers: [],
        completedChecks: [],
      };
    }
    return evaluateCampaignOperationsReadiness({
      profile,
      campaign: snap.campaigns.find((item) => item.organizationId === organizationId),
      accounts: snap.socialAccounts.filter((item) => item.organizationId === organizationId),
      website: snap.websiteProjects.find((item) => item.organizationId === organizationId),
      jobs: orgJobs(organizationId),
    });
  },
};
