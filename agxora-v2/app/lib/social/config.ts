/**
 * Phase 63.1 — YouTube publish / OAuth configuration (server-only).
 */

import "server-only";

export type SocialPlatformId = "youtube";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

export function isYouTubePublishEnabled(): boolean {
  const raw = process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getYouTubeOAuthConfig(): {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
} | null {
  const clientId = process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.AGXORA_YOUTUBE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.AGXORA_YOUTUBE_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: YOUTUBE_SCOPES,
  };
}

export function requireSocialOAuthEncryptionKey(): Buffer {
  const raw = process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "test") {
      return Buffer.from("01234567890123456789012345678901", "utf8");
    }
    throw new Error("AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY is required");
  }
  const decoded = Buffer.from(raw, raw.length === 64 ? "hex" : "base64");
  if (decoded.byteLength !== 32) {
    throw new Error("AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return decoded;
}

export const PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS = 15 * 60_000;
export const OAUTH_STATE_TTL_MS = 10 * 60_000;

export type YouTubePrivacyStatus = "private" | "unlisted" | "public";

const DEFAULT_YOUTUBE_UPLOAD_MAX_DURATION_MS = 55_000;

function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Phase 64 — server-only default YouTube upload privacy (never client-overridable). */
export function getYouTubeDefaultPrivacyStatus(): YouTubePrivacyStatus {
  const raw = process.env.AGXORA_YOUTUBE_DEFAULT_PRIVACY_STATUS?.trim().toLowerCase();
  if (raw === "unlisted" || raw === "public") return raw;
  return "private";
}

/** Phase 64 — in-request upload duration guard (fail-closed). */
export function getYouTubeUploadMaxDurationMs(): number {
  return envPositiveInt(
    "AGXORA_YOUTUBE_UPLOAD_MAX_DURATION_MS",
    DEFAULT_YOUTUBE_UPLOAD_MAX_DURATION_MS,
  );
}

export function isYouTubePublishFullyConfigured(): boolean {
  return isYouTubePublishEnabled() && Boolean(getYouTubeOAuthConfig());
}

const DEFAULT_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES = 10 * 1024 * 1024;
const DEFAULT_YOUTUBE_UPLOAD_SESSION_TTL_MS = 24 * 60 * 60_000;
const DEFAULT_YOUTUBE_WORKER_MAX_SESSIONS_PER_RUN = 5;
const DEFAULT_YOUTUBE_UPLOAD_SESSION_LEASE_MS = 5 * 60_000;
const DEFAULT_YOUTUBE_ASYNC_SYNC_CHUNK_BUDGET = 2;

/** Phase 65 — async cross-request YouTube upload (default off). */
export function isYouTubeAsyncUploadEnabled(): boolean {
  const raw = process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getYouTubeAsyncUploadThresholdBytes(): number {
  return envPositiveInt(
    "AGXORA_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES",
    DEFAULT_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES,
  );
}

export function getYouTubeUploadSessionTtlMs(): number {
  return envPositiveInt(
    "AGXORA_YOUTUBE_UPLOAD_SESSION_TTL_MS",
    DEFAULT_YOUTUBE_UPLOAD_SESSION_TTL_MS,
  );
}

export function getYouTubeWorkerMaxSessionsPerRun(): number {
  return envPositiveInt(
    "AGXORA_YOUTUBE_WORKER_MAX_SESSIONS_PER_RUN",
    DEFAULT_YOUTUBE_WORKER_MAX_SESSIONS_PER_RUN,
  );
}

export function getYouTubeUploadSessionLeaseMs(): number {
  return envPositiveInt(
    "AGXORA_YOUTUBE_UPLOAD_SESSION_LEASE_MS",
    DEFAULT_YOUTUBE_UPLOAD_SESSION_LEASE_MS,
  );
}

export function getYouTubeAsyncSyncChunkBudget(): number {
  return envPositiveInt(
    "AGXORA_YOUTUBE_ASYNC_SYNC_CHUNK_BUDGET",
    DEFAULT_YOUTUBE_ASYNC_SYNC_CHUNK_BUDGET,
  );
}
