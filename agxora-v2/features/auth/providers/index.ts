/**
 * Auth provider wiring — Phase 43 uses createDefaultAuthAdapter (server|local).
 * UI should prefer features/auth hooks.
 */

export {
  AuthProvider,
  useAuth,
  useOptionalAuth,
} from "@/app/lib/auth/AuthProvider";
export type { AuthContextValue } from "@/app/lib/auth/AuthProvider";
export {
  localAuthAdapter,
  createAuthAdapter,
} from "@/app/lib/auth/LocalAuthAdapter";
export {
  ServerAuthAdapter,
  serverAuthAdapter,
} from "@/app/lib/auth/ServerAuthAdapter";
export {
  createDefaultAuthAdapter,
  getActiveAuthAdapter,
} from "@/app/lib/auth/createDefaultAuthAdapter";
export { getAuthMode, isServerAuthMode } from "@/app/lib/auth/mode";
export type { AuthProviderPort } from "@/app/lib/auth/types";
