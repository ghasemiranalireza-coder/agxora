/**
 * Billing domain service — invoices, renewals, coupons, refunds placeholders.
 * Never expose provider secrets to UI.
 */

import { getCommercialPlan, listPublicPlans } from "../plans";
import {
  activateLicense,
  cancelLicense,
  changePlan,
  ensureLicense,
  renewLicense,
} from "../license";
import { getPaymentProvider } from "../payments";
import { saasCommercialStore } from "../store";
import { sendBillingEmail } from "../email/emailService";
import { notifySaasEvent } from "../notifications/notify";
import type {
  BillingInvoice,
  BillingProfile,
  CommercialPlanId,
  CouponRecord,
  PaymentProviderId,
} from "../types";

function createInvoiceNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `AGX-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export const billingService = {
  ensureWorkspace(organizationId: string) {
    return ensureLicense(organizationId);
  },

  getLicense(organizationId: string) {
    return ensureLicense(organizationId);
  },

  listPlans() {
    return listPublicPlans();
  },

  applyCoupon(code: string): CouponRecord | null {
    const coupon = saasCommercialStore
      .listCoupons()
      .find((c) => c.code.toLowerCase() === code.trim().toLowerCase() && c.active);
    return coupon ?? null;
  },

  async startCheckout(input: {
    organizationId: string;
    planId: CommercialPlanId;
    providerId?: PaymentProviderId;
    actorUserId?: string;
    email?: string;
    couponCode?: string;
  }) {
    const plan = getCommercialPlan(input.planId);
    let amount = plan.priceMonthlyUsd ?? 0;
    if (input.couponCode) {
      const coupon = this.applyCoupon(input.couponCode);
      if (coupon?.percentOff) {
        amount = Math.round(amount * (1 - coupon.percentOff / 100));
        saasCommercialStore.logAudit({
          action: "coupon.applied",
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          metadata: { code: coupon.code },
        });
      }
    }
    const provider = getPaymentProvider(input.providerId ?? "stripe");
    const session = await provider.createCheckoutSession({
      organizationId: input.organizationId,
      planId: input.planId,
      amountUsd: amount,
      customerEmail: input.email,
    });
    return { session, amountUsd: amount };
  },

  /** Mock confirmation after checkout redirect. */
  completeCheckout(input: {
    organizationId: string;
    planId: CommercialPlanId;
    amountUsd: number;
    providerId?: PaymentProviderId;
    actorUserId?: string;
    email?: string;
  }): BillingInvoice {
    activateLicense(input.organizationId, input.planId, input.actorUserId);
    const invoice = saasCommercialStore.addInvoice({
      organizationId: input.organizationId,
      number: createInvoiceNumber(),
      status: "paid",
      amountUsd: input.amountUsd,
      currency: "USD",
      issuedAt: new Date().toISOString(),
      dueAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      description: `${getCommercialPlan(input.planId).name} subscription`,
      planId: input.planId,
    });
    saasCommercialStore.addPayment({
      organizationId: input.organizationId,
      invoiceId: invoice.id,
      providerId: input.providerId ?? "stripe",
      amountUsd: input.amountUsd,
      currency: "USD",
      status: "succeeded",
      createdAt: new Date().toISOString(),
      reference: `mock_${invoice.id}`,
    });
    if (!saasCommercialStore.listPaymentMethods(input.organizationId).length) {
      saasCommercialStore.upsertPaymentMethod({
        organizationId: input.organizationId,
        providerId: input.providerId ?? "stripe",
        brand: "Visa",
        last4: "4242",
        expMonth: 12,
        expYear: new Date().getFullYear() + 3,
        isDefault: true,
      });
    }
    if (input.email) {
      sendBillingEmail({
        templateId: "invoice",
        to: input.email,
        subject: `Invoice ${invoice.number}`,
        body: `Thank you for subscribing to AGXORA ${getCommercialPlan(input.planId).name}. Amount: $${input.amountUsd}.`,
      });
    }
    notifySaasEvent(input.organizationId, "invoice_ready", {
      title: "Invoice ready",
      body: `Invoice ${invoice.number} was paid successfully.`,
      href: "/dashboard/billing",
    });
    return invoice;
  },

  upgrade(
    organizationId: string,
    planId: CommercialPlanId,
    actorUserId?: string,
  ) {
    return changePlan(organizationId, planId, "upgrade", actorUserId);
  },

  downgrade(
    organizationId: string,
    planId: CommercialPlanId,
    actorUserId?: string,
  ) {
    return changePlan(organizationId, planId, "downgrade", actorUserId);
  },

  cancel(organizationId: string, actorUserId?: string, email?: string) {
    const license = cancelLicense(organizationId, actorUserId);
    notifySaasEvent(organizationId, "subscription_expiry", {
      title: "Subscription cancelled",
      body: "Your AGXORA subscription was cancelled. Access remains until the period ends.",
      href: "/dashboard/billing",
    });
    if (email) {
      sendBillingEmail({
        templateId: "billing_notification",
        to: email,
        subject: "Subscription cancelled",
        body: "Your AGXORA subscription has been cancelled.",
      });
    }
    return license;
  },

  renew(organizationId: string, actorUserId?: string, email?: string) {
    const license = renewLicense(organizationId, actorUserId);
    notifySaasEvent(organizationId, "invoice_ready", {
      title: "Subscription renewed",
      body: `Your plan renews on ${(license.renewsAt ?? "").slice(0, 10)}.`,
      href: "/dashboard/billing",
    });
    if (email) {
      sendBillingEmail({
        templateId: "billing_notification",
        to: email,
        subject: "Subscription renewed",
        body: `Your AGXORA subscription was renewed through ${license.renewsAt?.slice(0, 10) ?? "the next period"}.`,
      });
    }
    return license;
  },

  /** Refund placeholder — records audit only. */
  refundPlaceholder(organizationId: string, invoiceId: string, actorUserId?: string) {
    saasCommercialStore.logAudit({
      action: "billing.refund_placeholder",
      organizationId,
      actorUserId,
      metadata: { invoiceId },
    });
  },

  getOrCreateProfile(
    organizationId: string,
    seed?: Partial<BillingProfile>,
  ): BillingProfile {
    const existing = saasCommercialStore.getProfile(organizationId);
    if (existing) return existing;
    const profile: BillingProfile = {
      organizationId,
      companyName: seed?.companyName ?? "AGXORA Organization",
      billingEmail: seed?.billingEmail ?? "billing@example.com",
      addressLine1: seed?.addressLine1,
      city: seed?.city,
      country: seed?.country ?? "DE",
      vatId: seed?.vatId,
      taxId: seed?.taxId,
      updatedAt: new Date().toISOString(),
    };
    return saasCommercialStore.upsertProfile(profile);
  },

  updateProfile(profile: BillingProfile): BillingProfile {
    return saasCommercialStore.upsertProfile({
      ...profile,
      updatedAt: new Date().toISOString(),
    });
  },

  listInvoices(organizationId: string) {
    return saasCommercialStore.listInvoices(organizationId);
  },

  listPayments(organizationId: string) {
    return saasCommercialStore.listPayments(organizationId);
  },

  listPaymentMethods(organizationId: string) {
    return saasCommercialStore.listPaymentMethods(organizationId);
  },

  /** Admin: all licenses across orgs. */
  listAllLicenses() {
    return saasCommercialStore.listLicenses();
  },

  listAudit(organizationId?: string) {
    return saasCommercialStore.listAudit(organizationId);
  },
};
