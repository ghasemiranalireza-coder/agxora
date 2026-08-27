/**
 * Phase 59 / 59.1 — Real image creative generation + security hardening tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { emptyAgentsState } from "@/features/agents/repositories/state";
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
import {
  generateCreativeImageForActor,
  setCreativeGenerateLoadStateForTests,
} from "@/app/lib/creative/generate";
import {
  getServerCreativeImageProvider,
  setServerCreativeImageProviderForTests,
} from "@/app/lib/creative/serverProvider";
import {
  MAX_CREATIVE_ASSET_DATA_URL_CHARS,
  sanitizeAssetsForPersistence,
  validateCreativeAssetUrl,
} from "@/app/lib/creative/assets";
import { resolveTrustedOpenAIBaseUrl } from "@/app/lib/creative/config";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import {
  MemoryRateLimitStore,
  enforceRateLimit,
  resetRateLimitStore,
  setRateLimitStoreForTests,
} from "@/app/lib/security/rate-limit";

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

function actorFor(organizationId: string, userId = "user_phase59"): Actor {
  return {
    userId,
    email: "phase59@example.com",
    name: "Phase 59",
    organizationId,
    workspaceId: "ws_phase59",
    membershipId: "mem_phase59",
    role: "OWNER",
    sessionToken: "session_phase59",
  };
}

function baseProject(
  organizationId: string,
  overrides: Partial<CreativeProject> = {},
): CreativeProject {
  return {
    id: "creative_test_1",
    organizationId,
    profileId: "profile_1",
    name: "Spring image ad",
    creativeType: "IMAGE_AD",
    platform: "instagram_feed",
    status: "APPROVED",
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
      customerRequest: "TRUSTED_SERVER_BRIEF_PROMOTE_JACKETS",
    },
    concepts: [
      {
        id: "concept_1",
        title: "Trusted concept",
        hook: "hook",
        summary: "summary",
        angle: "angle",
      },
    ],
    productionPlan: {
      summary: "Image plan",
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      modality: "image",
      estimatedDurationSeconds: 0,
      aspectRatio: "1:1",
      requiresExternalGeneration: true,
      checklist: ["generate"],
    },
    approvalState: "APPROVED",
    executionJobId: "job_1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseApproval(
  organizationId: string,
  overrides: Partial<AgentApproval> = {},
): AgentApproval {
  return {
    id: "approval_1",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_1",
    stepId: "step_1",
    toolId: "creative_generate",
    action: "creative_generate",
    reason: "External generation",
    state: "APPROVED",
    requestedAt: "2026-01-01T00:00:00.000Z",
    decidedAt: "2026-01-01T00:01:00.000Z",
    decidedBy: "op",
    ...overrides,
  };
}

function baseJob(
  organizationId: string,
  overrides: Partial<ExecutionJob> = {},
): ExecutionJob {
  return {
    id: "job_1",
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_generate",
    title: "Generate",
    status: "WAITING_FOR_APPROVAL",
    priority: "HIGH",
    requiresApproval: true,
    approvalId: "approval_1",
    paused: false,
    queueSeq: 1,
    attempts: [],
    maxAttempts: 3,
    retryable: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    taskId: "task_1",
    params: { creativeId: "creative_test_1", growthAction: "creative_generate" },
    ...overrides,
  };
}

function stateWithAuthz(
  organizationId: string,
  options?: {
    readonly project?: CreativeProject;
    readonly approval?: AgentApproval;
    readonly job?: ExecutionJob;
    readonly omitApproval?: boolean;
    readonly omitProject?: boolean;
    readonly omitJob?: boolean;
  },
): AgentsPersistedState {
  const empty = emptyAgentsState();
  return {
    ...empty,
    creativeProjects: options?.omitProject
      ? []
      : [options?.project ?? baseProject(organizationId)],
    executionJobs: options?.omitJob
      ? []
      : [options?.job ?? baseJob(organizationId)],
    approvals: options?.omitApproval
      ? []
      : [options?.approval ?? baseApproval(organizationId)],
  };
}

beforeEach(() => {
  setAgentsRepository(new MemoryAgentsRepository());
  agentsStore.clearMemory();
  resetCreativeGenerationProvider();
  setServerCreativeImageProviderForTests(null);
  setCreativeGenerateLoadStateForTests(null);
  creativeService.clearPreviewAssetsForTests();
  delete process.env.AGXORA_CREATIVE_IMAGE_PROVIDER;
  delete process.env.AGXORA_OPENAI_API_KEY;
  process.env.AGXORA_RATE_LIMIT_ENABLED = "true";
  setRateLimitStoreForTests(new MemoryRateLimitStore(100));
});

afterEach(() => {
  resetCreativeGenerationProvider();
  setServerCreativeImageProviderForTests(null);
  setCreativeGenerateLoadStateForTests(null);
  creativeService.clearPreviewAssetsForTests();
  resetRateLimitStore();
  setRateLimitStoreForTests(null);
  vi.restoreAllMocks();
});

describe("Phase 59 creative image provider basics", () => {
  it("defaults provider id to none and maps aspect ratios", () => {
    expect(getCreativeImageProviderId(undefined)).toBe("none");
    expect(mapAspectRatioToOpenAISize("1:1")).toBe("1024x1024");
    expect(buildCreativeImagePrompt({
      organizationId: ORG_A,
      creativeProjectId: "c1",
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      modality: "image",
      aspectRatio: "1:1",
      durationSeconds: 0,
      language: "en",
      promptSummary: "Promote jackets",
      brief: baseProject(ORG_A).brief,
    })).toContain("Spring jacket");
  });

  it("only trusts the OpenAI API host for base URL", () => {
    expect(resolveTrustedOpenAIBaseUrl(undefined)).toBe(
      "https://api.openai.com/v1",
    );
    expect(resolveTrustedOpenAIBaseUrl("https://evil.example/v1")).toBe(
      "https://api.openai.com/v1",
    );
    expect(resolveTrustedOpenAIBaseUrl("http://api.openai.com/v1")).toBe(
      "https://api.openai.com/v1",
    );
  });
});

describe("Phase 59.1 asset bounds", () => {
  it("rejects oversized data URLs and strips them from persistence", () => {
    const huge = `data:image/jpeg;base64,${"A".repeat(MAX_CREATIVE_ASSET_DATA_URL_CHARS)}`;
    expect(validateCreativeAssetUrl(huge)).toBe("provider_asset_too_large");
    const sanitized = sanitizeAssetsForPersistence([
      {
        providerId: "openai",
        url: "data:image/jpeg;base64,abc",
        mimeType: "image/jpeg",
        width: 1024,
        height: 1024,
      },
    ]);
    expect(sanitized[0]?.url).toBeUndefined();
    expect(sanitized[0]?.mimeType).toBe("image/jpeg");
  });

  it("oversized provider output cannot enter persisted Agent OS state", async () => {
    const huge = `data:image/jpeg;base64,${"B".repeat(MAX_CREATIVE_ASSET_DATA_URL_CHARS + 10)}`;
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      async generate() {
        return {
          available: true,
          generated: true,
          status: "completed",
          reason: "generated",
          providerId: "openai",
          assets: [{ providerId: "openai", url: huge, mimeType: "image/jpeg" }],
        };
      },
    });
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      approvalState: "APPROVED",
    });
    expect(out.result.status).toBe("failed");
    expect(out.result.reason).toBe("provider_asset_too_large");
    expect(out.productionResult.assets).toEqual([]);
    expect(out.previewAssets ?? []).toEqual([]);
  });

  it("persists metadata for valid bounded assets without embedding data URLs", async () => {
    const small = `data:image/jpeg;base64,${Buffer.from("img").toString("base64")}`;
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      async generate() {
        return {
          available: true,
          generated: true,
          status: "completed",
          reason: "generated",
          providerId: "openai",
          assets: [
            {
              providerId: "openai",
              url: small,
              mimeType: "image/jpeg",
              width: 1024,
              height: 1024,
            },
          ],
        };
      },
    });
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
    });
    expect(out.result.generated).toBe(true);
    expect(out.previewAssets?.[0]?.url).toBe(small);
    expect(out.productionResult.assets?.[0]?.url).toBeUndefined();
    expect(out.productionResult.assets?.[0]?.mimeType).toBe("image/jpeg");
  });
});

describe("Phase 59.1 server approval + project binding", () => {
  it("forged client approvalState=APPROVED does not authorize without persisted approval", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, { omitApproval: true }),
    );

    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_test_1",
        approvalState: "APPROVED",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("missing approval → provider NOT called", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, { omitApproval: true }),
    );
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_test_1",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejected approval → provider NOT called", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, {
        approval: baseApproval(ORG_A, { state: "REJECTED" }),
      }),
    );
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_test_1",
        approvalState: "APPROVED",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("approval belonging to another organization → provider NOT called", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, {
        approval: baseApproval(ORG_B),
        job: baseJob(ORG_A, { approvalId: "approval_1" }),
      }),
    );
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_test_1",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("unknown creativeProjectId → provider NOT called", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_missing",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("creativeProjectId belonging to another org → provider NOT called", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    // Actor is ORG_A; state for ORG_A is empty of that foreign project.
    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, {
        project: baseProject(ORG_B),
        omitProject: false,
      }),
    );
    // filter: project org B won't match actor A in authorize
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_test_1",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("client prompt differing from persisted project uses trusted server brief", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));

    await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      approvalState: "APPROVED",
      request: {
        organizationId: ORG_A,
        creativeProjectId: "creative_test_1",
        creativeType: "IMAGE_AD",
        platform: "instagram_feed",
        modality: "image",
        aspectRatio: "1:1",
        durationSeconds: 0,
        language: "en",
        promptSummary: "CLIENT_FORGED_PROMPT_SHOULD_BE_IGNORED",
      } satisfies CreativeGenerationRequest,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0]?.[0] as CreativeGenerationRequest;
    expect(arg.promptSummary).toBe("TRUSTED_SERVER_BRIEF_PROMOTE_JACKETS");
    expect(arg.promptSummary).not.toContain("CLIENT_FORGED");
  });

  it("rejects client organizationId override before provider call", async () => {
    const provider = createTestCreativeProvider();
    const spy = vi.spyOn(provider, "generate");
    setServerCreativeImageProviderForTests(provider);
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_test_1",
        organizationId: ORG_B,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("unconfigured provider remains honestly unavailable after authz", async () => {
    process.env.AGXORA_CREATIVE_IMAGE_PROVIDER = "none";
    setServerCreativeImageProviderForTests(null);
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));
    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
    });
    expect(out.result.status).toBe("unavailable");
    expect(out.result.generated).toBe(false);
    expect(getServerCreativeImageProvider().configured).toBe(false);
  });
});

describe("Phase 59.1 rate limit", () => {
  it("rate limit exceeded → 429 path and provider would not be reached", async () => {
    process.env.AGXORA_RATE_LIMIT_AGENTS_CREATIVE_GENERATE_MAX = "2";
    const req = new Request("http://localhost/api/v1/agents/creative/generate", {
      method: "POST",
    });
    await enforceRateLimit({
      request: req,
      policyId: "agents.creative_generate",
      userId: "user_phase59",
    });
    await enforceRateLimit({
      request: req,
      policyId: "agents.creative_generate",
      userId: "user_phase59",
    });
    await expect(
      enforceRateLimit({
        request: req,
        policyId: "agents.creative_generate",
        userId: "user_phase59",
      }),
    ).rejects.toMatchObject({ code: "rate_limited", status: 429 });
    delete process.env.AGXORA_RATE_LIMIT_AGENTS_CREATIVE_GENERATE_MAX;
  });
});

describe("Phase 59 OpenAI provider honesty", () => {
  it("missing key / empty assets / HTTP failure stay fail-closed", async () => {
    const missing = createOpenAICreativeImageProvider({
      apiKey: "",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
    });
    expect((await missing.generate({
      organizationId: ORG_A,
      creativeProjectId: "c1",
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      modality: "image",
      aspectRatio: "1:1",
      durationSeconds: 0,
      language: "en",
      promptSummary: "x",
    })).status).toBe("unavailable");

    const emptyFetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{}] }), { status: 200 }),
    );
    const empty = createOpenAICreativeImageProvider({
      apiKey: "sk-test",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
      fetchImpl: emptyFetch as unknown as typeof fetch,
    });
    expect((await empty.generate({
      organizationId: ORG_A,
      creativeProjectId: "c1",
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      modality: "image",
      aspectRatio: "1:1",
      durationSeconds: 0,
      language: "en",
      promptSummary: "x",
    })).reason).toBe("provider_returned_no_assets");

    const failFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: { message: "boom sk-secret-should-redact" } }),
        { status: 500 },
      ),
    );
    const failed = createOpenAICreativeImageProvider({
      apiKey: "sk-secret-should-redact",
      model: "gpt-image-1",
      baseUrl: "https://api.openai.com/v1",
      fetchImpl: failFetch as unknown as typeof fetch,
    });
    const failResult = await failed.generate({
      organizationId: ORG_A,
      creativeProjectId: "c1",
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      modality: "image",
      aspectRatio: "1:1",
      durationSeconds: 0,
      language: "en",
      promptSummary: "x",
    });
    expect(failResult.status).toBe("failed");
    expect(failResult.reason).not.toContain("sk-secret-should-redact");
  });
});

describe("Phase 59 orchestration regressions", () => {
  it("approval rejection never calls a configured local provider", async () => {
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
    expect(creativeService.get(ORG_A, project.id)?.status).toBe("BLOCKED");
    expect(spy).not.toHaveBeenCalled();
  });

  it("configured local generation persists v7 metadata without secrets", async () => {
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
    expect(agentsStore.getSnapshot().version).toBe(7);
    expect(JSON.stringify(agentsStore.getSnapshot())).not.toMatch(/sk-/);
  });

  it("keeps org isolation and Phase 57 gate", () => {
    seedProfile(ORG_A);
    seedProfile(ORG_B);
    const a = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Org A",
    });
    expect(creativeService.get(ORG_B, a.id)).toBeUndefined();
    const gate = evaluateFirstCustomerProductionGate({
      runtime: "production",
      nodeEnv: "production",
      authRequired: true,
      authMode: "server",
      crmPersistence: "database",
      agentOsPersistence: "server",
      emailProvider: "http",
      useMocks: false,
    });
    expect(gate.ready).toBe(true);
  });
});
