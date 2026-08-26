/**
 * Growth CRM follow-up operations — Agent OS metadata + real CRM note mutations.
 * Never claims outbound email/calendar send; email_draft is a CRM note only.
 */

import { createGrowthId, nowIso } from "../growth/ids";
import { agentsStore } from "../store";
import {
  emptyNoteDraft,
  getCrmBridgeProvider,
  type CrmBridgeProvider,
} from "./adapter";
import { getGrowthCrmLink } from "./sync";
import type {
  CrmFollowUpKind,
  CrmFollowUpOutcome,
  CrmFollowUpResult,
  CrmLeadNextAction,
  CrmLinkedLeadState,
  GrowthCrmFollowUp,
  GrowthCrmLink,
} from "./types";

const FOLLOW_UP_AUTHOR = "Growth Agent";
const HREF_PREFIX = "/dashboard/crm";

function isUnavailableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "CrmBridgeUnavailableError" ||
      error.message.includes("unavailable"))
  );
}

function followUpHref(customerId: string): string {
  return `${HREF_PREFIX}/${encodeURIComponent(customerId)}`;
}

function dayKey(iso?: string): string | undefined {
  if (!iso) return undefined;
  return iso.slice(0, 10);
}

function isOverdue(followUp: GrowthCrmFollowUp, today: string): boolean {
  const due = dayKey(followUp.dueAt);
  return Boolean(due && due < today);
}

