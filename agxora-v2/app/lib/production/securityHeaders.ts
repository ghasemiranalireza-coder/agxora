/**
 * Production security headers — applied via next.config and proxy responses.
 * Placeholders for CSP tightening once asset inventory is complete.
 */

export type SecurityHeader = {
  readonly key: string;
  readonly value: string;
};

export const SECURITY_HEADERS: readonly SecurityHeader[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  /**
   * Baseline CSP — allows Next.js / Framer / Three.js while blocking
   * obvious XSS vectors. Tighten further per environment.
   */
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
] as const;

/** HSTS only when served over HTTPS in production. */
export function productionOnlyHeaders(
  isProduction: boolean,
): readonly SecurityHeader[] {
  if (!isProduction) return SECURITY_HEADERS;
  return [
    ...SECURITY_HEADERS,
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
  ];
}

/** Apply baseline security headers onto a mutable Headers object (proxy). */
export function applySecurityHeaders(
  headers: Headers,
  isProduction = process.env.NODE_ENV === "production",
): void {
  for (const { key, value } of productionOnlyHeaders(isProduction)) {
    headers.set(key, value);
  }
}
