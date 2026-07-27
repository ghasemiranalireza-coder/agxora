/**
 * AGXORA Auth — provider-independent contracts.
 * Swap Local → Clerk / Auth0 / Supabase / custom without rewriting UI.
 */

import type { OrganizationId, UserId } from "../organization/types";

export type AuthProviderId =
  | "local"
  | "clerk"
  | "auth0"
  | "supabase"
  | "custom";

export type AuthStatus =
  | "anonymous"
  | "authenticated"
  | "loading"
  | "error";

export interface AuthUser {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly emailVerified: boolean;
  readonly defaultOrganizationId?: OrganizationId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuthSession {
  readonly sessionId: string;
  readonly userId: UserId;
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface AuthState {
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
  readonly session: AuthSession | null;
  readonly error: string | null;
  readonly hydrated: boolean;
}

export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export interface ForgotPasswordInput {
  readonly email: string;
}

export interface ResetPasswordInput {
  readonly token: string;
  readonly password: string;
}

export interface VerifyEmailInput {
  readonly token: string;
}

/**
 * Pluggable auth backend. Implement this for Clerk/Auth0/Supabase later.
 */
export interface AuthProviderPort {
  readonly id: AuthProviderId;

  signUp(input: SignUpInput): Promise<{ user: AuthUser; session: AuthSession }>;
  signIn(input: SignInInput): Promise<{ user: AuthUser; session: AuthSession }>;
  signOut(): Promise<void>;

  getSession(): Promise<AuthSession | null>;
  getUser(): Promise<AuthUser | null>;
  refreshSession(): Promise<AuthSession | null>;

  requestPasswordReset(input: ForgotPasswordInput): Promise<{ token: string }>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  requestEmailVerification(): Promise<{ token: string }>;
  verifyEmail(input: VerifyEmailInput): Promise<AuthUser>;
}
