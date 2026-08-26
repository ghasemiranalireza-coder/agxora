/**
 * Phase 57 — resolve onboarding organization id.
 *
 * Authenticated / server mode MUST use membership-derived organization.
 * Local/demo may still mint a temporary client org id.
 */

import { isServerAuthMode } from "@/app/lib/auth/mode";

export type ResolveOnboardingOrganizationInput = {
  /** OrganizationProvider session org (when hydrated). */
  readonly sessionOrganizationId?: string | null;
  /** AuthUser.defaultOrganizationId from server /me membership. */
  readonly authOrganizationId?: string | null;
  /** When true, never mint a client-side org_* id. */
  readonly requireAuthenticatedOrganization?: boolean;
};

export type ResolveOnboardingOrganizationResult =
  | { readonly ok: true; readonly organizationId: string; readonly source: "session" | "auth" | "local_demo" }
  | { readonly ok: false; readonly code: "missing_authenticated_organization"; readonly message: string };

function mintLocalDemoOrganizationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `org_${crypto.randomUUID()}`;
  }
  return `org_${Date.now().toString(36)}`;
}

/**
 * Resolve the organization id used for Business OS activation during onboarding.
 */
export function resolveOnboardingOrganizationId(
  input: ResolveOnboardingOrganizationInput = {},
): ResolveOnboardingOrganizationResult {
  const sessionId = input.sessionOrganizationId?.trim() || null;
  const authId = input.authOrganizationId?.trim() || null;

  if (sessionId && authId && sessionId !== authId) {
    // Prefer auth/membership authority — never bind to a divergent client session org.
    return {
      ok: true,
      organizationId: authId,
      source: "auth",
    };
  }
  if (sessionId) {
    return { ok: true, organizationId: sessionId, source: "session" };
  }
  if (authId) {
    return { ok: true, organizationId: authId, source: "auth" };
  }

  const requireAuth =
    input.requireAuthenticatedOrganization ?? isServerAuthMode();

  if (requireAuth) {
    return {
      ok: false,
      code: "missing_authenticated_organization",
      message:
        "Authenticated onboarding requires a server membership organizationId",
    };
  }

  return {
    ok: true,
    organizationId: mintLocalDemoOrganizationId(),
    source: "local_demo",
  };
}

/** True when the id looks like a client-minted demo org (not for production bind). */
export function isClientMintedOrganizationId(organizationId: string): boolean {
  return /^org_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    organizationId,
  );
}
