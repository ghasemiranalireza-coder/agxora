import { NextResponse } from "next/server";
import { buildReadinessPayload } from "@/app/lib/production/health";

export const runtime = "nodejs";

/** Readiness — fail closed when production invariants or the database are not satisfied. */
export async function GET() {
  const payload = await buildReadinessPayload();
  return NextResponse.json(payload, {
    status: payload.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
