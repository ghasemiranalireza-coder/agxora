/**
 * Phase 62.0 — server-generated object keys for creative blob storage.
 * Keys are never derived from user or provider input.
 */

import { PersistenceError } from "@/app/lib/tenancy/errors";

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertSafeId(value: string, field: string): void {
  if (!value?.trim() || !ID_PATTERN.test(value.trim())) {
    throw new PersistenceError("validation", `Invalid ${field}`, {
      details: [{ field, message: "invalid_id" }],
    });
  }
  if (value.includes("..") || value.includes("/")) {
    throw new PersistenceError("validation", `Invalid ${field}`, {
      details: [{ field, message: "path_traversal" }],
    });
  }
}

export function buildCreativeObjectKey(input: {
  readonly organizationId: string;
  readonly creativeProjectId: string;
  readonly assetId: string;
}): string {
  const organizationId = input.organizationId.trim();
  if (!UUID_PATTERN.test(organizationId)) {
    throw new PersistenceError("validation", "Invalid organizationId", {
      details: [{ field: "organizationId", message: "invalid_uuid" }],
    });
  }
  assertSafeId(input.creativeProjectId, "creativeProjectId");
  assertSafeId(input.assetId, "assetId");
  return `org/${organizationId}/creative/${input.creativeProjectId}/${input.assetId}`;
}

export function parseCreativeObjectKey(
  key: string,
): {
  organizationId: string;
  creativeProjectId: string;
  assetId: string;
} | null {
  const match =
    /^org\/([0-9a-f-]{36})\/creative\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/.exec(
      key.trim(),
    );
  if (!match) return null;
  return {
    organizationId: match[1]!,
    creativeProjectId: match[2]!,
    assetId: match[3]!,
  };
}
