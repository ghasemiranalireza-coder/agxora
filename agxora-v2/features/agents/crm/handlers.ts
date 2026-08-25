/**
 * CRM tool handlers — Growth ↔ CRM bridge + follow-up operations via Agent OS.
 */

import { agentsStore } from "../store";
import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import {
  completeCrmFollowUp,
  createCrmFollowUp,
  getCrmLinkedLeadState,
  listCrmFollowUps,
} from "./followUp";
import { getCampaignCrmSync, getGrowthCrmLink, syncGrowthProfileToCrm } from "./sync";
import type { CrmFollowUpKind } from "./types";

function readString(
  params: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
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

export async function handleCrmTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const action = readString(ctx.params, "action") ?? "sync";

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

  if (action === "complete_follow_up") {
    const followUpId = readString(ctx.params, "followUpId");
    if (!followUpId) {
      return {
        ok: false,
        error: "followUpId is required to complete a CRM follow-up.",
        durationMs: Date.now() - started,
      };
    }
    const { result, followUp } = await completeCrmFollowUp({
      organizationId: ctx.organizationId,
      followUpId,
      completionNote: readString(ctx.params, "completionNote"),
      taskId: ctx.taskId,
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
