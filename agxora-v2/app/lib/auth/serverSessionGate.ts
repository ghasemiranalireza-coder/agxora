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

function readServerSessionEnv(): {
  readonly NODE_ENV?: string | null;
  readonly AGXORA_AUTH_REQUIRED?: string | null;
} {
  // Direct property reads match getAuthMode(). Passing the whole process.env
  // object leaves the production client polyfill as {} and turns this gate off.
  return {
    NODE_ENV: process.env.NODE_ENV,
    AGXORA_AUTH_REQUIRED: process.env.AGXORA_AUTH_REQUIRED,
  };
}

export function isServerSessionRequired(
  env: {
    readonly NODE_ENV?: string | null;
    readonly AGXORA_AUTH_REQUIRED?: string | null;
  } = readServerSessionEnv(),
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

/** Where a resolved /api/v1/auth/me session may navigate. External URLs stay off. */
export function destinationAfterLiveSession(nextPath: string | null | undefined): string {
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    return nextPath;
  }
  return "/dashboard";
}

export function buildLoginRedirectPath(nextPath: string): string {
  const next =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  return `/login?next=${encodeURIComponent(next)}`;
}
