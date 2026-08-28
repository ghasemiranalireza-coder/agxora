/**
 * Phase 60 — durable creative asset URL path helpers (no server-only import).
 * Shared by client-safe URL checks and the server asset store.
 */

export function buildDurableCreativeAssetUrl(
  creativeProjectId: string,
  assetId: string,
): string {
  return `/api/v1/agents/creative/assets/${encodeURIComponent(creativeProjectId)}/${encodeURIComponent(assetId)}`;
}

export function parseDurableCreativeAssetUrl(
  url: string,
): { creativeProjectId: string; assetId: string } | null {
  const trimmed = url.trim();
  const match = /^\/api\/v1\/agents\/creative\/assets\/([^/]+)\/([^/]+)$/.exec(
    trimmed,
  );
  if (!match) return null;
  try {
    return {
      creativeProjectId: decodeURIComponent(match[1]!),
      assetId: decodeURIComponent(match[2]!),
    };
  } catch {
    return null;
  }
}
