/**
 * Shared JSON error mapping for persistence APIs.
 */

import { NextResponse } from "next/server";
import { isPersistenceError } from "@/app/lib/tenancy/errors";

export function jsonError(error: unknown): NextResponse {
  if (isPersistenceError(error)) {
    if (error.code === "persistence" || error.code === "misconfigured") {
      console.error("[agxora.persistence]", {
        code: error.code,
        message: error.message,
      });
    } else if (error.code !== "rate_limited") {
      console.warn("[agxora.authz]", {
        code: error.code,
        message: error.message,
      });
    }

    const headers: Record<string, string> = {};
    if (error.code === "rate_limited") {
      const retryDetail = error.details?.find((d) =>
        d.message.startsWith("retry_after_sec="),
      );
      const retryAfterSec = retryDetail
        ? Number.parseInt(retryDetail.message.split("=")[1] ?? "60", 10)
        : 60;
      headers["Retry-After"] = String(
        Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec : 60,
      );
      headers["Cache-Control"] = "no-store";
    }

    return NextResponse.json(
      {
        ok: false,
        code: error.code,
        message: error.message,
        // Never echo limiter internals / retry detail strings to clients.
        details:
          error.code === "rate_limited" ? undefined : error.details,
      },
      { status: error.status, headers },
    );
  }

  console.error("[agxora.persistence.unexpected]", {
    message: error instanceof Error ? error.message : "unknown",
  });
  return NextResponse.json(
    {
      ok: false,
      code: "persistence",
      message: "Unexpected persistence failure",
    },
    { status: 500 },
  );
}
