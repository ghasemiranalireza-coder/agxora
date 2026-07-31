/**
 * IdentityService — composes auth + team + sessions via placeholder API.
 */

import { localAuthAdapter } from "../auth/LocalAuthAdapter";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../auth/types";
import type { MembershipRole, OrganizationId, UserId, WorkspaceId } from "../organization/types";
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

class LocalIdentityApi implements IdentityApi {
  async login(
    input: SignInInput & { readonly rememberMe?: boolean },
  ): Promise<LoginResult> {
    const { user, session } = await localAuthAdapter.signIn(input);
    if (input.rememberMe) setRememberedEmail(input.email);
    else setRememberedEmail(null);
    ensureActiveSession(user.id, session.sessionId);
    return { ok: true, userId: user.id, sessionId: session.sessionId };
  }

  async logout(): Promise<void> {
    await localAuthAdapter.signOut();
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
    const { user } = await localAuthAdapter.signUp({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
    return { ok: true, userId: user.id, companyName: input.companyName };
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ readonly token: string }> {
    return localAuthAdapter.requestPasswordReset(input);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await localAuthAdapter.resetPassword(input);
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

export const identityApi: IdentityApi = new LocalIdentityApi();

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
