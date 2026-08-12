import { NextResponse } from "next/server";
import { switchActiveWorkspace } from "@/app/lib/auth/server";
import { readSessionToken } from "@/app/lib/tenancy/actor";
import { authJsonError, requireDatabase } from "@/app/lib/auth/server/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

type Body = { readonly workspaceId?: string };

/**
 * Client may request a workspace switch; membership is verified server-side.
 * Does not change user identity, org ownership, or role authority.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireDatabase();
    const token = await readSessionToken();
    if (!token) {
      throw new PersistenceError("unauthorized", "Authentication required");
    }
    const body = (await request.json()) as Body;
    if (!body.workspaceId?.trim()) {
      throw new PersistenceError("validation", "workspaceId is required");
    }
    const result = await switchActiveWorkspace(token, body.workspaceId.trim());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return authJsonError(error);
  }
}
