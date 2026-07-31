import { NextResponse } from "next/server";
import { buildHealthPayload } from "@/app/lib/production/health";

/** Liveness / readiness — no secrets; safe for load balancers. */
export async function GET() {
  const payload = buildHealthPayload();
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
