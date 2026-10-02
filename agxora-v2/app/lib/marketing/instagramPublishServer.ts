/**
 * Governed Instagram image publish.
 * Organization, account, caption, and asset come from the server.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { getAgentOsStateForActor, putAgentOsStateForActor } from "@/app/lib/agents/persistence";
import { assertGovernedExecutionAllowed, commercialBillingSchemaReady } from "@/app/lib/billing/enforce";
import { canUseCapability } from "@/app/lib/billing/entitlements";
import { paidAccessFor } from "@/app/lib/billing/executionPolicy";
import { authorizeCapabilityExecution } from "@/features/agents/capabilities/registry";
import { createMemoryRecord } from "@/features/agents/memory";
import { capabilitiesForRole } from "@/features/agents/workforce/workers";
import { validateStoredMarketingPlan } from "@/features/agents/marketing/planSchema";
import { lookupGrantedPermissionKeys } from "@/app/lib/platform-authorization/service";
import { getSocialCredentialSummary, getValidSocialAccessTokenForActor } from "@/app/lib/social/credentials";
import { getInstagramOAuthConfig } from "@/app/lib/social/instagram/config";
import { signMarketingAssetTicket } from "@/app/lib/social/instagram/assetTicket";
import {
  createImageContainer,
  publishContainer,
  readContainerStatus,
  readPublishedMedia,
  type InstagramFetch,
} from "@/app/lib/social/instagram/client";
import type { Actor } from "@/app/lib/tenancy/types";
import { requireCurrentClaimGatePass } from "./claimGateServer";
import {
  INSTAGRAM_PUBLISH_CAPABILITY,
  approvedInstagramCaption,
  assessInstagramPublishAccess,
  classifyContainerCreate,
  classifyContainerStatus,
  classifyMediaPublish,
  contentDigest,
  decideIdempotentPublish,
  instagramPublishIdempotencyKey,
  safePublishEvidence,
  verifyReadBack,
  type ExistingPublish,
  type PublishExecutionStatus,
} from "./instagramPublish";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export type InstagramPublishView = {
  readonly status: "not_connected" | "connected" | "ready" | "publishing" | "published" | "verified" | "ambiguous" | "failed" | "blocked";
  readonly username: string | null;
  readonly caption: string | null;
  readonly executionId: string | null;
  readonly containerId: string | null;
  readonly mediaId: string | null;
  readonly permalink: string | null;
  readonly message: string | null;
};

let fetchOverride: InstagramFetch | null = null;

/** Test-only. Production uses the platform fetch. */
export function setInstagramFetchForTests(fetchImpl: InstagramFetch | null): void {
  fetchOverride = fetchImpl;
}

function viewFromOutcome(status: PublishExecutionStatus, outcome: Record<string, unknown>, username: string | null): InstagramPublishView {
  const mediaId = typeof outcome.mediaId === "string" ? outcome.mediaId : null;
  const verified = status === "COMPLETED" && outcome.verificationStatus === "verified";
  return {
    status: status === "COMPLETED" && verified ? "verified" : status === "COMPLETED" ? "published" : status === "FAILED" ? "failed" : status === "AMBIGUOUS" ? "ambiguous" : "publishing",
    username,
    caption: typeof outcome.caption === "string" ? outcome.caption : null,
    executionId: typeof outcome.executionId === "string" ? outcome.executionId : null,
    containerId: typeof outcome.containerId === "string" ? outcome.containerId : null,
    mediaId,
    permalink: typeof outcome.permalink === "string" ? outcome.permalink : null,
    message: status === "AMBIGUOUS"
      ? "Publication status uncertain. Do not republish automatically."
      : status === "FAILED"
        ? "Publication failed."
        : verified
          ? "Verified"
          : null,
  };
}

async function entitlement(actor: Actor): Promise<boolean> {
  const subscription = await prisma.commercialSubscription.findUnique({ where: { organizationId: actor.organizationId } }).catch(() => null);
  const access = subscription
    ? paidAccessFor({
        organizationId: subscription.organizationId,
        planCode: subscription.planCode as "agxora_base" | "agxora_business" | "agxora_professional",
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }, new Date())
    : "legacy";
  return canUseCapability({
    planCode: access === "paid" ? (subscription?.planCode as "agxora_base" | "agxora_business" | "agxora_professional") : null,
    capabilityId: INSTAGRAM_PUBLISH_CAPABILITY,
    access,
  });
}

