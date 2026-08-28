/**
 * Phase 65.0 / 66.0 — trusted internal creative publish worker boundary.
 * POST /api/v1/internal/creative/publish/worker
 * GET  /api/v1/internal/creative/publish/worker (Vercel Cron)
 */

import { NextResponse } from "next/server";
import { assertCreativePublishWorkerAuthorized } from "@/app/lib/creative/publishWorkerAuth";
import { runCreativePublishWorker } from "@/app/lib/creative/publishWorker";
import { getYouTubeWorkerMaxSessionsPerRun } from "@/app/lib/social/config";

export const runtime = "nodejs";

async function handleWorkerInvocation(request: Request): Promise<NextResponse> {
  try {
    assertCreativePublishWorkerAuthorized(request.headers.get("authorization"));
    const body =
      request.method === "POST"
        ? ((await request.json().catch(() => ({}))) as { maxSessions?: number })
        : {};
    const maxSessions = Math.min(
      Math.max(1, body.maxSessions ?? getYouTubeWorkerMaxSessionsPerRun()),
      getYouTubeWorkerMaxSessionsPerRun(),
    );
    const summary = await runCreativePublishWorker(maxSessions);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "worker_failed";
    if (message === "worker_not_configured") {
      return NextResponse.json({ ok: false, error: "worker_not_configured" }, { status: 503 });
    }
    if (message === "worker_unauthorized") {
      return NextResponse.json({ ok: false, error: "worker_unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "worker_failed" }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleWorkerInvocation(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handleWorkerInvocation(request);
}
