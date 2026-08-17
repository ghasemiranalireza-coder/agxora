/**
 * Resolve trusted Actor from server session token.
 * Client-supplied org/workspace IDs are never used for authorization.
 */

import "server-only";

import { cookies, headers } from "next/headers";
import type { MembershipRole as PrismaRole } from "@prisma/client";
import { prisma } from "../db/prisma";
import { hashSessionToken } from "../auth/server/tokens";
import { PersistenceError } from "./errors";
import type { Actor, MembershipRole } from "./types";
import { SERVER_SESSION_COOKIE, SERVER_SESSION_HEADER } from "./sessionCookie";

export { SERVER_SESSION_COOKIE, SERVER_SESSION_HEADER };

function mapRole(role: PrismaRole): MembershipRole {
  return role;
}

async function loadActiveMembership(
  userId: string,
  preferredWorkspaceId?: string | null,
) {
  if (preferredWorkspaceId) {
    const preferred = await prisma.membership.findFirst({
      where: {
        userId,
        workspaceId: preferredWorkspaceId,
        status: "ACTIVE",
        workspace: { archivedAt: null },
      },
    });
    if (preferred) return preferred;
  }

  return prisma.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      workspace: { archivedAt: null },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function resolveActorFromToken(token: string): Promise<Actor | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: true,
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
    return null;
  }

  const membership = await loadActiveMembership(
    session.userId,
    session.activeWorkspaceId,
  );

  if (!membership) {
    throw new PersistenceError(
      "forbidden",
      "Authenticated user has no active workspace membership",
    );
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: membership.organizationId,
    workspaceId: membership.workspaceId,
    membershipId: membership.id,
    role: mapRole(membership.role),
    sessionToken: token,
  };
}

/**
 * Preferred workspace membership when the user has multiple.
 * Still derived from server memberships — never from client tenant IDs.
 */
export async function getActorForWorkspace(
  token: string,
  workspaceId: string,
): Promise<Actor | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.userId,
      workspaceId,
      status: "ACTIVE",
      workspace: { archivedAt: null },
    },
  });
  if (!membership) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    organizationId: membership.organizationId,
    workspaceId: membership.workspaceId,
    membershipId: membership.id,
    role: mapRole(membership.role),
    sessionToken: token,
  };
}

export async function readSessionToken(): Promise<string | null> {
  const headerStore = await headers();
  const headerToken =
    headerStore.get(SERVER_SESSION_HEADER)?.trim() ||
    headerStore.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (headerToken) return headerToken;

  const cookieStore = await cookies();
  return cookieStore.get(SERVER_SESSION_COOKIE)?.value?.trim() || null;
}

/** Trusted current actor or null if unauthenticated. */
export async function getCurrentActor(): Promise<Actor | null> {
  const token = await readSessionToken();
  if (!token) return null;
  return resolveActorFromToken(token);
}

export async function requireCurrentActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  return actor;
}

/**
 * Resolve actor in a requested workspace after verifying membership.
 * The requested ID is a hint only — membership is the authority.
 */
export async function requireActorForWorkspace(workspaceId: string): Promise<Actor> {
  const token = await readSessionToken();
  if (!token) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }
  const actor = await getActorForWorkspace(token, workspaceId);
  if (!actor) {
    throw new PersistenceError("forbidden", "No membership for requested workspace");
  }
  return actor;
}

/**
 * Test/helper: build actor from known membership (no HTTP).
 */
export async function getActorBySessionToken(token: string): Promise<Actor | null> {
  return resolveActorFromToken(token);
}
