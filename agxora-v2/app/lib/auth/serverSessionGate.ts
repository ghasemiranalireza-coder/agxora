/**
 * Shared session-gate helpers for proxy (Edge) and dashboard UI.
 * Private APIs authorize via `agxora.server.session` + requireCurrentActor().
 * Do not import Prisma or `server-only` here — proxy.ts runs on the Edge.
 */

export type ProxySessionInput = {
  readonly serverSession?: string | null;
  readonly localSession?: string | null;
  readonly nodeEnv?: string | null;
  readonly authRequired?: string | null;
};

export function isServerSessionRequired(
  env: {
    readonly NODE_ENV?: string | null;
    readonly AGXORA_AUTH_REQUIRED?: string | null;
  } = process.env,
): boolean {
  return (
    env.AGXORA_AUTH_REQUIRED === "true" || env.NODE_ENV === "production"
  );
}

/**
 * Production and AGXORA_AUTH_REQUIRED=true only trust the httpOnly server
 * cookie. The local demo cookie is ignored there so /dashboard cannot look
 * signed-in while POST /api/v1/ai/chat still returns 401.
 */
export function resolveProxySession(input: ProxySessionInput): {
  readonly hasServerSession: boolean;
  readonly hasSession: boolean;
  readonly source: "server-session" | "session" | null;
} {
  const server = Boolean(input.serverSession?.trim());
  const local = Boolean(input.localSession?.trim());
  const requireServer = isServerSessionRequired({
    NODE_ENV: input.nodeEnv ?? process.env.NODE_ENV,
    AGXORA_AUTH_REQUIRED:
      input.authRequired ?? process.env.AGXORA_AUTH_REQUIRED,
  });

  if (requireServer) {
    return {
      hasServerSession: server,
      hasSession: server,
      source: server ? "server-session" : null,
    };
  }

  return {
    hasServerSession: server,
    hasSession: server || local,
    source: server ? "server-session" : local ? "session" : null,
  };
}

export function buildLoginRedirectPath(nextPath: string): string {
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  return `/login?next=${encodeURIComponent(next)}`;
}
