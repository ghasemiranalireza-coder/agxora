/**
 * Shared HTTP dispatch for Next.js Route Handlers.
 * Maps `/api/*` and `/api/v1/*` onto the LocalDataProvider handlers
 * so RestDataProvider / ApiClient never hit HTML 404 pages.
 */

import { NextResponse } from "next/server";
import type { ApiRequestOptions, ApiResponse } from "../types";
import { localDataProvider } from "../providers/data/LocalDataProvider";
import { registerLocalDataHandlers } from "../providers/data/registerLocalHandlers";
import { buildHealthPayload } from "@/app/lib/production/health";
import { logPlatformEvent } from "../observability/logger";

let handlersReady = false;

function ensureHandlers(): void {
  if (handlersReady) return;
  registerLocalDataHandlers();
  handlersReady = true;
}

/** Strip `/api` and optional `/v1` prefixes → logical provider path. */
export function toLogicalPath(pathname: string): string {
  let path = pathname.split("?")[0] || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.startsWith("/api/")) path = path.slice(4);
  else if (path === "/api") path = "/";
  if (path.startsWith("/v1/")) path = path.slice(3);
  else if (path === "/v1") path = "/";
  if (!path.startsWith("/")) path = `/${path}`;
  return path === "" ? "/" : path;
}

function methodOf(request: Request, hasBody: boolean): ApiRequestOptions["method"] {
  const m = request.method.toUpperCase();
  if (
    m === "GET" ||
    m === "POST" ||
    m === "PUT" ||
    m === "PATCH" ||
    m === "DELETE"
  ) {
    return m;
  }
  return hasBody ? "POST" : "GET";
}

/**
 * Dispatch an incoming Route Handler request to the local data layer.
 */
export async function dispatchApiRequest(
  request: Request,
  pathFromRoute: string,
): Promise<NextResponse> {
  ensureHandlers();

  const url = new URL(request.url);
  const search = url.search || "";
  let logical = toLogicalPath(pathFromRoute);
  if (search) logical = `${logical}${search}`;

  let body: unknown;
  const canHaveBody = !["GET", "HEAD"].includes(request.method.toUpperCase());
  if (canHaveBody) {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_json",
            message: "Request body must be valid JSON",
          },
          { status: 400 },
        );
      }
    }
  }

  // Canonical health — prefer production health payload over local stub.
  if (toLogicalPath(logical.split("?")[0] ?? logical) === "/health") {
    const payload = buildHealthPayload();
    return NextResponse.json(
      { ...payload, provider: "api-route" },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const options: ApiRequestOptions = {
    method: methodOf(request, body !== undefined),
    path: logical,
    body,
  };

  let result: ApiResponse<unknown>;
  try {
    result = await localDataProvider.request(options);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Handler threw unexpectedly";
    logPlatformEvent("api.error", {
      path: logical,
      code: "handler_exception",
      message,
    });
    return NextResponse.json(
      {
        ok: false,
        code: "handler_exception",
        message,
      },
      { status: 500 },
    );
  }

  if (!result.ok) {
    logPlatformEvent("api.error", {
      path: logical,
      code: result.code,
      status: String(result.status),
    });
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        message: result.message,
        details: result.details,
      },
      { status: result.status || 500 },
    );
  }

  return NextResponse.json(result.data, {
    status: result.status || 200,
    headers: { "Cache-Control": "no-store" },
  });
}
