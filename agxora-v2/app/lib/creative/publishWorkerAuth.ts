/**
 * Phase 65.0 / 66.0 — trusted worker authentication (constant-time token compare).
 */

import "server-only";

import { timingSafeEqual } from "crypto";

function timingSafeTokenMatch(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  return (
    expectedBuf.byteLength === providedBuf.byteLength &&
    timingSafeEqual(expectedBuf, providedBuf)
  );
}

export function isCreativePublishWorkerConfigured(): boolean {
  return Boolean(process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN?.trim());
}

export function isCreativePublishSchedulerConfigured(): boolean {
  const raw = process.env.AGXORA_CREATIVE_PUBLISH_SCHEDULER_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function isCreativePublishSchedulerStrict(): boolean {
  const raw = process.env.AGXORA_CREATIVE_PUBLISH_SCHEDULER_STRICT?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function assertCreativePublishWorkerAuthorized(
  authorizationHeader: string | null,
): void {
  const workerToken = process.env.AGXORA_CREATIVE_PUBLISH_WORKER_TOKEN?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!workerToken && !cronSecret) {
    throw new Error("worker_not_configured");
  }
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("worker_unauthorized");
  }
  const provided = authorizationHeader.slice("Bearer ".length).trim();
  if (workerToken && timingSafeTokenMatch(workerToken, provided)) {
    return;
  }
  if (cronSecret && timingSafeTokenMatch(cronSecret, provided)) {
    return;
  }
  throw new Error("worker_unauthorized");
}
