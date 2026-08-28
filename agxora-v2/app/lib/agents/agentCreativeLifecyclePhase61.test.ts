/**
 * Phase 61 — IMAGE_AD production lifecycle completion tests.
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
} from "@/features/agents/creative/provider";
import {
  canRegenerateCompletedImage,
  canRequestPaidGeneration,
} from "@/features/agents/creative/capabilities";
import { canTransitionCreativeStatus } from "@/features/agents/creative/transitions";
import { operationsService } from "@/features/agents/execution/service";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";
import {
  generateCreativeImageForActor,
  setCreativeGenerateLoadStateForTests,
} from "@/app/lib/creative/generate";
import { setServerCreativeImageProviderForTests } from "@/app/lib/creative/serverProvider";
import {
  createMemoryCreativeAssetStore,
  getCreativeAssetStore,
  setCreativeAssetStoreForTests,
  parseDurableCreativeAssetUrl,
} from "@/app/lib/creative/assetStore";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import {
  fetchTrustedHttpsAsset,
  setTrustedHttpsAssetFetchForTests,
} from "@/app/lib/creative/httpsAssetFetch";

const ORG_A = "org_phase61_a";
const TRUSTED_HOST = "oaidalleapiprodscus.blob.core.windows.net";
const TRUSTED_URL = `https://${TRUSTED_HOST}/generated/test.png`;

function seedProfile(organizationId: string) {
  return growthService.saveProfile({
    organizationId,
    seedFromBusinessOs: false,
    draft: {
      companyName: "Phase 61 Co",
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

function actorFor(organizationId: string): Actor {
  return {
    userId: "user_phase61",
    email: "phase61@example.com",
    name: "Phase 61",
    organizationId,
    workspaceId: "ws_phase61",
    membershipId: "mem_phase61",
    role: "OWNER",
    sessionToken: "session_phase61",
  };
}

function tinyJpegDataUrl(label: string): string {
  const payload = Buffer.from(label).toString("base64");
  return `data:image/jpeg;base64,${payload}`;
}

function baseProject(
  organizationId: string,
  overrides: Partial<CreativeProject> = {},
): CreativeProject {
  return {
    id: "creative_phase61",
    organizationId,
    profileId: "profile_1",
    name: "Phase 61 IMAGE_AD",
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
    executionJobId: "job_1",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    ...overrides,
  };
}

function stateWithAuthz(
  organizationId: string,
  patch: {
    project?: Partial<CreativeProject>;
    job?: Partial<ExecutionJob>;
    regenerateJob?: boolean;
  } = {},
): AgentsPersistedState {
  const project = baseProject(organizationId, patch.project);
  const approval: AgentApproval = {
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
    requestedAt: "2026-08-28T00:00:00.000Z",
    decidedAt: "2026-08-28T00:01:00.000Z",
    decidedBy: "op",
  };
  const job: ExecutionJob = {
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
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    taskId: "task_1",
    params: {
      creativeId: project.id,
      growthAction: "creative_generate",
      ...(patch.regenerateJob ? { regenerate: true } : {}),
    },
    ...patch.job,
  };
  return {
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
    campaigns: [],
    growthProfiles: [],
    tasks: [],
    agents: [],
    socialContent: [],
    websiteProjects: [],
    crmLinks: [],
    leadActions: [],
    followUps: [],
  };
}

beforeEach(() => {
  setAgentsRepository(new MemoryAgentsRepository());
  agentsStore.clearMemory();
  resetCreativeGenerationProvider();
  setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
  setCreativeGenerateLoadStateForTests(null);
  setServerCreativeImageProviderForTests(null);
  setTrustedHttpsAssetFetchForTests(null);
});

afterEach(() => {
  resetCreativeGenerationProvider();
  setCreativeAssetStoreForTests(null);
  setCreativeGenerateLoadStateForTests(null);
  setServerCreativeImageProviderForTests(null);
  setTrustedHttpsAssetFetchForTests(null);
  vi.restoreAllMocks();
});

describe("Phase 61 IMAGE_AD lifecycle", () => {
  it("allows COMPLETED → READY_FOR_APPROVAL for explicit regenerate", () => {
    expect(canTransitionCreativeStatus("COMPLETED", "READY_FOR_APPROVAL")).toBe(true);
  });

  it("allows paid generation for VIDEO_AD when production plan modality is video (Phase 62)", async () => {
    seedProfile(ORG_A);
    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "VIDEO_AD",
      platform: "youtube_shorts",
      customerRequest: "Video ad",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    const planned = creativeService.get(ORG_A, project.id)!;
    expect(canRequestPaidGeneration(planned)).toBe(true);
    const { job } = await creativeService.requestProduction(ORG_A, project.id);
    expect(job.params.creativeId).toBe(planned.id);
  });

  it("blocks paid generation for ANIMATION on the server generate path", async () => {
    setServerCreativeImageProviderForTests({
      id: "openai",
      configured: true,
      modalities: ["image"],
      async health() {
        return { ok: true };
      },
      async generate() {
        throw new Error("provider must not be called");
      },
    });
    const animationProject = baseProject(ORG_A, {
      creativeType: "ANIMATION",
      productionPlan: {
        summary: "Animation",
        creativeType: "ANIMATION",
        platform: "instagram_reels",
        modality: "animation",
        estimatedDurationSeconds: 15,
        aspectRatio: "9:16",
        requiresExternalGeneration: true,
        checklist: [],
      },
    });
    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, { project: animationProject }),
    );

    const out = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: animationProject.id,
    });
    expect(out.result.reason).toBe("creative_paid_generation_unsupported");
    expect(out.result.generated).toBe(false);
  });

  it("queues regenerate with explicit flag and fresh approval job", async () => {
    setCreativeGenerationProvider(createTestCreativeProvider());
    seedProfile(ORG_A);
    const brief = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Image ad",
    });
    creativeService.prepareProductionPlan(ORG_A, brief.id);
    const { job: firstJob } = await creativeService.requestProduction(ORG_A, brief.id);
    const waiting = await operationsService.start(ORG_A, firstJob.id, "op");
    const approval = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === waiting.approvalId)!;
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "op",
    });
    const completed = creativeService.get(ORG_A, brief.id)!;
    expect(completed.status).toBe("COMPLETED");
    const durableUrl = `/api/v1/agents/creative/assets/${brief.id}/casset_regen_test`;
    agentsStore.upsertCreativeProject({
      ...completed,
      productionResult: {
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "test_creative",
        assets: [
          {
            providerId: "test_creative",
            url: durableUrl,
            mimeType: "image/png",
          },
        ],
      },
    });
    const eligible = creativeService.get(ORG_A, brief.id)!;
    expect(canRegenerateCompletedImage(eligible)).toBe(true);

    const { job: regenJob } = await creativeService.requestRegenerateProduction(
      ORG_A,
      brief.id,
    );
    expect(regenJob.params.regenerate).toBe(true);
    expect(regenJob.requiresApproval).toBe(true);
    const queued = creativeService.get(ORG_A, brief.id)!;
    expect(queued.status).toBe("READY_FOR_APPROVAL");
    expect(queued.productionResult?.generated).toBe(true);
    expect(queued.productionResult?.assets?.length).toBeGreaterThan(0);
  });

  it("requires regenerate ExecutionJob when durable asset exists", async () => {
    const generateSpy = vi.fn(async () => ({
      available: true,
      generated: true,
      status: "completed" as const,
      reason: "generated",
      providerId: "openai",
      assets: [
        {
          providerId: "openai",
          url: tinyJpegDataUrl("second"),
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
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));

    const first = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase61",
    });
    expect(first.result.generated).toBe(true);
    const durableUrl = first.productionResult.assets?.[0]?.url;
    expect(durableUrl).toBeTruthy();
    expect(generateSpy).toHaveBeenCalledTimes(1);

    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, {
        project: {
          status: "COMPLETED",
          executionJobId: "job_1",
          productionResult: first.productionResult,
        },
      }),
    );

    const blocked = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase61",
      regenerate: true,
    });
    expect(blocked.result.reason).toBe("creative_regenerate_job_required");
    expect(generateSpy).toHaveBeenCalledTimes(1);

    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, {
        regenerateJob: true,
        project: {
          status: "RUNNING",
          executionJobId: "job_1",
          productionResult: first.productionResult,
        },
      }),
    );

    const regen = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase61",
    });
    expect(regen.result.generated).toBe(true);
    expect(generateSpy).toHaveBeenCalledTimes(2);
    expect(regen.productionResult.assets?.[0]?.url).not.toBe(durableUrl);
  });

  it("preserves durable Agent OS URL when regenerate storage fails", async () => {
    const inner = createMemoryCreativeAssetStore();
    let putCalls = 0;
    setCreativeAssetStoreForTests({
      id: "memory",
      async put(input) {
        putCalls += 1;
        if (putCalls > 1) {
          throw new PersistenceError("persistence", "disk full");
        }
        return inner.put(input);
      },
      async get(input) {
        return inner.get(input);
      },
      async getPrimary(input) {
        return inner.getPrimary(input);
      },
      async deletePrimary(input) {
        await inner.deletePrimary(input);
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
    setCreativeGenerateLoadStateForTests(async () => stateWithAuthz(ORG_A));

    const first = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase61",
    });
    const durableUrl = first.productionResult.assets?.[0]?.url;
    expect(durableUrl).toBeTruthy();

    setCreativeGenerateLoadStateForTests(async () =>
      stateWithAuthz(ORG_A, {
        regenerateJob: true,
        project: {
          status: "COMPLETED",
          productionResult: first.productionResult,
        },
      }),
    );

    const failed = await generateCreativeImageForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase61",
    });
    expect(failed.result.generated).toBe(false);
    expect(failed.result.status).toBe("failed");
    expect(failed.productionResult.generated).toBe(true);
    expect(failed.productionResult.assets?.[0]?.url).toBe(durableUrl);

    const parsed = parseDurableCreativeAssetUrl(durableUrl!);
    expect(parsed).not.toBeNull();
    const preserved = await getCreativeAssetStore().get({
      organizationId: ORG_A,
      creativeProjectId: parsed!.creativeProjectId,
      assetId: parsed!.assetId,
    });
    expect(preserved?.bytes.byteLength).toBeGreaterThan(0);
  });

  it("preserves COMPLETED client state when regenerate fails via service", async () => {
    setCreativeGenerationProvider(createTestCreativeProvider());
    seedProfile(ORG_A);
    const project = creativeService.createBrief({
      organizationId: ORG_A,
      creativeType: "IMAGE_AD",
      platform: "instagram_feed",
      customerRequest: "Image ad",
    });
    creativeService.prepareProductionPlan(ORG_A, project.id);
    const { job: firstJob } = await creativeService.requestProduction(ORG_A, project.id);
    const waiting = await operationsService.start(ORG_A, firstJob.id, "op");
    const approval = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === waiting.approvalId)!;
    await growthService.resolveApproval({
      approvalId: approval.id,
      state: "APPROVED",
      decidedBy: "op",
    });
    const completed = creativeService.get(ORG_A, project.id)!;
    expect(completed.status).toBe("COMPLETED");
    const durableUrl = `/api/v1/agents/creative/assets/${project.id}/casset_keep_test`;
    agentsStore.upsertCreativeProject({
      ...completed,
      status: "COMPLETED",
      productionResult: {
        available: true,
        generated: true,
        status: "completed",
        reason: "generated",
        providerId: "test_creative",
        assets: [
          {
            providerId: "test_creative",
            url: durableUrl,
            mimeType: "image/png",
          },
        ],
      },
    });
    const previousUrl = durableUrl;

    setCreativeGenerationProvider(createTestCreativeProvider({ status: "failed" }));
    const { job: regenJob } = await creativeService.requestRegenerateProduction(
      ORG_A,
      project.id,
    );
    const regenWaiting = await operationsService.start(ORG_A, regenJob.id, "op");
    const regenApproval = agentsStore
      .getSnapshot()
      .approvals.find((item) => item.id === regenWaiting.approvalId)!;
    await growthService.resolveApproval({
      approvalId: regenApproval.id,
      state: "APPROVED",
      decidedBy: "op",
    });

    const after = creativeService.get(ORG_A, project.id)!;
    expect(after.status).toBe("COMPLETED");
    expect(after.productionResult?.generated).toBe(true);
    expect(after.productionResult?.assets?.[0]?.url).toBe(previousUrl);
  });

  it("rejects HTTPS redirect to untrusted host", async () => {
    setTrustedHttpsAssetFetchForTests(async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.example.com/image.png" },
      }),
    );

    await expect(fetchTrustedHttpsAsset(TRUSTED_URL)).rejects.toMatchObject({
      code: "validation",
      details: expect.arrayContaining([
        expect.objectContaining({ message: "provider_asset_url_not_trusted" }),
      ]),
    });
  });

  it("keeps Phase 57 production gate ready matrix", () => {
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
