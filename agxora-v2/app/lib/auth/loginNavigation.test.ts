import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkoutHrefForIntent, pathWithPlan } from "../billing/planHandoff";
import {
  freshLoginDestination,
  observerLoginRedirect,
} from "./loginNavigation";

const intent = { plan: "agxora_business" as const, interval: "month" as const };
const welcomeHref = pathWithPlan("/welcome", intent);
const checkoutHref = checkoutHrefForIntent(intent);

describe("fresh login destination", () => {
  it("sends an invite login to the invite path", () => {
    expect(
      freshLoginDestination({
        next: "/invite/token-1",
        needsOnboarding: true,
        welcomeHref,
        checkoutHref,
      }),
    ).toBe("/invite/token-1");
  });

  it("sends a user who still needs onboarding to /welcome", () => {
    expect(
      freshLoginDestination({
        next: "/dashboard/settings",
        needsOnboarding: true,
        welcomeHref: "/welcome",
        checkoutHref: null,
      }),
    ).toBe("/welcome");
  });

  it("sends a valid plan intent to the checkout destination", () => {
    expect(
      freshLoginDestination({
        next: "/dashboard",
        needsOnboarding: false,
        welcomeHref: "/welcome",
        checkoutHref,
      }),
    ).toBe("/dashboard/settings?plan=agxora_business&interval=month#billing");
  });

  it("sends a same-origin next path through", () => {
    expect(
      freshLoginDestination({
        next: "/dashboard/ai",
        needsOnboarding: false,
        welcomeHref: "/welcome",
        checkoutHref: null,
      }),
    ).toBe("/dashboard/ai");
  });

  it("falls back to /dashboard when next is missing", () => {
    expect(
      freshLoginDestination({
        next: null,
        needsOnboarding: false,
        welcomeHref: "/welcome",
        checkoutHref: null,
      }),
    ).toBe("/dashboard");
  });

  it("does not let the live-session observer replace the fresh-login destination", () => {
    const chosen = freshLoginDestination({
      next: null,
      needsOnboarding: true,
      welcomeHref: "/welcome",
      checkoutHref: null,
    });
    expect(chosen).toBe("/welcome");
    expect(
      observerLoginRedirect({
        loginNavigationOwned: true,
        authenticated: true,
        next: "/dashboard",
      }),
    ).toBeNull();
  });

  it("still redirects an already-authenticated login page", () => {
    expect(
      observerLoginRedirect({
        loginNavigationOwned: false,
        authenticated: true,
        next: "/dashboard/settings",
      }),
    ).toBe("/dashboard/settings");
    expect(
      observerLoginRedirect({
        loginNavigationOwned: false,
        authenticated: true,
        next: null,
      }),
    ).toBe("/dashboard");
  });

  it("blocks external and protocol-relative next paths", () => {
    expect(
      freshLoginDestination({
        next: "https://evil.example",
        needsOnboarding: false,
        welcomeHref: "/welcome",
        checkoutHref: null,
      }),
    ).toBe("/dashboard");
    expect(
      freshLoginDestination({
        next: "//evil.example",
        needsOnboarding: false,
        welcomeHref: "/welcome",
        checkoutHref: null,
      }),
    ).toBe("/dashboard");
    expect(
      observerLoginRedirect({
        loginNavigationOwned: false,
        authenticated: true,
        next: "//evil.example",
      }),
    ).toBe("/dashboard");
  });

  it("wires the login page so submit owns navigation", () => {
    const page = readFileSync(new URL("../../login/page.tsx", import.meta.url), "utf8");
    expect(page).toContain("loginNavigationOwned.current = true");
    expect(page).toContain("freshLoginDestination(");
    expect(page).toContain("observerLoginRedirect(");
    expect(page).not.toContain("destinationAfterLiveSession(");
  });
});
