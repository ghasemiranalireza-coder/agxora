/**
 * Phase 46-A — trustworthy client IP extraction.
 *
 * Client-controlled headers are ignored unless AGXORA_TRUST_PROXY=true.
 * Never trust arbitrary identity headers (x-user-id, etc.).
 */

import "server-only";

import { getRateLimitRuntimeConfig } from "./config";

const UNTRUSTED_IP_KEY = "untrusted";

function firstForwardedIp(value: string): string | null {
  const candidate = value.split(",")[0]?.trim() ?? "";
  if (!candidate || candidate.length > 128) return null;
  // Reject obvious header injection / garbage.
  if (/[\s\r\n]/.test(candidate)) return null;
  return candidate;
}

/**
 * Returns a stable IP key fragment for rate limiting.
 * When the proxy is not trusted, all callers share `untrusted` —
 * spoof-safe but coarse. Production should enable AGXORA_TRUST_PROXY
 * behind a correctly configured reverse proxy.
 */
export function resolveClientIpKey(request: Request): string {
  const { trustProxy } = getRateLimitRuntimeConfig();
  if (!trustProxy) {
    return UNTRUSTED_IP_KEY;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = firstForwardedIp(forwarded);
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && realIp.length <= 128 && !/[\s\r\n]/.test(realIp)) {
    return realIp;
  }

  return UNTRUSTED_IP_KEY;
}

export { UNTRUSTED_IP_KEY };
