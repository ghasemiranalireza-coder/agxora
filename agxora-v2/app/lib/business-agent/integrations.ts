import "server-only";

import type { IntegrationConnection, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import { hasActiveSocialCredential, getSocialCredentialSummary } from "@/app/lib/social/credentials";
import { beginYouTubeOAuthForActor, disconnectYouTubeForActor } from "@/app/lib/social/oauth/youtube";
import { beginGmailOAuthForActor, disconnectGmailForActor } from "@/app/lib/social/oauth/gmail";
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
  persistenceProviderFromUnknown,
  type IntegrationPermissionFlags,
  type IntegrationProviderId,
} from "./catalog";
import { resolveCanonicalProvidersForActor } from "@/app/lib/integrations/resolve-for-actor";
import type { ResolvedProviderState } from "@/app/lib/integrations/resolver";
import { toCanonicalProviderId } from "@/app/lib/integrations/ids";

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

async function gmailConnected(actor: Actor): Promise<boolean> {
  return hasActiveSocialCredential(actor.organizationId, "gmail");
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
  const [ytLive, gmailLive, gmailSummary] = await Promise.all([
    youtubeConnected(actor),
    gmailConnected(actor),
    getSocialCredentialSummary(actor.organizationId, "gmail"),
  ]);

  return INTEGRATION_CATALOG.map((entry) => {
    const row = byProvider.get(entry.provider) ?? null;
    const liveConnected =
      entry.provider === "youtube"
        ? ytLive
        : entry.provider === "email_gmail"
          ? gmailLive
          : false;
    const connected = liveConnected;
    const accountLabel =
      entry.provider === "email_gmail"
        ? (row?.accountLabel ?? gmailSummary?.externalAccountName ?? null)
        : (row?.accountLabel ?? null);
    const externalAccountId =
      entry.provider === "email_gmail"
        ? (row?.externalAccountId ?? gmailSummary?.externalAccountId ?? null)
        : (row?.externalAccountId ?? null);
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
      accountLabel,
      externalAccountId,
      lastError: row?.lastError ?? null,
      permissions: flagsFromRow(row),
      connectedAt: row?.connectedAt?.toISOString() ?? null,
    };
  });
}

export async function listCanonicalProvidersForActor(
  actor: Actor,
): Promise<readonly ResolvedProviderState[]> {
  return resolveCanonicalProvidersForActor(actor);
}

export async function connectIntegrationForActor(
  actor: Actor,
  provider: IntegrationProviderId | string,
  redirectPath?: string,
): Promise<{ readonly authorizationUrl?: string; readonly connected: boolean }> {
  assertCanManageIntegrations(actor);
  const persistenceId = persistenceProviderFromUnknown(String(provider));
  if (!persistenceId || !isIntegrationProviderId(persistenceId)) {
    throw new PersistenceError("validation", "Unknown integration provider");
  }
  const entry = getCatalogEntry(persistenceId);

  if (persistenceId === "youtube") {
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
      metadata: { oauth: true, canonicalProviderId: toCanonicalProviderId("youtube") },
    });
    return { authorizationUrl: result.authorizationUrl, connected: false };
  }

  if (persistenceId === "email_gmail") {
    const result = await beginGmailOAuthForActor(actor, redirectPath);
    await upsertConnection(actor, "email_gmail", {
      status: "not_connected",
      lastError: null,
    });
    await recordExternalAction({
      actor,
      provider: "email_gmail",
      action: "connect_begin",
      status: "planned",
      metadata: { oauth: true, canonicalProviderId: toCanonicalProviderId("gmail") },
    });
    return { authorizationUrl: result.authorizationUrl, connected: false };
  }

  await recordExternalAction({
    actor,
    provider: persistenceId,
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
  provider: IntegrationProviderId | string,
): Promise<void> {
  assertCanManageIntegrations(actor);
  const persistenceId = persistenceProviderFromUnknown(String(provider));
  if (!persistenceId || !isIntegrationProviderId(persistenceId)) {
    throw new PersistenceError("validation", "Unknown integration provider");
  }
  if (persistenceId === "youtube") {
    await disconnectYouTubeForActor(actor);
  } else if (persistenceId === "email_gmail") {
    await disconnectGmailForActor(actor);
  } else {
    const entry = getCatalogEntry(persistenceId);
    if (entry.implementationStatus === "not_implemented") {
      const row = await prisma.integrationConnection.findUnique({
        where: {
          organizationId_workspaceId_provider: {
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            provider: persistenceId,
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

  await upsertConnection(actor, persistenceId, {
    status: "disconnected",
    disconnectedAt: new Date(),
    connectedAt: null,
    accountLabel: null,
    externalAccountId: null,
  });
  await recordExternalAction({
    actor,
    provider: persistenceId,
    action: "disconnect",
    status: "completed",
  });
}

export async function updatePermissionsForActor(
  actor: Actor,
  provider: IntegrationProviderId | string,
  flags: Partial<IntegrationPermissionFlags>,
): Promise<IntegrationPermissionFlags> {
  assertCanManageIntegrations(actor);
  const persistenceId = persistenceProviderFromUnknown(String(provider));
  if (!persistenceId || !isIntegrationProviderId(persistenceId)) {
    throw new PersistenceError("validation", "Unknown integration provider");
  }
  const existing = await prisma.integrationConnection.findUnique({
    where: {
      organizationId_workspaceId_provider: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider: persistenceId,
      },
    },
  });
  const merged: IntegrationPermissionFlags = {
    ...flagsFromRow(existing),
    ...flags,
  };
  const row = await upsertConnection(actor, persistenceId, merged);
  await recordExternalAction({
    actor,
    provider: persistenceId,
    action: "permissions_update",
    status: "completed",
    metadata: { permissions: merged },
  });
  return flagsFromRow(row);
}

export async function markIntegrationConnectedForActor(
  actor: Actor,
  provider: IntegrationProviderId,
  input: {
    readonly accountLabel?: string | null;
    readonly externalAccountId?: string | null;
  },
): Promise<void> {
  await upsertConnection(actor, provider, {
    status: "connected",
    accountLabel: input.accountLabel ?? null,
    externalAccountId: input.externalAccountId ?? null,
    lastError: null,
    connectedAt: new Date(),
    disconnectedAt: null,
  });
  await recordExternalAction({
    actor,
    provider,
    action: "connect_complete",
    status: "completed",
    metadata: { accountLabel: input.accountLabel ?? null },
  });
}

export async function markIntegrationErrorForActor(
  actor: Actor,
  provider: IntegrationProviderId,
  error: string,
): Promise<void> {
  await upsertConnection(actor, provider, {
    status: "error",
    lastError: error,
  });
}

export async function getPermissionFlagsForActor(
  actor: Actor,
  provider: IntegrationProviderId | string,
): Promise<IntegrationPermissionFlags> {
  const persistenceId = persistenceProviderFromUnknown(String(provider));
  if (!persistenceId || !isIntegrationProviderId(persistenceId)) {
    return SAFE_PERMISSIONS;
  }
  const row = await prisma.integrationConnection.findUnique({
    where: {
      organizationId_workspaceId_provider: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider: persistenceId,
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
