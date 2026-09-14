/**
 * Provider adapter contract for a later execution framework.
 *
 * This phase defines the boundary only. Gmail and YouTube keep their
 * existing execution paths. Do not route production actions through
 * these adapters yet.
 */

import type { CanonicalProviderId } from "./ids";
import type { ProviderCapability } from "./types";
import type { ResolvedProviderState } from "./resolver";

/**
 * Actor-derived scope. Credentials remain organization scoped;
 * connection enablement remains workspace scoped.
 */
export type AdapterContext = {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId: string;
};

export type AdapterConnectResult = {
  readonly authorizationUrl?: string;
  readonly connected: boolean;
};

export type AdapterHealthResult = {
  readonly ok: boolean;
  readonly message: string;
};

export type AdapterExecuteResult = {
  readonly ok: boolean;
  readonly code: "not_implemented" | "ok" | "denied";
  readonly output?: unknown;
};

export interface ProviderAdapter {
  readonly providerId: CanonicalProviderId;
  readonly capabilities: readonly ProviderCapability[];
  connect(ctx: AdapterContext): Promise<AdapterConnectResult>;
  disconnect(ctx: AdapterContext): Promise<void>;
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
    throw new Error(`adapter_not_implemented:${this.providerId}`);
  }

  async disconnect(): Promise<void> {
    throw new Error(`adapter_not_implemented:${this.providerId}`);
  }

  async getConnection(): Promise<ResolvedProviderState> {
    throw new Error(`adapter_not_implemented:${this.providerId}`);
  }

  async execute(): Promise<AdapterExecuteResult> {
    return { ok: false, code: "not_implemented" };
  }

  async health(): Promise<AdapterHealthResult> {
    return {
      ok: false,
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
