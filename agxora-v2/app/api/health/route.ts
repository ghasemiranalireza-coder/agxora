import { NextResponse } from "next/server";
import { buildLivenessPayload } from "@/app/lib/production/health";

/** Liveness — process is up. Does not inspect DB, email, or auth config. */
export async function GET() {
  const payload = buildLivenessPayload();
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
