/**
 * Phase 59 — Real image creative generation provider tests.
 * External OpenAI HTTP is mocked; no secrets required in CI.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { growthService } from "@/features/agents/growth/service";
import { creativeService } from "@/features/agents/creative/service";
import {
  createTestCreativeProvider,
  resetCreativeGenerationProvider,
  setCreativeGenerationProvider,
  type CreativeGenerationRequest,
} from "@/features/agents/creative/provider";
import { operationsService } from "@/features/agents/execution/service";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";
import { createOpenAICreativeImageProvider } from "@/app/lib/creative/openaiImages";
import {
  buildCreativeImagePrompt,
  mapAspectRatioToOpenAISize,
} from "@/app/lib/creative/prompt";
import { getCreativeImageProviderId } from "@/app/lib/creative/providerId";
import { generateCreativeImageForActor } from "@/app/lib/creative/generate";
import {
  getServerCreativeImageProvider,
  setServerCreativeImageProviderForTests,
} from "@/app/lib/creative/serverProvider";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";

const ORG_A = "org_phase59_a";
const ORG_B = "org_phase59_b";

function seedProfile(organizationId: string) {
  return growthService.saveProfile({
    organizationId,
    seedFromBusinessOs: false,
    draft: {
      companyName: "Phase 59 Co",
      industry: "Retail",
      description: "Handmade goods",
      services: ["Online shop"],
      products: ["Jackets"],
      targetAudience: "Online shoppers",
      uniqueSellingProposition: "Spring collection",
      brandTone: "friendly",
      preferredPlatforms: ["instagram"],
    },
  });
}

function baseRequest(
  overrides: Partial<CreativeGenerationRequest> = {},
): CreativeGenerationRequest {
  return {
    organizationId: ORG_A,
    creativeProjectId: "creative_test_1",
    creativeType: "IMAGE_AD",
    platform: "instagram_feed",
    modality: "image",
    aspectRatio: "1:1",
    durationSeconds: 0,
    language: "en",
    promptSummary: "Promote our spring jacket collection",
    ...overrides,
  };
}

function actorFor(organizationId: string): Actor {
  return {
    userId: "user_phase59",
    email: "phase59@example.com",
    name: "Phase 59",
    organizationId,
    workspaceId: "ws_phase59",
    membershipId: "mem_phase59",
    role: "OWNER",
    sessionToken: "session_phase59",
  };
}

beforeEach(() => {
  setAgentsRepository(new MemoryAgentsRepository());
  agentsStore.clearMemory();
  resetCreativeGenerationProvider();
  setServerCreativeImageProviderForTests(null);
  delete process.env.AGXORA_CREATIVE_IMAGE_PROVIDER;
  delete process.env.AGXORA_OPENAI_API_KEY;
});

afterEach(() => {
  resetCreativeGenerationProvider();
  setServerCreativeImageProviderForTests(null);
  vi.restoreAllMocks();
});

describe("Phase 59 creative image provider id/config", () => {
  it("defaults to none when unset", () => {
    expect(getCreativeImageProviderId(undefined)).toBe("none");
    expect(getCreativeImageProviderId("")).toBe("none");
    expect(getCreativeImageProviderId("openai")).toBe("openai");
  });

  it("maps aspect ratios to OpenAI sizes", () => {
    expect(mapAspectRatioToOpenAISize("1:1")).toBe("1024x1024");
    expect(mapAspectRatioToOpenAISize("9:16")).toBe("1024x1536");
    expect(mapAspectRatioToOpenAISize("16:9")).toBe("1536x1024");
  });

  it("builds a non-empty prompt from brief/request fields", () => {
    const prompt = buildCreativeImagePrompt({
      ...baseRequest(),
      brief: {
        productOrService: "Spring jacket",
        targetAudience: "Shoppers",
        campaignGoal: "Awareness",
        language: "en",
        tone: "warm",
        durationSeconds: 0,
        aspectRatio: "1:1",
        cta: "Shop now",
        brandNotes: "Earth tones",
        customerRequest: "Promote spring jackets",
      },
    });
    expect(prompt).toContain("Spring jacket");
    expect(prompt).toContain("Shop now");
    expect(prompt.length).toBeGreaterThan(40);
  });
});

describe("Phase 59 OpenAI image provider honesty", () => {
  it("is unavailable when API key is missing", async () => {
    const provider = createOpenAICreativeImageProvider({
      apiKey: "",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
    });
    expect(provider.configured).toBe(false);
    const result = await provider.generate(baseRequest());
    expect(result.status).toBe("unavailable");
    expect(result.generated).toBe(false);
    expect(result.assets).toEqual([]);
  });

  it("fails closed for non-IMAGE_AD modalities", async () => {
    const provider = createOpenAICreativeImageProvider({
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
      fetchImpl: vi.fn(),
    });
    const result = await provider.generate(
      baseRequest({ creativeType: "VIDEO_AD", modality: "video" }),
    );
    expect(result.status).toBe("failed");
    expect(result.reason).toBe("phase59_image_ad_only");
    expect(result.generated).toBe(false);
    expect(result.assets).toEqual([]);
  });

  it("returns generated=true only with usable asset URL from mocked HTTP", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            { b64_json: Buffer.from("fake-image-bytes").toString("base64") },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = createOpenAICreativeImageProvider({
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.generate(baseRequest());
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("completed");
    expect(result.generated).toBe(true);
    expect(result.assets[0]?.url?.startsWith("data:image/jpeg;base64,")).toBe(
      true,
    );
  });

  it("fails when provider response has no asset URL/b64", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{}] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = createOpenAICreativeImageProvider({
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await provider.generate(baseRequest());
    expect(result.status).toBe("failed");
    expect(result.generated).toBe(false);
    expect(result.reason).toBe("provider_returned_no_assets");
    expect(result.assets).toEqual([]);
  });

  it("returns truthful failure on HTTP errors without leaking secrets", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: { message: "Invalid auth sk-secret-should-redact value" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = createOpenAICreativeImageProvider({
      apiKey: "sk-secret-should-redact",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await provider.generate(baseRequest());
    expect(result.status).toBe("failed");
    expect(result.generated).toBe(false);
    expect(result.reason).not.toContain("sk-secret-should-redact");
  });
});

describe("Phase 59 server generation boundary", () => {
  it("rejects unapproved generation before provider call", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);

    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_1",
        approvalState: "REQUIRES_APPROVAL",
        request: baseRequest(),
      }),
    ).rejects.toBeInstanceOf(PersistenceError);

    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects client organizationId override", async () => {
    setServerCreativeImageProviderForTests(createTestCreativeProvider());
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_1",
        organizationId: ORG_B,
        approvalState: "APPROVED",
        request: baseRequest({ organizationId: ORG_B }),
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("forces actor organization on successful generation", async () => {
    setServerCreativeImageProviderForTests(createTestCreativeProvider());
    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      approvalState: "APPROVED",
      request: baseRequest({ organizationId: ORG_A }),
    });
    expect(out.organizationId).toBe(ORG_A);
    expect(out.result.generated).toBe(true);
    expect(out.productionResult.assets?.length).toBeGreaterThan(0);
    expect(JSON.stringify(out)).not.toMatch(/sk-/);
  });

  it("stays unavailable when server provider is not configured", async () => {
    process.env.AGXORA_CREATIVE_IMAGE_PROVIDER = "none";
    setServerCreativeImageProviderForTests(null);
    const provider = getServerCreativeImageProvider();
    expect(provider.configured).toBe(false);

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      approvalState: "APPROVED",
      request: baseRequest(),
    });
    expect(out.result.status).toBe("unavailable");
    expect(out.result.generated).toBe(false);
    expect(out.productionResult.assets).toEqual([]);
  });

  it("treats openai without API key as unavailable", async () => {
    process.env.AGXORA_CREATIVE_IMAGE_PROVIDER = "openai";
    delete process.env.AGXORA_OPENAI_API_KEY;
    setServerCreativeImageProviderForTests(null);
    const provider = getServerCreativeImageProvider();
    expect(provider.id).toBe("openai");
    expect(provider.configured).toBe(false);
  });
});

describe("Phase 59 creative orchestration + persistence", () => {
  it("approval rejection never calls a configured provider", async () => {
    seedProfile(ORG_A);
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setCreativeGenerationProvider(provider);

    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Image ad for spring jackets",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    const { job } = await creativeService.requestProduction(ORG_A, project.id);
    const started = await operationsService.start(ORG_A, job.id, "op");
    const approval = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === started.approvalId)!;

    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "REJECTED",
      decidedBy: "op",
    });

    const creative = creativeService.get(ORG_A, project.id);
    expect(creative?.status).toBe("BLOCKED");
    expect(creative?.productionResult?.generated).not.toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("persists generated metadata in Agent OS v7 without secrets", async () => {
    seedProfile(ORG_A);
    setCreativeGenerationProvider(createTestCreativeProvider());

    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Image ad for spring jackets",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    creativeService.markApproved(ORG_A, project.id);
    const completed = await creativeService.runProviderGeneration(
      ORG_A,
      project.id,
    );

    expect(completed.status).toBe("COMPLETED");
    expect(completed.productionResult?.generated).toBe(true);
    expect(completed.productionResult?.assets?.[0]?.url).toBeTruthy();

    const snapshot = agentsStore.getSnapshot();
    expect(snapshot.version).toBe(7);
    expect(
      snapshot.creativeProjects.some((item) => item.id === project.id),
    ).toBe(true);
    expect(JSON.stringify(snapshot)).not.toMatch(/sk-/);
  });

  it("keeps org isolation for creative projects", () => {
    seedProfile(ORG_A);
    seedProfile(ORG_B);
    const a = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Org A creative",
    });
    creativeService.createBrief({
      organizationId: ORG_B,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Org B creative",
    });
    expect(
      creativeService.list(ORG_A).every((item) => item.organizationId === ORG_A),
    ).toBe(true);
    expect(creativeService.get(ORG_B, a.id)).toBeUndefined();
  });

  it("does not weaken Phase 57 production gate", () => {
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
    expect(result.enforced).toBe(true);
    expect(result.ready).toBe(true);
  });
});
