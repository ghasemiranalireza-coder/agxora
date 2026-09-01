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
  const channels = (input.channels ?? []).filter(isIntegrationProviderId);
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

  const policy = await getAgentPolicyForActor(actor);
  if (policy.mode === "SAFE" && item.status !== "APPROVED") {
    await recordExternalAction({
      actor,
      provider: item.provider,
      action: kind,
      status: "approval_required",
      target: item.id,
      error: "safe_mode_requires_approval",
    });
    throw new PersistenceError(
      "forbidden",
      "SAFE MODE requires explicit approval before external actions",
    );
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

  // YouTube OAuth exists, but campaign publish is not wired to the creative
  // upload pipeline in Phase 1. Never report fake success.
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
