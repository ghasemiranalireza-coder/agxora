/**
 * Canonical provider adapter contract.
 *
 * Phase 3 routes Gmail and YouTube execution through this boundary.
 * Callers resolve `providerId → adapter` and must not branch on
 * `provider === "gmail"` / `provider === "youtube"` to execute.
 *
 * Result codes were extended additively from Phase 2's
 * `not_implemented | ok | denied` so Gmail/YouTube can report truthful
 * connection, approval, permission, and provider failures without
 * leaking provider-specific payloads or implying success.
 */

import type { Actor } from "@/app/lib/tenancy/types";
import { getProviderDefinition } from "./registry";
import { resolveProviderState, type ResolvedProviderState } from "./resolver";
import type { CanonicalProviderId } from "./ids";
import type { ProviderCapability } from "./types";

/**
 * Actor-derived scope. Credentials remain organization scoped;
 * connection enablement remains workspace scoped.
 *
 * `actor` is required for real Gmail/YouTube adapters. It must come from
 * `requireCurrentActor()` (or the equivalent server Actor) — never from
 * client-supplied organization/workspace IDs.
 */
export type AdapterContext = {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly actor?: Actor;
  readonly redirectPath?: string;
};

export const ADAPTER_RESULT_CODES = [
  "ok",
  "not_implemented",
  "denied",
  "not_connected",
  "requires_reauth",
  "permission_denied",
  "approval_required",
  "provider_error",
  "validation_error",
] as const;

export type AdapterResultCode = (typeof ADAPTER_RESULT_CODES)[number];

export type AdapterConnectResult = {
  readonly authorizationUrl?: string;
  readonly connected: boolean;
  readonly code: AdapterResultCode;
};

export type AdapterDisconnectResult = {
  readonly code: AdapterResultCode;
};

export type AdapterHealthResult = {
  readonly ok: boolean;
  readonly message: string;
  readonly code?: AdapterResultCode;
};

export type AdapterExecuteResult = {
  readonly ok: boolean;
  readonly code: AdapterResultCode;
  readonly output?: unknown;
  readonly message?: string;
  readonly status?: number;
};

export interface ProviderAdapter {
  readonly providerId: CanonicalProviderId;
  readonly capabilities: readonly ProviderCapability[];
  connect(ctx: AdapterContext): Promise<AdapterConnectResult>;
  disconnect(ctx: AdapterContext): Promise<AdapterDisconnectResult>;
  getConnection(ctx: AdapterContext): Promise<ResolvedProviderState>;
  execute(
    capability: ProviderCapability,
    input: unknown,
    ctx: AdapterContext,
  ): Promise<AdapterExecuteResult>;
  health(ctx: AdapterContext): Promise<AdapterHealthResult>;
}

export class UnimplementedProviderAdapter implements ProviderAdapter {
  readonly capabilities: readonly ProviderCapability[] = [];

  constructor(readonly providerId: CanonicalProviderId) {}

  async connect(): Promise<AdapterConnectResult> {
    return { connected: false, code: "not_implemented" };
  }

  async disconnect(): Promise<AdapterDisconnectResult> {
    return { code: "not_implemented" };
  }

  async getConnection(): Promise<ResolvedProviderState> {
    return resolveProviderState({
      provider: getProviderDefinition(this.providerId),
      connection: null,
      credentialAvailable: false,
      localStorageConnected: false,
    });
  }

  async execute(): Promise<AdapterExecuteResult> {
    return { ok: false, code: "not_implemented", message: "not_implemented" };
  }

  async health(): Promise<AdapterHealthResult> {
    return {
      ok: false,
      code: "not_implemented",
      message: "Provider adapter is not implemented. No live health check.",
    };
  }
}

const adapters = new Map<CanonicalProviderId, ProviderAdapter>();

export function registerProviderAdapter(adapter: ProviderAdapter): void {
  adapters.set(adapter.providerId, adapter);
}

export function getProviderAdapter(
  providerId: CanonicalProviderId,
): ProviderAdapter {
  return adapters.get(providerId) ?? new UnimplementedProviderAdapter(providerId);
}

export function listRegisteredProviderAdapters(): readonly ProviderAdapter[] {
  return [...adapters.values()];
}
