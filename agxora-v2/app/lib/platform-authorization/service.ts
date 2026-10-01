/**
 * Persistence for legal acceptances and external-platform authorizations.
 * Queries are always scoped to the actor's organization. Tokens are not stored here.
 */

import "server-only";

import type { IntegrationProvider, Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db/prisma";
import { getSocialCredentialSummary } from "@/app/lib/social/credentials";
import type { IntegrationProviderId } from "@/app/lib/business-agent/catalog";
import { persistenceProviderFromUnknown } from "@/app/lib/business-agent/catalog";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  AUTHORIZATION_TYPES,
  LEGAL_FRAMEWORK_DOCUMENT,
  LEGAL_FRAMEWORK_VERSION,
  PLATFORM_AUTHORIZATION_VERSION,
  assertSameTenant,
  canExecuteAutomaticPublishing,
  classifyConnectionStatus,
  evaluateConnectAuthorization,
  flagsFromPermissionKeys,
  intersectWithOAuthScopes,
  isPlatformPermissionKey,
  needsLegalReacceptance,
  buildPlatformConfirmation,
  containsSecretMaterial,
  parseExplicitAuthorization,
  permissionLabel,
  redactAuthorizationMetadata,
  supportedPermissionKeys,

  type AuthorizationDecision,
  type AuthorizationType,
  type ExplicitAuthorizationInput,
  type PlatformPermissionKey,
  type PublicConnectionStatus,
} from "./policy";

export type PlatformAuthorizationView = {
  readonly provider: string;
  readonly accountLabel: string | null;
  readonly externalAccountId: string | null;
  readonly status: PublicConnectionStatus;
  readonly permissions: readonly PlatformPermissionKey[];
  readonly permissionLabels: readonly string[];
  readonly aiContentAuthorized: boolean;
  readonly automaticPublishingAuthorized: boolean;
  readonly authorizationVersion: string;
  readonly legalDocumentVersion: string;
  readonly authorizedAt: string | null;
  readonly revokedAt: string | null;
  readonly lastSuccessfulSync: string | null;
  readonly lastError: string | null;
  readonly confirmationText: string | null;
};

type StoredGrant = {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly provider: string;
  readonly status: string;
  readonly permissions: readonly PlatformPermissionKey[];
  readonly aiContentAuthorized: boolean;
  readonly automaticPublishingAuthorized: boolean;
  readonly confirmationText: string;
  readonly externalAccountId: string | null;
  readonly accountLabel: string | null;
  readonly grantedScopes: readonly string[];
  readonly authorizedAt: Date;
  readonly revokedAt: Date | null;
  readonly lastSuccessfulSync: Date | null;
  readonly lastError: string | null;
  readonly authorizationVersion: string;
  readonly legalDocumentVersion: string;
};

type AuditInput = {
  readonly actor: Actor;
  readonly provider: string;
  readonly event: string;
  readonly authorizationType: AuthorizationType | string;
  readonly status: string;
  readonly grantedScopes?: readonly string[];
  readonly externalAccountId?: string | null;
  readonly authorizedAt?: Date | null;
  readonly revokedAt?: Date | null;
  readonly metadata?: Record<string, unknown>;
};

type AuthorizationStore = {
  savePending(
    actor: Actor,
    provider: IntegrationProviderId,
    decision: Extract<AuthorizationDecision, { ok: true }>,
    accountLabel: string | null,
  ): Promise<void>;
  finalize(
    actor: Actor,
    provider: IntegrationProviderId,
    input: {
      readonly accountLabel?: string | null;
      readonly externalAccountId?: string | null;
      readonly oauthScopes?: readonly string[];
    },
  ): Promise<void>;
  revoke(actor: Actor, provider: IntegrationProviderId, reason: string): Promise<void>;
  list(actor: Actor): Promise<readonly StoredGrant[]>;
  find(actor: Actor, provider: string): Promise<StoredGrant | null>;
  setAutomaticPublishing(
    actor: Actor,
    provider: IntegrationProviderId,
    enabled: boolean,
    confirmationText: string | null,
  ): Promise<void>;
  appendAudit(input: AuditInput): Promise<void>;
  saveLegalAcceptance(input: {
    readonly actor: Actor;
    readonly authorizationType: AuthorizationType;
    readonly platform?: string | null;
  }): Promise<void>;
  listLegal(actor: Actor): Promise<
    readonly {
      readonly authorizationType: string;
      readonly legalDocumentVersion: string;
      readonly platform: string | null;
      readonly acceptedAt: Date;
      readonly revokedAt: Date | null;
    }[]
  >;
};

