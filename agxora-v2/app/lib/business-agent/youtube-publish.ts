/**
 * Phase 3A — execute an approved YouTube campaign publish through the real adapter.
 * Gmail send stays in campaigns.ts and is not used here.
 */

import "server-only";

import type { CampaignItem } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { getSocialProviderAdapter } from "@/app/lib/social/adapters/registry";
import {
  isConfirmedSocialPublish,
  type SocialPublishResult,
} from "@/app/lib/social/adapters/provider";
import { recordExternalAction } from "./audit";

function youtubeMediaAssetId(item: CampaignItem): string | null {
  const fromRequirement = item.mediaRequirement.trim();
  return fromRequirement || null;
}

async function markYouTubeFailed(
  actor: Actor,
  item: CampaignItem,
  kind: "publish" | "schedule",
  result: SocialPublishResult,
): Promise<never> {
  const reason = result.kind === "ok" ? "youtube_missing_video_id" : result.reason;
  await prisma.campaignItem.update({
    where: { id: item.id },
    data: {
      status: "FAILED",
      error: reason,
      retryCount: { increment: 1 },
    },
  });
  await recordExternalAction({
    actor,
    provider: "youtube",
    action: kind === "schedule" ? "youtube.schedule" : "youtube.publish_video",
    status: "failed",
    target: item.id,
    error: reason,
    metadata: { resultKind: result.kind },
  });

  if (result.kind === "unsupported") {
    throw new PersistenceError(
      "validation",
      "YouTube does not support this operation yet",
      { status: 501 },
    );
  }
  if (result.kind === "human_required") {
    throw new PersistenceError(
      "forbidden",
      "YouTube requires additional human action before publishing",
      { status: 409 },
    );
  }
  throw new PersistenceError("validation", "YouTube did not confirm the publish", {
    status: 502,
  });
}

export async function executeYouTubeCampaignItemForActor(
  actor: Actor,
  item: CampaignItem,
  kind: "publish" | "schedule" | "send_email",
): Promise<CampaignItem> {
  if (kind === "send_email") {
    await prisma.campaignItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: "YouTube does not send email",
        retryCount: { increment: 1 },
      },
    });
    await recordExternalAction({
      actor,
      provider: "youtube",
      action: "send_email",
      status: "failed",
      target: item.id,
      error: "unsupported",
    });
    throw new PersistenceError(
      "validation",
      "YouTube does not support sending email",
      { status: 501 },
    );
  }

  if (item.status === "PUBLISHED" && item.externalId) {
    await recordExternalAction({
      actor,
      provider: "youtube",
      action: kind === "schedule" ? "youtube.schedule" : "youtube.publish_video",
      status: "completed",
      target: item.id,
      externalId: item.externalId,
      metadata: { idempotentReplay: true },
    });
    return item;
  }

  if (item.status === "PUBLISHING") {
    throw new PersistenceError(
      "conflict",
      "YouTube publish already in progress",
    );
  }

  if (item.status !== "APPROVED") {
    await recordExternalAction({
      actor,
      provider: "youtube",
      action: kind,
      status: "approval_required",
      target: item.id,
      error: "approval_required",
    });
    throw new PersistenceError(
      "forbidden",
      "Publishing requires explicit approval",
    );
  }

  const adapter = getSocialProviderAdapter("youtube");
  const capabilities = adapter.getCapabilities();

  if (kind === "schedule") {
    return markYouTubeFailed(actor, item, "schedule", {
      kind: "unsupported",
      reason: "youtube_schedule_not_implemented",
    });
  }

  if (!capabilities.publishVideo) {
    return markYouTubeFailed(actor, item, "publish", {
      kind: "unsupported",
      reason: "youtube_publish_unsupported",
    });
  }

  const claimed = await prisma.campaignItem.updateMany({
    where: {
      id: item.id,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      status: "APPROVED",
    },
    data: {
      status: "PUBLISHING",
      error: null,
    },
  });
  if (claimed.count !== 1) {
    const latest = await prisma.campaignItem.findFirst({
      where: {
        id: item.id,
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
      },
    });
    if (latest?.status === "PUBLISHED" && latest.externalId) {
      await recordExternalAction({
        actor,
        provider: "youtube",
        action: "youtube.publish_video",
        status: "completed",
        target: item.id,
        externalId: latest.externalId,
        metadata: { idempotentReplay: true },
      });
      return latest;
    }
    throw new PersistenceError(
      "conflict",
      "YouTube publish already in progress",
    );
  }

  await recordExternalAction({
    actor,
    provider: "youtube",
    action: "youtube.publish_video",
    status: "executing",
    target: item.id,
  });

  const result = await adapter.publishVideo({
    actor,
    campaignItemId: item.id,
    title: item.title,
    description: item.caption || item.body || item.script || item.title,
    body: item.body,
    mediaAssetId: youtubeMediaAssetId(item),
    contentType: item.contentType,
    scheduledAt: item.scheduledAt,
  });

  if (!isConfirmedSocialPublish(result)) {
    return markYouTubeFailed(actor, item, "publish", result);
  }

  const published = await prisma.campaignItem.update({
    where: { id: item.id },
    data: {
      status: "PUBLISHED",
      externalId: result.externalId,
      publishedAt: new Date(),
      error: null,
    },
  });
  await recordExternalAction({
    actor,
    provider: "youtube",
    action: "youtube.publish_video",
    status: "completed",
    target: item.id,
    externalId: result.externalId,
  });
  return published;
}
