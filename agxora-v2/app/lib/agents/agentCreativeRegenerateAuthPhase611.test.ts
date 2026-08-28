/**
 * Phase 61.1 — adversarial regenerate authorization + store-authoritative durable policy.
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
import { authorizeCreativeGenerationFromState } from "@/app/lib/creative/authorize";
import { setServerCreativeImageProviderForTests } from "@/app/lib/creative/serverProvider";
import {
  createMemoryCreativeAssetStore,
  setCreativeAssetStoreForTests,
  buildDurableCreativeAssetUrl,
} from "@/app/lib/creative/assetStore";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { growthService } from "@/features/agents/growth/service";
import { creativeService } from "@/features/agents/creative/service";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

function actorFor(organizationId: string): Actor {
  return {
    userId: "user_phase611",
    email: "phase611@example.com",
    name: "Phase 611",
    organizationId,
    workspaceId: "ws_phase611",
    membershipId: "mem_phase611",
    role: "OWNER",
    sessionToken: "session_phase611",
  };
}

function tinyJpegDataUrl(label: string): string {
  return `data:image/jpeg;base64,${Buffer.from(label).toString("base64")}`;
}

function baseProject(
  organizationId: string,
  overrides: Partial<CreativeProject> = {},
): CreativeProject {
  return {
    id: "creative_test_1",
    organizationId,
    profileId: "profile_1",
    name: "Phase 611 IMAGE_AD",
    creativeType: "IMAGE_AD",
    platform: "instagram_feed",
    status: "APPROVED",
    brief: {
      productOrService: "Jackets",
      targetAudience: "Shoppers",
      campaignGoal: "Awareness",
      language: "en",
      tone: "friendly",
      durationSeconds: 0,
      aspectRatio: "1:1",
      cta: "Shop now",
      brandNotes: "Clean",
      customerRequest: "TRUSTED_SERVER_BRIEF",
    },
    concepts: [
      {
        id: "concept_1",
        title: "Spring",
        summary: "Spring jackets",
        hook: "New drop",
        angle: "product",
      },
    ],
    productionPlan: {
      summary: "Image ad",
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      modality: "image",
      estimatedDurationSeconds: 0,
      aspectRatio: "1:1",
      requiresExternalGeneration: true,
      checklist: ["generate"],
    },
    approvalState: "APPROVED",
    executionJobId: "job_initial",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    ...overrides,
  };
}

function baseApproval(
  organizationId: string,
  id: string,
  overrides: Partial<AgentApproval> = {},
): AgentApproval {
  return {
    id,
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: `task_${id}`,
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
  id: string,
  overrides: Partial<ExecutionJob> = {},
): ExecutionJob {
  return {
    id,
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_generate",
    title: "Generate",
    status: "WAITING_FOR_APPROVAL",
    priority: "HIGH",
    requiresApproval: true,
    approvalId: `approval_${id}`,
    paused: false,
    queueSeq: 1,
    attempts: [],
    maxAttempts: 3,
    retryable: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    taskId: `task_${id}`,
    params: {
      creativeId: "creative_test_1",
      growthAction: "creative_generate",
    },
    ...overrides,
  };
}

function authState(input: {
  organizationId?: string;
  project?: Partial<CreativeProject>;
  jobs?: ExecutionJob[];
  approvals?: AgentApproval[];
}): AgentsPersistedState {
  const organizationId = input.organizationId ?? ORG_A;
  const project = baseProject(organizationId, input.project);
  const initialJob = baseJob(organizationId, "job_initial", {
    approvalId: "approval_initial",
    params: {
      creativeId: project.id,
      growthAction: "creative_generate",
    },
  });
  const jobs = input.jobs ?? [initialJob];
  const approvals =
    input.approvals ??
    jobs.flatMap((job) => {
      const approvalId = job.approvalId ?? `approval_${job.id}`;
      return [
        baseApproval(organizationId, approvalId, {
          taskId: job.taskId,
        }),
      ];
    });
  return {
    ...emptyAgentsState(),
    creativeProjects: [project],
    executionJobs: jobs,
    approvals,
  };
}

beforeEach(() => {
  setAgentsRepository(new MemoryAgentsRepository());
  agentsStore.clearMemory();
  setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
  setCreativeGenerateLoadStateForTests(null);
  setServerCreativeImageProviderForTests(null);
});

afterEach(() => {
  setCreativeAssetStoreForTests(null);
  setCreativeGenerateLoadStateForTests(null);
  setServerCreativeImageProviderForTests(null);
  vi.restoreAllMocks();
});

describe("Phase 61.1 regenerate authorization", () => {
  it("rejects old initial-production job when store has durable asset (client regenerate=true)", async () => {
    const generateSpy = vi.fn(async () => ({
      available: true,
      generated: true,
      status: "completed" as const,
      reason: "generated",
      providerId: "openai",
      assets: [
        {
          providerId: "openai",
          url: tinyJpegDataUrl("should-not-run"),
          mimeType: "image/jpeg",
        },
      ],
    }));
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      generate: generateSpy,
    });

    setCreativeGenerateLoadStateForTests(async () =>
      authState({
        project: {
          status: "COMPLETED",
          executionJobId: "job_initial",
          productionResult: undefined,
        },
      }),
    );

    const store = createMemoryCreativeAssetStore();
    await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_test_1",
      assetId: "casset_existing",
      mimeType: "image/jpeg",
      bytes: new Uint8Array([1, 2, 3]),
      providerId: "openai",
    });
    setCreativeAssetStoreForTests(store);

    const blocked = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      regenerate: true,
    });
    expect(blocked.result.reason).toBe("creative_regenerate_job_required");
    expect(blocked.result.generated).toBe(false);
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("allows new APPROVED regenerate job with params.regenerate=true", async () => {
    const generateSpy = vi.fn(async () => ({
      available: true,
      generated: true,
      status: "completed" as const,
      reason: "generated",
      providerId: "openai",
      assets: [
        {
          providerId: "openai",
          url: tinyJpegDataUrl("replacement"),
          mimeType: "image/jpeg",
        },
      ],
    }));
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      generate: generateSpy,
    });

    const store = createMemoryCreativeAssetStore();
    await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_test_1",
      assetId: "casset_existing",
      mimeType: "image/jpeg",
      bytes: new Uint8Array([1, 2, 3]),
      providerId: "openai",
    });
    setCreativeAssetStoreForTests(store);

    const regenJob = baseJob(ORG_A, "job_regen", {
      approvalId: "approval_regen",
      params: {
        creativeId: "creative_test_1",
        growthAction: "creative_generate",
        regenerate: true,
      },
    });

    setCreativeGenerateLoadStateForTests(async () =>
      authState({
        project: {
          status: "READY_FOR_APPROVAL",
          executionJobId: "job_regen",
          productionResult: undefined,
        },
        jobs: [baseJob(ORG_A, "job_initial"), regenJob],
        approvals: [
          baseApproval(ORG_A, "approval_initial"),
          baseApproval(ORG_A, "approval_regen"),
        ],
      }),
    );

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      regenerate: false,
    });
    expect(out.result.generated).toBe(true);
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(out.productionResult.assets?.[0]?.url).toMatch(
      /^\/api\/v1\/agents\/creative\/assets\//,
    );
  });

  it("blocks generation when productionResult cleared but store still has primary asset", async () => {
    const generateSpy = vi.fn();
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      generate: generateSpy,
    });

    const store = createMemoryCreativeAssetStore();
    await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_test_1",
      assetId: "casset_existing",
      mimeType: "image/jpeg",
      bytes: new Uint8Array([9, 9, 9]),
    });
    setCreativeAssetStoreForTests(store);

    setCreativeGenerateLoadStateForTests(async () =>
      authState({
        project: {
          status: "READY_FOR_APPROVAL",
          executionJobId: "job_initial",
          productionResult: undefined,
        },
      }),
    );

    const blocked = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
    });
    expect(blocked.result.reason).toBe("creative_regenerate_job_required");
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("preserves store-backed durable URL when regenerate fails and Agent OS metadata was cleared", async () => {
    const store = createMemoryCreativeAssetStore();
    await store.put({
      organizationId: ORG_A,
      creativeProjectId: "creative_test_1",
      assetId: "casset_existing",
      mimeType: "image/jpeg",
      bytes: new Uint8Array([5, 6, 7]),
      providerId: "openai",
    });
    setCreativeAssetStoreForTests({
      id: "memory",
      async put() {
        throw new PersistenceError("persistence", "disk full");
      },
      async get(input) {
        return store.get(input);
      },
      async getPrimary(input) {
        return store.getPrimary(input);
      },
      async deletePrimary(input) {
        await store.deletePrimary(input);
      },
    });

    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      generate: vi.fn(async () => ({
        available: true,
        generated: true,
        status: "completed" as const,
        reason: "generated",
        providerId: "openai",
        assets: [
          {
            providerId: "openai",
            url: tinyJpegDataUrl("replacement"),
            mimeType: "image/jpeg",
          },
        ],
      })),
    });

    const regenJob = baseJob(ORG_A, "job_regen", {
      approvalId: "approval_regen",
      params: {
        creativeId: "creative_test_1",
        growthAction: "creative_generate",
        regenerate: true,
      },
    });

    setCreativeGenerateLoadStateForTests(async () =>
      authState({
        project: {
          status: "RUNNING",
          executionJobId: "job_regen",
          productionResult: undefined,
        },
        jobs: [baseJob(ORG_A, "job_initial"), regenJob],
        approvals: [
          baseApproval(ORG_A, "approval_initial"),
          baseApproval(ORG_A, "approval_regen"),
        ],
      }),
    );

    const failed = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_test_1",
      regenerate: true,
    });
    expect(failed.result.generated).toBe(false);
    expect(failed.productionResult.generated).toBe(true);
    expect(failed.productionResult.assets?.[0]?.url).toBe(
      buildDurableCreativeAssetUrl("creative_test_1", "casset_existing"),
    );
  });

  it("fail-closes when executionJobId is missing", () => {
    const state = authState({
      project: { executionJobId: undefined },
    });
    expect(() =>
      authorizeCreativeGenerationFromState(state, ORG_A, "creative_test_1"),
    ).toThrow(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({ message: "missing_bound_job" }),
        ]),
      }),
    );
  });

  it("fail-closes when executionJobId is stale (no latest-job fallback)", () => {
    const state = authState({
      project: { executionJobId: "job_missing" },
    });
    expect(() =>
      authorizeCreativeGenerationFromState(state, ORG_A, "creative_test_1"),
    ).toThrow(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({ message: "stale_bound_job" }),
        ]),
      }),
    );
  });

  it("rejects cross-org approval binding before provider call", async () => {
    const generateSpy = vi.fn();
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      generate: generateSpy,
    });
    setCreativeGenerateLoadStateForTests(async () =>
      authState({
        approvals: [baseApproval(ORG_B, "approval_initial")],
      }),
    );
    await expect(
      generateCreativeImageForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_test_1",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(generateSpy).not.toHaveBeenCalled();
  });
});

describe("Phase 61.1 prepareProductionPlan policy", () => {
  function seedProfile(organizationId: string) {
    growthService.saveProfile({
      organizationId,
      seedFromBusinessOs: false,
      draft: {
        companyName: "Acme",
        industry: "Retail",
        description: "Shops",
        services: ["Delivery"],
        products: ["Jackets"],
        targetAudience: "Shoppers",
        uniqueSellingProposition: "Warm",
        brandTone: "friendly",
        preferredPlatforms: ["instagram"],
      },
    });
  }

  it("prepareProductionPlan preserves Agent OS durable metadata on COMPLETED IMAGE_AD", () => {
    seedProfile(ORG_A);
    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Image ad",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    const durableUrl = `/api/v1/agents/creative/assets/${project.id}/casset_ui`;
    agentsStore.upsertCreativeProject({
      ...creativeService.get(ORG_A, project.id)!,
      status: "COMPLETED",
      productionResult: {
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "test",
        assets: [{ providerId: "test", url: durableUrl, mimeType: "image/png" }],
      },
    });
    const replanned = creativeService.prepareProductionPlan(ORG_A, project.id);
    expect(replanned.status).toBe("READY_FOR_APPROVAL");
    expect(replanned.productionResult?.assets?.[0]?.url).toBe(durableUrl);
  });
});
