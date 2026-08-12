/**
 * IdentityService — composes auth + team + sessions.
 * Phase 43: routes login/register/logout through the active auth adapter
 * (server by default when CRM database mode / AUTH_MODE=server).
 */

import { getActiveAuthAdapter } from "../auth/createDefaultAuthAdapter";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../auth/types";
import {
  asUserId,
  type MembershipRole,
  type OrganizationId,
  type UserId,
  type WorkspaceId,
} from "../organization/types";
import { teamService } from "../saas";
import type { IdentityApi, LoginResult, RegisterResult } from "./api";
import {
  ensureActiveSession,
  listSessions,
  revokeOtherSessions,
} from "./sessions";
import type { InvitationRecord, MembershipRecord, SessionRecord } from "./types";

const REMEMBER_KEY = "agxora.identity.remember-email";

export function getRememberedEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REMEMBER_KEY);
}

export function setRememberedEmail(email: string | null): void {
  if (typeof window === "undefined") return;
  if (!email) window.localStorage.removeItem(REMEMBER_KEY);
  else window.localStorage.setItem(REMEMBER_KEY, email);
}

class AdapterIdentityApi implements IdentityApi {
  private adapter() {
    return getActiveAuthAdapter();
  }

  async login(
    input: SignInInput & { readonly rememberMe?: boolean },
  ): Promise<LoginResult> {
    const { user, session } = await this.adapter().signIn(input);
    if (input.rememberMe) setRememberedEmail(input.email);
    else setRememberedEmail(null);
    // Local session list is UI-only; server session is authoritative in server mode.
    ensureActiveSession(user.id, session.sessionId);
    return { ok: true, userId: user.id, sessionId: session.sessionId };
  }

  async logout(): Promise<void> {
    await this.adapter().signOut();
  }

  async register(
    input: SignUpInput & { readonly companyName?: string; readonly acceptTerms: boolean },
  ): Promise<RegisterResult> {
    if (!input.acceptTerms) throw new Error("You must accept the terms to continue.");
    if (input.companyName?.trim()) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "agxora.identity.pending-company",
          input.companyName.trim(),
        );
      }
    }
    const adapter = this.adapter();
    if (adapter.id === "custom") {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          displayName: input.displayName,
          companyName: input.companyName,
          acceptTerms: input.acceptTerms,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        user?: { id: string };
      };
      if (!response.ok || !payload.ok || !payload.user) {
        throw new Error(payload.message || "Registration failed");
      }
      return {
        ok: true,
        userId: asUserId(payload.user.id),
        companyName: input.companyName,
      };
    }

    const { user } = await adapter.signUp({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
    return { ok: true, userId: user.id, companyName: input.companyName };
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ readonly token: string }> {
    return this.adapter().requestPasswordReset(input);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await this.adapter().resetPassword(input);
  }

  async inviteMember(input: {
    readonly organizationId: OrganizationId;
    readonly workspaceId: WorkspaceId;
    readonly email: string;
    readonly role: MembershipRole;
    readonly invitedBy: UserId;
  }): Promise<InvitationRecord> {
    const invitation = teamService.invite(input);
    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      workspaceId: invitation.workspaceId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
    };
  }

  async changeRole(input: {
    readonly organizationId: OrganizationId;
    readonly membershipId: string;
    readonly role: MembershipRole;
    readonly actorUserId: UserId;
  }): Promise<MembershipRecord> {
    const membership = await teamService.assignRole(input);
    return {
      id: membership.id,
      userId: membership.userId,
      organizationId: membership.organizationId,
      workspaceId: membership.workspaceId,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  async listSessions(userId: UserId): Promise<readonly SessionRecord[]> {
    return listSessions(userId);
  }

  async logoutAllDevices(userId: UserId, currentSessionId: string): Promise<void> {
    revokeOtherSessions(userId, currentSessionId);
  }
}

export const identityApi: IdentityApi = new AdapterIdentityApi();

/** Convenience aliases matching the Phase 16 API surface. */
export const login = (input: SignInInput & { rememberMe?: boolean }) =>
  identityApi.login(input);
export const logout = () => identityApi.logout();
export const register = (
  input: SignUpInput & { companyName?: string; acceptTerms: boolean },
) => identityApi.register(input);
export const forgotPassword = (input: ForgotPasswordInput) =>
  identityApi.forgotPassword(input);
export const resetPassword = (input: ResetPasswordInput) =>
  identityApi.resetPassword(input);
export const inviteMember = identityApi.inviteMember.bind(identityApi);
export const changeRole = identityApi.changeRole.bind(identityApi);
