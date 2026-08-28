/**
 * Phase 65.0 — trusted worker authentication (constant-time token compare).
 */

import "server-only";

import { timingSafeEqual } from "crypto";

export function isCreativePublishWorkerConfigured(): boolean {
  return Boolean(process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN?.trim());
}

export function assertCreativePublishWorkerAuthorized(
  authorizationHeader: string | null,
): void {
  const expected = process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN?.trim();
  if (!expected) {
    throw new Error("worker_not_configured");
  }
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("worker_unauthorized");
  }
  const provided = authorizationHeader.slice("Bearer ".length).trim();
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (
    expectedBuf.byteLength !== providedBuf.byteLength ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    throw new Error("worker_unauthorized");
  }
}
