/**
 * Central IAM service — sole orchestration entry for auth lifecycle + audit.
 * Mock / local only — swap IdentityApi later without UI changes.
 */

import {
  getRememberedEmail,
  login as identityLogin,
  logout as identityLogout,
  register as identityRegister,
} from "@/app/lib/identity";
import { localAuthAdapter } from "@/app/lib/auth/LocalAuthAdapter";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
  VerifyEmailInput,
} from "@/app/lib/auth/types";
import { iamAuditLog } from "../store/auditStore";
import { iamSessionManager } from "../store/sessionManager";

export const iamAuthService = {
  getRememberedEmail,

  async login(
    input: SignInInput & { readonly rememberMe?: boolean },
  ): Promise<{ userId: string; sessionId: string }> {
    const result = await identityLogin(input);
    const session = await localAuthAdapter.getSession();
    iamSessionManager.setSession(session);
    iamSessionManager.startAutoRefresh();
    iamAuditLog({
      action: "auth.login",
      actorUserId: result.userId,
      resource: "session",
      resourceId: result.sessionId,
      metadata: { rememberMe: String(Boolean(input.rememberMe)) },
    });
    return { userId: result.userId, sessionId: result.sessionId };
  },

  async logout(): Promise<void> {
    const session = iamSessionManager.getSnapshot().session;
    await identityLogout();
    iamSessionManager.stopAutoRefresh();
    iamSessionManager.setSession(null);
    iamAuditLog({
      action: "auth.logout",
      actorUserId: session?.userId,
      resource: "session",
      resourceId: session?.sessionId,
    });
  },

  async register(
    input: SignUpInput & {
      readonly companyName?: string;
      readonly acceptTerms: boolean;
    },
  ): Promise<{ userId: string; companyName?: string }> {
    const result = await identityRegister(input);
    const session = await localAuthAdapter.getSession();
    iamSessionManager.setSession(session);
    iamSessionManager.startAutoRefresh();
    iamAuditLog({
      action: "auth.register",
      actorUserId: result.userId,
      resource: "user",
      resourceId: result.userId,
      metadata: result.companyName
        ? { companyName: result.companyName }
        : undefined,
    });
    return result;
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<{ token: string }> {
    const result = await localAuthAdapter.requestPasswordReset(input);
    iamAuditLog({
      action: "auth.password_reset_requested",
      resource: "user",
      metadata: { email: input.email.trim().toLowerCase() },
    });
    return result;
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await localAuthAdapter.resetPassword(input);
    iamAuditLog({
      action: "auth.password_reset_completed",
      resource: "user",
    });
  },

  async verifyEmail(input: VerifyEmailInput) {
    const user = await localAuthAdapter.verifyEmail(input);
    iamAuditLog({
      action: "auth.email_verified",
      actorUserId: user.id,
      resource: "user",
      resourceId: user.id,
    });
    return user;
  },

  async refreshSession() {
    return iamSessionManager.refresh();
  },
};
