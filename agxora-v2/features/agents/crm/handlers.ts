/**
 * CRM tool handlers — Growth ↔ CRM bridge + follow-up operations via Agent OS.
 */

import { agentsStore } from "../store";
import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import {
  cancelCrmFollowUp,
  completeCrmFollowUp,
  createCrmFollowUp,
  getCrmLinkedLeadState,
  listCrmFollowUps,
  rescheduleCrmFollowUp,
} from "./followUp";
import { attachLeadExecutionsToQueue } from "./execute";
import { buildLeadActionQueue } from "./prioritize";
import { advanceCrmCustomerStatus, loadCrmStatusesForOrganization } from "./status";
import { getCampaignCrmSync, getGrowthCrmLink, syncGrowthProfileToCrm } from "./sync";
import type { CrmFollowUpKind } from "./types";
import type { CrmCustomerRecord, CrmCustomerStatus } from "@/app/lib/crm/directory";
import {
  AGENT_CRM_CUSTOMER_READ_FIELDS,
  agentCrmCustomerIdErrorMessage,
  agentCrmCustomerIdIssue,
  firstCustomerCrmCustomerResolveErrorMessage,
  resolveFirstCustomerCrmCustomerId,
} from "@/app/lib/workspace/firstCustomerAgentCrm";
import { emptyNoteDraft, getCrmBridgeProvider } from "./adapter";

