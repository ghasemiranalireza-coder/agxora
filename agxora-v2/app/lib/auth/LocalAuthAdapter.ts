/**
 * Local auth adapter — full session lifecycle without a remote backend.
 * Replace with Clerk/Auth0/Supabase by implementing AuthProviderPort.
 */

import { asUserId } from "../organization/types";
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
import {
  createEmptyAuthStore,
  createToken,
  hashPassword,
  readAuthStore,
  readSessionCookie,
  setSessionCookie,
  writeAuthStore,
  type PersistedAuthStore,
  type PersistedAuthUser,
} from "./sessionStore";

function toAuthUser(user: PersistedAuthUser): AuthUser {
  return {
    id: asUserId(user.id),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    defaultOrganizationId: user.defaultOrganizationId as AuthUser["defaultOrganizationId"],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function assertEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("A valid email is required");
  }
  return normalized;
}

function assertPassword(password: string): void {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

export class LocalAuthAdapter implements AuthProviderPort {
  readonly id = "local" as const;

  private mutate(
    updater: (store: PersistedAuthStore) => PersistedAuthStore,
  ): PersistedAuthStore {
    const next = updater(readAuthStore());
    writeAuthStore(next);
    return next;
  }

  async signUp(input: SignUpInput): Promise<{ user: AuthUser; session: AuthSession }> {
    const email = assertEmail(input.email);
    assertPassword(input.password);
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Display name is required");

    const store = readAuthStore();
    if (store.users.some((user) => user.email === email)) {
      throw new Error("An account with this email already exists");
    }

    const now = new Date().toISOString();
    const user: PersistedAuthUser = {
      id: createToken("usr"),
      email,
      displayName,
      emailVerified: false,
      passwordHash: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    };

    const session = this.createSession(user.id);
    this.mutate((prev) => ({
      ...prev,
      users: [...prev.users, user],
      sessions: [...prev.sessions.filter((s) => s.userId !== user.id), session],
      activeSessionId: session.sessionId,
    }));
    setSessionCookie(session.sessionId);

    return {
      user: toAuthUser(user),
      session: {
        sessionId: session.sessionId,
        userId: asUserId(session.userId),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    };
  }

  async signIn(input: SignInInput): Promise<{ user: AuthUser; session: AuthSession }> {
    const email = assertEmail(input.email);
    assertPassword(input.password);
    const store = readAuthStore();
    const user = store.users.find((item) => item.email === email);
    if (!user) throw new Error("Invalid email or password");
    const hash = await hashPassword(input.password);
    if (hash !== user.passwordHash) throw new Error("Invalid email or password");

    const session = this.createSession(user.id);
    this.mutate((prev) => ({
      ...prev,
      sessions: [...prev.sessions.filter((s) => s.userId !== user.id), session],
      activeSessionId: session.sessionId,
    }));
    setSessionCookie(session.sessionId);

    return {
      user: toAuthUser(user),
      session: {
        sessionId: session.sessionId,
        userId: asUserId(session.userId),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    };
  }

  async signOut(): Promise<void> {
    const active = readSessionCookie() ?? readAuthStore().activeSessionId;
    this.mutate((prev) => ({
      ...prev,
      sessions: active
        ? prev.sessions.filter((session) => session.sessionId !== active)
        : prev.sessions,
      activeSessionId: null,
    }));
    setSessionCookie(null);
  }

  async getSession(): Promise<AuthSession | null> {
    const store = readAuthStore();
    const sessionId = readSessionCookie() ?? store.activeSessionId;
    if (!sessionId) return null;
    const session = store.sessions.find((item) => item.sessionId === sessionId);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.signOut();
      return null;
    }
    return {
      sessionId: session.sessionId,
      userId: asUserId(session.userId),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async getUser(): Promise<AuthUser | null> {
    const session = await this.getSession();
    if (!session) return null;
    const user = readAuthStore().users.find((item) => item.id === session.userId);
    return user ? toAuthUser(user) : null;
  }

  async refreshSession(): Promise<AuthSession | null> {
    const current = await this.getSession();
    if (!current) return null;
    const session = this.createSession(current.userId);
    this.mutate((prev) => ({
      ...prev,
      sessions: [
        ...prev.sessions.filter((item) => item.userId !== current.userId),
        session,
      ],
      activeSessionId: session.sessionId,
    }));
    setSessionCookie(session.sessionId);
    return {
      sessionId: session.sessionId,
      userId: asUserId(session.userId),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  async requestPasswordReset(
    input: ForgotPasswordInput,
  ): Promise<{ token: string }> {
    const email = assertEmail(input.email);
    const user = readAuthStore().users.find((item) => item.email === email);
    // Always succeed to avoid email enumeration in future backends.
    if (!user) return { token: createToken("reset_noop") };
    const token = createToken("reset");
    this.mutate((prev) => ({
      ...prev,
      resetTokens: [
        ...prev.resetTokens.filter((item) => item.userId !== user.id),
        {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      ],
    }));
    return { token };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    assertPassword(input.password);
    const store = readAuthStore();
    const record = store.resetTokens.find((item) => item.token === input.token);
    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error("Invalid or expired reset token");
    }
    const passwordHash = await hashPassword(input.password);
    this.mutate((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === record.userId
          ? { ...user, passwordHash, updatedAt: new Date().toISOString() }
          : user,
      ),
      resetTokens: prev.resetTokens.filter((item) => item.token !== input.token),
    }));
  }

  async requestEmailVerification(): Promise<{ token: string }> {
    const user = await this.getUser();
    if (!user) throw new Error("Not authenticated");
    const token = createToken("verify");
    this.mutate((prev) => ({
      ...prev,
      verifyTokens: [
        ...prev.verifyTokens.filter((item) => item.userId !== user.id),
        {
          token,
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    }));
    return { token };
  }

  async verifyEmail(input: VerifyEmailInput): Promise<AuthUser> {
    const store = readAuthStore();
    const record = store.verifyTokens.find((item) => item.token === input.token);
    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error("Invalid or expired verification token");
    }
    let verified: PersistedAuthUser | undefined;
    this.mutate((prev) => ({
      ...prev,
      users: prev.users.map((user) => {
        if (user.id !== record.userId) return user;
        verified = {
          ...user,
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        };
        return verified;
      }),
      verifyTokens: prev.verifyTokens.filter((item) => item.token !== input.token),
    }));
    if (!verified) throw new Error("User not found");
    return toAuthUser(verified);
  }

  /** Dev/local helper — expose last reset token for UI without email. */
  peekResetToken(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    const store = readAuthStore();
    const user = store.users.find((item) => item.email === normalized);
    if (!user) return null;
    return (
      store.resetTokens.find((item) => item.userId === user.id)?.token ?? null
    );
  }

  peekVerifyToken(userId: string): string | null {
    return (
      readAuthStore().verifyTokens.find((item) => item.userId === userId)?.token ??
      null
    );
  }

  private createSession(userId: string) {
    const now = Date.now();
    return {
      sessionId: createToken("sess"),
      userId,
      accessToken: createToken("atk"),
      refreshToken: createToken("rtk"),
      expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now).toISOString(),
    };
  }
}

export const localAuthAdapter = new LocalAuthAdapter();

/**
 * Factory for auth providers.
 * Prefer createDefaultAuthAdapter() — Phase 43 defaults to server auth when configured.
 */
export function createAuthAdapter(
  providerId: AuthProviderPort["id"] = "local",
): AuthProviderPort {
  if (providerId === "local") return localAuthAdapter;
  if (providerId === "custom") {
    // Lazy import avoided — callers should use createDefaultAuthAdapter.
    throw new Error(
      'Use createDefaultAuthAdapter() for server auth ("custom").',
    );
  }
  throw new Error(
    `Auth provider "${providerId}" is not configured yet. Use "local"/"custom" via createDefaultAuthAdapter().`,
  );
}

export { createEmptyAuthStore };