const memoryGrants = new Map<string, StoredGrant>();
const memoryAudits: AuditInput[] = [];
const memoryLegal: Array<{
  organizationId: string;
  userId: string;
  authorizationType: string;
  legalDocumentVersion: string;
  platform: string | null;
  acceptedAt: Date;
  revokedAt: Date | null;
}> = [];

function memoryKey(actor: Actor, provider: string): string {
  return `${actor.organizationId}::${actor.workspaceId}::${provider}`;
}

function viewFromGrant(grant: StoredGrant): PlatformAuthorizationView {
  return {
    provider: grant.provider,
    accountLabel: grant.accountLabel,
    externalAccountId: grant.externalAccountId,
    status: classifyConnectionStatus({
      authorizationStatus: grant.status,
      connectionStatus: grant.status,
      revokedAt: grant.revokedAt,
      accessTokenExpiresAt: null,
      hasRefreshToken: true,
      now: new Date(),
    }),
    permissions: grant.permissions,
    permissionLabels: grant.permissions.map((key) => permissionLabel(key)),
    aiContentAuthorized: grant.aiContentAuthorized,
    automaticPublishingAuthorized: grant.automaticPublishingAuthorized,
    authorizationVersion: grant.authorizationVersion,
    legalDocumentVersion: grant.legalDocumentVersion,
    authorizedAt: grant.authorizedAt.toISOString(),
    revokedAt: grant.revokedAt?.toISOString() ?? null,
    lastSuccessfulSync: grant.lastSuccessfulSync?.toISOString() ?? null,
    lastError: grant.lastError,
    confirmationText: grant.confirmationText,
  };
}

