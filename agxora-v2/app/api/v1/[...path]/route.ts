import type { NextRequest } from "next/server";
import { dispatchApiRequest } from "@/app/lib/backend/api/httpDispatch";

type RouteContext = {
  readonly params: Promise<{ readonly path: string[] }>;
};

/**
 * Versioned REST surface — `/api/v1/*`
 * Logical handlers are the same as `/api/*` (v1 prefix stripped in dispatch).
 */
async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const joined = `/v1/${path.join("/")}`;
  return dispatchApiRequest(request, joined);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
