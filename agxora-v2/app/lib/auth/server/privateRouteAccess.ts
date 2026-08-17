/**
 * Server-session gate for private HTML routes (dashboard / workspace / onboarding / welcome).
 *
 * Cookie presence is never authentication. The opaque cookie token is hashed
 * and looked up in PostgreSQL (same path as API `requireCurrentActor`).
 */

import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { hashSessionToken } from "./tokens";
import { isAuthRequired } from "@/app/lib/production/env";
import { evaluateAccess } from "@/features/auth/guards";

export type SessionInspectionStatus =
  | "missing"
  | "invalid"
  | "expired"
  | "revoked"
  | "ok";

export type SessionInspection = {
  readonly status: SessionInspectionStatus;
  readonly sessionId?: string;
  readonly userId?: string;
};

export type PrivateRouteDecision =
  | { readonly allow: true }
  | {
      readonly allow: false;
      readonly reason: "unauthorized" | "expired_session";
      readonly redirectTo: string;
    };

export async function inspectSessionToken(
  rawToken: string | null | undefined,
): Promise<SessionInspection> {
  const token = rawToken?.trim() ?? "";
  if (!token) return { status: "missing" };

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!session) return { status: "invalid" };
  if (session.revokedAt) {
    return { status: "revoked", sessionId: session.id, userId: session.userId };
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
    return { status: "expired", sessionId: session.id, userId: session.userId };
  }

  return { status: "ok", sessionId: session.id, userId: session.userId };
}

export function decidePrivateRouteAccess(input: {
  readonly authRequired: boolean;
  readonly inspection: SessionInspection;
  readonly nextPath?: string;
}): PrivateRouteDecision {
  const nextPath = input.nextPath || "/dashboard";

  if (input.inspection.status === "ok") {
    return { allow: true };
  }

  if (input.inspection.status === "missing" && !input.authRequired) {
    return { allow: true };
  }

  if (
    input.inspection.status === "expired" ||
    input.inspection.status === "revoked" ||
    input.inspection.status === "invalid"
  ) {
    const decision = evaluateAccess({
      authenticated: true,
      sessionExpired: true,
    });
    return {
      allow: false,
      reason:
        decision.reason === "expired_session"
          ? "expired_session"
          : "unauthorized",
      redirectTo:
        decision.reason === "expired_session"
          ? "/session-expired"
          : `/login?next=${encodeURIComponent(nextPath)}`,
    };
  }

  const decision = evaluateAccess({ authenticated: false });
  return {
    allow: false,
    reason: "unauthorized",
    redirectTo:
      decision.reason === "unauthorized"
        ? `/login?next=${encodeURIComponent(nextPath)}`
        : "/unauthorized",
  };
}

export async function evaluatePrivatePageAccess(
  rawToken: string | null | undefined,
  nextPath = "/dashboard",
): Promise<PrivateRouteDecision> {
  const inspection = await inspectSessionToken(rawToken);
  return decidePrivateRouteAccess({
    authRequired: isAuthRequired(),
    inspection,
    nextPath,
  });
}
