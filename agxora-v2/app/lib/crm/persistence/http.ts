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
    } else {
      console.warn("[agxora.authz]", {
        code: error.code,
        message: error.message,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        code: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.status },
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
