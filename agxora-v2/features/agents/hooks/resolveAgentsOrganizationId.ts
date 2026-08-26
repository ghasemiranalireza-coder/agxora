/**
 * Phase 57.1 — resolve Agent OS organization id (testable, client-safe).
 */

import { isServerAuthMode } from "@/app/lib/auth/mode";

export const AGENTS_LOCAL_ORG = "org_local_default";

export type ResolveAgentsOrganizationInput = {
  readonly sessionOrganizationId?: string | null;
  readonly authOrganizationId?: string | null;
  readonly serverAuthMode?: boolean;
};

/**
 * In server-auth mode, auth membership organization is authoritative.
 * Local/demo preserves OrganizationProvider priority.
 */
export function resolveAgentsOrganizationId(
  input: ResolveAgentsOrganizationInput = {},
): string {
  const sessionId = input.sessionOrganizationId?.trim() || null;
  const authId = input.authOrganizationId?.trim() || null;
  const serverAuth = input.serverAuthMode ?? isServerAuthMode();

  if (serverAuth) {
    if (authId && sessionId && authId !== sessionId) {
      return authId;
    }
    return authId ?? sessionId ?? AGENTS_LOCAL_ORG;
  }

  return sessionId ?? authId ?? AGENTS_LOCAL_ORG;
}
