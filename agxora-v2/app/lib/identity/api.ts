/**
 * Identity API placeholders — production-ready contracts.
 * Local adapters fulfill these today; swap for remote backend later.
 */

import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../auth/types";
import type { MembershipRole, OrganizationId, UserId, WorkspaceId } from "../organization/types";
import type { AccessDenial, InvitationRecord, MembershipRecord, SessionRecord } from "./types";

export interface LoginResult {
  readonly ok: true;
  readonly userId: UserId;
  readonly sessionId: string;
}

export interface RegisterResult {
  readonly ok: true;
  readonly userId: UserId;
  readonly companyName?: string;
}

export interface IdentityApi {
  login(input: SignInInput & { readonly rememberMe?: boolean }): Promise<LoginResult>;
  logout(): Promise<void>;
  register(
    input: SignUpInput & { readonly companyName?: string; readonly acceptTerms: boolean },
  ): Promise<RegisterResult>;
  forgotPassword(input: ForgotPasswordInput): Promise<{ readonly token: string }>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  inviteMember(input: {
    readonly organizationId: OrganizationId;
    readonly workspaceId: WorkspaceId;
    readonly email: string;
    readonly role: MembershipRole;
    readonly invitedBy: UserId;
  }): Promise<InvitationRecord>;
  changeRole(input: {
    readonly organizationId: OrganizationId;
    readonly membershipId: string;
    readonly role: MembershipRole;
    readonly actorUserId: UserId;
  }): Promise<MembershipRecord>;
  listSessions(userId: UserId): Promise<readonly SessionRecord[]>;
  logoutAllDevices(userId: UserId, currentSessionId: string): Promise<void>;
}

export function accessError(
  code: AccessDenial["code"],
  message: string,
  requiredPermission?: string,
): AccessDenial {
  return { code, message, requiredPermission };
}

/**
 * Route classification for middleware / future edge guards.
 */
export const ROUTE_ACCESS = {
  public: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/demo",
    "/logout",
  ],
  private: ["/dashboard", "/workspace", "/onboarding", "/welcome"],
  admin: ["/dashboard/settings", "/dashboard/team", "/dashboard/finance", "/dashboard/automation"],
} as const;