async function loadPublishContext(actor: Actor, input: {
  readonly goalId: string;
  readonly planId: string;
  readonly day: number;
  readonly clientOrganizationId?: string;
  readonly explicitPublish: boolean;
  readonly clientCaption?: string;
  readonly clientAssetId?: string;
  readonly clientImageUrl?: string;
}) {
  const configured = Boolean(getInstagramOAuthConfig());
  const state = await getAgentOsStateForActor(actor);
  const worker = (state.workers ?? []).find((item) =>
    item.organizationId === actor.organizationId && item.role === "MARKETING" && item.status === "ACTIVE",
  );
  const planRecord = state.plans.find((item) => item.id === input.planId && item.organizationId === actor.organizationId && item.goalId === input.goalId);
  const record = planRecord?.steps.find((step) => step.capabilityId === "MARKETING_RECORD_PLAN");
  const stored = validateStoredMarketingPlan(asRecord(record?.result)?.approvedPlan ?? asRecord(record?.result)?.plan);
  const item = stored.ok ? stored.plan.contentItems.find((entry) => entry.day === input.day) : undefined;
  const storedExecution = await prisma.agentGovernedExecution.findFirst({
    where: {
      organizationId: actor.organizationId,
      businessGoalId: input.goalId,
      planId: input.planId,
      capabilityId: "MARKETING_RECORD_PLAN",
      status: "COMPLETED",
    },
  });
  const caption = item ? approvedInstagramCaption(item.draftCopy) : "";
  if (input.clientCaption !== undefined && input.clientCaption !== caption) {
    return { ok: false as const, status: 403, error: "The published caption must match the approved plan." };
  }
  if (input.clientImageUrl) {
    return { ok: false as const, status: 403, error: "An external image URL cannot be published." };
  }
  const claim = stored.ok
    ? await requireCurrentClaimGatePass(actor, stored.plan, input.planId)
    : { ok: false as const, error: "The claim gate must pass for the current plan." };
  const image = await prisma.agentGovernedExecution.findFirst({
    where: {
      organizationId: actor.organizationId,
      businessGoalId: input.goalId,
      planId: input.planId,
      capabilityId: "MARKETING_CREATE_IMAGE",
      status: "COMPLETED",
    },
    orderBy: { updatedAt: "desc" },
  });
  const imageOutcome = asRecord(image?.outcome);
  const assetId = typeof imageOutcome?.assetId === "string" ? imageOutcome.assetId : "";
  const imageApproved = imageOutcome?.approval === "approved" && imageOutcome.day === input.day;
  if (input.clientAssetId && input.clientAssetId !== assetId) {
    return { ok: false as const, status: 404, error: "Marketing image was not found." };
  }
  const asset = assetId
    ? await prisma.creativeAsset.findFirst({ where: { id: assetId, organizationId: actor.organizationId } })
    : null;
  const credential = await getSocialCredentialSummary(actor.organizationId, "instagram");
  const permissions = await lookupGrantedPermissionKeys(actor, "instagram");
  const access = assessInstagramPublishAccess({
    actorOrganizationId: actor.organizationId,
    clientOrganizationId: input.clientOrganizationId,
    workerActive: Boolean(worker && capabilitiesForRole("MARKETING").includes(INSTAGRAM_PUBLISH_CAPABILITY)),
    entitled: await entitlement(actor),
    configured,
    planFound: Boolean(planRecord),
    planOrganizationId: planRecord?.organizationId ?? null,
    planStatus: stored.ok ? stored.plan.status : "missing",
    channelIntent: stored.ok ? stored.plan.channelIntent : null,
    itemFound: Boolean(item),
    recordCompleted: Boolean(storedExecution),
    claimGatePass: claim.ok,
    imageApproved,
    imageOwned: Boolean(asset),
    explicitPublish: input.explicitPublish,
    credentialActive: Boolean(credential && !credential.revokedAt && credential.externalAccountId),
    publishPermission: Boolean(permissions?.includes("publish_posts")),
  });
  if (!access.ok) return access;
  if (!stored.ok || !item || !worker || !credential?.externalAccountId || !credential.externalAccountName || !asset) {
    return { ok: false as const, status: 403, error: "Instagram publishing is not ready." };
  }
  return {
    ok: true as const,
    workerId: worker.id,
    caption,
    contentHash: claim.ok ? claim.contentHash : contentDigest(caption),
    assetId: asset.id,
    accountId: credential.externalAccountId,
    username: credential.externalAccountName,
  };
}

