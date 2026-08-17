/**
 * Phase 44.2 — server-authoritative session listing and revocation.
 *
 * Caller must pass a trusted Actor (requireCurrentActor). Client userId,
 * session owner, and currentSessionId are never accepted as authority.
 * Session tokens are used only to identify the current row and are never
 * returned in public DTOs.
 */

import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { hashSessionToken } from "@/app/lib/auth/server/tokens";
import { getActorBySessionToken } from "@/app/lib/tenancy/actor";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublicManagedSession = {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly current: boolean;
};

export type ManagedSessionList = {
  readonly sessions: readonly PublicManagedSession[];
};

function isSessionId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function toPublicManagedSession(
  row: { id: string; createdAt: Date; expiresAt: Date },
  currentTokenHash: string,
  rowTokenHash: string,
): PublicManagedSession {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    current: rowTokenHash === currentTokenHash,
  };
}

function assertNoSecrets(payload: unknown, forbidden: readonly string[]): void {
  const json = JSON.stringify(payload);
  for (const value of forbidden) {
    if (value && json.includes(value)) {
      throw new PersistenceError("persistence", "Refusing to serialize session secrets");
    }
  }
}

/**
 * Active (non-revoked, non-expired) sessions for the authenticated user.
 * Current session is derived from the actor's server token, not the client.
 */
export async function listManagedSessions(actor: Actor): Promise<ManagedSessionList> {
  const now = new Date();
  const currentTokenHash = hashSessionToken(actor.sessionToken);
  const rows = await prisma.session.findMany({
    where: {
      userId: actor.userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      tokenHash: true,
    },
  });

  const sessions = rows
    .map((row) => toPublicManagedSession(row, currentTokenHash, row.tokenHash))
    .sort((a, b) => Number(b.current) - Number(a.current));

  const payload = { sessions };
  assertNoSecrets(payload, [actor.sessionToken, ...rows.map((row) => row.tokenHash)]);
  return payload;
}

export async function listManagedSessionsForToken(
  token: string | null,
): Promise<ManagedSessionList> {
  if (!token) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  const actor = await getActorBySessionToken(token);
  if (!actor) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  return listManagedSessions(actor);
}

/**
 * Revoke one of the authenticated user's sessions.
 * Cross-user ids are indistinguishable from missing ids (404).
 * The current session must be ended with logout, not this endpoint.
 */
export async function revokeManagedSession(
  actor: Actor,
  sessionIdRaw: string,
): Promise<{ ok: true; id: string }> {
  const sessionId = sessionIdRaw.trim();
  if (!isSessionId(sessionId)) {
    throw new PersistenceError("not_found", "Session not found");
  }

  const row = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!row || row.userId !== actor.userId) {
    throw new PersistenceError("not_found", "Session not found");
  }
  if (row.tokenHash === hashSessionToken(actor.sessionToken)) {
    throw new PersistenceError(
      "validation",
      "Use logout to end the current session",
    );
  }
  if (row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
    throw new PersistenceError("not_found", "Session not found");
  }

  await prisma.session.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  const payload = { ok: true as const, id: row.id };
  assertNoSecrets(payload, [row.tokenHash, actor.sessionToken]);
  return payload;
}

export async function revokeManagedSessionForToken(
  token: string | null,
  sessionId: string,
): Promise<{ ok: true; id: string }> {
  if (!token) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  const actor = await getActorBySessionToken(token);
  if (!actor) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  return revokeManagedSession(actor, sessionId);
}

/** Revoke every other active session for this user; keep the current cookie session. */
export async function revokeOtherManagedSessions(
  actor: Actor,
): Promise<{ ok: true; revokedCount: number }> {
  const result = await prisma.session.updateMany({
    where: {
      userId: actor.userId,
      revokedAt: null,
      tokenHash: { not: hashSessionToken(actor.sessionToken) },
    },
    data: { revokedAt: new Date() },
  });
  return { ok: true, revokedCount: result.count };
}

export async function revokeOtherManagedSessionsForToken(
  token: string | null,
): Promise<{ ok: true; revokedCount: number }> {
  if (!token) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  const actor = await getActorBySessionToken(token);
  if (!actor) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  return revokeOtherManagedSessions(actor);
}
