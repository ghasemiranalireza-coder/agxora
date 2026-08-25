/**
 * CRM tool handlers — Growth ↔ CRM bridge via Agent OS tools.
 */

import { agentsStore } from "../store";
import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import { getCampaignCrmSync, getGrowthCrmLink, syncGrowthProfileToCrm } from "./sync";

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

export async function handleCrmTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const action = readString(ctx.params, "action") ?? "sync";

  if (action === "get_link") {
    const profileId = readString(ctx.params, "profileId");
    const link = getGrowthCrmLink(ctx.organizationId, profileId);
    const sync = getCampaignCrmSync(
      ctx.organizationId,
      readString(ctx.params, "campaignId"),
    );
    return {
      ok: true,
      output: {
        action,
        link: link ?? null,
        sync: sync ?? null,
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
