/**
 * Phase 3B — execute an approved LinkedIn campaign publish through the real adapter.
 * Gmail send and YouTube upload stay untouched.
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

async function markLinkedInFailed(
  actor: Actor,
  item: CampaignItem,
  kind: "publish" | "schedule",
  result: SocialPublishResult,
): Promise<never> {
  const reason = result.kind === "ok" ? "linkedin_missing_post_id" : result.reason;
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
    provider: "linkedin",
    action: kind === "schedule" ? "linkedin.schedule" : "linkedin.publish_post",
    status: "failed",
    target: item.id,
    error: reason,
    metadata: { resultKind: result.kind },
  });

  if (result.kind === "unsupported") {
    throw new PersistenceError(
      "validation",
      "LinkedIn does not support this operation yet",
      { status: 501 },
    );
  }
  if (result.kind === "human_required") {
    throw new PersistenceError(
      "forbidden",
      "LinkedIn requires additional human action before publishing",
      { status: 409 },
    );
  }
  throw new PersistenceError("validation", "LinkedIn did not confirm the publish", {
    status: 502,
  });
}

export async function executeLinkedInCampaignItemForActor(
  actor: Actor,
  item: CampaignItem,
  kind: "publish" | "schedule" | "send_email",
): Promise<CampaignItem> {
  if (kind === "send_email") {
    await prisma.campaignItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: "LinkedIn does not send email",
        retryCount: { increment: 1 },
      },
    });
    await recordExternalAction({
      actor,
      provider: "linkedin",
      action: "send_email",
      status: "failed",
      target: item.id,
      error: "unsupported",
    });
    throw new PersistenceError(
      "validation",
      "LinkedIn does not support sending email",
      { status: 501 },
    );
  }

  if (item.status === "PUBLISHED" && item.externalId) {
    await recordExternalAction({
      actor,
      provider: "linkedin",
      action: kind === "schedule" ? "linkedin.schedule" : "linkedin.publish_post",
      status: "completed",
      target: item.id,
      externalId: item.externalId,
      metadata: { idempotentReplay: true },
    });
    return item;
  }

  if (item.status === "PUBLISHING") {
    throw new PersistenceError("conflict", "LinkedIn publish already in progress");
  }

  if (item.status !== "APPROVED") {
    await recordExternalAction({
      actor,
      provider: "linkedin",
      action: kind,
      status: "approval_required",
      target: item.id,
      error: "approval_required",
    });
    throw new PersistenceError("forbidden", "Publishing requires explicit approval");
  }

  const adapter = getSocialProviderAdapter("linkedin");
  const capabilities = adapter.getCapabilities();

  if (kind === "schedule") {
    return markLinkedInFailed(actor, item, "schedule", {
      kind: "unsupported",
      reason: "linkedin_schedule_not_implemented",
    });
  }

  if (!capabilities.publishText) {
    return markLinkedInFailed(actor, item, "publish", {
      kind: "unsupported",
      reason: "linkedin_publish_unsupported",
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
        provider: "linkedin",
        action: "linkedin.publish_post",
        status: "completed",
        target: item.id,
        externalId: latest.externalId,
        metadata: { idempotentReplay: true },
      });
      return latest;
    }
    throw new PersistenceError("conflict", "LinkedIn publish already in progress");
  }

  await recordExternalAction({
    actor,
    provider: "linkedin",
    action: "linkedin.publish_post",
    status: "executing",
    target: item.id,
  });

  const result = await adapter.publishText({
    actor,
    campaignItemId: item.id,
    title: item.title,
    description: item.caption || item.body || item.script || item.title,
    body: item.body || item.caption || item.script || item.title,
    mediaAssetId: item.mediaRequirement.trim() || null,
    contentType: item.contentType,
    scheduledAt: item.scheduledAt,
  });

  if (!isConfirmedSocialPublish(result)) {
    return markLinkedInFailed(actor, item, "publish", result);
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
    provider: "linkedin",
    action: "linkedin.publish_post",
    status: "completed",
    target: item.id,
    externalId: result.externalId,
  });
  return published;
}
