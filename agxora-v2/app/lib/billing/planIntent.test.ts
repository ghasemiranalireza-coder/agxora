import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { authorizeCheckout } from "./checkoutPolicy";
import { priceCents, getCommercialPlan } from "./catalog";
import { decodePlanIntent, encodePlanIntent } from "./planHandoff";
import { checkoutSettingsHref, registerHref, resolveSelectedInterval, resolveSelectedPlan } from "./planIntent";

const ROOT = path.resolve(__dirname, "../../..");

describe("phase 27 plan handoff", () => {
  it("keeps the selected pricing plan through registration", () => {
    expect(registerHref("agxora_business", "month")).toBe("/register?plan=business&interval=month");
    expect(registerHref("agxora_professional", "year")).toBe("/register?plan=professional&interval=year");
    expect(registerHref("agxora_base", "month")).toBe("/register?plan=base&interval=month");
    const intent = decodePlanIntent(encodePlanIntent({ plan: "agxora_business", interval: "year" }));
    expect(intent).toEqual({ plan: "agxora_business", interval: "year" });
    expect(checkoutSettingsHref("agxora_business", "year")).toBe(
      "/dashboard/settings?plan=agxora_business&interval=year#billing",
    );
  });

  it("rejects an unknown plan and never accepts a price amount", () => {
    expect(resolveSelectedPlan("enterprise")).toBeNull();
    expect(resolveSelectedPlan("price_123")).toBeNull();
    expect(resolveSelectedPlan("7900")).toBeNull();
    expect(resolveSelectedPlan("14900")).toBeNull();
    expect(resolveSelectedPlan("agxora_business")).toBe("agxora_business");
    expect(resolveSelectedPlan("business")).toBe("agxora_business");
    expect(resolveSelectedInterval("lifetime")).toBeNull();
    expect(resolveSelectedInterval("year")).toBe("year");
  });

  it("does not let a client-supplied amount choose the Stripe price", () => {
    const href = registerHref("agxora_business", "month");
    expect(href).not.toContain("7900");
    expect(href).not.toContain("price_");
    const decision = authorizeCheckout({
      authenticated: true,
      sessionOrganizationId: "11111111-1111-4111-8111-111111111111",
      body: {
        planCode: "agxora_business",
        billingInterval: "month",
        organizationId: "22222222-2222-4222-8222-222222222222",
        amount: 1,
        priceId: "price_forged",
      } as { planCode: string; billingInterval: string },
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.planCode).toBe("agxora_business");
      expect(decision.organizationId).toBe("11111111-1111-4111-8111-111111111111");
      expect(priceCents(getCommercialPlan(decision.planCode), decision.billingInterval)).toBe(7900);
    }
    const checkout = readFileSync(path.join(ROOT, "app/api/v1/billing/checkout/route.ts"), "utf8");
    expect(checkout).toContain("startCheckout");
    expect(checkout).not.toContain("body.amount");
    expect(checkout).not.toContain("body.priceId");
  });
});
