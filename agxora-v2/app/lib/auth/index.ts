/**
 * AGXORA Auth public surface.
 */

export * from "./types";
export * from "./sessionStore";
export * from "./mode";
export {
  LocalAuthAdapter,
  localAuthAdapter,
  createAuthAdapter,
} from "./LocalAuthAdapter";
export {
  ServerAuthAdapter,
  serverAuthAdapter,
} from "./ServerAuthAdapter";
export {
  createDefaultAuthAdapter,
  getActiveAuthAdapter,
} from "./createDefaultAuthAdapter";
export {
  AuthProvider,
  useAuth,
  useOptionalAuth,
  useUser,
  useCurrentUserId,
  type AuthContextValue,
} from "./AuthProvider";
export { AuthOrganizationBridge } from "./AuthOrganizationBridge";
export { AuthServerBridge } from "./AuthServerBridge";
