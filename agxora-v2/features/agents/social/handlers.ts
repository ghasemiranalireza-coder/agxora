import { createGrowthId, nowIso } from "../growth/ids";
import { agentsStore } from "../store";
import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import { getSocialAdapter } from "./adapters";
import { generateContentCalendar } from "./calendar";
import { generateSocialContent } from "./content";
import { generateSocialStrategy } from "./strategy";
import type { SocialContentItem, SocialPublishingJob } from "./types";

function readString(params: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function profileOf(organizationId: string, profileId?: string) {
  const profiles = agentsStore
    .getSnapshot()
    .growthProfiles.filter((item) => item.organizationId === organizationId);
  if (profileId) return profiles.find((item) => item.id === profileId);
  return profiles[0];
}

export async function handleSocialTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const profile = profileOf(ctx.organizationId, readString(ctx.params, "profileId"));
  if (!profile) {
    return {
      ok: false,
      error: "Growth profile is required before social generation.",
      durationMs: Date.now() - started,
    };
  }
  const action = readString(ctx.params, "growthAction") ?? "strategy";

  if (action === "calendar") {
    const strategy =
      agentsStore
        .getSnapshot()
        .socialStrategies.find((item) => item.organizationId === ctx.organizationId) ??
      generateSocialStrategy({ organizationId: ctx.organizationId, profile });
    if (!agentsStore.getSnapshot().socialStrategies.some((item) => item.id === strategy.id)) {
      agentsStore.upsertSocialStrategy(strategy);
    }
    const calendar = generateContentCalendar({
      organizationId: ctx.organizationId,
      profile,
      strategy,
    });
    agentsStore.upsertSocialCalendar(calendar);
    return {
      ok: true,
      output: {
        calendarId: calendar.id,
        entries: calendar.entries.length,
        published: false,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "content") {
    const strategy =
      agentsStore
        .getSnapshot()
        .socialStrategies.find((item) => item.organizationId === ctx.organizationId) ??
      generateSocialStrategy({ organizationId: ctx.organizationId, profile });
    const calendar =
      agentsStore
        .getSnapshot()
        .socialCalendars.find((item) => item.organizationId === ctx.organizationId) ??
      generateContentCalendar({
        organizationId: ctx.organizationId,
        profile,
        strategy,
      });
    agentsStore.upsertSocialStrategy(strategy);
    agentsStore.upsertSocialCalendar(calendar);
    const items = generateSocialContent({
      organizationId: ctx.organizationId,
      profile,
      strategy,
      calendar,
    });
    agentsStore.replaceSocialContent(ctx.organizationId, items);
    return {
      ok: true,
      output: {
        contentCount: items.length,
        published: false,
      },
      durationMs: Date.now() - started,
    };
  }

  const strategy = generateSocialStrategy({
    organizationId: ctx.organizationId,
    profile,
  });
  agentsStore.upsertSocialStrategy(strategy);
  return {
    ok: true,
    output: {
      strategyId: strategy.id,
      pillars: strategy.pillars.length,
      published: false,
    },
    durationMs: Date.now() - started,
  };
}

async function runSocialSideEffect(
  ctx: ToolInvocationContext,
  action: "publish" | "schedule",
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const contentId = readString(ctx.params, "contentId");
  const item = agentsStore
    .getSnapshot()
    .socialContent.find(
      (row) =>
        row.organizationId === ctx.organizationId &&
        (contentId ? row.id === contentId : true),
    );
  if (!item) {
    return {
      ok: false,
      error: "Social content not found.",
      durationMs: Date.now() - started,
    };
  }
  if (item.approvalState === "REJECTED" || item.status === "REJECTED" || item.status === "BLOCKED") {
    return {
      ok: false,
      error: "Rejected social content cannot be published.",
      durationMs: Date.now() - started,
    };
  }

  const adapter = getSocialAdapter(item.platform);
  const result =
    action === "schedule"
      ? await adapter.schedulePost(item)
      : item.contentType === "STORY"
        ? await adapter.publishStory(item)
        : await adapter.publishPost(item);

  const published =
    result.available && result.published && result.status === "published";
  const safeItem: SocialContentItem = {
    ...item,
    taskId: ctx.taskId,
    publishResult: result,
    status: published ? "PUBLISHED" : "READY",
    updatedAt: nowIso(),
  };
  agentsStore.upsertSocialContent(safeItem);

  const job: SocialPublishingJob = {
    id: createGrowthId("sjob"),
    organizationId: ctx.organizationId,
    contentId: item.id,
    platform: item.platform,
    action,
    status: safeItem.status,
    available: result.available,
    result,
    taskId: ctx.taskId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  agentsStore.upsertPublishingJob(job);

  return {
    ok: true,
    output: {
      available: result.available,
      status: result.status,
      published: safeItem.status === "PUBLISHED",
      contentStatus: safeItem.status,
    },
    durationMs: Date.now() - started,
  };
}

export async function handleSocialPublishTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  return runSocialSideEffect(ctx, "publish");
}

export async function handleSocialScheduleTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  return runSocialSideEffect(ctx, "schedule");
}
