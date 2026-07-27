/**
 * UserContext — centralized user identity surface.
 * Backed by AuthProvider (no duplicated state).
 */

export { useAuth as useUserContext, useUser, useCurrentUserId } from "../auth";
export type { AuthUser as UserContextUser } from "../auth";
