/**
 * AGXORA Enterprise IAM — public types (Phase 22).
 * UI and modules depend on these contracts — never on adapter internals.
 */

export type {
  AuthProviderId,
  AuthStatus,
  AuthUser,
  AuthSession,
  AuthState,
  AuthProviderPort,
  SignInInput,
  SignUpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@/app/lib/auth/types";

/** Default IAM roles (enterprise SaaS). */
export type IamRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "viewer";

export type IamPermissionAction =
  | "read"
  | "write"
  | "manage"
  | "admin"
  | "invite"
  | "billing";

export type IamPermissionResource =
  | "organization"
  | "workspace"
  | "team"
  | "settings"
  | "security"
  | "billing"
  | "module"
  | "audit";

export interface IamPermission {
  readonly id: string;
  readonly resource: IamPermissionResource;
  readonly action: IamPermissionAction;
  readonly description: string;
}

export interface IamRoleDefinition {
  readonly key: IamRole;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly system: true;
}

/** Token pair architecture — backend-ready. */
export interface IamTokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly tokenType: "Bearer";
}

export interface IamSessionPolicy {
  /** Absolute session lifetime in ms. */
  readonly absoluteTimeoutMs: number;
  /** Idle timeout placeholder (0 = disabled until wired). */
  readonly idleTimeoutMs: number;
  /** Auto-refresh when access token has less than this remaining. */
  readonly refreshSkewMs: number;
  readonly persistentLogin: boolean;
}

export const DEFAULT_SESSION_POLICY: IamSessionPolicy = {
  absoluteTimeoutMs: 1000 * 60 * 60 * 24 * 30,
  idleTimeoutMs: 0,
  refreshSkewMs: 1000 * 60 * 5,
  persistentLogin: true,
};

export type IamAuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.email_verified"
  | "auth.session_refreshed"
  | "auth.session_expired"
  | "auth.account_locked"
  | "rbac.role_changed"
  | "rbac.permission_updated"
  | "org.created"
  | "org.updated"
  | "workspace.switched"
  | "team.invited"
  | "team.removed"
  | "team.ownership_transferred";

export interface IamAuditEvent {
  readonly id: string;
  readonly action: IamAuditAction;
  readonly actorUserId?: string;
  readonly organizationId?: string;
  readonly workspaceId?: string;
  readonly resource: string;
  readonly resourceId?: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly createdAt: string;
}

export interface IamOrganizationView {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logo?: string;
  readonly plan: string;
  readonly ownerId: string;
  readonly createdAt: string;
}

export interface IamWorkspaceView {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
}

export interface IamMemberView {
  readonly id: string;
  readonly userId: string;
  readonly email?: string;
  readonly displayName?: string;
  readonly role: IamRole | string;
  readonly status: string;
  readonly organizationId: string;
  readonly workspaceId: string;
}

export interface IamProfilePreferences {
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl?: string;
  readonly language: string;
  readonly timezone: string;
  readonly notificationsEmail: boolean;
  readonly notificationsPush: boolean;
}

export type IamRouteClass = "public" | "private" | "admin";

export interface IamRouteDefinition {
  readonly path: string;
  readonly routeClass: IamRouteClass;
  readonly requiredRole?: readonly IamRole[];
  readonly requiredPermission?: string;
}
