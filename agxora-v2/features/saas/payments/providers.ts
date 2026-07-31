/**
 * Payment provider abstraction — Stripe / PayPal / Bank Transfer / Manual.
 * UI never imports provider SDKs.
 */

import type {
  BillingTransaction,
  PaymentProviderId,
} from "../types";

export interface CheckoutSessionInput {
  readonly organizationId: string;
  readonly planId: string;
  readonly amountUsd: number;
  readonly currency?: string;
  readonly customerEmail?: string;
  readonly successUrl?: string;
  readonly cancelUrl?: string;
}

export interface CheckoutSessionResult {
  readonly providerId: PaymentProviderId;
  readonly sessionId: string;
  readonly checkoutUrl: string;
  readonly status: "created" | "requires_action" | "mock";
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly displayName: string;
  createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult>;
  chargeInvoice?(input: {
    organizationId: string;
    invoiceId: string;
    amountUsd: number;
  }): Promise<BillingTransaction>;
  health(): Promise<{ ok: boolean; message: string }>;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

abstract class StubPaymentProvider implements PaymentProvider {
  abstract readonly id: PaymentProviderId;
  abstract readonly displayName: string;

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    return {
      providerId: this.id,
      sessionId: createId(`${this.id}_sess`),
      checkoutUrl: `/dashboard/billing?checkout=mock&provider=${this.id}&plan=${input.planId}`,
      status: "mock",
    };
  }

  async health() {
    return {
      ok: true,
      message: `${this.displayName} adapter ready (mock — no live network)`,
    };
  }
}

export class StripePaymentProvider extends StubPaymentProvider {
  readonly id = "stripe" as const;
  readonly displayName = "Stripe";
}

export class PayPalPaymentProvider extends StubPaymentProvider {
  readonly id = "paypal" as const;
  readonly displayName = "PayPal";
}

export class BankTransferPaymentProvider extends StubPaymentProvider {
  readonly id = "bank_transfer" as const;
  readonly displayName = "Bank Transfer";
}

export class ManualPaymentProvider extends StubPaymentProvider {
  readonly id = "manual" as const;
  readonly displayName = "Manual / Offline";
}

const registry = new Map<PaymentProviderId, PaymentProvider>([
  ["stripe", new StripePaymentProvider()],
  ["paypal", new PayPalPaymentProvider()],
  ["bank_transfer", new BankTransferPaymentProvider()],
  ["manual", new ManualPaymentProvider()],
]);

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  const provider = registry.get(id);
  if (!provider) throw new Error(`Unknown payment provider: ${id}`);
  return provider;
}

export function listPaymentProviders(): readonly PaymentProvider[] {
  return [...registry.values()];
}

export function registerPaymentProvider(provider: PaymentProvider): void {
  registry.set(provider.id, provider);
}
