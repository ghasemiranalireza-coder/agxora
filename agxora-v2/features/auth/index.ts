/**
 * AGXORA Enterprise Identity & Access Management (Phase 22).
 *
 * Extension points:
 * - Auth adapter: implement AuthProviderPort (Clerk / Auth0 / Supabase / custom)
 * - Session: iamSessionManager (access + refresh + idle policy)
 * - RBAC: IAM_ROLES / IAM_PERMISSIONS / register via roleHasPermission
 * - Audit: iamAuditLog → replace storage with immutable backend
 * - Team: iamTeamService wraps TeamService
 * - Guards: IamRouteGuard / IamRoleGuard / IamPermissionGuard
 */

export * from "./types";
export * from "./guards";
export * from "./store";
export * from "./services";
export * from "./hooks";
export * from "./providers";
export * from "./validation";
export * from "./utils";
export * from "./components";
