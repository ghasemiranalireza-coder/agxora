import "server-only";

import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { CanonicalProviderId } from "../ids";
import { resolveCanonicalProvidersForActor } from "../resolve-for-actor";
import type { ResolvedProviderState } from "../resolver";

export async function resolveAdapterConnectionForActor(
  actor: Actor,
  providerId: CanonicalProviderId,
): Promise<ResolvedProviderState> {
  const states = await resolveCanonicalProvidersForActor(actor);
  const match = states.find((row) => row.providerId === providerId);
  if (!match) {
    throw new PersistenceError("not_found", "Provider is not in the canonical registry");
  }
  return match;
}
