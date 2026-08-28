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
