/**
 * Production canonical host.
 * agxora.vercel.app is an alias only. The session cookie is host-only on
 * agxora.de, so the alias must move the browser there before auth runs.
 */

export const PRODUCTION_CANONICAL_ORIGIN = "https://agxora.de";

export const PRODUCTION_ALIAS_HOSTS = ["agxora.vercel.app"] as const;

export type CanonicalRedirect = {
  readonly source: string;
  readonly has: { type: "host"; value: string }[];
  readonly destination: string;
  readonly permanent: true;
};

export function canonicalAliasRedirects(): CanonicalRedirect[] {
  return PRODUCTION_ALIAS_HOSTS.flatMap((host) => [
    {
      source: "/",
      has: [{ type: "host", value: host }],
      destination: `${PRODUCTION_CANONICAL_ORIGIN}/`,
      permanent: true,
    },
    {
      source: "/:path*",
      has: [{ type: "host", value: host }],
      destination: `${PRODUCTION_CANONICAL_ORIGIN}/:path*`,
      permanent: true,
    },
  ]);
}

/** Resolved location for an alias host. Query is preserved. Other hosts stay put. */
export function canonicalRedirectLocation(
  host: string,
  pathname: string,
  search = "",
): string | null {
  const bare = host.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!PRODUCTION_ALIAS_HOSTS.includes(bare as (typeof PRODUCTION_ALIAS_HOSTS)[number])) {
    return null;
  }
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const query = search
    ? search.startsWith("?")
      ? search
      : `?${search}`
    : "";
  return `${PRODUCTION_CANONICAL_ORIGIN}${path}${query}`;
}
