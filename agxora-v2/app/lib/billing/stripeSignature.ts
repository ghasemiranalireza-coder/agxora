/**
 * Stripe webhook signature. Scheme: t=timestamp,v1=hex HMAC-SHA256 of `${t}.${payload}`.
 * https://docs.stripe.com/webhooks/signatures
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300;

export function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const signed = `${timestamp}.${payload}`;
  const digest = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

export function verifyStripeSignature(input: {
  readonly payload: string;
  readonly header: string | null;
  readonly secret: string;
  readonly now?: Date;
  readonly toleranceSeconds?: number;
}): { readonly ok: true; readonly timestamp: number } | { readonly ok: false; readonly reason: string } {
  if (!input.secret) return { ok: false, reason: "missing_secret" };
  if (!input.header) return { ok: false, reason: "missing_signature" };
  const parts = input.header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestampPart || signatures.length === 0) return { ok: false, reason: "malformed_signature" };
  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "malformed_signature" };
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const tolerance = input.toleranceSeconds ?? TOLERANCE_SECONDS;
  if (Math.abs(nowSeconds - timestamp) > tolerance) return { ok: false, reason: "stale_signature" };
  const expected = createHmac("sha256", input.secret).update(`${timestamp}.${input.payload}`, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const match = signatures.some((signature) => {
    const actual = Buffer.from(signature, "utf8");
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  });
  if (!match) return { ok: false, reason: "invalid_signature" };
  return { ok: true, timestamp };
}