function readFields(body: {
  goalId?: unknown;
  planId?: unknown;
  day?: unknown;
  action?: unknown;
  organizationId?: unknown;
  caption?: unknown;
  imageUrl?: unknown;
  assetId?: unknown;
  approvalId?: unknown;
  accessToken?: unknown;
} | null) {
  void body?.approvalId;
  void body?.accessToken;
  return {
    goalId: typeof body?.goalId === "string" ? body.goalId.trim() : "",
    planId: typeof body?.planId === "string" ? body.planId.trim() : "",
    day: typeof body?.day === "number" ? body.day : Number.NaN,
    action: typeof body?.action === "string" ? body.action : "",
    clientOrganizationId: typeof body?.organizationId === "string" ? body.organizationId.trim() : undefined,
    clientCaption: typeof body?.caption === "string" ? body.caption : undefined,
    clientImageUrl: typeof body?.imageUrl === "string" ? body.imageUrl.trim() : undefined,
    clientAssetId: typeof body?.assetId === "string" ? body.assetId.trim() : undefined,
  };
}

export async function previewInstagramPublishForActor(actor: Actor, body: Parameters<typeof readFields>[0]) {
  const fields = readFields(body);
  if (!fields.goalId || !fields.planId || !Number.isInteger(fields.day)) {
    return { ok: false as const, status: 400, error: "Marketing publish fields are required." };
  }
  const loaded = await loadPublishContext(actor, { ...fields, explicitPublish: true, clientCaption: undefined, clientImageUrl: undefined });
  if (!loaded.ok) {
    const credential = await getSocialCredentialSummary(actor.organizationId, "instagram").catch(() => null);
    return {
      ok: true as const,
      preview: {
        status: credential?.externalAccountName ? "blocked" : "not_connected",
        username: credential?.externalAccountName ? `@${credential.externalAccountName.replace(/^@/, "")}` : null,
        caption: null,
        executionId: null,
        containerId: null,
        mediaId: null,
        permalink: null,
        message: loaded.error,
      } satisfies InstagramPublishView,
    };
  }
  const baseKey = instagramPublishIdempotencyKey({
    organizationId: actor.organizationId,
    goalId: fields.goalId,
    planId: fields.planId,
    day: fields.day,
  });
  const existing = await prisma.agentGovernedExecution.findFirst({
    where: { organizationId: actor.organizationId, idempotencyKey: { startsWith: baseKey } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const outcome = asRecord(existing.outcome) ?? {};
    return { ok: true as const, preview: viewFromOutcome(existing.status, { ...outcome, executionId: existing.executionId }, `@${loaded.username.replace(/^@/, "")}`) };
  }
  return {
    ok: true as const,
    preview: {
      status: "ready",
      username: `@${loaded.username.replace(/^@/, "")}`,
      caption: loaded.caption,
      executionId: null,
      containerId: null,
      mediaId: null,
      permalink: null,
      message: null,
    } satisfies InstagramPublishView,
  };
}

export async function publishInstagramForActor(actor: Actor, body: Parameters<typeof readFields>[0]) {
  const fields = readFields(body);
  if (fields.action !== "publish") {
    return { ok: false as const, status: 403, error: "Publish to Instagram requires an explicit action." };
  }
  if (!fields.goalId || !fields.planId || !Number.isInteger(fields.day)) {
    return { ok: false as const, status: 400, error: "Marketing publish fields are required." };
  }
  const capability = authorizeCapabilityExecution({
    capabilityId: INSTAGRAM_PUBLISH_CAPABILITY,
    organizationId: actor.organizationId,
  });
  if (!capability.ok) {
    return { ok: false as const, status: 403, error: "Instagram publishing is not available." };
  }
  const loaded = await loadPublishContext(actor, { ...fields, explicitPublish: true });
  if (!loaded.ok) return loaded;
  const config = getInstagramOAuthConfig();
  if (!config) return { ok: false as const, status: 503, error: "Instagram publishing is not configured." };

  const baseKey = instagramPublishIdempotencyKey({
    organizationId: actor.organizationId,
    goalId: fields.goalId,
    planId: fields.planId,
    day: fields.day,
  });
  const rows = await prisma.agentGovernedExecution.findMany({
    where: { organizationId: actor.organizationId, idempotencyKey: { startsWith: baseKey } },
  });
  const decision = decideIdempotentPublish({
    baseKey,
    existing: rows.map((row) => {
      const outcome = asRecord(row.outcome) ?? {};
      return {
        idempotencyKey: row.idempotencyKey,
        executionId: row.executionId,
        status: row.status,
        containerId: typeof outcome.containerId === "string" ? outcome.containerId : undefined,
        mediaId: typeof outcome.mediaId === "string" ? outcome.mediaId : undefined,
      } satisfies ExistingPublish;
    }),
  });
  if (decision.action === "replay") {
    const row = rows.find((item) => item.executionId === decision.existing.executionId);
    const outcome = asRecord(row?.outcome) ?? {};
    return {
      ok: true as const,
      replayed: true,
      preview: viewFromOutcome(decision.existing.status, { ...outcome, executionId: decision.existing.executionId }, `@${loaded.username.replace(/^@/, "")}`),
    };
  }

  const executionRowId = randomUUID();
  const executionId = randomUUID();
  const billingReady = await commercialBillingSchemaReady();
  try {
    await prisma.$transaction(async (tx) => {
      if (billingReady) {
        await assertGovernedExecutionAllowed(tx, {
          organizationId: actor.organizationId,
          capabilityId: INSTAGRAM_PUBLISH_CAPABILITY,
        });
      }
      await tx.agentGovernedExecution.create({
        data: {
          id: executionRowId,
          organizationId: actor.organizationId,
          idempotencyKey: decision.key,
          executionId,
          businessGoalId: fields.goalId,
          planId: fields.planId,
          capabilityId: INSTAGRAM_PUBLISH_CAPABILITY,
          workerId: loaded.workerId,
          actorId: actor.userId,
          approvalRequired: true,
          approvalGranted: true,
          status: "EXECUTING",
          verificationStatus: "pending",
          outcome: {
            day: fields.day,
            caption: loaded.caption,
            contentHash: contentDigest(loaded.caption),
            assetId: loaded.assetId,
            externalAccountId: loaded.accountId,
            username: loaded.username,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.agentGovernedExecution.findUnique({
        where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey: decision.key } },
      });
      if (!winner) return { ok: false as const, status: 409, error: "Publication status uncertain. Do not republish automatically." };
      return {
        ok: true as const,
        replayed: true,
        preview: viewFromOutcome(winner.status, { ...(asRecord(winner.outcome) ?? {}), executionId: winner.executionId }, `@${loaded.username.replace(/^@/, "")}`),
      };
    }
    throw error;
  }

  const token = await getValidSocialAccessTokenForActor(actor, "instagram");
  if (!token) {
    return finish(actor, executionRowId, executionId, fields, loaded, "FAILED", "credential_unavailable", null);
  }
  const ticket = signMarketingAssetTicket({ organizationId: actor.organizationId, assetId: loaded.assetId });
  const imageUrl = `${config.publicBaseUrl}/api/v1/public/marketing-image/${ticket}`;
  const container = await createImageContainer({
    config,
    accessToken: token,
    igUserId: loaded.accountId,
    imageUrl,
    caption: loaded.caption,
    fetchImpl: fetchOverride ?? undefined,
  });
  const created = classifyContainerCreate(container);
  if (created.kind === "failed" || created.kind === "ambiguous") {
    return finish(actor, executionRowId, executionId, fields, loaded, created.kind === "failed" ? "FAILED" : "AMBIGUOUS", created.reason, null);
  }
  await rememberExternal(executionRowId, { containerId: created.containerId });

  let ready = false;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const status = await readContainerStatus({
      config,
      accessToken: token,
      containerId: created.containerId,
      fetchImpl: fetchOverride ?? undefined,
    });
    const classified = classifyContainerStatus(status.statusCode, status.transportError);
    if (classified === "ready") {
      ready = true;
      break;
    }
    if (classified === "wait") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    return finish(
      actor,
      executionRowId,
      executionId,
      fields,
      loaded,
      classified.kind === "failed" ? "FAILED" : "AMBIGUOUS",
      classified.reason,
      created.containerId,
    );
  }
  if (!ready) {
    return finish(actor, executionRowId, executionId, fields, loaded, "AMBIGUOUS", "container_not_ready", created.containerId);
  }

  const published = classifyMediaPublish(await publishContainer({
    config,
    accessToken: token,
    igUserId: loaded.accountId,
    creationId: created.containerId,
    fetchImpl: fetchOverride ?? undefined,
  }));
  if (published.kind !== "published") {
    return finish(actor, executionRowId, executionId, fields, loaded, published.kind === "failed" ? "FAILED" : "AMBIGUOUS", published.reason, created.containerId);
  }
  await rememberExternal(executionRowId, { containerId: created.containerId, mediaId: published.mediaId });

  const media = await readPublishedMedia({
    config,
    accessToken: token,
    mediaId: published.mediaId,
    fetchImpl: fetchOverride ?? undefined,
  });
  if (!media.ok) {
    return finish(actor, executionRowId, executionId, fields, loaded, "AMBIGUOUS", "readback_unavailable", created.containerId, published.mediaId);
  }
  const verified = verifyReadBack({
    expectedAccountId: loaded.accountId,
    expectedUsername: loaded.username,
    expectedMediaId: published.mediaId,
    expectedCaption: loaded.caption,
    accountId: media.accountId,
    username: media.username,
    mediaId: media.id,
    caption: media.caption,
    permalink: media.permalink,
  });
  if (!verified.ok) {
    return finish(actor, executionRowId, executionId, fields, loaded, "AMBIGUOUS", verified.reason, created.containerId, published.mediaId);
  }
  return finish(actor, executionRowId, executionId, fields, loaded, "COMPLETED", "verified", created.containerId, published.mediaId, verified.permalink);
}

async function rememberExternal(id: string, patch: { containerId?: string; mediaId?: string }) {
  const current = await prisma.agentGovernedExecution.findUnique({ where: { id } });
  if (!current) return;
  await prisma.agentGovernedExecution.update({
    where: { id },
    data: { outcome: { ...(asRecord(current.outcome) ?? {}), ...patch } as Prisma.InputJsonValue },
  });
}

async function finish(
  actor: Actor,
  id: string,
  executionId: string,
  fields: { goalId: string; planId: string; day: number },
  loaded: { workerId: string; caption: string; assetId: string; accountId: string; username: string },
  status: PublishExecutionStatus,
  reason: string,
  containerId: string | null,
  mediaId?: string,
  permalink?: string,
) {
  const publishedAt = status === "COMPLETED" ? new Date().toISOString() : undefined;
  const metadata = safePublishEvidence({
    provider: "instagram",
    externalAccountId: loaded.accountId,
    username: loaded.username,
    containerId: containerId ?? undefined,
    mediaId,
    permalink,
    contentHash: contentDigest(loaded.caption),
    publishedAt,
    verificationStatus: status === "COMPLETED" ? "verified" : status === "FAILED" ? "failed" : "pending",
  });
  await prisma.agentGovernedExecution.update({
    where: { id },
    data: {
      status,
      verificationStatus: status === "COMPLETED" ? "verified" : status === "FAILED" ? "failed" : "pending",
      outcome: {
        day: fields.day,
        caption: loaded.caption,
        contentHash: contentDigest(loaded.caption),
        assetId: loaded.assetId,
        externalAccountId: loaded.accountId,
        username: loaded.username,
        containerId,
        mediaId: mediaId ?? null,
        permalink: permalink ?? null,
        reason,
        executionId,
        verificationStatus: status === "COMPLETED" ? "verified" : "pending",
      } as Prisma.InputJsonValue,
    },
  });
  await prisma.agentGovernedEvidence.create({
    data: {
      organizationId: actor.organizationId,
      executionId,
      businessGoalId: fields.goalId,
      planId: fields.planId,
      capabilityId: INSTAGRAM_PUBLISH_CAPABILITY,
      workerId: loaded.workerId,
      actorId: actor.userId,
      action: status === "COMPLETED" ? "instagram_publish_verified" : "instagram_publish_stopped",
      status,
      metadata,
    },
  });
  let memoryId: string | null = null;
  if (status === "COMPLETED") {
    const state = await getAgentOsStateForActor(actor);
    const username = loaded.username.replace(/^@/, "");
    const value = {
      kind: "business_memory",
      subjectType: "organization",
      memoryType: "GOAL_OUTCOME",
      content: `Approved marketing content was published to Instagram @${username} and verified by external read-back. External media ID ${mediaId ?? ""}.`,
      status: "VERIFIED",
      provenance: "VERIFIED_EXECUTION",
      sourceReference: executionId,
      conflict: false,
      history: [],
      updatedAt: new Date().toISOString(),
    };
    const record = createMemoryRecord({
      organizationId: actor.organizationId,
      scope: "business",
      key: `memory:GOAL_OUTCOME:instagram:${executionId}`,
      value,
    });
    await putAgentOsStateForActor(actor, { ...state, memories: [...state.memories, record] });
    memoryId = record.id;
  }
  return {
    ok: true as const,
    replayed: false,
    memoryId,
    preview: viewFromOutcome(status, {
      caption: loaded.caption,
      executionId,
      containerId,
      mediaId: mediaId ?? null,
      permalink: permalink ?? null,
      verificationStatus: status === "COMPLETED" ? "verified" : "pending",
    }, `@${loaded.username.replace(/^@/, "")}`),
  };
}
