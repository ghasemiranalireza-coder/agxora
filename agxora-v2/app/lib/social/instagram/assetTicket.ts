/**
 * Short-lived signed URL for the one approved JPEG Meta must fetch.
 * The token names an organization asset. It is not a storage key from the client.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { requireSocialOAuthEncryptionKey } from "@/app/lib/social/config";

const TTL_MS = 10 * 60_000;

type AssetTicket = {
  readonly organizationId: string;
  readonly assetId: string;
  readonly expiresAt: number;
};

export function signMarketingAssetTicket(input: {
  readonly organizationId: string;
  readonly assetId: string;
  readonly now?: number;
}): string {
  const ticket: AssetTicket = {
    organizationId: input.organizationId,
    assetId: input.assetId,
    expiresAt: (input.now ?? Date.now()) + TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const signature = createHmac("sha256", requireSocialOAuthEncryptionKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readMarketingAssetTicket(token: string, now = Date.now()): AssetTicket | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", requireSocialOAuthEncryptionKey()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AssetTicket>;
    if (!parsed.organizationId || !parsed.assetId || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt <= now) return null;
    return { organizationId: parsed.organizationId, assetId: parsed.assetId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}
