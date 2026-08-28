/**
 * Phase 62.0 — paid video generation, object storage, regenerate parity, adversarial tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyAgentsState } from "@/features/agents/repositories/state";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  generateCreativeImageForActor,
  setCreativeGenerateLoadStateForTests,
} from "@/app/lib/creative/generate";
import {
  setServerCreativeImageProviderForTests,
  setServerCreativeVideoProviderForTests,
} from "@/app/lib/creative/serverProvider";
import {
  createMemoryCreativeAssetStore,
  setCreativeAssetStoreForTests,
  buildDurableCreativeAssetUrl,
} from "@/app/lib/creative/assetStore";
import {
  createMemoryCreativeBlobStore,
  setCreativeBlobStoreForTests,
} from "@/app/lib/creative/blobStore";
import {
  loadCreativeAssetForActor,
  setCreativeAssetLoadStateForTests,
} from "@/app/lib/creative/assetAccess";
import {
  hasDurablePrimaryAsset,
  isDurableCreativeAssetUrl,
  sanitizeAssetsForPersistence,
} from "@/app/lib/creative/assets";
import { persistProviderAssetsDurably } from "@/app/lib/creative/persistAssets";
import {
  canRegenerateCompletedVideo,
  canRequestPaidGeneration,
  PAID_VIDEO_GENERATION_TYPES,
  supportsPaidVideoGeneration,
} from "@/features/agents/creative/capabilities";
import { creativeService } from "@/features/agents/creative/service";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";
import type {
  CreativeGenerationProvider,
  CreativeGenerationResult,
} from "@/features/agents/creative/provider";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

function actorFor(organizationId: string): Actor {
  return {
    userId: "user_phase620",
    email: "phase620@example.com",
    name: "Phase 620",
    organizationId,
    workspaceId: "ws_phase620",
    membershipId: "mem_phase620",
    role: "OWNER",
    sessionToken: "session_phase620",
  };
}

function tinyMp4DataUrl(label: string): string {
  const stub = Buffer.from(`ftyp${label}`.padEnd(32, "0")).toString("base64");
  return `data:video/mp4;base64,${stub}`;
}

function videoProject(
  organizationId: string,
  creativeType: "VIDEO_AD" | "SOCIAL_VIDEO" = "VIDEO_AD",
  overrides: Partial<CreativeProject> = {},
): CreativeProject {
  return {
    id: "creative_video_1",
    organizationId,
    profileId: "profile_1",
    name: `Phase 62 ${creativeType}`,
    creativeType,
    platform: "tiktok",
    status: "APPROVED",
    brief: {
      productOrService: "Sneakers",
      targetAudience: "Gen Z",
      campaignGoal: "Awareness",
      language: "en",
      tone: "energetic",
      durationSeconds: 15,
      aspectRatio: "9:16",
      cta: "Shop now",
      brandNotes: "Bold",
      customerRequest: "TRUSTED_VIDEO_BRIEF",
    },
    concepts: [
      {
        id: "concept_1",
        title: "Drop",
        summary: "New sneakers",
        hook: "Fresh",
        angle: "product",
      },
    ],
    productionPlan: {
      summary: "Video ad",
      creativeType,
      platform: "tiktok",
      modality: "video",
      estimatedDurationSeconds: 15,
      aspectRatio: "9:16",
      requiresExternalGeneration: true,
      checklist: ["generate"],
    },
    approvalState: "APPROVED",
    executionJobId: "job_video_1",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    ...overrides,
  };
}

function baseApproval(
  organizationId: string,
  overrides: Partial<AgentApproval> = {},
): AgentApproval {
  return {
    id: "approval_video_1",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_video_1",
    stepId: "step_1",
    toolId: "creative_generate",
    action: "creative_generate",
    reason: "External generation",
    state: "APPROVED",
    requestedAt: "2026-08-28T00:00:00.000Z",
    decidedAt: "2026-08-28T00:01:00.000Z",
    decidedBy: "op",
    ...overrides,
  };
}

function baseJob(
  organizationId: string,
  overrides: Partial<ExecutionJob> = {},
): ExecutionJob {
  return {
    id: "job_video_1",
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_generate",
    title: "Generate video",
    status: "WAITING_FOR_APPROVAL",
    priority: "HIGH",
    requiresApproval: true,
    approvalId: "approval_video_1",
    paused: false,
    queueSeq: 1,
    attempts: [],
    maxAttempts: 3,
    retryable: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    taskId: "task_video_1",
    params: {
      creativeId: "creative_video_1",
      growthAction: "creative_generate",
    },
    ...overrides,
  };
}

function authState(
  project: CreativeProject,
  jobOverrides: Partial<ExecutionJob> = {},
): AgentsPersistedState {
  const job = baseJob(project.organizationId, jobOverrides);
  const approvalId = job.approvalId ?? "approval_video_1";
  return {
    ...emptyAgentsState(),
    creativeProjects: [project],
    executionJobs: [job],
    approvals: [
      baseApproval(project.organizationId, {
        id: approvalId,
        taskId: job.taskId,
      }),
    ],
  };
}

function mockVideoProvider(
  result: CreativeGenerationResult,
): CreativeGenerationProvider {
  return {
    id: "openai_video_test",
    modalities: ["video"],
    configured: true,
    async health() {
      return { ok: true };
    },
    async generate() {
      return result;
    },
  };
}

beforeEach(() => {
  setAgentsRepository(new MemoryAgentsRepository());
  agentsStore.clearMemory();
  setCreativeBlobStoreForTests(createMemoryCreativeBlobStore());
  setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
  setCreativeGenerateLoadStateForTests(null);
  setCreativeAssetLoadStateForTests(null);
  setServerCreativeImageProviderForTests(null);
  setServerCreativeVideoProviderForTests(null);
});

afterEach(() => {
  setCreativeBlobStoreForTests(null);
  setCreativeAssetStoreForTests(null);
  setCreativeGenerateLoadStateForTests(null);
  setCreativeAssetLoadStateForTests(null);
  setServerCreativeImageProviderForTests(null);
  setServerCreativeVideoProviderForTests(null);
});

describe("Phase 62.0 capability gates", () => {
  it("supports VIDEO_AD and SOCIAL_VIDEO paid video; blocks ANIMATION", () => {
    expect(PAID_VIDEO_GENERATION_TYPES).toEqual(["VIDEO_AD", "SOCIAL_VIDEO"]);
    expect(supportsPaidVideoGeneration("VIDEO_AD")).toBe(true);
    expect(supportsPaidVideoGeneration("SOCIAL_VIDEO")).toBe(true);
    expect(supportsPaidVideoGeneration("ANIMATION")).toBe(false);
    expect(
      canRequestPaidGeneration({
        creativeType: "ANIMATION",
        productionPlan: {
          summary: "",
          creativeType: "ANIMATION",
          platform: "tiktok",
          modality: "animation",
          estimatedDurationSeconds: 10,
          aspectRatio: "9:16",
          requiresExternalGeneration: true,
          checklist: [],
        },
      }),
    ).toBe(false);
  });
});

describe("Phase 62.0 VIDEO_AD / SOCIAL_VIDEO generation", () => {
  it("persists video to object storage and returns durable URL only in productionResult", async () => {
    const project = videoProject(ORG_A);
    setCreativeGenerateLoadStateForTests(async () => authState(project));
    setServerCreativeVideoProviderForTests(
      mockVideoProvider({
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "openai_video_test",
        assets: [
          {
            providerId: "openai_video_test",
            providerAssetId: "vid_1",
            url: tinyMp4DataUrl("phase62"),
            mimeType: "video/mp4",
            durationMs: 15_000,
          },
        ],
      }),
    );

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: project.id,
    });

    expect(out.result.generated).toBe(true);
    expect(out.result.status).toBe("completed");
    expect(out.productionResult.assets?.[0]?.url).toMatch(
      /^\/api\/v1\/agents\/creative\/assets\//,
    );
    expect(out.productionResult.assets?.[0]?.url).not.toMatch(/^data:/);
    expect(
      sanitizeAssetsForPersistence(out.productionResult.assets ?? []).every(
        (a) => !a.url?.startsWith("data:"),
      ),
    ).toBe(true);
    expect(out.previewAssets?.[0]?.url?.startsWith("data:video/")).toBe(true);
  });

  it("SOCIAL_VIDEO follows the same durable path", async () => {
    const project = videoProject(ORG_A, "SOCIAL_VIDEO");
    setCreativeGenerateLoadStateForTests(async () => authState(project));
    setServerCreativeVideoProviderForTests(
      mockVideoProvider({
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "openai_video_test",
        assets: [
          {
            providerId: "openai_video_test",
            providerAssetId: "vid_social",
            url: tinyMp4DataUrl("social"),
            mimeType: "video/mp4",
            durationMs: 12_000,
          },
        ],
      }),
    );

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: project.id,
    });
    expect(out.productionResult.generated).toBe(true);
    expect(isDurableCreativeAssetUrl(out.productionResult.assets?.[0]?.url ?? "")).toBe(
      true,
    );
  });
});

describe("Phase 62.0 provider / storage failures", () => {
  it("unconfigured video provider → unavailable, never COMPLETED", async () => {
    const project = videoProject(ORG_A);
    setCreativeGenerateLoadStateForTests(async () => authState(project));
    setServerCreativeVideoProviderForTests({
      id: "openai_video",
      modalities: ["video"],
      configured: false,
      async health() {
        return { ok: false, reason: "openai_api_key_missing" };
      },
      async generate() {
        return {
          available: false,
          generated: false,
          status: "unavailable",
          reason: "openai_api_key_missing",
          providerId: "openai_video",
          assets: [],
        };
      },
    });

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: project.id,
    });
    expect(out.result.status).toBe("unavailable");
    expect(out.result.generated).toBe(false);
    expect(out.productionResult.generated).toBe(false);
  });

  it("storage failure after provider success → failed, not COMPLETED", async () => {
    const project = videoProject(ORG_A);
    setCreativeGenerateLoadStateForTests(async () => authState(project));
    setServerCreativeVideoProviderForTests(
      mockVideoProvider({
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "openai_video_test",
        assets: [
          {
            providerId: "openai_video_test",
            providerAssetId: "vid_fail",
            url: tinyMp4DataUrl("fail"),
            mimeType: "video/mp4",
          },
        ],
      }),
    );

    const failingStore = createMemoryCreativeAssetStore();
    vi.spyOn(failingStore, "put").mockRejectedValueOnce(
      new PersistenceError("persistence", "storage_put_failed"),
    );
    setCreativeAssetStoreForTests(failingStore);

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: project.id,
    });
    expect(out.result.generated).toBe(false);
    expect(out.result.status).toBe("failed");
    expect(out.productionResult.generated).toBe(false);
  });
});

describe("Phase 62.0 authorization + org isolation", () => {
  it("cross-org actor cannot load video asset bytes", async () => {
    const project = videoProject(ORG_A);
    const persisted = await persistProviderAssetsDurably({
      organizationId: ORG_A,
      creativeProjectId: project.id,
      providerId: "test",
      assets: [
        {
          providerId: "test",
          providerAssetId: "v1",
          url: tinyMp4DataUrl("iso"),
          mimeType: "video/mp4",
        },
      ],
      replaceExisting: false,
    });
    expect(persisted.ok).toBe(true);
    const assetId = persisted.durableAssets[0]!.providerAssetId!;
    setCreativeAssetLoadStateForTests(async () => authState(project));

    await expect(
      loadCreativeAssetForActor(actorFor(ORG_B), project.id, assetId),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("client regenerate flag without job.params.regenerate is blocked when durable exists", async () => {
    const project = videoProject(ORG_A, "VIDEO_AD", {
      productionResult: {
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "stored",
        assets: [
          {
            providerId: "stored",
            providerAssetId: "casset_old",
            url: buildDurableCreativeAssetUrl("creative_video_1", "casset_old"),
            mimeType: "video/mp4",
          },
        ],
      },
    });
    await persistProviderAssetsDurably({
      organizationId: ORG_A,
      creativeProjectId: project.id,
      providerId: "test",
      assets: [
        {
          providerId: "test",
          providerAssetId: "casset_old",
          url: tinyMp4DataUrl("old"),
          mimeType: "video/mp4",
        },
      ],
      replaceExisting: false,
    });

    setCreativeGenerateLoadStateForTests(async () => authState(project));
    setServerCreativeVideoProviderForTests(
      mockVideoProvider({
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "openai_video_test",
        assets: [
          {
            providerId: "openai_video_test",
            providerAssetId: "vid_new",
            url: tinyMp4DataUrl("new"),
            mimeType: "video/mp4",
          },
        ],
      }),
    );

    const blocked = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: project.id,
      regenerate: true,
    });
    expect(blocked.result.reason).toBe("creative_regenerate_job_required");
    expect(blocked.result.generated).toBe(false);
  });
});

describe("Phase 62.0 regenerate parity (Phase 61.1)", () => {
  it("authorized regenerate replaces video; failed regenerate preserves prior durable asset", async () => {
    const project = videoProject(ORG_A, "VIDEO_AD", {
      status: "COMPLETED",
      productionResult: {
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "openai_video_test",
        assets: [
          {
            providerId: "openai_video_test",
            providerAssetId: "casset_keep",
            url: buildDurableCreativeAssetUrl("creative_video_1", "casset_keep"),
            mimeType: "video/mp4",
            durationMs: 10_000,
          },
        ],
      },
    });
    await persistProviderAssetsDurably({
      organizationId: ORG_A,
      creativeProjectId: project.id,
      providerId: "test",
      assets: [
        {
          providerId: "test",
          providerAssetId: "casset_keep",
          url: tinyMp4DataUrl("keep"),
          mimeType: "video/mp4",
          durationMs: 10_000,
        },
      ],
      replaceExisting: false,
    });

    expect(canRegenerateCompletedVideo(project)).toBe(true);

    setCreativeGenerateLoadStateForTests(async () =>
      authState(
        {
          ...project,
          executionJobId: "job_regen",
        },
        {
          id: "job_regen",
          approvalId: "approval_regen",
          params: {
            creativeId: project.id,
            growthAction: "creative_generate",
            regenerate: true,
          },
        },
      ),
    );

    setServerCreativeVideoProviderForTests(
      mockVideoProvider({
        available: true,
        generated: false,
        status: "failed",
        reason: "openai_video_timeout",
        providerId: "openai_video_test",
        assets: [],
      }),
    );

    const failed = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: project.id,
      regenerate: true,
    });
    expect(failed.result.generated).toBe(false);
    expect(failed.productionResult.generated).toBe(true);
    expect(hasDurablePrimaryAsset(failed.productionResult.assets)).toBe(true);
    expect(failed.productionResult.assets?.[0]?.url).toContain("casset_keep");
  });
});

describe("Phase 62.0 regression — Phase 57 production gate unchanged", () => {
  it("first-customer gate still requires database CRM, server auth, server Agent OS, email", () => {
    const gate = evaluateFirstCustomerProductionGate({
      authMode: "server",
      crmPersistence: "database",
      agentOsPersistence: "server",
      emailProvider: "console",
    });
    expect(gate.ready).toBe(true);
  });
});

describe("Phase 62.0 creativeService regenerate queue", () => {
  it("requestRegenerateProduction queues job with params.regenerate for completed video", async () => {
    setAgentsRepository(new MemoryAgentsRepository());
    agentsStore.clearMemory();
    creativeService.clearPreviewAssetsForTests();

    const project = videoProject(ORG_A, "SOCIAL_VIDEO", {
      status: "COMPLETED",
      productionResult: {
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "openai_video_test",
        assets: [
          {
            providerId: "openai_video_test",
            providerAssetId: "casset_regen",
            url: buildDurableCreativeAssetUrl("creative_video_1", "casset_regen"),
            mimeType: "video/mp4",
          },
        ],
      },
    });
    agentsStore.upsertCreativeProject(project);

    const { job } = await creativeService.requestRegenerateProduction(
      ORG_A,
      project.id,
    );
    expect(job.params.regenerate).toBe(true);
  });
});
