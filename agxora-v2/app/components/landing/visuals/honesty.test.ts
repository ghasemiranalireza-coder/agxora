import { describe, expect, it } from "vitest";
import {
  INTELLIGENCE_STEPS,
  LOOP_STEPS,
  MARKETING_STEPS,
  SURFACE_PATH,
  SYSTEM_NODES,
  WORKFORCE_NODES,
} from "./model";

describe("landing product visuals stay honest", () => {
  it("marks only Customer Communication as a live workforce", () => {
    const live = WORKFORCE_NODES.filter((node) => node.status === "live").map((node) => node.id);
    expect(live).toEqual(["customerCommunication"]);
    expect(WORKFORCE_NODES.find((node) => node.id === "marketing")?.status).toBe("direction");
  });

  it("does not mark registry providers as connected", () => {
    expect(SYSTEM_NODES.map((node) => node.status)).not.toContain("connected");
    expect(SYSTEM_NODES.find((node) => node.id === "gmail")?.status).toBe("available");
    expect(SYSTEM_NODES.find((node) => node.id === "youtube")?.status).toBe("available");
    expect(SYSTEM_NODES.find((node) => node.id === "moreSystems")?.status).toBe("direction");
  });

  it("keeps approval on the governed, surface, and marketing paths", () => {
    expect(LOOP_STEPS).toEqual([
      "business",
      "goal",
      "plan",
      "approval",
      "execute",
      "verify",
      "evidence",
      "memory",
      "nextGoal",
    ]);
    expect(SURFACE_PATH).toContain("approval");
    expect(MARKETING_STEPS).toContain("approval");
    expect(INTELLIGENCE_STEPS.map((step) => step.id)).toContain("approval");
  });
});
