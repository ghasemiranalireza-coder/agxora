import "server-only";

import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import type { Actor } from "@/app/lib/tenancy/types";
import { hasActiveSocialCredential, getSocialCredentialSummary } from "@/app/lib/social/credentials";
import {
  socialCredentialPlatformFor,
  toCanonicalProviderId,
  toPersistenceProviderId,
} from "./ids";
import { PROVIDER_REGISTRY } from "./registry";
import {
  resolveProviderState,
  type ResolvedProviderState,
  type ResolverConnectionInput,
} from "./resolver";
import type { ConnectionRuntimeStatus } from "./types";
import type { WorkspacePermissionFlags } from "./permission-flags";

function flagsFromRow(row: IntegrationConnection | null): WorkspacePermissionFlags | null {
  if (!row) return null;
  return {
    canRead: row.canRead,
    canCreateDraft: row.canCreateDraft,
    canSchedule: row.canSchedule,
    canPublish: row.canPublish,
    canSendEmail: row.canSendEmail,
    canDelete: row.canDelete,
  };
}

function runtimeStatusFromRow(
  row: IntegrationConnection | null,
): ConnectionRuntimeStatus {
  if (!row) return "not_connected";
  switch (row.status) {
    case "connected":
      return "connected";
    case "disconnected":
      return "disconnected";
    case "error":
      return "error";
    default:
      return "not_connected";
  }
}

function connectionInputFromRow(
  row: IntegrationConnection | null,
): ResolverConnectionInput | null {
  if (!row) return null;
  return {
    status: runtimeStatusFromRow(row),
    lastError: row.lastError,
    permissions: flagsFromRow(row),
    accountLabel: row.accountLabel,
    externalAccountId: row.externalAccountId,
    connectedAt: row.connectedAt?.toISOString() ?? null,
  };
}

/**
 * Server-authoritative provider states for the Integration Center.
 * Credentials are organization scoped; connection rows are workspace scoped.
 */
export async function resolveCanonicalProvidersForActor(
  actor: Actor,
): Promise<readonly ResolvedProviderState[]> {
  const persistenceIds = PROVIDER_REGISTRY.map((entry) =>
    toPersistenceProviderId(entry.providerId),
  ).filter((id): id is NonNullable<typeof id> => id != null);

  const [rows, gmailLive, youtubeLive, gmailSummary, youtubeSummary] =
    await Promise.all([
      persistenceIds.length
        ? prisma.integrationConnection.findMany({
            where: {
              organizationId: actor.organizationId,
              workspaceId: actor.workspaceId,
              provider: { in: persistenceIds },
            },
          })
        : Promise.resolve([] as IntegrationConnection[]),
      hasActiveSocialCredential(actor.organizationId, "gmail"),
      hasActiveSocialCredential(actor.organizationId, "youtube"),
      getSocialCredentialSummary(actor.organizationId, "gmail"),
      getSocialCredentialSummary(actor.organizationId, "youtube"),
    ]);

  const byCanonical = new Map<string, IntegrationConnection>();
  for (const row of rows) {
    const canonical = toCanonicalProviderId(row.provider);
    if (canonical) byCanonical.set(canonical, row);
  }

  return PROVIDER_REGISTRY.map((provider) => {
    const row = byCanonical.get(provider.providerId) ?? null;
    const social = socialCredentialPlatformFor(provider.providerId);
    const credentialAvailable =
      social === "gmail" ? gmailLive : social === "youtube" ? youtubeLive : false;
    const summary =
      social === "gmail"
        ? gmailSummary
        : social === "youtube"
          ? youtubeSummary
          : null;
    const connection = connectionInputFromRow(row);
    const merged: ResolverConnectionInput | null = connection
      ? {
          ...connection,
          accountLabel:
            connection.accountLabel ?? summary?.externalAccountName ?? null,
          externalAccountId:
            connection.externalAccountId ?? summary?.externalAccountId ?? null,
        }
      : summary
        ? {
            status: "not_connected",
            lastError: null,
            permissions: null,
            accountLabel: summary.externalAccountName ?? null,
            externalAccountId: summary.externalAccountId ?? null,
            connectedAt: null,
          }
        : null;
    return resolveProviderState({
      provider,
      connection: merged,
      credentialAvailable,
      localStorageConnected: false,
    });
  });
}
