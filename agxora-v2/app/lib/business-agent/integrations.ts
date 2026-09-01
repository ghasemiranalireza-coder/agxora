import "server-only";

import type { IntegrationConnection, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { hasActiveSocialCredential } from "@/app/lib/social/credentials";
import { beginYouTubeOAuthForActor, disconnectYouTubeForActor } from "@/app/lib/social/oauth/youtube";
import { recordExternalAction } from "./audit";
import {
  assertCanManageIntegrations,
  permissionGranted,
  type SideEffectPermission,
} from "./authorize";
import {
  getCatalogEntry,
  INTEGRATION_CATALOG,
  SAFE_PERMISSIONS,
  isIntegrationProviderId,
  type IntegrationPermissionFlags,
  type IntegrationProviderId,
} from "./catalog";

export type IntegrationSummary = {
  readonly provider: IntegrationProviderId;
  readonly label: string;
  readonly category: "email" | "social";
  readonly implementationStatus: "oauth_ready" | "not_implemented";
  readonly oauthNote: string;
  readonly connected: boolean;
  readonly status: IntegrationConnection["status"];
  readonly accountLabel: string | null;
  readonly externalAccountId: string | null;
  readonly lastError: string | null;
  readonly permissions: IntegrationPermissionFlags;
  readonly connectedAt: string | null;
};

function flagsFromRow(row: IntegrationConnection | null): IntegrationPermissionFlags {
  if (!row) return SAFE_PERMISSIONS;
  return {
    canRead: row.canRead,
    canCreateDraft: row.canCreateDraft,
    canSchedule: row.canSchedule,
    canPublish: row.canPublish,
    canSendEmail: row.canSendEmail,
    canDelete: row.canDelete,
  };
}

async function youtubeConnected(actor: Actor): Promise<boolean> {
  return hasActiveSocialCredential(actor.organizationId, "youtube");
}

async function upsertConnection(
  actor: Actor,
  provider: IntegrationProvider,
  patch: Partial<
    Pick<
      IntegrationConnection,
      | "status"
      | "accountLabel"
      | "externalAccountId"
      | "lastError"
      | "connectedAt"
      | "disconnectedAt"
      | "canRead"
      | "canCreateDraft"
      | "canSchedule"
      | "canPublish"
      | "canSendEmail"
      | "canDelete"
    >
  >,
): Promise<IntegrationConnection> {
  return prisma.integrationConnection.upsert({
    where: {
      organizationId_workspaceId_provider: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      },
    },
    create: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      provider,
      createdByUserId: actor.userId,
      status: patch.status ?? "not_connected",
      accountLabel: patch.accountLabel ?? null,
      externalAccountId: patch.externalAccountId ?? null,
      lastError: patch.lastError ?? null,
      connectedAt: patch.connectedAt ?? null,
      disconnectedAt: patch.disconnectedAt ?? null,
      canRead: patch.canRead ?? SAFE_PERMISSIONS.canRead,
      canCreateDraft: patch.canCreateDraft ?? SAFE_PERMISSIONS.canCreateDraft,
      canSchedule: patch.canSchedule ?? SAFE_PERMISSIONS.canSchedule,
      canPublish: patch.canPublish ?? SAFE_PERMISSIONS.canPublish,
      canSendEmail: patch.canSendEmail ?? SAFE_PERMISSIONS.canSendEmail,
      canDelete: patch.canDelete ?? SAFE_PERMISSIONS.canDelete,
    },
    update: patch,
  });
}

