import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { authorizeCapabilityExecution } from "@/features/agents/capabilities/registry";
import {
  COMMERCIAL_PLANS,
  FUTURE_MARKETING_CAPABILITIES,
  VAT_NOTICE,
  formatNetEur,
  getCommercialPlan,
  planAllows,
  priceCents,
} from "./catalog";
import { authorizeCheckout, checkoutUrls, decideCancellation, decideCheckoutStart } from "./checkoutPolicy";
import { canUseCapability, isCustomerCapabilityUsable } from "./entitlements";
import { countsTowardGovernedExecution, decideGovernedExecution, governedExecutionWhere } from "./executionPolicy";
import {
  commitProviderEvent,
  normalizeStripeEvent,
  reduceBillingEvent,
  type BillingUnitOfWork,
  type NormalizedProviderEvent,
  type SubscriptionRecord,
} from "./providerEvent";
import { exportableSubscription } from "./publicView";
import { decideSeat } from "./seatPolicy";
import { signStripePayload, verifyStripeSignature } from "./stripeSignature";
import { hasPaidAccess, subscriptionFromBrowserReturn } from "./subscriptionState";

const ROOT = path.resolve(__dirname, "../../..");
const NOW = new Date("2026-09-26T12:00:00.000Z");
const PERIOD_START = new Date("2026-09-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-10-01T00:00:00.000Z");

function subscription(overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return {
    organizationId: "org-a",
    planCode: "agxora_business",
    status: "ACTIVE",
    currency: "EUR",
    interval: "month",
    currentPeriodStart: PERIOD_START,
    currentPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    provider: "stripe",
    providerCustomerId: "cus_a",
    providerSubscriptionId: "sub_a",
    providerEventCreatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

function stripeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    type: "customer.subscription.updated",
    created: 1_758_000_000,
    data: {
      object: {
        id: "sub_a",
        customer: "cus_a",
        status: "active",
        cancel_at_period_end: false,
        current_period_start: Math.floor(PERIOD_START.getTime() / 1000),
        current_period_end: Math.floor(PERIOD_END.getTime() / 1000),
        metadata: { organizationId: "org-a", planCode: "agxora_business", interval: "month" },
        items: { data: [{ price: { id: "price_business_month" } }] },
      },
    },
    ...overrides,
  };
}

function memory(initial?: SubscriptionRecord, failSave = false) {
  const state = {
    events: new Set<string>(),
    subs: new Map<string, SubscriptionRecord>(),
  };
  if (initial) state.subs.set(initial.organizationId, initial);
  return {
    state,
    async apply(event: NormalizedProviderEvent) {
      const draft = {
        events: new Set(state.events),
        subs: new Map(state.subs),
      };
      const work: BillingUnitOfWork = {
        findEvent: async (_provider, id) => draft.events.has(id),
        findSubscriptionByOrganization: async (organizationId) => draft.subs.get(organizationId) ?? null,
        findOrganizationByProvider: async (customerId, subscriptionId) => {
          for (const row of draft.subs.values()) {
            if (subscriptionId && row.providerSubscriptionId === subscriptionId) return row.organizationId;
            if (customerId && row.providerCustomerId === customerId) return row.organizationId;
          }
          return null;
        },
        insertEvent: async (row) => {
          draft.events.add(row.providerEventId);
        },
        saveSubscription: async (row) => {
          if (failSave) throw new Error("db down");
          draft.subs.set(row.organizationId, row);
        },
      };
      const result = await commitProviderEvent(work, event, NOW);
      state.events = draft.events;
      state.subs = draft.subs;
      return result;
    },
  };
}

