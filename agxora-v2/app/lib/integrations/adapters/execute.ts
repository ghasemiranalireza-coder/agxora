import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  getProviderAdapter,
  type AdapterExecuteResult,
} from "../adapter";
import { adapterContextFromActor } from "../adapter-context";
import { isCanonicalProviderId, toCanonicalProviderId } from "../ids";
import type { CanonicalProviderId } from "../ids";
import type { ProviderCapability } from "../types";
import { persistenceErrorFromAdapterResult } from "../adapter-errors";
import "./register";

export async function executeProviderCapabilityForActor(
  actor: Actor,
  provider: CanonicalProviderId | string,
  capability: ProviderCapability,
  input: unknown,
): Promise<AdapterExecuteResult> {
  const canonical = isCanonicalProviderId(provider)
    ? provider
    : toCanonicalProviderId(String(provider));
  if (!canonical) {
    return { ok: false, code: "not_implemented", message: "not_implemented" };
  }
  const adapter = getProviderAdapter(canonical);
  return adapter.execute(capability, input, adapterContextFromActor(actor));
}

export async function executeProviderCapabilityOrThrow(
  actor: Actor,
  provider: CanonicalProviderId | string,
  capability: ProviderCapability,
  input: unknown,
): Promise<unknown> {
  const result = await executeProviderCapabilityForActor(
    actor,
    provider,
    capability,
    input,
  );
  if (!result.ok) {
    throw persistenceErrorFromAdapterResult(result);
  }
  return result.output;
}

export function requireCanonicalProviderId(value: string): CanonicalProviderId {
  const canonical = toCanonicalProviderId(value);
  if (!canonical) {
    throw new PersistenceError("validation", "Unknown integration provider");
  }
  return canonical;
}
