/**
 * Phase 43 — browser adapter for server-verifiable authentication.
 *
 * Authority is the httpOnly cookie + server session DB row.
 * Client state is UI-only. accessToken is always the placeholder "cookie".
 */

"use client";

import { asOrganizationId, asUserId } from "../organization/types";
import type {
  AuthProviderPort,
  AuthSession,
  AuthUser,
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
  VerifyEmailInput,
} from "./types";

type MePayload = {
  ok?: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  session?: {
    sessionId: string;
    userId: string;
    accessToken: "cookie" | string;
    expiresAt: string;
    createdAt: string;
  } | null;
  /** Phase 57 — membership organization from server session. */
  organizationId?: string | null;
  workspaceId?: string | null;
  message?: string;
  code?: string;
};

function toAuthUser(
  user: NonNullable<MePayload["user"]>,
  organizationId?: string | null,
): AuthUser {
  return {
    id: asUserId(user.id),
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    defaultOrganizationId: organizationId
      ? asOrganizationId(organizationId)
      : undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toAuthSession(session: NonNullable<MePayload["session"]>): AuthSession {
  return {
    sessionId: session.sessionId,
    userId: asUserId(session.userId),
    accessToken: "cookie",
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  };
}

async function authFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  const payload = (await response.json()) as T & {
    ok?: boolean;
    message?: string;
    code?: string;
  };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || `Auth request failed (${response.status})`);
  }
  return payload;
}

export class ServerAuthAdapter implements AuthProviderPort {
  readonly id = "custom" as const;

  async signUp(
    input: SignUpInput,
  ): Promise<{ user: AuthUser; session: AuthSession }> {
    const payload = await authFetch<MePayload>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        acceptTerms: true,
      }),
    });
    if (!payload.user || !payload.session) {
      throw new Error("Registration failed");
    }
    return {
      user: toAuthUser(payload.user, payload.organizationId),
      session: toAuthSession(payload.session),
    };
  }

  async signIn(
    input: SignInInput,
  ): Promise<{ user: AuthUser; session: AuthSession }> {
    const payload = await authFetch<MePayload>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    });
    if (!payload.user || !payload.session) {
      throw new Error("Invalid email or password");
    }
    return {
      user: toAuthUser(payload.user, payload.organizationId),
      session: toAuthSession(payload.session),
    };
  }

  async signOut(): Promise<void> {
    await authFetch<{ ok: boolean }>("/api/v1/auth/logout", {
      method: "POST",
      body: "{}",
    });
  }

  async getSession(): Promise<AuthSession | null> {
    const payload = await authFetch<MePayload>("/api/v1/auth/me");
    return payload.session ? toAuthSession(payload.session) : null;
  }

  async getUser(): Promise<AuthUser | null> {
    const payload = await authFetch<MePayload>("/api/v1/auth/me");
    return payload.user
      ? toAuthUser(payload.user, payload.organizationId)
      : null;
  }

  async refreshSession(): Promise<AuthSession | null> {
    return this.getSession();
  }

  async requestPasswordReset(
    input: ForgotPasswordInput,
  ): Promise<{ token: string }> {
    const payload = await authFetch<{
      ok: boolean;
      delivery: string;
      resetToken?: string;
      message?: string;
    }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: input.email }),
    });
    // Honesty: do not invent a delivery success token.
    // When expose mode is off, return empty token — UI must not claim "email sent".
    return { token: payload.resetToken ?? "" };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await authFetch<{ ok: boolean }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: input.token,
        password: input.password,
      }),
    });
  }

  async requestEmailVerification(): Promise<{ token: string }> {
    const payload = await authFetch<{
      ok: boolean;
      delivery: string;
      verificationToken?: string;
      message?: string;
    }>("/api/v1/auth/request-verification", {
      method: "POST",
      body: JSON.stringify({}),
    });
    // Honesty: only return a token when the server explicitly exposed one (dev).
    return { token: payload.verificationToken ?? "" };
  }

  async verifyEmail(input: VerifyEmailInput): Promise<AuthUser> {
    const payload = await authFetch<MePayload>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: input.token }),
    });
    if (!payload.user) throw new Error("Verification failed");
    return toAuthUser(payload.user, payload.organizationId);
  }
}

export const serverAuthAdapter = new ServerAuthAdapter();
