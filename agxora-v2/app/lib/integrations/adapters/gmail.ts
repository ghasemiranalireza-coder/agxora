import "server-only";

import { beginGmailOAuthForActor, disconnectGmailForActor } from "@/app/lib/social/oauth/gmail";
import {
  executeGmailToolForActor,
  isGmailToolName,
  type GmailToolArgs,
  type GmailToolName,
} from "@/app/lib/business-agent/gmail-tools";
import { executeGmailCampaignItemForActor } from "@/app/lib/business-agent/gmail-campaign";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { GmailClientDeps } from "@/app/lib/gmail/client";
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

function gmailToolForCapability(
  capability: ProviderCapability,
  input: Record<string, unknown>,
): GmailToolName {
  const operation = input.operation;
  if (typeof operation === "string" && isGmailToolName(operation)) {
    return operation;
  }
  switch (capability) {
    case "read":
      return typeof input.messageId === "string" && input.messageId
        ? "gmail.get_message"
        : "gmail.list_messages";
    case "create":
      return "gmail.create_draft";
    case "send":
      return "gmail.send_message";
    default:
      throw new PersistenceError(
        "validation",
        `Gmail does not implement capability ${capability}`,
        { status: 501 },
      );
  }
}

function toolArgsFromInput(input: Record<string, unknown>): GmailToolArgs {
  return {
    query: typeof input.query === "string" ? input.query : undefined,
    maxResults:
      typeof input.maxResults === "number" ? input.maxResults : undefined,
    messageId: typeof input.messageId === "string" ? input.messageId : undefined,
    to: typeof input.to === "string" ? input.to : undefined,
    subject: typeof input.subject === "string" ? input.subject : undefined,
    body: typeof input.body === "string" ? input.body : undefined,
    cc: typeof input.cc === "string" ? input.cc : undefined,
    inReplyTo: typeof input.inReplyTo === "string" ? input.inReplyTo : undefined,
    draftId: typeof input.draftId === "string" ? input.draftId : undefined,
    campaignItemId:
      typeof input.campaignItemId === "string" ? input.campaignItemId : undefined,
    approved: input.approved === true,
  };
}

function clientDepsFromInput(input: Record<string, unknown>): GmailClientDeps {
  const deps = input.deps;
  if (!isRecord(deps)) return {};
  return {
    fetchImpl:
      typeof deps.fetchImpl === "function"
        ? (deps.fetchImpl as typeof fetch)
        : undefined,
    getAccessToken:
      typeof deps.getAccessToken === "function"
        ? (deps.getAccessToken as GmailClientDeps["getAccessToken"])
        : undefined,
  };
}

function capabilityMatchesTool(
  capability: ProviderCapability,
  tool: GmailToolName,
): boolean {
  if (tool === "gmail.list_messages" || tool === "gmail.get_message") {
    return capability === "read";
  }
  if (tool === "gmail.create_draft") return capability === "create";
  if (tool === "gmail.send_message") return capability === "send";
  return false;
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

export class GmailProviderAdapter implements ProviderAdapter {
  readonly providerId = "gmail" as const;
  readonly capabilities = getProviderDefinition("gmail").implementedCapabilities;

  async connect(ctx: AdapterContext): Promise<AdapterConnectResult> {
    const actor = requireAdapterActor(ctx);
    const result = await beginGmailOAuthForActor(actor, ctx.redirectPath);
    return {
      authorizationUrl: result.authorizationUrl,
      connected: false,
      code: "ok",
    };
  }

  async disconnect(ctx: AdapterContext): Promise<AdapterDisconnectResult> {
    const actor = requireAdapterActor(ctx);
    await disconnectGmailForActor(actor);
    return { code: "ok" };
  }

  async getConnection(ctx: AdapterContext) {
    const actor = requireAdapterActor(ctx);
    return resolveAdapterConnectionForActor(actor, "gmail");
  }

  async execute(
    capability: ProviderCapability,
    input: unknown,
    ctx: AdapterContext,
  ): Promise<AdapterExecuteResult> {
    try {
      const actor = requireAdapterActor(ctx);
      if (!this.capabilities.includes(capability) || capability === "connect") {
        return {
          ok: false,
          code: "not_implemented",
          message: "not_implemented",
        };
      }

      const record = isRecord(input) ? input : {};
      if (record.source === "campaign_item") {
        if (capability !== "send") {
          return {
            ok: false,
            code: "not_implemented",
            message: "not_implemented",
          };
        }
        const campaignItemId =
          typeof record.campaignItemId === "string" ? record.campaignItemId : "";
        if (!campaignItemId) {
          throw new PersistenceError("validation", "campaignItemId is required");
        }
        const item = await loadCampaignItemForActor(actor, campaignItemId);
        const output = await executeGmailCampaignItemForActor(actor, item);
        return { ok: true, code: "ok", output: redactSecrets(output) };
      }

      const tool = gmailToolForCapability(capability, record);
      if (!capabilityMatchesTool(capability, tool)) {
        throw new PersistenceError(
          "validation",
          "Gmail capability does not match the requested operation",
        );
      }
      const output = await executeGmailToolForActor(
        actor,
        tool,
        toolArgsFromInput(record),
        clientDepsFromInput(record),
      );
      return { ok: true, code: "ok", output: redactSecrets(output) };
    } catch (error) {
      return normalizeAdapterError(error);
    }
  }

  async health(ctx: AdapterContext): Promise<AdapterHealthResult> {
    const connection = await this.getConnection(ctx);
    return adapterHealthFromConnection(connection);
  }
}

export const gmailAdapter = new GmailProviderAdapter();
