/**
 * Phase 46-A / 46-B — HTTP helpers for rate-limit responses.
 */

import { NextResponse } from "next/server";
import { isPersistenceError } from "@/app/lib/tenancy/errors";
import { enforceRateLimit, type EnforceRateLimitInput } from "./enforce";

/**
 * Returns a 429 NextResponse when limited; otherwise null (caller continues).
 * Generic message — does not reveal account/resource existence.
 */
export async function rateLimitResponse(
  input: EnforceRateLimitInput,
): Promise<NextResponse | null> {
  try {
    await enforceRateLimit(input);
    return null;
  } catch (error) {
    if (isPersistenceError(error) && error.code === "rate_limited") {
      const retryDetail = error.details?.find((d) =>
        d.message.startsWith("retry_after_sec="),
      );
      const retryAfterSec = retryDetail
        ? Number.parseInt(retryDetail.message.split("=")[1] ?? "60", 10)
        : 60;
      const safeRetry = Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? retryAfterSec
        : 60;

      return NextResponse.json(
        {
          ok: false,
          code: "rate_limited",
          message: "Too many requests. Try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(safeRetry),
            "Cache-Control": "no-store",
          },
        },
      );
    }
    throw error;
  }
}
