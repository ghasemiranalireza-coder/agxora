import "server-only";

import type { ContentItemStatus, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { recordExternalAction } from "./audit";
import { getAgentPolicyForActor } from "./policy";
import { assertProviderPermission } from "./integrations";
import {
  getCatalogEntry,
  isIntegrationProviderId,
  type IntegrationProviderId,
} from "./catalog";
import { executeGmailToolForActor } from "./gmail-tools";
import { executeYouTubeCampaignItemForActor } from "./youtube-publish";
import {
  firstUnsupportedCampaignProvider,
  firstUnsupportedRequestedChannel,
  supportedCampaignChannels,
  unsupportedCampaignProviderMessage,
} from "./campaign-providers";
import {
  campaignItemApproveBlockReason,
  campaignItemRejectBlockReason,
  decideExternalActionPolicy,
} from "./policy-gates";

export type CampaignItemDraft = {
  readonly provider: IntegrationProviderId;
  readonly contentType: string;
  readonly title?: string;
  readonly caption?: string;
  readonly body?: string;
  readonly script?: string;
  readonly mediaRequirement?: string;
  readonly scheduledAt?: string | null;
};

export async function listCampaignsForActor(actor: Actor) {
  return prisma.campaign.findMany({
    where: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getCampaignForActor(actor: Actor, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!campaign) {
    throw new PersistenceError("not_found", "Campaign not found");
  }
  return campaign;
}

export async function createCampaignForActor(
  actor: Actor,
  input: {
    readonly name: string;
    readonly objective?: string;
    readonly targetAudience?: string;
    readonly channels?: readonly IntegrationProviderId[];
    readonly startDate?: string | null;
    readonly endDate?: string | null;
    readonly items?: readonly CampaignItemDraft[];
  },
) {
  const name = input.name.trim();
  if (!name) {
    throw new PersistenceError("validation", "Campaign name is required");
  }
  const requestedChannels = (input.channels ?? []).filter(isIntegrationProviderId);
  const channels = supportedCampaignChannels(requestedChannels);
  if (requestedChannels.length > 0 && channels.length === 0) {
    const unsupported = firstUnsupportedRequestedChannel(requestedChannels);
    throw new PersistenceError(
      "validation",
      unsupported
        ? unsupportedCampaignProviderMessage(unsupported)
        : "None of the selected channels are available in AGXORA yet. Nothing was created or published.",
    );
  }
  const unsupportedItem = firstUnsupportedCampaignProvider(input.items ?? []);
  if (unsupportedItem) {
    throw new PersistenceError(
      "validation",
      unsupportedCampaignProviderMessage(unsupportedItem),
    );
  }
  const campaign = await prisma.campaign.create({
    data: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      createdByUserId: actor.userId,
      name,
      objective: input.objective?.trim() ?? "",
      targetAudience: input.targetAudience?.trim() ?? "",
      channels: channels as IntegrationProvider[],
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      status: "needs_approval",
      items: {
        create: (input.items ?? []).map((item) => ({
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          createdByUserId: actor.userId,
          provider: item.provider,
          contentType: item.contentType.trim() || "post",
          title: item.title?.trim() ?? "",
          caption: item.caption?.trim() ?? "",
          body: item.body?.trim() ?? "",
          script: item.script?.trim() ?? "",
          mediaRequirement: item.mediaRequirement?.trim() ?? "",
          scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
          status: "NEEDS_APPROVAL" as ContentItemStatus,
        })),
      },
    },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  await recordExternalAction({
    actor,
    action: "campaign_create",
    status: "approval_required",
    target: campaign.id,
    metadata: { itemCount: campaign.items.length, channels },
  });
  return campaign;
}

export async function listCalendarForActor(actor: Actor) {
  return prisma.campaignItem.findMany({
    where: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: 200,
  });
}

export async function approveCampaignItemForActor(
  actor: Actor,
  itemId: string,
) {
  const item = await prisma.campaignItem.findFirst({
    where: {
      id: itemId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
  });
  if (!item) {
    throw new PersistenceError("not_found", "Content item not found");
  }
  if (item.status === "APPROVED") {
    return item;
  }
  const blocked = campaignItemApproveBlockReason(item.status);
  if (blocked) {
    throw new PersistenceError("conflict", blocked);
  }
  const updated = await prisma.campaignItem.update({
    where: { id: item.id },
    data: {
      status: "APPROVED",
      approvedByUserId: actor.userId,
      error: null,
    },
  });
  await recordExternalAction({
    actor,
    provider: item.provider,
    action: "content_approve",
    status: "completed",
    target: item.id,
  });
  return updated;
}

export async function rejectCampaignItemForActor(
  actor: Actor,
  itemId: string,
) {
  const item = await prisma.campaignItem.findFirst({
    where: {
      id: itemId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
  });
  if (!item) {
    throw new PersistenceError("not_found", "Content item not found");
  }
  if (item.status === "CANCELLED") {
    return item;
  }
  const blocked = campaignItemRejectBlockReason(item.status);
  if (blocked) {
    throw new PersistenceError("conflict", blocked);
  }
  const updated = await prisma.campaignItem.update({
    where: { id: item.id },
    data: {
      status: "CANCELLED",
      error: null,
    },
  });
  await recordExternalAction({
    actor,
    provider: item.provider,
    action: "content_reject",
    status: "cancelled",
    target: item.id,
  });
  return updated;
}

export async function executeCampaignItemForActor(
  actor: Actor,
  itemId: string,
  kind: "publish" | "schedule" | "send_email",
) {
  const item = await prisma.campaignItem.findFirst({
    where: {
      id: itemId,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
  });
  if (!item) {
    throw new PersistenceError("not_found", "Content item not found");
  }

  if (
    item.provider === "youtube" &&
    kind === "publish" &&
    item.status === "PUBLISHED" &&
    item.externalId
  ) {
    await recordExternalAction({
      actor,
      provider: "youtube",
      action: "youtube.publish_video",
      status: "completed",
      target: item.id,
      externalId: item.externalId,
      metadata: { idempotentReplay: true },
    });
    return item;
  }

  const policy = await getAgentPolicyForActor(actor);
  const gate = decideExternalActionPolicy({
    mode: policy.mode,
    itemStatus: item.status,
    kind,
  });
  if (gate.blocked) {
    await recordExternalAction({
      actor,
      provider: item.provider,
      action: kind,
      status: "approval_required",
      target: item.id,
      error: gate.code,
    });
    throw new PersistenceError("forbidden", gate.message);
  }

  const permission =
    kind === "send_email"
      ? "send_email"
      : kind === "schedule"
        ? "schedule"
        : "publish";
  await assertProviderPermission(actor, item.provider, permission);

  const catalog = getCatalogEntry(item.provider);
  if (catalog.implementationStatus === "not_implemented") {
    await prisma.campaignItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: "Integration not implemented yet",
        retryCount: { increment: 1 },
      },
    });
    await recordExternalAction({
      actor,
      provider: item.provider,
      action: kind,
      status: "failed",
      target: item.id,
      error: "not_implemented",
    });
    throw new PersistenceError(
      "validation",
      "Integration not implemented yet",
      { status: 501 },
    );
  }

  if (item.provider === "youtube") {
    return executeYouTubeCampaignItemForActor(actor, item, kind);
  }

  if (item.provider === "email_gmail" && kind === "send_email") {
    if (item.status !== "APPROVED") {
      await recordExternalAction({
        actor,
        provider: "email_gmail",
        action: "gmail.send_message",
        status: "approval_required",
        target: item.id,
        error: "approval_required",
      });
      throw new PersistenceError(
        "forbidden",
        "Sending Gmail requires explicit approval",
      );
    }

    await prisma.campaignItem.update({
      where: { id: item.id },
      data: { status: "PUBLISHING" },
    });
    await recordExternalAction({
      actor,
      provider: "email_gmail",
      action: "gmail.send_message",
      status: "executing",
      target: item.id,
    });

    try {
      const result = (await executeGmailToolForActor(actor, "gmail.send_message", {
        to: item.caption || undefined,
        subject: item.title,
        body: item.body,
        approved: true,
      })) as { id?: string; threadId?: string };

      const sentId = typeof result.id === "string" ? result.id : null;
      if (!sentId) {
        throw new PersistenceError(
          "validation",
          "Gmail did not confirm the send",
          { status: 502 },
        );
      }

      const published = await prisma.campaignItem.update({
        where: { id: item.id },
        data: {
          status: "PUBLISHED",
          externalId: sentId,
          error: null,
        },
      });
      await recordExternalAction({
        actor,
        provider: "email_gmail",
        action: "gmail.send_message",
        status: "completed",
        target: item.id,
        externalId: sentId,
        metadata: { threadId: result.threadId ?? null },
      });
      return published;
    } catch (error) {
      const message =
        error instanceof PersistenceError
          ? error.message
          : "Gmail send failed";
      await prisma.campaignItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          error: message,
          retryCount: { increment: 1 },
        },
      });
      throw error;
    }
  }

  // Remaining providers are either not implemented or not wired for this
  // operation. Never report fake success.
  await prisma.campaignItem.update({
    where: { id: item.id },
    data: {
      status: "FAILED",
      error: "Automatic publishing is not supported for this operation yet",
      retryCount: { increment: 1 },
    },
  });
  await recordExternalAction({
    actor,
    provider: item.provider,
    action: kind,
    status: "failed",
    target: item.id,
    error: "publish_pipeline_not_wired",
  });
  throw new PersistenceError(
    "validation",
    "Automatic publishing is not supported for this operation through the official API.",
    { status: 501 },
  );
}
