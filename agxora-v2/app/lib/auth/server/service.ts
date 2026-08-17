/**
 * Phase 43 — server-authoritative authentication service.
 *
 * Authentication answers "who is this user?" via credentials + session.
 * Authorization remains in tenancy/authorize (membership role from DB).
 */

import "server-only";

import { prisma } from "@/app/lib/db/prisma";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import { assertPasswordPolicy, hashPassword, verifyPassword } from "./password";
import { createOpaqueToken, hashOpaqueToken, hashSessionToken } from "./tokens";
import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  deliverEmail,
  type EmailDeliveryStatus,
} from "@/app/lib/email";

const GENERIC_AUTH_ERROR = "Invalid email or password";
const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export type PublicAuthUser = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly emailVerified: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type PublicAuthSession = {
  readonly sessionId: string;
  readonly userId: string;
  /** Placeholder — real token lives only in httpOnly cookie. */
  readonly accessToken: "cookie";
  readonly expiresAt: string;
  readonly createdAt: string;
};

export type AuthSuccess = {
  readonly user: PublicAuthUser;
  readonly session: PublicAuthSession;
  /** Raw session token for Set-Cookie only — never JSON-serialize to clients. */
  readonly rawSessionToken: string;
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

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new PersistenceError("validation", "A valid email is required");
  }
  return normalized;
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PublicAuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.name,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toPublicSession(session: {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}): PublicAuthSession {
  return {
    sessionId: session.id,
    userId: session.userId,
    accessToken: "cookie",
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

async function createServerSession(
  userId: string,
  activeWorkspaceId?: string | null,
): Promise<{
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  rawSessionToken: string;
}> {
  const rawSessionToken = createOpaqueToken(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const row = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(rawSessionToken),
      expiresAt,
      activeWorkspaceId: activeWorkspaceId ?? null,
    },
  });
  return { ...row, rawSessionToken };
}

/**
 * Register creates User + personal Organization + Default Workspace + OWNER membership.
 * Role/owner IDs are derived server-side — never from the client.
 */
export async function registerWithPassword(input: {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly companyName?: string;
}): Promise<AuthSuccess> {
  const email = normalizeEmail(input.email);
  assertPasswordPolicy(input.password);
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new PersistenceError("validation", "Display name is required");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new PersistenceError("conflict", "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const company =
    input.companyName?.trim() || `${displayName}'s Organization`;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: displayName,
        passwordHash,
        emailVerified: false,
      },
    });

    const orgSlug = `${slugify(email.split("@")[0] || "org")}-${user.id.slice(0, 8)}`;
    const organization = await tx.organization.create({
      data: {
        name: company,
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
    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        workspaceId: workspace.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    return { user, workspaceId: workspace.id };
  });

  const session = await createServerSession(result.user.id, result.workspaceId);

  return {
    user: toPublicUser(result.user),
    session: toPublicSession(session),
    rawSessionToken: session.rawSessionToken,
  };
}

export async function loginWithPassword(input: {
  readonly email: string;
  readonly password: string;
}): Promise<AuthSuccess> {
  const email = normalizeEmail(input.email);
  // Always run a hash compare path timing-wise when possible
  const user = await prisma.user.findUnique({ where: { email } });
  const hash = user?.passwordHash || (await hashPassword("invalid-dummy-password"));
  const ok = user?.passwordHash
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyPassword(input.password, hash).then(() => false);

  if (!user || !user.passwordHash || !ok) {
    throw new PersistenceError("unauthorized", GENERIC_AUTH_ERROR);
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    throw new PersistenceError(
      "forbidden",
      "Authenticated user has no active workspace membership",
    );
  }

  // Session rotation / fixation protection: always issue a fresh session on login
  const session = await createServerSession(user.id, membership.workspaceId);

  return {
    user: toPublicUser(user),
    session: toPublicSession(session),
    rawSessionToken: session.rawSessionToken,
  };
}

export async function logoutSession(token: string | null): Promise<void> {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionPublic(token: string | null): Promise<{
  user: PublicAuthUser;
  session: PublicAuthSession;
} | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
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
  return {
    user: toPublicUser(session.user),
    session: toPublicSession(session),
  };
}

/**
 * Forgot-password: creates a one-time hashed token and attempts email delivery.
 * `delivery: "queued"` only after a successful provider handoff.
 * Dev/test may expose raw token when AGXORA_AUTH_EXPOSE_RESET_TOKEN=1.
 *
 * Anti-enumeration: missing accounts return the same ok shape. When a provider
 * is configured but the account is missing, delivery stays "not_configured"
 * (no message was handed off). Existing accounts report actual handoff status.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{
  readonly ok: true;
  readonly delivery: EmailDeliveryStatus;
  readonly resetToken?: string;
}> {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { ok: true, delivery: "not_configured" };
  }

  const rawToken = createOpaqueToken(32);
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const { delivery } = await deliverEmail(
    buildPasswordResetEmail({ to: email, rawToken }),
  );

  if (process.env.AGXORA_AUTH_EXPOSE_RESET_TOKEN === "1") {
    return { ok: true, delivery, resetToken: rawToken };
  }
  return { ok: true, delivery };
}

export async function resetPasswordWithToken(input: {
  readonly token: string;
  readonly password: string;
}): Promise<void> {
  assertPasswordPolicy(input.password);
  const token = input.token.trim();
  if (!token) {
    throw new PersistenceError("validation", "Reset token is required");
  }

  const tokenHash = hashOpaqueToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new PersistenceError("unauthorized", "Invalid or expired reset token");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    // Invalidate sibling unused tokens for this user
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    });
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}

export async function createEmailVerificationToken(
  userId: string,
): Promise<{ rawToken: string; delivery: EmailDeliveryStatus }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new PersistenceError("not_found", "User not found");
  }

  const rawToken = createOpaqueToken(32);
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });

  const { delivery } = await deliverEmail(
    buildEmailVerificationEmail({ to: user.email, rawToken }),
  );
  return { rawToken, delivery };
}

export async function verifyEmailWithToken(tokenRaw: string): Promise<PublicAuthUser> {
  const token = tokenRaw.trim();
  if (!token) {
    throw new PersistenceError("validation", "Verification token is required");
  }
  const tokenHash = hashOpaqueToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new PersistenceError("unauthorized", "Invalid or expired verification token");
  }

  const user = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return tx.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
  });

  return toPublicUser(user);
}

/**
 * Client may REQUEST a workspace switch; server verifies membership.
 */
export async function switchActiveWorkspace(
  sessionToken: string,
  workspaceId: string,
): Promise<{ organizationId: string; workspaceId: string; role: string }> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(sessionToken) },
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new PersistenceError("unauthorized", "Authentication required");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.userId,
      workspaceId,
      status: "ACTIVE",
      workspace: { archivedAt: null },
    },
  });
  if (!membership) {
    throw new PersistenceError("forbidden", "No membership for requested workspace");
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { activeWorkspaceId: workspaceId },
  });

  return {
    organizationId: membership.organizationId,
    workspaceId: membership.workspaceId,
    role: membership.role,
  };
}
