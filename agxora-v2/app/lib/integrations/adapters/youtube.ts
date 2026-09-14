import "server-only";

import { beginYouTubeOAuthForActor, disconnectYouTubeForActor } from "@/app/lib/social/oauth/youtube";
import { getSocialProviderAdapter } from "@/app/lib/social/adapters/registry";
import type { SocialPublishInput } from "@/app/lib/social/adapters/provider";
import { executeYouTubeCampaignItemForActor } from "@/app/lib/business-agent/youtube-publish";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { redactSecrets } from "@/app/lib/business-agent/redact";
import { getProviderDefinition } from "../registry";
import { requireAdapterActor } from "../adapter-context";
import {
  adapterHealthFromConnection,
  normalizeAdapterError,
} from "../adapter-errors";
import type {
  AdapterConnectResult,
  AdapterContext,
  AdapterDisconnectResult,
  AdapterExecuteResult,
  AdapterHealthResult,
  ProviderAdapter,
} from "../adapter";
import type { ProviderCapability } from "../types";
import { resolveAdapterConnectionForActor } from "./connection";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function loadCampaignItemForActor(actor: Actor, itemId: string) {
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
  return item;
}

function youtubeKindFromInput(
  capability: ProviderCapability,
  input: Record<string, unknown>,
): "publish" | "schedule" | "send_email" {
  if (input.operation === "schedule" || capability === "schedule") {
    return "schedule";
  }
  if (input.operation === "send_email" || capability === "send") {
    return "send_email";
  }
  return "publish";
}

function publishInputFromRecord(
  actor: Actor,
  input: Record<string, unknown>,
): SocialPublishInput {
  const campaignItemId =
    typeof input.campaignItemId === "string" ? input.campaignItemId : "";
  if (!campaignItemId) {
    throw new PersistenceError("validation", "campaignItemId is required");
  }
  return {
    actor,
    campaignItemId,
    title: typeof input.title === "string" ? input.title : "",
    description:
      typeof input.description === "string"
        ? input.description
        : typeof input.caption === "string"
          ? input.caption
          : typeof input.body === "string"
            ? input.body
            : "",
    body: typeof input.body === "string" ? input.body : undefined,
    mediaAssetId:
      typeof input.mediaAssetId === "string"
        ? input.mediaAssetId
        : typeof input.mediaRequirement === "string"
          ? input.mediaRequirement
          : null,
    contentType: typeof input.contentType === "string" ? input.contentType : "video",
    scheduledAt:
      input.scheduledAt instanceof Date
        ? input.scheduledAt
        : typeof input.scheduledAt === "string"
          ? new Date(input.scheduledAt)
          : null,
  };
}

export class YouTubeProviderAdapter implements ProviderAdapter {
  readonly providerId = "youtube" as const;
  readonly capabilities = getProviderDefinition("youtube").implementedCapabilities;

  async connect(ctx: AdapterContext): Promise<AdapterConnectResult> {
    const actor = requireAdapterActor(ctx);
    const result = await beginYouTubeOAuthForActor(actor, ctx.redirectPath);
    return {
      authorizationUrl: result.authorizationUrl,
      connected: false,
      code: "ok",
    };
  }

  async disconnect(ctx: AdapterContext): Promise<AdapterDisconnectResult> {
    const actor = requireAdapterActor(ctx);
    await disconnectYouTubeForActor(actor);
    return { code: "ok" };
  }

  async getConnection(ctx: AdapterContext) {
    const actor = requireAdapterActor(ctx);
    return resolveAdapterConnectionForActor(actor, "youtube");
  }

  async execute(
    capability: ProviderCapability,
    input: unknown,
    ctx: AdapterContext,
  ): Promise<AdapterExecuteResult> {
    try {
      const actor = requireAdapterActor(ctx);
      const record = isRecord(input) ? input : {};

      if (record.source === "campaign_item") {
        const campaignItemId =
          typeof record.campaignItemId === "string" ? record.campaignItemId : "";
        if (!campaignItemId) {
          throw new PersistenceError("validation", "campaignItemId is required");
        }
        const item = await loadCampaignItemForActor(actor, campaignItemId);
        const kind = youtubeKindFromInput(capability, record);
        const output = await executeYouTubeCampaignItemForActor(actor, item, kind);
        return { ok: true, code: "ok", output: redactSecrets(output) };
      }

      if (capability === "connect" || capability === "create" || capability === "schedule") {
        return { ok: false, code: "not_implemented", message: "not_implemented" };
      }
      if (!this.capabilities.includes(capability)) {
        return { ok: false, code: "not_implemented", message: "not_implemented" };
      }

      const social = getSocialProviderAdapter("youtube");

      if (capability === "read") {
        const accounts = await social.listAccounts(actor);
        if (accounts.kind !== "ok") {
          return {
            ok: false,
            code:
              accounts.reason === "youtube_not_connected"
                ? "not_connected"
                : "provider_error",
            message: accounts.reason,
          };
        }
        return { ok: true, code: "ok", output: redactSecrets(accounts) };
      }

      if (capability !== "publish") {
        return { ok: false, code: "not_implemented", message: "not_implemented" };
      }

      const result = await social.publishVideo(publishInputFromRecord(actor, record));
      if (result.kind !== "ok") {
        const code =
          result.kind === "unsupported"
            ? "not_implemented"
            : result.kind === "human_required"
              ? "approval_required"
              : result.reason === "youtube_not_connected"
                ? "not_connected"
                : "provider_error";
        return {
          ok: false,
          code,
          message: result.reason,
          status: result.kind === "human_required" ? 409 : 502,
        };
      }
      return { ok: true, code: "ok", output: redactSecrets(result) };
    } catch (error) {
      return normalizeAdapterError(error);
    }
  }

  async health(ctx: AdapterContext): Promise<AdapterHealthResult> {
    const connection = await this.getConnection(ctx);
    return adapterHealthFromConnection(connection);
  }
}

export const youtubeAdapter = new YouTubeProviderAdapter();
