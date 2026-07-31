/**
 * Re-export auth provider surface — UI should prefer features/auth hooks.
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
export type { AuthProviderPort } from "@/app/lib/auth/types";
