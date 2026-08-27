/**
 * Phase 58 — Creative production tests.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { growthService } from "@/features/agents/growth/service";
import { creativeService } from "@/features/agents/creative/service";
import {
  createTestCreativeProvider,
  resetCreativeGenerationProvider,
  setCreativeGenerationProvider,
} from "@/features/agents/creative/provider";
import { canTransitionCreativeStatus } from "@/features/agents/creative/transitions";
import { operationsService } from "@/features/agents/execution/service";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";

const ORG_A = "org_creative_a";
const ORG_B = "org_creative_b";

function seedProfile(organizationId: string) {
  return growthService.saveProfile({
    organizationId,
    seedFromBusinessOs: false,
    draft: {
      companyName: "Acme Foods",
      industry: "Food",
      description: "Premium sauces",
      services: ["Delivery"],
      products: ["Hot Sauce"],
      targetAudience: "Food lovers 25-40",
      uniqueSellingProposition: "Small-batch heat",
      brandTone: "creative",
      preferredPlatforms: ["instagram"],
    },
  });
}

beforeEach(() => {
  setAgentsRepository(new MemoryAgentsRepository());
  agentsStore.clearMemory();
  resetCreativeGenerationProvider();
});

afterEach(() => {
  resetCreativeGenerationProvider();
});

describe("Phase 58 creative production", () => {
  it("creates brief, concepts, script, storyboard, and production plan", () => {
    seedProfile(ORG_A);
    const brief = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "VIDEO_AD",
      platform: "instagram_reels",
      customerRequest: "Make a hype Instagram ad for Hot Sauce",
    });
    expect(brief.status).toBe("PLANNED");
    expect(brief.concepts.length).toBeGreaterThan(0);
    expect(brief.productionResult).toBeUndefined();

    const withScript = creativeService.attachScript(ORG_A, brief.id);
    expect(withScript.script?.scenes.length).toBeGreaterThan(0);

    const withBoard = creativeService.attachStoryboard(ORG_A, brief.id);
    expect(withBoard.storyboard?.frames.length).toBeGreaterThan(0);

    const planned = creativeService.prepareProductionPlan(ORG_A, brief.id);
    expect(planned.status).toBe("READY_FOR_APPROVAL");
    expect(planned.productionPlan?.requiresExternalGeneration).toBe(true);
  });

  it("requires approval tool flag before external production and blocks on rejection", async () => {
    seedProfile(ORG_A);
    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "SOCIAL_VIDEO",
      platform: "tiktok",
      customerRequest: "30s TikTok promo",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    const { job } = await creativeService.requestProduction(ORG_A, project.id);
    expect(job.requiresApproval).toBe(true);
    expect(job.toolId).toBe("creative_generate");

    const started = await operationsService.start(ORG_A, job.id, "op");
    expect(started.status).toBe("WAITING_FOR_APPROVAL");
    expect(started.approvalId).toBeTruthy();

    const approval = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === started.approvalId)!;
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "REJECTED",
      decidedBy: "op",
    });
    const creative = creativeService.get(ORG_A, project.id)!;
    expect(creative.status).toBe("BLOCKED");
    expect(creative.productionResult?.generated).not.toBe(true);
  });

  it("returns PROVIDER_UNAVAILABLE and never fabricates completed media", async () => {
    seedProfile(ORG_A);
    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "VIDEO_AD",
      platform: "youtube_shorts",
      customerRequest: "Short YouTube ad",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    const { job } = await creativeService.requestProduction(ORG_A, project.id);
    const waiting = await operationsService.start(ORG_A, job.id, "op");
    const approval = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === waiting.approvalId)!;
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "op",
    });
    const finished = operationsService.get(ORG_A, job.id)!;
    expect(finished.status).toBe("BLOCKED");
    expect(finished.result?.status).toBe("unavailable");
    expect(finished.blocker?.code).toBe("creative.provider_unavailable");

    const creative = creativeService.get(ORG_A, project.id)!;
    expect(creative.status).toBe("PROVIDER_UNAVAILABLE");
    expect(creative.productionResult?.generated).toBe(false);
    expect(creative.productionResult?.assets ?? []).toHaveLength(0);
  });

  it("completes only when a configured provider returns assets", async () => {
    setCreativeGenerationProvider(createTestCreativeProvider());
    seedProfile(ORG_A);
    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "ANIMATION",
      platform: "instagram_reels",
      customerRequest: "Animated promo",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    const { job } = await creativeService.requestProduction(ORG_A, project.id);
    const waiting = await operationsService.start(ORG_A, job.id, "op");
    const approval = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === waiting.approvalId)!;
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "op",
    });
    const finished = operationsService.get(ORG_A, job.id)!;
    expect(finished.status).toBe("COMPLETED");
    expect(finished.result?.externalEffect).toBe(true);

    const creative = creativeService.get(ORG_A, project.id)!;
    expect(creative.status).toBe("COMPLETED");
    expect(creative.productionResult?.generated).toBe(true);
    expect(creative.productionResult?.assets?.length).toBeGreaterThan(0);
  });

  it("enforces organization isolation", () => {
    seedProfile(ORG_A);
    seedProfile(ORG_B);
    const a = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "facebook",
      customerRequest: "Org A creative",
      customerId: "cust_a",
    });
    creativeService.createBrief({
      organizationId: ORG_B,
      creativeType: "IMAGE_AD",
      platform: "facebook",
      customerRequest: "Org B creative",
      customerId: "cust_b",
    });
    expect(creativeService.list(ORG_A).every((p) => p.organizationId === ORG_A)).toBe(
      true,
    );
    expect(creativeService.list(ORG_A).some((p) => p.id === a.id)).toBe(true);
    expect(creativeService.list(ORG_A).some((p) => p.customerId === "cust_b")).toBe(
      false,
    );
    expect(creativeService.get(ORG_B, a.id)).toBeUndefined();
  });

  it("rejects invalid status transitions", () => {
    expect(canTransitionCreativeStatus("COMPLETED", "RUNNING")).toBe(false);
    expect(canTransitionCreativeStatus("PLANNED", "READY_FOR_APPROVAL")).toBe(true);
  });

  it("persists creative projects in Agent OS v7 snapshot", () => {
    seedProfile(ORG_A);
    creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "SCRIPT",
      platform: "youtube",
      customerRequest: "Script only",
    });
    const snap = agentsStore.getSnapshot();
    expect(snap.version).toBe(7);
    expect(snap.creativeProjects.length).toBe(1);
  });

  it("does not weaken Phase 57 production gate matrix", () => {
    const result = evaluateFirstCustomerProductionGate({
      runtime: "production",
      nodeEnv: "production",
      authRequired: true,
      authMode: "server",
      crmPersistence: "database",
      agentOsPersistence: "server",
      emailProvider: "http",
      useMocks: false,
    });
    expect(result.ready).toBe(true);
  });
});
