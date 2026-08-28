/**
 * Phase 60.1 — bounded, allowlisted HTTPS fetch for provider image URLs.
 * Prevents SSRF and unbounded buffering on the creative generate path.
 */

import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  ALLOWED_CREATIVE_IMAGE_MIME_TYPES,
  MAX_CREATIVE_ASSET_DECODED_BYTES,
  isAllowedCreativeImageMimeType,
} from "./assets";

/** Narrow allowlist for OpenAI Images temporary HTTPS asset hosts. */
export const TRUSTED_PROVIDER_ASSET_HOSTS = [
  "oaidalleapiprodscus.blob.core.windows.net",
  "dalleprodsec.blob.core.windows.net",
  "oaidalleapiprod.blob.core.windows.net",
] as const;

export type TrustedProviderAssetHost =
  (typeof TRUSTED_PROVIDER_ASSET_HOSTS)[number];

let fetchImplOverride: typeof fetch | null = null;

/** Test-only fetch injection for HTTPS materialization tests. */
export function setTrustedHttpsAssetFetchForTests(
  impl: typeof fetch | null,
): void {
  fetchImplOverride = impl;
}

function getFetchImpl(): typeof fetch {
  return fetchImplOverride ?? fetch;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;

  // IPv4 literal checks
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const octets = ipv4.slice(1, 5).map((part) => Number.parseInt(part, 10));
    if (octets.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }

  // IPv6 unique-local / link-local prefixes (best-effort on hostname string)
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("fe80")) return true;

  return false;
}

/**
 * Validate provider HTTPS URL before any network I/O.
 * Rejects http://, private hosts, and non-allowlisted hosts.
 */
export function assertTrustedProviderAssetUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new PersistenceError(
      "validation",
      "Provider asset URL is not usable",
      {
        details: [{ field: "url", message: "provider_returned_unusable_asset_url" }],
      },
    );
  }

  if (parsed.protocol !== "https:") {
    throw new PersistenceError(
      "validation",
      "Provider asset URL must use HTTPS",
      {
        details: [{ field: "url", message: "provider_asset_url_not_trusted" }],
      },
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHostname(hostname)) {
    throw new PersistenceError(
      "validation",
      "Provider asset URL host is not allowed",
      {
        details: [{ field: "url", message: "provider_asset_url_not_trusted" }],
      },
    );
  }

  if (
    !(TRUSTED_PROVIDER_ASSET_HOSTS as readonly string[]).includes(hostname)
  ) {
    throw new PersistenceError(
      "validation",
      "Provider asset URL host is not trusted",
      {
        details: [{ field: "url", message: "provider_asset_url_not_trusted" }],
      },
    );
  }

  return parsed;
}

async function readBoundedResponseBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declared = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new PersistenceError("validation", "Asset exceeds size limit", {
        details: [{ field: "bytes", message: "provider_asset_too_large" }],
      });
    }
  }

  if (!response.body) {
    throw new PersistenceError("validation", "Asset bytes are empty", {
      details: [{ field: "bytes", message: "empty" }],
    });
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new PersistenceError("validation", "Asset exceeds size limit", {
          details: [{ field: "bytes", message: "provider_asset_too_large" }],
        });
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    throw new PersistenceError("persistence", "Failed to read provider asset", {
      details: [{ field: "bytes", message: "provider_read_failed" }],
    });
  }

  if (total === 0) {
    throw new PersistenceError("validation", "Asset bytes are empty", {
      details: [{ field: "bytes", message: "empty" }],
    });
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function fetchTrustedHttpsAsset(
  url: string,
): Promise<{ mimeType: string; bytes: Uint8Array }> {
  assertTrustedProviderAssetUrl(url);

  const response = await getFetchImpl()(url, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new PersistenceError("persistence", "Failed to fetch provider asset", {
      details: [{ field: "url", message: `provider_http_${response.status}` }],
    });
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  const mimeType =
    contentType && isAllowedCreativeImageMimeType(contentType)
      ? contentType
      : "image/png";
  if (!isAllowedCreativeImageMimeType(mimeType)) {
    throw new PersistenceError("validation", "Unsupported creative asset MIME type", {
      details: [{ field: "mimeType", message: "unsupported" }],
    });
  }

  const bytes = await readBoundedResponseBody(
    response,
    MAX_CREATIVE_ASSET_DECODED_BYTES,
  );

  return { mimeType, bytes };
}

/** @internal test helper */
export function __testReadBoundedResponseBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  return readBoundedResponseBody(response, maxBytes);
}

/** @internal test helper */
export { ALLOWED_CREATIVE_IMAGE_MIME_TYPES };