const memoryStore: AuthorizationStore = {
  async savePending(actor, provider, decision, accountLabel) {
    memoryGrants.set(memoryKey(actor, provider), {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      provider,
      status: "pending",
      permissions: decision.permissions,
      aiContentAuthorized: decision.aiContent,
      automaticPublishingAuthorized: decision.automaticPublishing,
      confirmationText: decision.confirmationText,
      externalAccountId: null,
      accountLabel,
      grantedScopes: decision.oauthScopes,
      authorizedAt: new Date(),
      revokedAt: null,
      lastSuccessfulSync: null,
      lastError: null,
      authorizationVersion: PLATFORM_AUTHORIZATION_VERSION,
      legalDocumentVersion: LEGAL_FRAMEWORK_VERSION,
    });
    await this.appendAudit({
      actor,
      provider,
      event: "authorization_granted",
      authorizationType: "platform",
      status: "pending",
      grantedScopes: decision.permissions,
    });
  },
  async finalize(actor, provider, input) {
    const current = memoryGrants.get(memoryKey(actor, provider));
    if (!current || !assertSameTenant(actor.organizationId, current.organizationId)) return;
    const permissions = intersectWithOAuthScopes(
      provider,
      current.permissions,
      input.oauthScopes ?? [],
    );
    memoryGrants.set(memoryKey(actor, provider), {
      ...current,
      status: "connected",
      permissions,
      accountLabel: input.accountLabel ?? current.accountLabel,
      externalAccountId: input.externalAccountId ?? current.externalAccountId,
      grantedScopes: input.oauthScopes ?? current.grantedScopes,
      lastSuccessfulSync: new Date(),
      lastError: null,
      automaticPublishingAuthorized:
        current.automaticPublishingAuthorized && permissions.includes("publish_posts"),
    });
  },
  async revoke(actor, provider, reason) {
    const current = memoryGrants.get(memoryKey(actor, provider));
    if (!current || !assertSameTenant(actor.organizationId, current.organizationId)) return;
    memoryGrants.set(memoryKey(actor, provider), {
      ...current,
      status: "revoked",
      revokedAt: new Date(),
      automaticPublishingAuthorized: false,
      lastError: reason,
    });
    await this.appendAudit({
      actor,
      provider,
      event: "authorization_revoked",
      authorizationType: "platform",
      status: "revoked",
      revokedAt: new Date(),
      metadata: { reason },
    });
  },
  async list(actor) {
    return [...memoryGrants.values()].filter((grant) =>
      assertSameTenant(actor.organizationId, grant.organizationId) &&
      grant.workspaceId === actor.workspaceId,
    );
  },
  async find(actor, provider) {
    const grant = memoryGrants.get(memoryKey(actor, provider)) ?? null;
    if (!grant || !assertSameTenant(actor.organizationId, grant.organizationId)) return null;
    return grant;
  },
  async setAutomaticPublishing(actor, provider, enabled, confirmationText) {
    const current = memoryGrants.get(memoryKey(actor, provider));
    if (!current || !assertSameTenant(actor.organizationId, current.organizationId)) {
      throw new PersistenceError("not_found", "Platform authorization not found");
    }
    memoryGrants.set(memoryKey(actor, provider), {
      ...current,
      automaticPublishingAuthorized: enabled,
      confirmationText: confirmationText ?? current.confirmationText,
    });
  },
  async appendAudit(input) {
    memoryAudits.push(input);
  },
  async saveLegalAcceptance(input) {
    memoryLegal.push({
      organizationId: input.actor.organizationId,
      userId: input.actor.userId,
      authorizationType: input.authorizationType,
      legalDocumentVersion: LEGAL_FRAMEWORK_VERSION,
      platform: input.platform ?? null,
      acceptedAt: new Date(),
      revokedAt: null,
    });
  },
  async listLegal(actor) {
    return memoryLegal.filter(
      (row) =>
        row.organizationId === actor.organizationId && row.userId === actor.userId,
    );
  },
};

let storeOverride: AuthorizationStore | null = null;

export function setAuthorizationStoreForTests(store: AuthorizationStore | null): void {
  storeOverride = store;
  if (store === null) {
    memoryGrants.clear();
    memoryAudits.length = 0;
    memoryLegal.length = 0;
  }
}

export function createMemoryAuthorizationStore(): AuthorizationStore {
  memoryGrants.clear();
  memoryAudits.length = 0;
  memoryLegal.length = 0;
  return memoryStore;
}

export function readMemoryAuthorizationAuditsForTests(): readonly AuditInput[] {
  return memoryAudits;
}

function store(): AuthorizationStore {
  return storeOverride ?? prismaStore;
}

async function liveConnectionStatus(
  actor: Actor,
  provider: string,
  grant: { readonly status: string; readonly revokedAt: Date | null } | null,
): Promise<PublicConnectionStatus> {
  const platform =
    provider === "email_gmail" ? "gmail" : provider === "youtube" ? "youtube" : null;
  const summary = platform
    ? await getSocialCredentialSummary(actor.organizationId, platform)
    : null;
  if (platform && grant?.status === "connected" && !summary) {
    return "disconnected";
  }
  return classifyConnectionStatus({
    authorizationStatus: grant?.status ?? null,
    connectionStatus: grant?.status ?? null,
    revokedAt: grant?.revokedAt ?? null,
    accessTokenExpiresAt: summary?.accessTokenExpiresAt ?? null,
    hasRefreshToken: summary?.hasRefreshToken === true,
    now: new Date(),
  });
}

function requirePersistenceProvider(provider: string): IntegrationProviderId {
  const persistenceId = persistenceProviderFromUnknown(provider);
  if (!persistenceId) {
    throw new PersistenceError("validation", "Unknown integration provider");
  }
  return persistenceId;
}

function scoped(input: {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly provider: string;
}): {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly provider: IntegrationProvider;
} {
  return {
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
    provider: requirePersistenceProvider(input.provider) as IntegrationProvider,
  };
}

