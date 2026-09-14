import { describe, expect, it } from "vitest";
import { PROVIDER_REGISTRY } from "@/app/lib/integrations/registry";
import { LANDING_AGENT_STEPS, LANDING_HERO_CHIPS } from "./content";

describe("Phase 5 landing honesty", () => {
  it("only lists Gmail and YouTube as available production providers", () => {
    const available = PROVIDER_REGISTRY.filter(
      (entry) => entry.implementationStatus === "available",
    ).map((entry) => entry.providerId);
    expect(available).toEqual(["gmail", "youtube"]);
  });

  it("does not encode connected or healthy states in the public catalog", () => {
    expect(
      PROVIDER_REGISTRY.every((entry) =>
        ["available", "coming_soon", "unsupported"].includes(
          entry.implementationStatus,
        ),
      ),
    ).toBe(true);
    expect(
      PROVIDER_REGISTRY.some((entry) => entry.implementationStatus === "available"),
    ).toBe(true);
  });

  it("keeps the agent path and capability chips in product copy", () => {
    expect(LANDING_AGENT_STEPS).toEqual([
      "request",
      "plan",
      "approval",
      "execution",
      "confirmation",
      "audit",
    ]);
    expect(LANDING_HERO_CHIPS).toContain("ai");
    expect(LANDING_HERO_CHIPS).toContain("intelligence");
  });
});
