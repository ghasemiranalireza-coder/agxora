import type { NextRequest } from "next/server";
import { dispatchApiRequest } from "@/app/lib/backend/api/httpDispatch";

type RouteContext = {
  readonly params: Promise<{ readonly path: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const joined = `/${path.join("/")}`;
  return dispatchApiRequest(request, joined);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