const prismaStore: AuthorizationStore = {
  async savePending(actor, provider, decision, accountLabel) {
    const flags = flagsFromPermissionKeys(decision.permissions);
    const connection = await prisma.integrationConnection.upsert({
      where: {
        organizationId_workspaceId_provider: scoped({
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          provider,
        }),
      },
      create: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
        createdByUserId: actor.userId,
        status: "not_connected",
        accountLabel,
        ...flags,
        aiContentAuthorized: decision.aiContent,
        automaticPublishingAuthorized: decision.automaticPublishing,
        authorizationVersion: PLATFORM_AUTHORIZATION_VERSION,
        grantedScopes: [...decision.oauthScopes],
      },
      update: {
        accountLabel,
        ...flags,
        aiContentAuthorized: decision.aiContent,
        automaticPublishingAuthorized: decision.automaticPublishing,
        authorizationVersion: PLATFORM_AUTHORIZATION_VERSION,
        grantedScopes: [...decision.oauthScopes],
        lastError: null,
      },
    });
    const authorization = await prisma.platformAuthorization.upsert({
      where: {
        organizationId_workspaceId_provider: scoped({
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          provider,
        }),
      },
      create: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        connectionId: connection.id,
        provider,
        accountLabel,
        status: "pending",
        grantedScopes: [...decision.oauthScopes],
        authorizationVersion: PLATFORM_AUTHORIZATION_VERSION,
        legalDocumentVersion: LEGAL_FRAMEWORK_VERSION,
        aiContentAuthorized: decision.aiContent,
        automaticPublishingAuthorized: decision.automaticPublishing,
        confirmationText: decision.confirmationText,
        permissions: {
          create: decision.permissions.map((permissionKey) => ({
            organizationId: actor.organizationId,
            permissionKey,
            granted: true,
          })),
        },
      },
      update: {
        userId: actor.userId,
        connectionId: connection.id,
        accountLabel,
        status: "pending",
        revokedAt: null,
        grantedScopes: [...decision.oauthScopes],
        authorizationVersion: PLATFORM_AUTHORIZATION_VERSION,
        legalDocumentVersion: LEGAL_FRAMEWORK_VERSION,
        aiContentAuthorized: decision.aiContent,
        automaticPublishingAuthorized: decision.automaticPublishing,
        confirmationText: decision.confirmationText,
        lastError: null,
        permissions: {
          deleteMany: {},
          create: decision.permissions.map((permissionKey) => ({
            organizationId: actor.organizationId,
            permissionKey,
            granted: true,
          })),
        },
      },
    });
    await writeLegalRows(actor, provider, decision);
    await this.appendAudit({
      actor,
      provider,
      event: "authorization_granted",
      authorizationType: "platform",
      status: authorization.status,
      grantedScopes: decision.permissions,
      authorizedAt: authorization.authorizedAt,
    });
  },
  async finalize(actor, provider, input) {
    const current = await this.find(actor, provider);
    const permissions = current
      ? intersectWithOAuthScopes(provider, current.permissions, input.oauthScopes ?? [])
      : [];
    const flags = flagsFromPermissionKeys(permissions);
    const now = new Date();
    if (current) {
      await prisma.platformAuthorization.updateMany({
        where: {
          ...scoped({
            organizationId: actor.organizationId,
            workspaceId: actor.workspaceId,
            provider,
          }),
          revokedAt: null,
        },
        data: {
          status: "connected",
          accountLabel: input.accountLabel ?? current.accountLabel,
          externalAccountId: input.externalAccountId ?? current.externalAccountId,
          grantedScopes: [...(input.oauthScopes ?? current.grantedScopes)],
          lastSuccessfulSync: now,
          lastError: null,
          automaticPublishingAuthorized:
            current.automaticPublishingAuthorized && permissions.includes("publish_posts"),
          aiContentAuthorized: current.aiContentAuthorized && permissions.includes("create_ai_content")
            ? true
            : current.aiContentAuthorized,
        },
      });
    }
    await prisma.integrationConnection.updateMany({
      where: scoped({
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      }),
      data: {
        status: "connected",
        accountLabel: input.accountLabel ?? undefined,
        externalAccountId: input.externalAccountId ?? undefined,
        connectedAt: now,
        disconnectedAt: null,
        lastError: null,
        lastSuccessfulSync: now,
        grantedScopes: [...(input.oauthScopes ?? [])],
        ...flags,
      },
    });
    await this.appendAudit({
      actor,
      provider,
      event: "authorization_connected",
      authorizationType: "platform",
      status: "connected",
      grantedScopes: permissions,
      externalAccountId: input.externalAccountId,
    });
  },
  async revoke(actor, provider, reason) {
    const now = new Date();
    await prisma.platformAuthorization.updateMany({
      where: scoped({
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      }),
      data: {
        status: "revoked",
        revokedAt: now,
        automaticPublishingAuthorized: false,
        lastError: reason,
      },
    });
    await prisma.integrationConnection.updateMany({
      where: scoped({
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      }),
      data: {
        status: "disconnected",
        disconnectedAt: now,
        automaticPublishingAuthorized: false,
        aiContentAuthorized: false,
        lastError: reason,
      },
    });
    await prisma.campaignItem.updateMany({
      where: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
        status: { in: ["SCHEDULED", "PUBLISHING"] },
      },
      data: {
        status: "CANCELLED",
        error: "authorization_revoked",
      },
    });
    await this.appendAudit({
      actor,
      provider,
      event: "authorization_revoked",
      authorizationType: "platform",
      status: "revoked",
      revokedAt: now,
      metadata: { reason },
    });
  },
  async list(actor) {
    const rows = await prisma.platformAuthorization.findMany({
      where: {
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
      },
      include: { permissions: true },
    });
    return rows.map(grantFromRow);
  },
  async find(actor, provider) {
    const persistenceId = persistenceProviderFromUnknown(provider);
    if (!persistenceId) return null;
    const row = await prisma.platformAuthorization.findUnique({
      where: {
        organizationId_workspaceId_provider: scoped({
          organizationId: actor.organizationId,
          workspaceId: actor.workspaceId,
          provider: persistenceId,
        }),
      },
      include: { permissions: true },
    });
    if (!row || !assertSameTenant(actor.organizationId, row.organizationId)) return null;
    return grantFromRow(row);
  },
  async setAutomaticPublishing(actor, provider, enabled, confirmationText) {
    const current = await this.find(actor, provider);
    if (!current) {
      throw new PersistenceError("not_found", "Platform authorization not found");
    }
    await prisma.platformAuthorization.updateMany({
      where: scoped({
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      }),
      data: {
        automaticPublishingAuthorized: enabled,
        ...(confirmationText ? { confirmationText } : {}),
      },
    });
    await prisma.integrationConnection.updateMany({
      where: scoped({
        organizationId: actor.organizationId,
        workspaceId: actor.workspaceId,
        provider,
      }),
      data: { automaticPublishingAuthorized: enabled },
    });
    await this.appendAudit({
      actor,
      provider,
      event: enabled ? "automatic_publishing_enabled" : "automatic_publishing_disabled",
      authorizationType: "automatic_publishing",
      status: current.status,
      metadata: { enabled },
    });
  },
  async appendAudit(input) {
    await prisma.authorizationAuditLog.create({
      data: {
        userId: input.actor.userId,
        organizationId: input.actor.organizationId,
        workspaceId: input.actor.workspaceId,
        provider: input.provider,
        externalAccountId: input.externalAccountId ?? null,
        authorizationStatus: input.status,
        grantedScopes: [...(input.grantedScopes ?? [])],
        authorizationVersion: PLATFORM_AUTHORIZATION_VERSION,
        legalDocument: LEGAL_FRAMEWORK_DOCUMENT,
        legalDocumentVersion: LEGAL_FRAMEWORK_VERSION,
        authorizationType: input.authorizationType,
        event: input.event,
        authorizedAt: input.authorizedAt ?? null,
        revokedAt: input.revokedAt ?? null,
        metadata: redactAuthorizationMetadata(input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },
  async saveLegalAcceptance(input) {
    await prisma.legalAcceptance.create({
      data: legalAcceptanceData(input.actor, input.authorizationType, input.platform),
    });
  },
  async listLegal(actor) {
    return prisma.legalAcceptance.findMany({
      where: {
        organizationId: actor.organizationId,
        userId: actor.userId,
      },
      orderBy: { acceptedAt: "desc" },
      select: {
        authorizationType: true,
        legalDocumentVersion: true,
        platform: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });
  },
};

function grantFromRow(row: {
  organizationId: string;
  workspaceId: string;
  userId: string;
  provider: IntegrationProvider;
  status: string;
  aiContentAuthorized: boolean;
  automaticPublishingAuthorized: boolean;
  confirmationText: string;
  externalAccountId: string | null;
  accountLabel: string | null;
  grantedScopes: string[];
  authorizedAt: Date;
  revokedAt: Date | null;
  lastSuccessfulSync: Date | null;
  lastError: string | null;
  authorizationVersion: string;
  legalDocumentVersion: string;
  permissions: readonly { permissionKey: string; granted: boolean }[];
}): StoredGrant {
  return {
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    userId: row.userId,
    provider: row.provider,
    status: row.status,
    permissions: row.permissions
      .filter((permission) => permission.granted)
      .map((permission) => permission.permissionKey)
      .filter(isPlatformPermissionKey),
    aiContentAuthorized: row.aiContentAuthorized,
    automaticPublishingAuthorized: row.automaticPublishingAuthorized,
    confirmationText: row.confirmationText,
    externalAccountId: row.externalAccountId,
    accountLabel: row.accountLabel,
    grantedScopes: row.grantedScopes,
    authorizedAt: row.authorizedAt,
    revokedAt: row.revokedAt,
    lastSuccessfulSync: row.lastSuccessfulSync,
    lastError: row.lastError,
    authorizationVersion: row.authorizationVersion,
    legalDocumentVersion: row.legalDocumentVersion,
  };
}

function legalAcceptanceData(
  actor: Actor,
  authorizationType: AuthorizationType,
  platform?: string | null,
): Prisma.LegalAcceptanceCreateInput {
  return {
    user: { connect: { id: actor.userId } },
    organization: { connect: { id: actor.organizationId } },
    legalDocument: LEGAL_FRAMEWORK_DOCUMENT,
    legalDocumentVersion: LEGAL_FRAMEWORK_VERSION,
    authorizationType,
    platform: platform ?? null,
    authorizationVersion:
      authorizationType === "agb" || authorizationType === "privacy" || authorizationType === "marketing"
        ? LEGAL_FRAMEWORK_VERSION
        : PLATFORM_AUTHORIZATION_VERSION,
    metadata: {},
  };
}

async function writeLegalRows(
  actor: Actor,
  provider: string,
  decision: Extract<AuthorizationDecision, { ok: true }>,
): Promise<void> {
  await prisma.legalAcceptance.create({
    data: legalAcceptanceData(actor, "platform", provider),
  });
  if (decision.aiContent) {
    await prisma.legalAcceptance.create({
      data: legalAcceptanceData(actor, "ai_content", provider),
    });
  }
  if (decision.automaticPublishing) {
    await prisma.legalAcceptance.create({
      data: legalAcceptanceData(actor, "automatic_publishing", provider),
    });
  }
}

export async function requireExplicitPlatformGrant(
  actor: Actor,
  provider: string,
  body: unknown,
): Promise<Extract<AuthorizationDecision, { ok: true }>> {
  if (containsSecretMaterial(body)) {
    throw new PersistenceError("validation", "External passwords and tokens must not be submitted.", {
      details: [{ field: "authorization", message: "secret_material_rejected" }],
    });
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if ("scope" in record || "scopes" in record || "oauthScopes" in record) {
      throw new PersistenceError(
        "validation",
        "OAuth scopes are chosen by AGXORA from the permissions you confirm.",
        { details: [{ field: "authorization", message: "scope_escalation_rejected" }] },
      );
    }
  }
  const request = parseExplicitAuthorization(body);
  const decision = evaluateConnectAuthorization({ provider, request });
  if (!decision.ok) {
    throw new PersistenceError("validation", decision.message, {
      details: [{ field: "authorization", message: decision.code }],
    });
  }
  const persistenceId = requirePersistenceProvider(provider);
  await store().savePending(
    actor,
    persistenceId,
    decision,
    request?.accountLabel ?? null,
  );
  return decision;
}

export async function finalizePlatformAuthorization(
  actor: Actor,
  provider: IntegrationProviderId,
  input: {
    readonly accountLabel?: string | null;
    readonly externalAccountId?: string | null;
    readonly oauthScopes?: readonly string[];
  },
): Promise<void> {
  await store().finalize(actor, provider, input);
}

export async function revokePlatformAuthorization(
  actor: Actor,
  provider: string,
  reason: string,
): Promise<void> {
  const persistenceId = persistenceProviderFromUnknown(provider);
  if (!persistenceId) return;
  await store().revoke(actor, persistenceId, reason);
}

export async function listPlatformAuthorizations(
  actor: Actor,
): Promise<readonly PlatformAuthorizationView[]> {
  const grants = await store().list(actor);
  return grants.map(viewFromGrant);
}

export async function lookupGrantedPermissionKeys(
  actor: Actor,
  provider: string,
): Promise<readonly PlatformPermissionKey[] | null> {
  try {
    const grant = await store().find(actor, provider);
    if (!grant || grant.status === "revoked" || grant.status === "disconnected") return null;
    return grant.permissions;
  } catch {
    return null;
  }
}

export async function assertAutomaticPublishingAllowed(
  actor: Actor,
  provider: string,
): Promise<void> {
  const grant = await store().find(actor, provider);
  const allowed = canExecuteAutomaticPublishing({
    status: await liveConnectionStatus(actor, provider, grant),
    automaticPublishingAuthorized: grant?.automaticPublishingAuthorized ?? false,
    publishGranted: grant?.permissions.includes("publish_posts") ?? false,
    sameTenant: grant ? assertSameTenant(actor.organizationId, grant.organizationId) : false,
  });
  if (!allowed) {
    throw new PersistenceError(
      "forbidden",
      "Automatic publishing is not authorized for this platform.",
    );
  }
}

export async function setAutomaticPublishingForActor(
  actor: Actor,
  provider: string,
  input: {
    readonly enabled: boolean;
    readonly confirmed: boolean;
    readonly contentTypes?: readonly string[];
    readonly frequency?: string | null;
    readonly accountLabel?: string | null;
  },
): Promise<void> {
  const persistenceId = requirePersistenceProvider(provider);
  if (input.enabled && !input.confirmed) {
    throw new PersistenceError(
      "validation",
      "Automatic publishing requires a separate explicit confirmation.",
    );
  }
  const grant = await store().find(actor, persistenceId);
  if (input.enabled) {
    const status = await liveConnectionStatus(actor, persistenceId, grant);
    if (!grant || status !== "connected" || !grant.permissions.includes("publish_posts")) {
      throw new PersistenceError(
        "forbidden",
        "Automatic publishing requires a connected platform and an explicit publish permission.",
      );
    }
  }
  const { buildAutomaticPublishingConfirmation } = await import("./policy");
  await store().setAutomaticPublishing(
    actor,
    persistenceId,
    input.enabled,
    input.enabled
      ? buildAutomaticPublishingConfirmation({
          provider,
          accountLabel: input.accountLabel ?? grant?.accountLabel ?? null,
          contentTypes: input.contentTypes ?? [],
          frequency: input.frequency ?? null,
        })
      : null,
  );
}

export async function recordLegalAcceptanceForActor(
  actor: Actor,
  authorizationType: string,
  platform?: string | null,
): Promise<void> {
  if (!(AUTHORIZATION_TYPES as readonly string[]).includes(authorizationType)) {
    throw new PersistenceError("validation", "Unknown authorization type");
  }
  if (authorizationType === "platform" || authorizationType === "automatic_publishing") {
    throw new PersistenceError(
      "validation",
      "Platform and automatic publishing authorization require the connection flow.",
    );
  }
  await store().saveLegalAcceptance({
    actor,
    authorizationType: authorizationType as AuthorizationType,
    platform,
  });
  await store().appendAudit({
    actor,
    provider: platform ?? "agxora",
    event: "legal_acceptance",
    authorizationType,
    status: "accepted",
  });
}

export async function listLegalAcceptancesForActor(actor: Actor): Promise<{
  readonly currentVersion: string;
  readonly agbAccepted: boolean;
  readonly privacyAcknowledged: boolean;
  readonly marketingConsent: boolean;
  readonly reacceptanceRequired: boolean;
  readonly acceptances: readonly {
    readonly authorizationType: string;
    readonly legalDocumentVersion: string;
    readonly platform: string | null;
    readonly acceptedAt: string;
  }[];
}> {
  const rows = await store().listLegal(actor);
  const active = rows.filter((row) => !row.revokedAt);
  const latestAgb = active.find((row) => row.authorizationType === "agb");
  return {
    currentVersion: LEGAL_FRAMEWORK_VERSION,
    agbAccepted: Boolean(latestAgb),
    privacyAcknowledged: active.some((row) => row.authorizationType === "privacy"),
    marketingConsent: active.some((row) => row.authorizationType === "marketing"),
    reacceptanceRequired: needsLegalReacceptance({
      acceptedVersion: latestAgb?.legalDocumentVersion ?? null,
      currentVersion: LEGAL_FRAMEWORK_VERSION,
    }),
    acceptances: active.map((row) => ({
      authorizationType: row.authorizationType,
      legalDocumentVersion: row.legalDocumentVersion,
      platform: row.platform,
      acceptedAt: row.acceptedAt.toISOString(),
    })),
  };
}

export async function recordTokenRevocation(
  actor: Actor,
  platform: "gmail" | "youtube",
): Promise<void> {
  const provider = platform === "gmail" ? "email_gmail" : "youtube";
  try {
    await store().revoke(actor, provider, "invalid_grant");
  } catch (error) {
    console.error("[agxora.authz] token revocation audit failed", error);
  }
}

export function authorizationPreview(provider: string, accountLabel: string | null) {
  const permissions = supportedPermissionKeys(provider);
  const confirmation = buildPlatformConfirmation({
    provider,
    accountLabel,
    permissions,
    aiContent: false,
    automaticPublishing: false,
  });
  return {
    provider,
    accountLabel,
    permissions: permissions.map((key) => ({
      key,
      label: permissionLabel(key),
    })),
    confirmation,
    revocation:
      "Diese Berechtigung ist unabhängig von der Annahme der AGXORA-AGB und kann jederzeit widerrufen werden.",
  };
}

export function assertNoCrossTenant<T extends { readonly organizationId: string }>(
  actor: Actor,
  record: T | null,
): T {
  if (!record || !assertSameTenant(actor.organizationId, record.organizationId)) {
    throw new PersistenceError("not_found", "Platform authorization not found");
  }
  return record;
}

export async function recordRegistrationAcceptances(
  tx: Prisma.TransactionClient,
  input: {
    readonly userId: string;
    readonly organizationId: string;
    readonly acceptTerms: boolean;
    readonly acknowledgePrivacy: boolean;
    readonly marketingConsent: boolean;
  },
): Promise<void> {
  const rows: Prisma.LegalAcceptanceCreateManyInput[] = [];
  const base = {
    userId: input.userId,
    organizationId: input.organizationId,
    legalDocument: LEGAL_FRAMEWORK_DOCUMENT,
    legalDocumentVersion: LEGAL_FRAMEWORK_VERSION,
    authorizationVersion: LEGAL_FRAMEWORK_VERSION,
  };
  if (input.acceptTerms) {
    rows.push({ ...base, authorizationType: "agb" });
  }
  if (input.acknowledgePrivacy) {
    rows.push({ ...base, authorizationType: "privacy" });
  }
  if (input.marketingConsent) {
    rows.push({ ...base, authorizationType: "marketing" });
  }
  if (rows.length === 0) return;
  await tx.legalAcceptance.createMany({ data: rows });
}

export type { ExplicitAuthorizationInput };
