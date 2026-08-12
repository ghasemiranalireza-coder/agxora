/**
 * Auth ensure — bridges LocalAuth identity into server Session + membership.
 *
 * Phase 42.1 limitation: trusts client-presented local identity after browser
 * LocalAuthAdapter validation. Phase 43 must replace this with real IdP /
 * httpOnly credential verification.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/app/lib/db/prisma";
import { SERVER_SESSION_COOKIE } from "@/app/lib/tenancy";
import { jsonError } from "@/app/lib/crm/persistence/http";
import { PersistenceError } from "@/app/lib/tenancy/errors";

export const runtime = "nodejs";

type EnsureBody = {
  readonly email?: string;
  readonly name?: string;
  readonly externalAuthId?: string;
  readonly accessToken?: string;
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace"
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      throw new PersistenceError(
        "misconfigured",
        "DATABASE_URL is not configured",
      );
    }

    const body = (await request.json()) as EnsureBody;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim() || email || "User";
    const externalAuthId = body.externalAuthId?.trim();
    const accessToken = body.accessToken?.trim();

    if (!email || !accessToken) {
      throw new PersistenceError("validation", "email and accessToken required");
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        externalAuthId: externalAuthId || null,
        emailVerified: true,
      },
      update: {
        name,
        externalAuthId: externalAuthId || undefined,
        emailVerified: true,
      },
    });

    let membership = await prisma.membership.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      const orgSlug = `${slugify(email.split("@")[0] || "org")}-${user.id.slice(0, 8)}`;
      const organization = await prisma.organization.create({
        data: {
          name: `${name}'s Organization`,
          slug: orgSlug,
          ownerId: user.id,
          workspaces: {
            create: {
              name: "Default",
              slug: "default",
            },
          },
        },
        include: { workspaces: true },
      });
      const workspace = organization.workspaces[0];
      membership = await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          workspaceId: workspace.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const token = accessToken.length >= 16 ? accessToken : `srv_${randomUUID()}`;

    await prisma.session.upsert({
      where: { token },
      create: {
        userId: user.id,
        token,
        expiresAt,
      },
      update: {
        userId: user.id,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      ok: true,
      userId: user.id,
      organizationId: membership.organizationId,
      workspaceId: membership.workspaceId,
      role: membership.role,
      token,
    });

    response.cookies.set({
      name: SERVER_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
