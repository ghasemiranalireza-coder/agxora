/**
 * Phase 63.0 — authorize creative publish from persisted Agent OS state.
 * Client approvalState is never authoritative.
 * Exact publishExecutionJobId binding only — no stale/latest job fallback.
 */

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { CreativeProject } from "@/features/agents/creative/types";

export type CreativePublishAuthorization = {
  readonly project: CreativeProject;
  readonly job: ExecutionJob;
  readonly approval: AgentApproval;
};

function readCreativeId(params: Readonly<Record<string, unknown>>): string | undefined {
  const value = params.creativeId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Resolve actor-owned creative project + APPROVED creative_publish approval
 * for the exact bound publish ExecutionJob on the project.
 * Throws PersistenceError; never calls a provider/adapter.
 */
export function authorizeCreativePublishFromState(
  state: AgentsPersistedState,
  actorOrganizationId: string,
  creativeProjectId: string,
): CreativePublishAuthorization {
  const project = state.creativeProjects.find(
    (item) =>
      item.id === creativeProjectId &&
      item.organizationId === actorOrganizationId,
  );
  if (!project) {
    throw new PersistenceError(
      "not_found",
      "Creative project not found for organization",
      {
        details: [{ field: "creativeProjectId", message: "not_found_or_cross_org" }],
      },
    );
  }

  if (!project.publishExecutionJobId) {
    throw new PersistenceError(
      "forbidden",
      "No creative_publish execution job bound to this creative project",
      {
        details: [{ field: "publishExecutionJobId", message: "missing_bound_job" }],
      },
    );
  }

  const job = state.executionJobs.find(
    (item) =>
      item.id === project.publishExecutionJobId &&
      item.organizationId === actorOrganizationId &&
      item.toolId === "creative_publish" &&
      readCreativeId(item.params) === creativeProjectId,
  );

  if (!job) {
    throw new PersistenceError(
      "forbidden",
      "Bound creative_publish execution job is missing or stale",
      {
        details: [{ field: "publishExecutionJobId", message: "stale_bound_job" }],
      },
    );
  }

  if (!job.approvalId) {
    throw new PersistenceError(
      "forbidden",
      "Creative publish requires an approved AgentApproval",
      {
        details: [{ field: "approval", message: "missing_approval_id" }],
      },
    );
  }

  const approval = state.approvals.find(
    (item) =>
      item.id === job.approvalId &&
      item.organizationId === actorOrganizationId,
  );

  if (!approval) {
    throw new PersistenceError(
      "forbidden",
      "Creative publish requires an approved AgentApproval",
      {
        details: [{ field: "approval", message: "missing" }],
      },
    );
  }

  if (approval.organizationId !== actorOrganizationId) {
    throw new PersistenceError(
      "forbidden",
      "Approval organization mismatch",
      {
        details: [{ field: "approval", message: "cross_org" }],
      },
    );
  }

  if (approval.toolId !== "creative_publish") {
    throw new PersistenceError(
      "forbidden",
      "Approval is not for creative_publish",
      {
        details: [{ field: "toolId", message: "mismatch" }],
      },
    );
  }

  if (approval.state !== "APPROVED") {
    throw new PersistenceError(
      "forbidden",
      "Creative publish requires an approved AgentApproval",
      {
        details: [{ field: "approval.state", message: approval.state }],
      },
    );
  }

  return { project, job, approval };
}