function readString(
  params: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseCrmStatus(value: string | undefined): CrmCustomerStatus | undefined {
  if (
    value === "lead" ||
    value === "prospect" ||
    value === "active" ||
    value === "inactive" ||
    value === "vip" ||
    value === "archived"
  ) {
    return value;
  }
  return undefined;
}

function latestProfile(organizationId: string, profileId?: string) {
  const profiles = agentsStore
    .getSnapshot()
    .growthProfiles.filter((item) => item.organizationId === organizationId);
  if (profileId) return profiles.find((item) => item.id === profileId);
  return profiles[0];
}

function findCampaign(organizationId: string, campaignId?: string) {
  const campaigns = agentsStore
    .getSnapshot()
    .campaigns.filter((item) => item.organizationId === organizationId);
  if (campaignId) return campaigns.find((item) => item.id === campaignId);
  return campaigns[0];
}

function parseFollowUpKind(value: string | undefined): CrmFollowUpKind {
  if (
    value === "call" ||
    value === "email_draft" ||
    value === "meeting" ||
    value === "general"
  ) {
    return value;
  }
  return "general";
}

const FIRST_CUSTOMER_NOTE_AUTHOR = "CRM Assistant";
const FIRST_CUSTOMER_NOTE_TITLE = "Agent CRM note";

function isFirstCustomerNoteAction(action: string): boolean {
  return action === "create_note" || action === "attach_customer_note";
}

function isDefaultCrmSyncAction(action: string): boolean {
  return action === "sync" || action === "attach_note";
}

async function attachFirstCustomerCrmNote(
  ctx: ToolInvocationContext,
  started: number,
  requestedCustomerId: string | undefined,
): Promise<ToolInvocationResult> {
  const provider = getCrmBridgeProvider();
  if (!provider.available) {
    return {
      ok: false,
      error: "CRM is unavailable for the first-customer Agent path.",
      output: {
        action: "create_note",
        crmAvailable: false,
        crmSuccess: false,
      },
      durationMs: Date.now() - started,
    };
  }

  try {
    const listed = await provider.listCustomers(ctx.organizationId);
    const resolved = resolveFirstCustomerCrmCustomerId({
      requestedId: requestedCustomerId,
      goal:
        readString(ctx.params, "goal") ??
        readString(ctx.params, "step") ??
        readString(ctx.params, "title"),
      customerIds: listed.map((customer) => customer.id),
    });
    if (!resolved.ok) {
      const invalidId =
        resolved.error === "missing" ||
        resolved.error === "mock" ||
        resolved.error === "invalid";
      return {
        ok: false,
        error: firstCustomerCrmCustomerResolveErrorMessage(resolved.error),
        output: {
          action: "create_note",
          crmAvailable: true,
          crmSuccess: false,
          issue: resolved.error,
          ...(invalidId ? { invalidCustomerId: true } : {}),
        },
        durationMs: Date.now() - started,
      };
    }

    const customer = await provider.getCustomer(resolved.id);
    if (!customer || customer.organizationId !== ctx.organizationId) {
      return {
        ok: false,
        error: "Customer not found",
        output: {
          action: "create_note",
          crmAvailable: true,
          crmSuccess: false,
        },
        durationMs: Date.now() - started,
      };
    }

    const goal =
      readString(ctx.params, "goal") ??
      readString(ctx.params, "step") ??
      FIRST_CUSTOMER_NOTE_TITLE;
    const note = await provider.createNote(
      ctx.organizationId,
      customer.id,
      emptyNoteDraft({
        title: readString(ctx.params, "title") ?? FIRST_CUSTOMER_NOTE_TITLE,
        body:
          readString(ctx.params, "body") ??
          readString(ctx.params, "summary") ??
          goal,
        author: FIRST_CUSTOMER_NOTE_AUTHOR,
      }),
    );

    const notes = await provider.listNotes(customer.id);
    const persisted = notes.some((item) => item.id === note.id);
    if (!persisted) {
      return {
        ok: false,
        error: "CRM note was not persisted.",
        output: {
          action: "create_note",
          customerId: customer.id,
          crmAvailable: true,
          crmSuccess: false,
        },
        durationMs: Date.now() - started,
      };
    }

    return {
      ok: true,
      output: {
        action: "create_note",
        customer: publicCustomerFields(customer),
        note: {
          id: note.id,
          customerId: note.customerId,
          title: note.title,
          body: note.body,
          author: note.author,
        },
        crmAvailable: true,
        crmSuccess: true,
      },
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "crm_bridge_error";
    return {
      ok: false,
      error: message,
      output: {
        action: "create_note",
        crmAvailable: false,
        crmSuccess: false,
      },
      durationMs: Date.now() - started,
    };
  }
}

function invalidCustomerIdResult(
  started: number,
  issue: NonNullable<ReturnType<typeof agentCrmCustomerIdIssue>>,
): ToolInvocationResult {
  return {
    ok: false,
    error: agentCrmCustomerIdErrorMessage(issue),
    output: {
      crmAvailable: true,
      crmSuccess: false,
      invalidCustomerId: true,
      issue,
    },
    durationMs: Date.now() - started,
  };
}

function publicCustomerFields(customer: {
  readonly id: string;
  readonly companyName: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly status: string;
}) {
  return {
    id: customer.id,
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    country: customer.country,
    status: customer.status,
  };
}

function markCampaignFollowUpTask(
  organizationId: string,
  campaignId: string | undefined,
  success: boolean,
  blocked: boolean,
): void {
  if (!campaignId) return;
  const campaign = agentsStore
    .getSnapshot()
    .campaigns.find(
      (item) => item.id === campaignId && item.organizationId === organizationId,
    );
  if (!campaign) return;
  const tasks = campaign.tasks.map((task) => {
    if (task.code !== "schedule_crm_follow_up") return task;
    if (success) return { ...task, status: "completed" as const };
    if (blocked) return { ...task, status: "blocked" as const };
    return task;
  });
  agentsStore.upsertCampaign({
    ...campaign,
    tasks,
    updatedAt: new Date().toISOString(),
  });
}

async function resolveOrchestrationCustomer(
  ctx: ToolInvocationContext,
  requestedCustomerId: string | undefined,
): Promise<
  | { readonly ok: true; readonly customer: CrmCustomerRecord }
  | { readonly ok: false; readonly result: ToolInvocationResult }
> {
  const started = Date.now();
  const provider = getCrmBridgeProvider();
  if (!provider.available) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "CRM is unavailable for the first-customer Agent path.",
        output: { crmAvailable: false, crmSuccess: false, mutated: false },
        durationMs: Date.now() - started,
      },
    };
  }
  const listed = await provider.listCustomers(ctx.organizationId);
  const resolved = resolveFirstCustomerCrmCustomerId({
    requestedId: requestedCustomerId,
    goal:
      readString(ctx.params, "goal") ??
      readString(ctx.params, "step") ??
      readString(ctx.params, "title"),
    customerIds: listed.map((customer) => customer.id),
  });
  if (!resolved.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        error: firstCustomerCrmCustomerResolveErrorMessage(resolved.error),
        output: {
          crmAvailable: true,
          crmSuccess: false,
          mutated: false,
          issue: resolved.error,
        },
        durationMs: Date.now() - started,
      },
    };
  }
  const customer = await provider.getCustomer(resolved.id);
  if (!customer || customer.organizationId !== ctx.organizationId) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Customer not found",
        output: { crmAvailable: true, crmSuccess: false, mutated: false },
        durationMs: Date.now() - started,
      },
    };
  }
  return { ok: true, customer };
}

/**
 * Read / prepare / verify steps for a business-goal plan.
 * These actions never create a CRM note.
 */
