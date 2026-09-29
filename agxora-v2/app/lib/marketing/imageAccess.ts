/**
 * Server-side gates for one marketing image.
 * Client organization, worker, capability, and prompt values are not authority.
 */

export function assessMarketingImageAccess(input: {
  readonly actorOrganizationId: string;
  readonly planOrganizationId: string | null;
  readonly planFound: boolean;
  readonly planStatus: "draft" | "approved_stored" | "rejected" | "missing";
  readonly itemFound: boolean;
  readonly recordCompleted: boolean;
  readonly workerActive: boolean;
  readonly entitled: boolean;
  readonly clientOrganizationId?: string | null;
}): { readonly ok: true } | { readonly ok: false; readonly status: number; readonly error: string } {
  if (input.clientOrganizationId && input.clientOrganizationId !== input.actorOrganizationId) {
    return { ok: false, status: 404, error: "Marketing plan was not found." };
  }
  if (!input.workerActive) {
    return { ok: false, status: 403, error: "An active Marketing Worker is required." };
  }
  if (!input.entitled) {
    return { ok: false, status: 403, error: "This plan cannot create a marketing image." };
  }
  if (!input.planFound || input.planOrganizationId !== input.actorOrganizationId) {
    return { ok: false, status: 404, error: "Marketing plan was not found." };
  }
  if (input.planStatus !== "approved_stored") {
    return { ok: false, status: 403, error: "An approved marketing plan is required." };
  }
  if (!input.recordCompleted) {
    return { ok: false, status: 404, error: "Marketing plan was not found." };
  }
  if (!input.itemFound) {
    return { ok: false, status: 404, error: "Marketing plan item was not found." };
  }
  return { ok: true };
}

export function readMarketingImageAction(
  body: { readonly action?: unknown; readonly priorExecutionId?: unknown } | null,
  expected: "generate" | "regenerate",
): { readonly ok: true; readonly priorExecutionId?: string } | { readonly ok: false; readonly status: 400; readonly error: string } {
  if (body?.action !== expected) {
    return { ok: false, status: 400, error: "Generate requires an explicit action." };
  }
  if (expected === "regenerate") {
    const priorExecutionId = typeof body.priorExecutionId === "string" ? body.priorExecutionId.trim() : "";
    if (!priorExecutionId) {
      return { ok: false, status: 400, error: "Regenerate requires the previous image." };
    }
    return { ok: true, priorExecutionId };
  }
  return { ok: true };
}

export function priorMarketingImageMatches(input: {
  readonly actorOrganizationId: string;
  readonly organizationId: string;
  readonly goalId: string;
  readonly planId: string;
  readonly executionGoalId: string;
  readonly executionPlanId: string;
  readonly day: number;
  readonly outcomeDay: unknown;
  readonly capabilityId: string;
}): boolean {
  return input.organizationId === input.actorOrganizationId
    && input.executionGoalId === input.goalId
    && input.executionPlanId === input.planId
    && input.outcomeDay === input.day
    && input.capabilityId === "MARKETING_CREATE_IMAGE";
}
