/**
 * Shared auth HTTP helpers.
 */

import { NextResponse } from "next/server";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { jsonError } from "@/app/lib/crm/persistence/http";
import type { AuthSuccess } from "@/app/lib/auth/server";
import { applySessionCookie } from "@/app/lib/auth/server";

/** Public JSON — never includes rawSessionToken or passwordHash. */
export function authSuccessResponse(result: AuthSuccess): NextResponse {
  const response = NextResponse.json({
    ok: true,
    user: result.user,
    session: result.session,
    organizationId: result.organizationId,
    workspaceId: result.workspaceId,
  });
  applySessionCookie(response, result.rawSessionToken);
  return response;
}

export function authJsonError(error: unknown): NextResponse {
  return jsonError(error);
}

export function requireDatabase(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new PersistenceError(
      "misconfigured",
      "DATABASE_URL is not configured",
    );
  }
}