async function handleCrmOrchestrationAction(
  ctx: ToolInvocationContext,
  started: number,
  action: "load_customer_context" | "prepare_crm_note" | "verify_crm_note",
  requestedCustomerId: string | undefined,
): Promise<ToolInvocationResult> {
  const resolved = await resolveOrchestrationCustomer(ctx, requestedCustomerId);
  if (!resolved.ok) {
    return { ...resolved.result, durationMs: Date.now() - started };
  }
  const customer = resolved.customer;
  const provider = getCrmBridgeProvider();

  if (action === "load_customer_context") {
    return {
      ok: true,
      output: {
        action,
        customer: publicCustomerFields(customer),
        fields: AGENT_CRM_CUSTOMER_READ_FIELDS,
        readOnly: true,
        mutated: false,
        crmAvailable: true,
        crmSuccess: false,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "prepare_crm_note") {
    const body =
      readString(ctx.params, "body") ??
      readString(ctx.params, "goal") ??
      readString(ctx.params, "step") ??
      "";
    const contextText = readString(ctx.params, "plannerContextText");
    return {
      ok: true,
      output: {
        action,
        readOnly: true,
        mutated: false,
        crmAvailable: true,
        crmSuccess: false,
        draft: {
          title: readString(ctx.params, "title") ?? "Follow-up",
          body,
          customerId: customer.id,
          companyName: customer.companyName,
          author: FIRST_CUSTOMER_NOTE_AUTHOR,
          ...(contextText ? { context: contextText } : {}),
        },
        customer: publicCustomerFields(customer),
      },
      durationMs: Date.now() - started,
    };
  }

  const noteId = readString(ctx.params, "noteId");
  if (!noteId) {
    return {
      ok: false,
      error: "CRM note was not created.",
      output: {
        action,
        verified: false,
        mutated: false,
        crmAvailable: true,
        crmSuccess: false,
        customerId: customer.id,
      },
      durationMs: Date.now() - started,
    };
  }
  const notes = await provider.listNotes(customer.id);
  const note = notes.find(
    (item) => item.id === noteId && item.customerId === customer.id,
  );
  if (!note || note.organizationId !== ctx.organizationId) {
    return {
      ok: false,
      error: "CRM note was not found after execution.",
      output: {
        action,
        verified: false,
        mutated: false,
        crmAvailable: true,
        crmSuccess: false,
        customerId: customer.id,
        noteId,
      },
      durationMs: Date.now() - started,
    };
  }
  return {
    ok: true,
    output: {
      action,
      verified: true,
      mutated: false,
      crmAvailable: true,
      crmSuccess: true,
      customerId: customer.id,
      note: {
        id: note.id,
        customerId: note.customerId,
        title: note.title,
        body: note.body,
        author: note.author,
      },
    },
    durationMs: Date.now() - started,
  };
}

export async function handleCrmTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const action = readString(ctx.params, "action") ?? "sync";
  const requestedCustomerId = readString(ctx.params, "customerId");
  if (requestedCustomerId) {
    const issue = agentCrmCustomerIdIssue(requestedCustomerId);
    if (issue) return invalidCustomerIdResult(started, issue);
  }

  if (
    action === "load_customer_context" ||
    action === "prepare_crm_note" ||
    action === "verify_crm_note"
  ) {
    return handleCrmOrchestrationAction(
      ctx,
      started,
      action,
      requestedCustomerId,
    );
  }

  if (action === "get_customer" || action === "read_customer") {
    if (!requestedCustomerId) {
      return invalidCustomerIdResult(started, "missing");
    }
    const provider = getCrmBridgeProvider();
    if (!provider.available) {
      return {
        ok: false,
        error: "CRM is unavailable for the first-customer Agent path.",
        output: {
          action,
          crmAvailable: false,
          crmSuccess: false,
        },
        durationMs: Date.now() - started,
      };
    }
    try {
      const customer = await provider.getCustomer(requestedCustomerId);
      if (!customer || customer.organizationId !== ctx.organizationId) {
        return {
          ok: false,
          error: "Customer not found",
          output: {
            action,
            crmAvailable: true,
            crmSuccess: false,
          },
          durationMs: Date.now() - started,
        };
      }
      return {
        ok: true,
        output: {
          action: "get_customer",
          customer: publicCustomerFields(customer),
          fields: AGENT_CRM_CUSTOMER_READ_FIELDS,
          crmAvailable: true,
          crmSuccess: true,
        },
        durationMs: Date.now() - started,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "crm_bridge_error";
      return {
        ok: false,
        error: message,
        output: {
          action,
          crmAvailable: false,
          crmSuccess: false,
        },
        durationMs: Date.now() - started,
      };
    }
  }

  if (action === "get_link" || action === "get_linked_record") {
    const profileId = readString(ctx.params, "profileId");
    const link = getGrowthCrmLink(ctx.organizationId, profileId);
    const sync = getCampaignCrmSync(
      ctx.organizationId,
      readString(ctx.params, "campaignId"),
    );
    const lead = getCrmLinkedLeadState(ctx.organizationId, profileId ?? link?.profileId);
    return {
      ok: true,
      output: {
        action,
        link: link ?? null,
        sync: sync ?? null,
        lead,
        followUps: listCrmFollowUps(ctx.organizationId, {
          linkId: link?.id,
        }),
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "list_follow_ups") {
    const followUps = listCrmFollowUps(ctx.organizationId, {
      customerId: readString(ctx.params, "customerId"),
      campaignId: readString(ctx.params, "campaignId"),
      linkId: readString(ctx.params, "linkId"),
    });
    return {
      ok: true,
      output: {
        action,
        followUps,
        lead: getCrmLinkedLeadState(
          ctx.organizationId,
          readString(ctx.params, "profileId"),
        ),
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "list_lead_priority" || action === "get_lead_priority") {
    const crmStatuses = await loadCrmStatusesForOrganization(ctx.organizationId);
    const queue = attachLeadExecutionsToQueue(
      ctx.organizationId,
      buildLeadActionQueue(ctx.organizationId, { crmStatuses }),
    );
    return {
      ok: true,
      output: {
        action: "list_lead_priority",
        queue,
        readOnly: true,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "update_customer_status" || action === "advance_crm_status") {
    const profileId = readString(ctx.params, "profileId");
    if (!profileId) {
      return {
        ok: false,
        error: "profileId is required to advance CRM status.",
        durationMs: Date.now() - started,
      };
    }
    const targetStatus = parseCrmStatus(readString(ctx.params, "targetStatus"));
    const expectedFromStatus = parseCrmStatus(readString(ctx.params, "fromStatus"));
    const leadAction = readString(ctx.params, "leadAction");
    const { result, customer, link } = await advanceCrmCustomerStatus({
      organizationId: ctx.organizationId,
      profileId,
      targetStatus,
      expectedFromStatus,
      leadAction,
      taskId: ctx.taskId,
      attachNote: true,
    });
    return {
      ok: true,
      output: {
        action: "update_customer_status",
        result,
        statusResult: result,
        customer: customer
          ? {
              id: customer.id,
              status: customer.status,
              organizationId: customer.organizationId,
              companyName: customer.companyName,
            }
          : null,
        link: link ?? null,
        crmAvailable: result.available,
        crmSuccess: result.success,
        fromStatus: result.fromStatus,
        toStatus: result.toStatus,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "complete_follow_up") {
    const followUpId = readString(ctx.params, "followUpId");
    if (!followUpId) {
      return {
        ok: false,
        error: "followUpId is required to complete a CRM follow-up.",
        durationMs: Date.now() - started,
      };
    }
    const leadAction = readString(ctx.params, "leadAction");
    const { result, followUp } = await completeCrmFollowUp({
      organizationId: ctx.organizationId,
      followUpId,
      completionNote: readString(ctx.params, "completionNote"),
      taskId: ctx.taskId,
      leadAction,
      requireCrmMutation: leadAction === "REVIEW_BLOCKED_FOLLOW_UP",
    });
    return {
      ok: true,
      output: {
        action,
        result,
        followUp: followUp ?? null,
        crmAvailable: result.available,
        crmSuccess: result.success,
        followUpResult: result,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "cancel_follow_up") {
    const followUpId = readString(ctx.params, "followUpId");
    if (!followUpId) {
      return {
        ok: false,
        error: "followUpId is required to cancel a CRM follow-up.",
        durationMs: Date.now() - started,
      };
    }
    const { result, followUp } = await cancelCrmFollowUp({
      organizationId: ctx.organizationId,
      followUpId,
      taskId: ctx.taskId,
      leadAction: readString(ctx.params, "leadAction") ?? "CANCEL_FOLLOW_UP",
    });
    return {
      ok: true,
      output: {
        action,
        result,
        followUp: followUp ?? null,
        crmAvailable: result.available,
        crmSuccess: result.success,
        followUpResult: result,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "reschedule_follow_up") {
    const followUpId = readString(ctx.params, "followUpId");
    const dueAt = readString(ctx.params, "dueAt");
    if (!followUpId) {
      return {
        ok: false,
        error: "followUpId is required to reschedule a CRM follow-up.",
        durationMs: Date.now() - started,
      };
    }
    if (!dueAt) {
      return {
        ok: false,
        error: "dueAt is required to reschedule a CRM follow-up.",
        durationMs: Date.now() - started,
      };
    }
    const { result, followUp } = await rescheduleCrmFollowUp({
      organizationId: ctx.organizationId,
      followUpId,
      dueAt,
      taskId: ctx.taskId,
      leadAction: readString(ctx.params, "leadAction") ?? "RESCHEDULE_FOLLOW_UP",
    });
    return {
      ok: true,
      output: {
        action,
        result,
        followUp: followUp ?? null,
        crmAvailable: result.available,
        crmSuccess: result.success,
        followUpResult: result,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "create_follow_up") {
    const profile = latestProfile(
      ctx.organizationId,
      readString(ctx.params, "profileId"),
    );
    if (!profile) {
      return {
        ok: false,
        error: "Growth profile is required before CRM follow-up.",
        durationMs: Date.now() - started,
      };
    }
    const campaign = findCampaign(
      ctx.organizationId,
      readString(ctx.params, "campaignId"),
    );
    const { result, followUp, link } = await createCrmFollowUp({
      organizationId: ctx.organizationId,
      profileId: profile.id,
      kind: parseFollowUpKind(readString(ctx.params, "kind")),
      title: readString(ctx.params, "title"),
      summary: readString(ctx.params, "summary"),
      dueAt: readString(ctx.params, "dueAt"),
      campaignId: campaign?.id,
      campaignName: campaign?.name,
      taskId: ctx.taskId,
    });
    markCampaignFollowUpTask(
      ctx.organizationId,
      campaign?.id,
      result.success,
      result.outcome === "unavailable" ||
        result.outcome === "blocked" ||
        result.outcome === "error" ||
        result.outcome === "missing_link",
    );
    return {
      ok: true,
      output: {
        action,
        result,
        followUp,
        link: link ?? null,
        lead: getCrmLinkedLeadState(ctx.organizationId, profile.id),
        crmAvailable: result.available,
        crmSuccess: result.success,
        followUpResult: result,
      },
      durationMs: Date.now() - started,
    };
  }

  const profile = latestProfile(
    ctx.organizationId,
    readString(ctx.params, "profileId"),
  );
  if (
    isFirstCustomerNoteAction(action) ||
    (!profile && isDefaultCrmSyncAction(action))
  ) {
    return attachFirstCustomerCrmNote(ctx, started, requestedCustomerId);
  }
  if (!profile) {
    return {
      ok: false,
      error: "Growth profile is required before CRM sync.",
      durationMs: Date.now() - started,
    };
  }

  const campaign = findCampaign(
    ctx.organizationId,
    readString(ctx.params, "campaignId"),
  );
  const attachNote =
    action === "attach_note" ||
    action === "sync" ||
    ctx.params.attachNote === true;

  const { result, link, sync } = await syncGrowthProfileToCrm({
    organizationId: ctx.organizationId,
    profile,
    campaignId: campaign?.id,
    campaignName: campaign?.name,
    campaignOffer: campaign?.offer,
    campaignObjective: campaign?.objective.statement,
    campaignCta: campaign?.websiteCta,
    attachNote: Boolean(campaign) && attachNote !== false,
    taskId: ctx.taskId,
  });

  if (campaign) {
    const tasks = campaign.tasks.map((task) => {
      if (task.code !== "sync_crm_customer" && task.code !== "attach_crm_note") {
        return task;
      }
      if (result.success) {
        return { ...task, status: "completed" as const };
      }
      if (
        result.outcome === "unavailable" ||
        result.outcome === "blocked" ||
        result.outcome === "error"
      ) {
        return { ...task, status: "blocked" as const };
      }
      return task;
    });
    agentsStore.upsertCampaign({
      ...campaign,
      tasks,
      updatedAt: new Date().toISOString(),
    });
  }

  const output = {
    action: action === "attach_note" ? "attach_note" : "sync",
    result,
    link: link ?? null,
    sync: sync ?? null,
    crmAvailable: result.available,
    crmSuccess: result.success,
  };

  // Mirror website/social publish adapters: the tool invocation itself completes so
  // Agent OS does not retry into a new execution/approval. Operations maps the
  // CURRENT bridge/sync result to COMPLETED / BLOCKED / FAILED via outcomeFromTask.
  return {
    ok: true,
    output,
    durationMs: Date.now() - started,
  };
}
