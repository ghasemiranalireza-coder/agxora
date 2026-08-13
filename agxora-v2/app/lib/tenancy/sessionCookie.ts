/**
 * Server session cookie/header names.
 *
 * Kept free of Prisma and `server-only` so Next.js `proxy.ts` (Edge) can
 * read the cookie name without bundling `@prisma/client`.
 */

export const SERVER_SESSION_COOKIE = "agxora.server.session";
export const SERVER_SESSION_HEADER = "x-agxora-session-token";
