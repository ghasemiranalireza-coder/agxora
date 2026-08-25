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
): CrmLinkedLeadState {
  const link = getGrowthCrmLink(organizationId, profileId) ?? null;
  const followUps = link
    ? listCrmFollowUps(organizationId, { linkId: link.id })
    : [];
  return {
    link,
    customerId: link?.customerId,
    companyName: link?.companyName,
    href: link?.href,
    openFollowUps: followUps.filter(
      (item) => item.status === "pending" || item.status === "blocked",
    ),
    completedFollowUps: followUps.filter((item) => item.status === "completed"),
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
      existing.result ??
      resultOf("completed", "crm_follow_up_already_completed", {
        noteId: existing.noteId,
        href: existing.href,
        duplicated: true,
      });
    return { result: { ...result, duplicated: true }, followUp: existing };
  }

  const provider = input.provider ?? getCrmBridgeProvider();
  if (!provider.available) {
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
    let noteId = existing.noteId;
    if (input.completionNote?.trim()) {
      const note = await provider.createNote(
        input.organizationId,
        existing.customerId,
        emptyNoteDraft({
          title: `Follow-up completed · ${existing.title}`,
          body: [
            `Completed follow-up (${existing.kind}).`,
            "",
            input.completionNote.trim(),
            "",
            "Source: AGXORA Growth Agent (internal CRM note).",
          ].join("\n"),
          author: FOLLOW_UP_AUTHOR,
        }),
      );
      noteId = note.id;
    }

    const href = existing.href ?? followUpHref(existing.customerId);
    const result = resultOf("completed", "crm_follow_up_completed", {
      noteId,
      href,
    });
    const followUp = persistFollowUp({
      ...existing,
      noteId,
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
