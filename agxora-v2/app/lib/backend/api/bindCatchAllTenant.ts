/**
 * Bind catch-all HTTP requests to the authenticated actor.
 * Client-supplied organizationId / workspaceId are never authoritative.
 */

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { ApiRequestOptions } from "../types";

const PUBLIC_CATCH_ALL_PATHS = new Set(["/health"]);

export function isPublicCatchAllLogicalPath(logicalPath: string): boolean {
  const path = logicalPath.split("?")[0] ?? logicalPath;
  return PUBLIC_CATCH_ALL_PATHS.has(path || "/");
}

function readQueryParam(path: string, key: string): string | null {
  const idx = path.indexOf("?");
  if (idx < 0) return null;
  return new URLSearchParams(path.slice(idx + 1)).get(key);
}

function asRecord(body: unknown): Record<string, unknown> | null {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return null;
}

function rejectMismatch(
  supplied: string | null,
  expected: string,
  field: "organizationId" | "workspaceId",
  message: string,
): void {
  if (supplied && supplied !== expected) {
    throw new PersistenceError("forbidden", message, {
      details: [{ field, message: `actor_${field === "organizationId" ? "org" : "workspace"}_authoritative` }],
    });
  }
}

/**
 * Replace client tenant IDs with the session actor's organization/workspace.
 * Mismatched client IDs are rejected — they are not silently ignored.
 */
export function bindCatchAllRequestToActor(
  actor: Actor,
  options: ApiRequestOptions,
): ApiRequestOptions {
  const record = asRecord(options.body);
  const queryOrg = readQueryParam(options.path, "organizationId");
  const bodyOrg =
    typeof record?.organizationId === "string" ? record.organizationId : null;
  const queryWs = readQueryParam(options.path, "workspaceId");
  const bodyWs =
    typeof record?.workspaceId === "string" ? record.workspaceId : null;

  rejectMismatch(
    queryOrg,
    actor.organizationId,
    "organizationId",
    "Organization mismatch",
  );
  rejectMismatch(
    bodyOrg,
    actor.organizationId,
    "organizationId",
    "Organization mismatch",
  );
  rejectMismatch(
    queryWs,
    actor.workspaceId,
    "workspaceId",
    "Workspace mismatch",
  );
  rejectMismatch(
    bodyWs,
    actor.workspaceId,
    "workspaceId",
    "Workspace mismatch",
  );

  const queryStart = options.path.indexOf("?");
  const basePath = queryStart >= 0 ? options.path.slice(0, queryStart) : options.path;
  const params = new URLSearchParams(
    queryStart >= 0 ? options.path.slice(queryStart + 1) : "",
  );
  params.set("organizationId", actor.organizationId);
  params.set("workspaceId", actor.workspaceId);
  const nextPath = `${basePath}?${params.toString()}`;

  let nextBody = options.body;
  if (record) {
    nextBody = {
      ...record,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    };
  } else if (
    options.method &&
    options.method !== "GET" &&
    options.body === undefined
  ) {
    nextBody = {
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    };
  }

  return { ...options, path: nextPath, body: nextBody };
}
