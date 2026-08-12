/**
 * Resolve trusted Actor from server session token.
 * Client-supplied org/workspace IDs are never used for authorization.
 */

import "server-only";

import { cookies, headers } from "next/headers";
import type { MembershipRole as PrismaRole } from "@prisma/client";
import { prisma } from "../db/prisma";
import { PersistenceError } from "./errors";
import type { Actor, MembershipRole } from "./types";

export const SERVER_SESSION_COOKIE = "agxora.server.session";
export const SERVER_SESSION_HEADER = "x-agxora-session-token";

function mapRole(role: PrismaRole): MembershipRole {
  return role;
}

async function resolveActorFromToken(token: string): Promise<Actor | null> {
  const session = await prisma.session.findUnique({
    where: { token },
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

  let membership = null;
  if (session.activeWorkspaceId) {
    membership = await prisma.membership.findFirst({
      where: {
        userId: session.userId,
        workspaceId: session.activeWorkspaceId,
        status: "ACTIVE",
      },
    });
  }

  if (!membership) {
    membership = await prisma.membership.findFirst({
      where: { userId: session.userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
  }

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
    sessionToken: session.token,
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
    where: { token },
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
    sessionToken: session.token,
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
 * Test/helper: build actor from known membership (no HTTP).
 */
export async function getActorBySessionToken(token: string): Promise<Actor | null> {
  return resolveActorFromToken(token);
}
