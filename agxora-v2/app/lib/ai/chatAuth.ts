/**
 * Bind AI chat context to the authenticated actor.
 * Client-provided organization IDs cannot authorize cross-org access.
 */

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { AIRuntimeContext } from "./AIContext";

export function bindChatContextToActor(
  actor: Actor,
  context: AIRuntimeContext,
): AIRuntimeContext {
  const clientOrg = context.organization.organizationId;
  if (
    typeof clientOrg === "string" &&
    clientOrg.length > 0 &&
    clientOrg !== actor.organizationId
  ) {
    throw new PersistenceError("forbidden", "Organization mismatch", {
      details: [{ field: "organizationId", message: "actor_org_authoritative" }],
    });
  }

  return {
    ...context,
    organization: {
      ...context.organization,
      organizationId: actor.organizationId,
      workspaceId: actor.workspaceId,
    },
  };
}