function sortOpenFollowUps(
  items: readonly GrowthCrmFollowUp[],
): GrowthCrmFollowUp[] {
  return [...items].sort((a, b) => {
    const aDue = dayKey(a.dueAt) ?? "9999-12-31";
    const bDue = dayKey(b.dueAt) ?? "9999-12-31";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function evaluateCrmLeadNextAction(input: {
  readonly link: GrowthCrmLink | null;
  readonly openFollowUps: readonly GrowthCrmFollowUp[];
  readonly today?: string;
  /** Live CRM customer status — when present, status advance/dispose beats endless create. */
  readonly crmStatus?: import("@/app/lib/crm/directory").CrmCustomerStatus;
}): CrmLeadNextAction {
  if (!input.link) {
    return { code: "link_to_crm" };
  }
  const today = input.today ?? nowIso().slice(0, 10);
  const open = sortOpenFollowUps(input.openFollowUps);
  if (open.length === 0) {
    const crmStatus = input.crmStatus;
    if (crmStatus === "archived") {
      return {
        code: "reactivate_crm_status",
        crmStatus,
        targetCrmStatus: "inactive",
        reactivationTargets: ["inactive"],
      };
    }
    if (crmStatus === "vip") {
      return {
        code: "reactivate_crm_status",
        crmStatus,
        reactivationTargets: ["active", "inactive"],
      };
    }
    if (crmStatus === "lead") {
      return {
        code: "advance_crm_status",
        crmStatus,
        targetCrmStatus: "prospect",
      };
    }
    if (crmStatus === "prospect") {
      return {
        code: "advance_crm_status",
        crmStatus,
        targetCrmStatus: "active",
      };
    }
    if (crmStatus === "active") {
      return {
        code: "dispose_crm_status",
        crmStatus,
        dispositionTargets: ["vip", "inactive"],
      };
    }
    if (crmStatus === "inactive") {
      return {
        code: "reactivate_crm_status",
        crmStatus,
        targetCrmStatus: "active",
        reactivationTargets: ["active"],
      };
    }
    return { code: "create_follow_up", crmStatus };
  }
  const overdue = open.find((item) => isOverdue(item, today));
  if (overdue) {
    return {
      code: "complete_overdue_follow_up",
      followUpId: overdue.id,
      dueAt: overdue.dueAt,
      crmStatus: input.crmStatus,
    };
  }
  const next = open[0]!;
  return {
    code: "complete_open_follow_up",
    followUpId: next.id,
    dueAt: next.dueAt,
    crmStatus: input.crmStatus,
  };
}

function buildFollowUpNoteBody(input: {
  readonly kind: CrmFollowUpKind;
  readonly summary: string;
  readonly dueAt?: string;
  readonly campaignName?: string;
  readonly companyName: string;
}): string {
  const lines = [
    `Follow-up kind: ${input.kind}`,
    `Company: ${input.companyName}`,
    input.dueAt ? `Due: ${input.dueAt}` : undefined,
    input.campaignName ? `Campaign: ${input.campaignName}` : undefined,
    "",
    input.summary.trim(),
    "",
    "Source: AGXORA Growth Agent (internal CRM note).",
    input.kind === "email_draft"
      ? "Note: email_draft records a draft only — no outbound email was sent."
      : undefined,
  ].filter((line): line is string => typeof line === "string");
  return lines.join("\n");
}

function resultOf(
  outcome: CrmFollowUpOutcome,
  message: string,
  extras?: Partial<CrmFollowUpResult>,
): CrmFollowUpResult {
  const available = outcome !== "unavailable";
  const success = outcome === "created" || outcome === "completed";
  return {
    available,
    success,
    outcome,
    message,
    duplicated: false,
    ...extras,
  };
}

function persistFollowUp(row: GrowthCrmFollowUp): GrowthCrmFollowUp {
  agentsStore.upsertGrowthCrmFollowUp(row);
  return row;
}

function orgFollowUps(organizationId: string): GrowthCrmFollowUp[] {
  return agentsStore
    .getSnapshot()
    .crmFollowUps.filter((item) => item.organizationId === organizationId);
}

export function listCrmFollowUps(
  organizationId: string,
  options?: {
    readonly customerId?: string;
    readonly campaignId?: string;
    readonly linkId?: string;
    readonly status?: GrowthCrmFollowUp["status"];
  },
): readonly GrowthCrmFollowUp[] {
  return orgFollowUps(organizationId).filter((item) => {
    if (options?.customerId && item.customerId !== options.customerId) return false;
    if (options?.campaignId && item.campaignId !== options.campaignId) return false;
    if (options?.linkId && item.linkId !== options.linkId) return false;
    if (options?.status && item.status !== options.status) return false;
    return true;
  });
}

export function getCrmFollowUp(
  organizationId: string,
  followUpId: string,
): GrowthCrmFollowUp | undefined {
  return orgFollowUps(organizationId).find((item) => item.id === followUpId);
}

export function getCrmFollowUpByTask(
  organizationId: string,
  taskId: string,
): GrowthCrmFollowUp | undefined {
  return orgFollowUps(organizationId).find((item) => item.taskId === taskId);
}

export function getCrmLinkedLeadState(
  organizationId: string,
  profileId?: string,
  options?: {
    readonly crmStatus?: import("@/app/lib/crm/directory").CrmCustomerStatus;
  },
): CrmLinkedLeadState {
  const link = getGrowthCrmLink(organizationId, profileId) ?? null;
  const followUps = link
    ? listCrmFollowUps(organizationId, { linkId: link.id })
    : listCrmFollowUps(organizationId);
  const openFollowUps = followUps.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "blocked" ||
      item.status === "failed",
  );
  const completedFollowUps = followUps.filter(
    (item) => item.status === "completed",
  );
  const today = nowIso().slice(0, 10);
  const overdueFollowUps = openFollowUps.filter((item) => isOverdue(item, today));
  const nextAction = evaluateCrmLeadNextAction({
    link,
    openFollowUps,
    today,
    crmStatus: options?.crmStatus,
  });
  return {
    link,
    customerId: link?.customerId,
    companyName: link?.companyName,
    href: link?.href,
    openFollowUps,
    completedFollowUps,
    overdueFollowUps,
    nextAction,
  };
}

export async function createCrmFollowUp(input: {
  readonly organizationId: string;
  readonly profileId: string;
  readonly kind?: CrmFollowUpKind;
  readonly title?: string;
  readonly summary?: string;
  readonly dueAt?: string;
  readonly campaignId?: string;
  readonly campaignName?: string;
  readonly taskId?: string;
  readonly provider?: CrmBridgeProvider;
}): Promise<{
  readonly result: CrmFollowUpResult;
  readonly followUp: GrowthCrmFollowUp;
  readonly link: GrowthCrmLink | undefined;
}> {
  const now = nowIso();
  const provider = input.provider ?? getCrmBridgeProvider();
  const kind: CrmFollowUpKind = input.kind ?? "general";
  const link = getGrowthCrmLink(input.organizationId, input.profileId);
  const title =
    input.title?.trim() ||
    `Follow-up · ${kind}${input.campaignName ? ` · ${input.campaignName}` : ""}`;
  const summary =
    input.summary?.trim() ||
    `Schedule ${kind.replace("_", " ")} follow-up for the linked Growth CRM lead.`;

  const base: GrowthCrmFollowUp = {
    id: createGrowthId("cfu"),
    organizationId: input.organizationId,
    profileId: input.profileId,
    linkId: link?.id ?? "",
    customerId: link?.customerId ?? "",
    contactId: link?.contactId,
    campaignId: input.campaignId,
    kind,
    title,
    summary,
    dueAt: input.dueAt,
    status: "pending",
    taskId: input.taskId,
    createdAt: now,
    updatedAt: now,
  };

  if (!provider.available) {
    const result = resultOf("unavailable", "crm_unavailable");
    const followUp = persistFollowUp({
      ...base,
      status: "blocked",
      outcome: "unavailable",
      result,
      lastError: result.message,
      updatedAt: nowIso(),
    });
    return { result, followUp, link };
  }

  if (!link) {
    const result = resultOf(
      "missing_link",
      "crm_link_required_before_follow_up",
    );
    const followUp = persistFollowUp({
      ...base,
      status: "failed",
      outcome: "missing_link",
      result,
      lastError: result.message,
      updatedAt: nowIso(),
    });
    return { result, followUp, link: undefined };
  }

  try {
    const customer = await provider.getCustomer(link.customerId);
    if (!customer) {
      const result = resultOf("error", "crm_customer_missing");
      const followUp = persistFollowUp({
        ...base,
        linkId: link.id,
        customerId: link.customerId,
        contactId: link.contactId,
        status: "failed",
        outcome: "error",
        result,
        lastError: result.message,
        updatedAt: nowIso(),
      });
      return { result, followUp, link };
    }

    const note = await provider.createNote(
      input.organizationId,
      link.customerId,
      emptyNoteDraft({
        title,
        body: buildFollowUpNoteBody({
          kind,
          summary,
          dueAt: input.dueAt,
          campaignName: input.campaignName,
          companyName: link.companyName || customer.companyName,
        }),
        author: FOLLOW_UP_AUTHOR,
      }),
    );

    const href = followUpHref(link.customerId);
    const result = resultOf("created", "crm_follow_up_created", {
      noteId: note.id,
      href,
    });
    // Successful create leaves the follow-up open (pending) so operators can
    // complete it later. Ops maps result.success → job COMPLETED.
    const followUp = persistFollowUp({
      ...base,
      linkId: link.id,
      customerId: link.customerId,
      contactId: link.contactId,
      noteId: note.id,
      href,
      status: "pending",
      outcome: "created",
      result,
      updatedAt: nowIso(),
    });
    return { result, followUp, link };
  } catch (error) {
    const unavailable = isUnavailableError(error);
    const outcome: CrmFollowUpOutcome = unavailable ? "unavailable" : "error";
    const message =
      error instanceof Error ? error.message : "crm_follow_up_failed";
    const result = resultOf(outcome, message);
    const followUp = persistFollowUp({
      ...base,
      linkId: link.id,
      customerId: link.customerId,
      contactId: link.contactId,
      status: unavailable ? "blocked" : "failed",
      outcome,
      result,
      lastError: message,
      updatedAt: nowIso(),
    });
    return { result, followUp, link };
  }
}

export async function completeCrmFollowUp(input: {
  readonly organizationId: string;
  readonly followUpId: string;
  readonly completionNote?: string;
  readonly taskId?: string;
  readonly provider?: CrmBridgeProvider;
}): Promise<{
  readonly result: CrmFollowUpResult;
  readonly followUp: GrowthCrmFollowUp | undefined;
}> {
  const existing = getCrmFollowUp(input.organizationId, input.followUpId);
  if (!existing) {
    return {
      result: resultOf("error", "crm_follow_up_missing"),
      followUp: undefined,
    };
  }

  if (existing.status === "completed") {
    const result =
      existing.result?.outcome === "completed"
        ? { ...existing.result, duplicated: true }
        : resultOf("completed", "crm_follow_up_already_completed", {
            noteId: existing.completionNoteId ?? existing.noteId,
            href: existing.href,
            duplicated: true,
          });
    // Record this task id so Operations can attribute the idempotent complete
    // to the CURRENT job without inventing a new CRM note.
    const followUp = persistFollowUp({
      ...existing,
      taskId: input.taskId ?? existing.taskId,
      result,
      updatedAt: nowIso(),
    });
    return { result, followUp };
  }

  const provider = input.provider ?? getCrmBridgeProvider();
  const wantsCompletionNote = Boolean(input.completionNote?.trim());

  // Completing without a completion note is an Agent OS state transition only.
  // CRM availability is required only when writing a completion note.
  if (wantsCompletionNote && !provider.available) {
    const result = resultOf("unavailable", "crm_unavailable");
    const followUp = persistFollowUp({
      ...existing,
      status: "blocked",
      outcome: "unavailable",
      result,
      lastError: result.message,
      taskId: input.taskId ?? existing.taskId,
      updatedAt: nowIso(),
    });
    return { result, followUp };
  }

  try {
    let completionNoteId = existing.completionNoteId;
    if (wantsCompletionNote) {
      const note = await provider.createNote(
        input.organizationId,
        existing.customerId,
        emptyNoteDraft({
          title: `Follow-up completed · ${existing.title}`,
          body: [
            `Completed follow-up (${existing.kind}).`,
            "",
            input.completionNote!.trim(),
            "",
            "Source: AGXORA Growth Agent (internal CRM note).",
          ].join("\n"),
          author: FOLLOW_UP_AUTHOR,
        }),
      );
      completionNoteId = note.id;
    }

    const href = existing.href ?? followUpHref(existing.customerId);
    const result = resultOf("completed", "crm_follow_up_completed", {
      noteId: completionNoteId ?? existing.noteId,
      href,
    });
    // Preserve the original create noteId; store completion note separately.
    const followUp = persistFollowUp({
      ...existing,
      noteId: existing.noteId,
      completionNoteId,
      href,
      status: "completed",
      outcome: "completed",
      result,
      taskId: input.taskId ?? existing.taskId,
      completedAt: nowIso(),
      updatedAt: nowIso(),
      lastError: undefined,
    });
    return { result, followUp };
  } catch (error) {
    const unavailable = isUnavailableError(error);
    const outcome: CrmFollowUpOutcome = unavailable ? "unavailable" : "error";
    const message =
      error instanceof Error ? error.message : "crm_follow_up_complete_failed";
    const result = resultOf(outcome, message);
    const followUp = persistFollowUp({
      ...existing,
      status: unavailable ? "blocked" : "failed",
      outcome,
      result,
      lastError: message,
      taskId: input.taskId ?? existing.taskId,
      updatedAt: nowIso(),
    });
    return { result, followUp };
  }
}