describe("commercial billing", () => {
  it("defines the net EUR catalog", () => {
    expect(COMMERCIAL_PLANS.map((plan) => plan.code)).toEqual([
      "agxora_base",
      "agxora_business",
      "agxora_professional",
    ]);
    expect(formatNetEur(priceCents(getCommercialPlan("agxora_base"), "month"))).toBe("19.99 EUR");
    expect(formatNetEur(priceCents(getCommercialPlan("agxora_base"), "year"))).toBe("199.90 EUR");
    expect(formatNetEur(priceCents(getCommercialPlan("agxora_business"), "month"))).toBe("79 EUR");
    expect(formatNetEur(priceCents(getCommercialPlan("agxora_business"), "year"))).toBe("790 EUR");
    expect(formatNetEur(priceCents(getCommercialPlan("agxora_professional"), "month"))).toBe("149 EUR");
    expect(formatNetEur(priceCents(getCommercialPlan("agxora_professional"), "year"))).toBe("1490 EUR");
    expect(VAT_NOTICE).toBe("zzgl. gesetzlicher MwSt.");
    expect(JSON.stringify(COMMERCIAL_PLANS)).not.toMatch(/Usd|unlimited|Start Free/i);
  });

  it("maps plan entitlements without treating future marketing as one blob", () => {
    expect(planAllows("agxora_base", "CRM")).toBe(true);
    expect(planAllows("agxora_base", "FINANCE_HUMAN")).toBe(true);
    expect(planAllows("agxora_base", "DATA_EXPORT")).toBe(true);
    expect(planAllows("agxora_base", "CUSTOMER_COMMUNICATION_WORKFORCE")).toBe(false);
    expect(planAllows("agxora_business", "GOVERNED_EMAIL")).toBe(true);
    expect(planAllows("agxora_business", "MARKETING_VIDEO_CREATION")).toBe(true);
    expect(planAllows("agxora_professional", "MARKETING_AUTOMATION")).toBe(true);
    expect(getCommercialPlan("agxora_base").seats).toBe(2);
    expect(getCommercialPlan("agxora_business").seats).toBe(5);
    expect(getCommercialPlan("agxora_professional").seats).toBe(15);
    expect(getCommercialPlan("agxora_base").governedExecutionsPerMonth).toBe(0);
    expect(getCommercialPlan("agxora_business").governedExecutionsPerMonth).toBe(300);
    expect(getCommercialPlan("agxora_professional").governedExecutionsPerMonth).toBe(1500);
    for (const capability of FUTURE_MARKETING_CAPABILITIES) {
      expect(getCommercialPlan("agxora_business").capabilities).toContain(capability);
    }
  });

  it("keeps Base off the workforce and gives Business and Professional the live workforce", () => {
    expect(canUseCapability({ planCode: "agxora_base", capabilityId: "CRM_FOLLOW_UP", access: "paid" })).toBe(false);
    expect(canUseCapability({ planCode: "agxora_base", capabilityId: "GOVERNED_EMAIL", access: "paid" })).toBe(false);
    expect(canUseCapability({ planCode: "agxora_business", capabilityId: "CUSTOMER_COMMUNICATION_WORKFORCE", access: "paid" })).toBe(true);
    expect(canUseCapability({ planCode: "agxora_professional", capabilityId: "GOVERNED_EMAIL", access: "paid" })).toBe(true);
    expect(canUseCapability({ planCode: null, capabilityId: "CRM_FOLLOW_UP", access: "legacy" })).toBe(true);
  });

  it("enforces seat limits for the subscribed organization only", () => {
    const base = subscription({ planCode: "agxora_base" });
    expect(decideSeat({ organizationId: "org-a", subscription: base, activeUserIds: ["u1", "u2"], userId: "u3", now: NOW }).reason).toBe("seat_limit");
    expect(decideSeat({ organizationId: "org-a", subscription: base, activeUserIds: ["u1"], userId: "u2", now: NOW }).allow).toBe(true);
    expect(decideSeat({ organizationId: "org-a", subscription: base, activeUserIds: ["u1", "u2"], userId: "u1", now: NOW }).reason).toBe("existing_member");
    expect(decideSeat({ organizationId: "org-b", subscription: base, activeUserIds: [], userId: "u9", now: NOW }).reason).toBe("tenant_mismatch");
    expect(decideSeat({ organizationId: "org-legacy", subscription: null, activeUserIds: ["u1", "u2", "u3"], userId: "u4", now: NOW }).reason).toBe("no_subscription_legacy");
  });

  it("fails closed at the governed execution limit and ignores failed attempts", () => {
    expect(countsTowardGovernedExecution("COMPLETED")).toBe(true);
    expect(countsTowardGovernedExecution("FAILED")).toBe(false);
    const where = governedExecutionWhere({ organizationId: "org-a", periodStart: PERIOD_START, periodEnd: PERIOD_END });
    expect(where.organizationId).toBe("org-a");
    expect(where.status.in).not.toContain("FAILED");
    const business = subscription();
    expect(decideGovernedExecution({
      organizationId: "org-a",
      subscription: business,
      capabilityId: "CRM_CREATE_NOTE",
      registryStatus: "LIVE",
      counted: 300,
      now: NOW,
      replaying: false,
    }).reason).toBe("execution_limit");
    expect(decideGovernedExecution({
      organizationId: "org-a",
      subscription: business,
      capabilityId: "CRM_CREATE_NOTE",
      registryStatus: "LIVE",
      counted: 299,
      now: NOW,
      replaying: false,
    }).allow).toBe(true);
    expect(decideGovernedExecution({
      organizationId: "org-a",
      subscription: subscription({ planCode: "agxora_base" }),
      capabilityId: "CRM_CREATE_NOTE",
      registryStatus: "LIVE",
      counted: 0,
      now: NOW,
      replaying: false,
    }).reason).toBe("plan_denied");
    expect(decideGovernedExecution({
      organizationId: "org-a",
      subscription: business,
      capabilityId: "CRM_CREATE_NOTE",
      registryStatus: "LIVE",
      counted: 300,
      now: NOW,
      replaying: true,
    }).reason).toBe("replay");
    expect(decideGovernedExecution({
      organizationId: "org-legacy",
      subscription: null,
      capabilityId: "CRM_CREATE_NOTE",
      registryStatus: "LIVE",
      counted: 0,
      now: NOW,
      replaying: false,
    }).reason).toBe("no_subscription_legacy");
  });

  it("rejects unauthenticated checkout, invalid plans, invalid intervals, and client organization ids", () => {
    expect(authorizeCheckout({ authenticated: false, sessionOrganizationId: null, body: { planCode: "agxora_base", billingInterval: "month" } }).ok).toBe(false);
    const foreign = authorizeCheckout({
      authenticated: true,
      sessionOrganizationId: "org-session",
      body: { planCode: "agxora_base", billingInterval: "month", organizationId: "org-foreign", successUrl: "https://evil.example/paid" },
    });
    expect(foreign.ok).toBe(true);
    if (foreign.ok) expect(foreign.organizationId).toBe("org-session");
    expect(authorizeCheckout({ authenticated: true, sessionOrganizationId: "org-session", body: { planCode: "starter", billingInterval: "month" } }).ok).toBe(false);
    expect(authorizeCheckout({ authenticated: true, sessionOrganizationId: "org-session", body: { planCode: "agxora_base", billingInterval: "weekly" } }).ok).toBe(false);
    expect(checkoutUrls("https://agxora.de").successUrl).toBe("https://agxora.de/dashboard/settings?billing=return#billing");
    expect(checkoutUrls("https://agxora.de").successUrl).not.toContain("evil.example");
  });

  it("rejects a bad Stripe signature and accepts a current one", () => {
    const payload = JSON.stringify({ id: "evt_1" });
    const header = signStripePayload(payload, "whsec_test", Math.floor(NOW.getTime() / 1000));
    expect(verifyStripeSignature({ payload, header: "t=1,v1=deadbeef", secret: "whsec_test", now: NOW }).ok).toBe(false);
    expect(verifyStripeSignature({ payload, header, secret: "whsec_test", now: NOW }).ok).toBe(true);
    expect(verifyStripeSignature({ payload, header: null, secret: "whsec_test", now: NOW }).ok).toBe(false);
  });

  it("activates from a provider event, ignores a duplicate, and ignores a stale event", async () => {
    const store = memory();
    const event = normalizeStripeEvent(stripeEvent());
    expect(event?.kind).toBe("subscription_upsert");
    const first = await store.apply(event!);
    expect(first.outcome).toBe("applied");
    expect(store.state.subs.get("org-a")?.status).toBe("ACTIVE");
    const duplicate = await store.apply(event!);
    expect(duplicate.outcome).toBe("duplicate");
    expect(store.state.subs.size).toBe(1);
    const stale = normalizeStripeEvent(stripeEvent({ id: "evt_old", created: 1_700_000_000 }));
    const staleResult = await store.apply(stale!);
    expect(staleResult.outcome).toBe("stale");
    expect(store.state.subs.get("org-a")?.providerSubscriptionId).toBe("sub_a");
  });

  it("marks payment failure past due and removes access", async () => {
    const store = memory(subscription());
    const failed = normalizeStripeEvent({
      id: "evt_fail",
      type: "invoice.payment_failed",
      created: Math.floor(new Date("2026-09-20T00:00:00.000Z").getTime() / 1000),
      data: { object: { id: "in_1", customer: "cus_a", subscription: "sub_a" } },
    });
    const result = await store.apply(failed!);
    expect(result.outcome).toBe("applied");
    expect(store.state.subs.get("org-a")?.status).toBe("PAST_DUE");
    expect(hasPaidAccess(store.state.subs.get("org-a")!, NOW)).toBe(false);
    expect(decideGovernedExecution({
      organizationId: "org-a",
      subscription: store.state.subs.get("org-a")!,
      capabilityId: "COMMUNICATION_SEND_EMAIL",
      registryStatus: "LIVE",
      counted: 0,
      now: NOW,
      replaying: false,
    }).reason).toBe("payment_required");
  });

  it("keeps access after cancel-at-period-end and drops it when the period has ended", () => {
    const canceled = subscription({ cancelAtPeriodEnd: true });
    expect(decideCancellation({ subscription: canceled, now: NOW }).action).toBe("already");
    expect(decideCancellation({ subscription: subscription(), now: NOW }).action).toBe("cancel");
    expect(hasPaidAccess(canceled, NOW)).toBe(true);
    const expired = subscription({ status: "EXPIRED", currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z") });
    expect(hasPaidAccess(expired, NOW)).toBe(false);
    expect(hasPaidAccess(subscription({ status: "CANCELED", cancelAtPeriodEnd: true, currentPeriodEnd: new Date("2026-09-20T00:00:00.000Z") }), NOW)).toBe(false);
  });

  it("does not activate from a browser return and does not apply a checkout that is not paid", () => {
    expect(subscriptionFromBrowserReturn({ billing: "return", session_id: "cs_test" })).toBeNull();
    const unpaid = normalizeStripeEvent({
      id: "evt_checkout",
      type: "checkout.session.completed",
      created: 1_759_000_000,
      data: {
        object: {
          id: "cs_1",
          payment_status: "unpaid",
          customer: "cus_a",
          subscription: "sub_new",
          client_reference_id: "org-a",
          metadata: { organizationId: "org-a", planCode: "agxora_base", interval: "month" },
        },
      },
    });
    const reduced = reduceBillingEvent({
      event: unpaid!,
      alreadyStored: false,
      subscription: null,
      mappedOrganizationId: null,
      now: NOW,
    });
    expect(reduced.outcome).toBe("ignored");
    expect(reduced.subscription).toBeNull();
  });

  it("rolls back when subscription persistence fails", async () => {
    const store = memory(undefined, true);
    const event = normalizeStripeEvent(stripeEvent());
    await expect(store.apply(event!)).rejects.toThrow("db down");
    expect(store.state.events.size).toBe(0);
    expect(store.state.subs.size).toBe(0);
  });

  it("rejects a provider customer mapped to another organization", async () => {
    const store = memory(subscription({ organizationId: "org-a", providerCustomerId: "cus_a" }));
    const event = normalizeStripeEvent(stripeEvent({
      id: "evt_foreign",
      data: {
        object: {
          ...stripeEvent().data.object,
          metadata: { organizationId: "org-b", planCode: "agxora_business", interval: "month" },
        },
      },
    }));
    const result = await store.apply(event!);
    expect(result.outcome).toBe("tenant_mismatch");
    expect(store.state.subs.has("org-b")).toBe(false);
    expect(store.state.subs.get("org-a")?.planCode).toBe("agxora_business");
  });

  it("does not read localStorage or the mock commercial catalog", () => {
    const billingDir = path.join(ROOT, "app/lib/billing");
    const files = ["catalog.ts", "service.ts", "providerEvent.ts", "checkoutPolicy.ts"];
    for (const file of files) {
      const source = readFileSync(path.join(billingDir, file), "utf8");
      expect(source).not.toContain("localStorage");
      expect(source).not.toContain("agxora-saas-commercial");
      expect(source).not.toContain("StubPaymentProvider");
      expect(source).not.toContain("4242");
    }
    const pricing = readFileSync(path.join(ROOT, "app/components/pricing/PricingPageView.tsx"), "utf8");
    expect(pricing).not.toContain("startFree");
    expect(pricing).not.toContain("priceMonthlyUsd");
    expect(pricing).toContain("VAT_NOTICE");
  });

  it("exports safe billing fields and leaves Finance invoices untouched", () => {
    const exported = exportableSubscription(subscription());
    expect(exported.providerCustomerId).toBe("cus_a");
    expect(JSON.stringify(exported)).not.toMatch(/cvc|pan|webhook|secret|4242/i);
    const schema = readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
    const invoice = schema.slice(schema.indexOf("model Invoice {"), schema.indexOf("model InvoiceItem"));
    expect(invoice).not.toContain("planCode");
    expect(invoice).not.toContain("providerSubscriptionId");
    const finance = authorizeCapabilityExecution({ capabilityId: "FINANCE_CREATE_INVOICE", organizationId: "org-a" });
    expect(finance.ok).toBe(false);
    if (!finance.ok) expect(finance.failure.availability).toBe("BLOCKED");
    const migration = readFileSync(
      path.join(ROOT, "prisma/migrations/20260926160000_phase21_commercial_billing/migration.sql"),
      "utf8",
    );
    expect(migration).not.toMatch(/\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM\b/i);
  });

  it("blocks future marketing until the registry is LIVE", () => {
    expect(planAllows("agxora_business", "MARKETING_VIDEO_CREATION")).toBe(true);
    expect(planAllows("agxora_professional", "MARKETING_VIDEO_CREATION")).toBe(true);
    expect(isCustomerCapabilityUsable({
      planCode: "agxora_business",
      capabilityId: "MARKETING_VIDEO_CREATION",
      registryStatus: "FUTURE",
      access: "paid",
    })).toBe(false);
    expect(isCustomerCapabilityUsable({
      planCode: "agxora_professional",
      capabilityId: "MARKETING_CAMPAIGN",
      registryStatus: "FUTURE",
      access: "paid",
    })).toBe(false);
    expect(canUseCapability({
      planCode: "agxora_business",
      capabilityId: "MARKETING_VIDEO_CREATION",
      access: "paid",
    })).toBe(false);
    const execution = authorizeCapabilityExecution({
      capabilityId: "MARKETING_VIDEO_CREATION",
      organizationId: "org-a",
    });
    expect(execution.ok).toBe(false);
    if (!execution.ok) expect(execution.failure.availability).toBe("FUTURE");
    expect(isCustomerCapabilityUsable({
      planCode: "agxora_professional",
      capabilityId: "MARKETING_VIDEO_CREATION",
      registryStatus: "LIVE",
      access: "paid",
    })).toBe(true);
    expect(decideCheckoutStart({
      requestedPlan: "agxora_professional",
      requestedInterval: "year",
      subscription: subscription(),
      openCheckoutAgeMs: null,
      now: NOW,
    }).action).toBe("plan_change");
    expect(decideCheckoutStart({
      requestedPlan: "agxora_base",
      requestedInterval: "month",
      subscription: null,
      openCheckoutAgeMs: 1_000,
      now: NOW,
    }).action).toBe("reject");
  });
});
