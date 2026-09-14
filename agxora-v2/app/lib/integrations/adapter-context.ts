/**
 * Adapter context helpers. Actor is the only authoritative org/workspace source.
 */

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { AdapterContext } from "./adapter";

export function adapterContextFromActor(
  actor: Actor,
  extra?: { readonly redirectPath?: string },
): AdapterContext {
  return {
    organizationId: actor.organizationId,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    actor,
    redirectPath: extra?.redirectPath,
  };
}

export function requireAdapterActor(ctx: AdapterContext): Actor {
  const actor = ctx.actor;
  if (!actor) {
    throw new PersistenceError("unauthorized", "Authoritative actor is required");
  }
  if (
    actor.organizationId !== ctx.organizationId ||
    actor.workspaceId !== ctx.workspaceId ||
    actor.userId !== ctx.userId
  ) {
    throw new PersistenceError(
      "forbidden",
      "Adapter context does not match the authoritative actor",
    );
  }
  return actor;
}