export async function listIntegrationsForActor(
  actor: Actor,
): Promise<readonly IntegrationSummary[]> {
  const rows = await prisma.integrationConnection.findMany({
    where: {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
  });
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  const ytLive = await youtubeConnected(actor);

  return INTEGRATION_CATALOG.map((entry) => {
    const row = byProvider.get(entry.provider) ?? null;
    const liveConnected = entry.provider === "youtube" ? ytLive : false;
    const connected =
      liveConnected || row?.status === "connected";
    return {
      provider: entry.provider,
      label: entry.label,
      category: entry.category,
      implementationStatus: entry.implementationStatus,
      oauthNote: entry.oauthNote,
      connected,
      status: connected
        ? "connected"
        : (row?.status ?? "not_connected"),
      accountLabel: row?.accountLabel ?? null,
      externalAccountId: row?.externalAccountId ?? null,
      lastError: row?.lastError ?? null,
      permissions: flagsFromRow(row),
      connectedAt: row?.connectedAt?.toISOString() ?? null,
    };
  });
}

export async function connectIntegrationForActor(
  actor: Actor,
  provider: IntegrationProviderId,
  redirectPath?: string,
): Promise<{ readonly authorizationUrl?: string; readonly connected: boolean }> {
  assertCanManageIntegrations(actor);
  if (!isIntegrationProviderId(provider)) {
    throw new PersistenceError("validation", "Unknown integration provider");
  }
  const entry = getCatalogEntry(provider);

  if (provider === "youtube") {
    const result = await beginYouTubeOAuthForActor(actor, redirectPath);
    await upsertConnection(actor, "youtube", {
      status: "not_connected",
      lastError: null,
    });
    await recordExternalAction({
      actor,
      provider: "youtube",
      action: "connect_begin",
      status: "planned",
      metadata: { oauth: true },
    });
    return { authorizationUrl: result.authorizationUrl, connected: false };
  }

  await recordExternalAction({
    actor,
    provider,
    action: "connect_begin",
    status: "failed",
    error: "not_implemented",
  });
  throw new PersistenceError(
    "validation",
    "Integration not implemented yet",
    {
      status: 501,
      details: [
        { field: "provider", message: "not_implemented" },
        { field: "note", message: entry.oauthNote },
      ],
    },
  );
}

export async function disconnectIntegrationForActor(
  actor: Actor,
  provider: IntegrationProviderId,
): Promise<void> {
  assertCanManageIntegrations(actor);
  if (provider === "youtube") {
    await disconnectYouTubeForActor(actor);
  } else {
    const entry = getCatalogEntry(provider);
    if (entry.implementationStatus === "not_implemented") {
      const row = await prisma.integrationConnection.findUnique({
        where: {
          organizationId_workspaceId_provider: {
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            provider,
          },
        },
      });
      if (!row || row.status !== "connected") {
        throw new PersistenceError(
          "validation",
          "Integration not implemented yet",
          { status: 501 },
        );
      }
    }
  }

  await upsertConnection(actor, provider, {
    status: "disconnected",
    disconnectedAt: new Date(),
    connectedAt: null,
    accountLabel: null,
    externalAccountId: null,
  });
  await recordExternalAction({
    actor,
    provider,
    action: "disconnect",
    status: "completed",
  });
}

export async function updatePermissionsForActor(
  actor: Actor,
  provider: IntegrationProviderId,
  flags: Partial<IntegrationPermissionFlags>,
): Promise<IntegrationPermissionFlags> {
  assertCanManageIntegrations(actor);
  const existing = await prisma.integrationConnection.findUnique({
    where: {
      organizationId_workspaceId_provider: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      },
    },
  });
  const merged: IntegrationPermissionFlags = {
    ...flagsFromRow(existing),
    ...flags,
  };
  const row = await upsertConnection(actor, provider, merged);
  await recordExternalAction({
    actor,
    provider,
    action: "permissions_update",
    status: "completed",
    metadata: { permissions: merged },
  });
  return flagsFromRow(row);
}

export async function getPermissionFlagsForActor(
  actor: Actor,
  provider: IntegrationProviderId,
): Promise<IntegrationPermissionFlags> {
  const row = await prisma.integrationConnection.findUnique({
    where: {
      organizationId_workspaceId_provider: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      },
    },
  });
  return flagsFromRow(row);
}

export async function assertProviderPermission(
  actor: Actor,
  provider: IntegrationProviderId,
  permission: SideEffectPermission,
): Promise<void> {
  const flags = await getPermissionFlagsForActor(actor, provider);
  if (!permissionGranted(flags, permission)) {
    throw new PersistenceError(
      "forbidden",
      `Permission ${permission} is not granted for ${provider}`,
    );
  }
}

export { hasActiveSocialCredential };
