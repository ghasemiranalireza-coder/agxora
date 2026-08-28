/**
 * Phase 59.1 / 61.1 — authorize creative generation from persisted Agent OS state.
 * Client approvalState is never authoritative.
 * Phase 61.1: exact executionJobId binding only — no stale/latest job fallback.
 */

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { CreativeProject } from "@/features/agents/creative/types";

export type CreativeGenerationAuthorization = {
  readonly project: CreativeProject;
  readonly job: ExecutionJob;
  readonly approval: AgentApproval;
};

function readCreativeId(params: Readonly<Record<string, unknown>>): string | undefined {
  const value = params.creativeId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Resolve actor-owned creative project + APPROVED creative_generate approval
 * for the exact bound ExecutionJob on the project.
 * Throws PersistenceError; never calls a provider.
 */
export function authorizeCreativeGenerationFromState(
  state: AgentsPersistedState,
  actorOrganizationId: string,
  creativeProjectId: string,
): CreativeGenerationAuthorization {
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

  if (!project.executionJobId) {
    throw new PersistenceError(
      "forbidden",
      "No creative_generate execution job bound to this creative project",
      {
        details: [{ field: "executionJobId", message: "missing_bound_job" }],
      },
    );
  }

  const job = state.executionJobs.find(
    (item) =>
      item.id === project.executionJobId &&
      item.organizationId === actorOrganizationId &&
      item.toolId === "creative_generate" &&
      readCreativeId(item.params) === creativeProjectId,
  );

  if (!job) {
    throw new PersistenceError(
      "forbidden",
      "Bound creative_generate execution job is missing or stale",
      {
        details: [{ field: "executionJobId", message: "stale_bound_job" }],
      },
    );
  }

  let approval: AgentApproval | undefined;
  if (job.approvalId) {
    approval = state.approvals.find(
      (item) =>
        item.id === job.approvalId &&
        item.organizationId === actorOrganizationId,
    );
  }
  if (!approval && job.taskId) {
    approval = state.approvals
      .filter(
        (item) =>
          item.organizationId === actorOrganizationId &&
          item.toolId === "creative_generate" &&
          item.taskId === job.taskId,
      )
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
      .at(-1);
  }

  if (!approval) {
    throw new PersistenceError(
      "forbidden",
      "Creative generation requires an approved AgentApproval",
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

  if (approval.toolId !== "creative_generate") {
    throw new PersistenceError(
      "forbidden",
      "Approval is not for creative_generate",
      {
        details: [{ field: "toolId", message: "mismatch" }],
      },
    );
  }

  if (approval.state !== "APPROVED") {
    throw new PersistenceError(
      "forbidden",
      "Creative generation requires an approved AgentApproval",
      {
        details: [{ field: "approval.state", message: approval.state }],
      },
    );
  }

  return { project, job, approval };
}
