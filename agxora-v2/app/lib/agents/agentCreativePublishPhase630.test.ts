/**
 * Phase 63.0 — creative publish orchestration adversarial + security tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryAgentsRepository } from "@/features/agents/repositories";
import { agentsStore, setAgentsRepository } from "@/features/agents/store";
import { creativeService } from "@/features/agents/creative/service";
import { canRequestPublish } from "@/features/agents/creative/capabilities";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject, CreativePublishResult } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import {
  publishCreativeForActor,
  setCreativePublishLoadStateForTests,
} from "@/app/lib/creative/publish";
import { authorizeCreativePublishFromState } from "@/app/lib/creative/authorizePublish";
import {
  createMemoryCreativeAssetStore,
  setCreativeAssetStoreForTests,
  buildDurableCreativeAssetUrl,
} from "@/app/lib/creative/assetStore";
import * as invokeSocialPublish from "@/app/lib/creative/invokeSocialPublish";
import { evaluateFirstCustomerProductionGate } from "@/app/lib/production/firstCustomerGate";
import { setPersistPublishResultForTests } from "@/app/lib/creative/persistPublishResult";
import { setPublishAttemptStoreForTests } from "@/app/lib/creative/publishIdempotency";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

function actorFor(organizationId: string): Actor {
  return {
    userId: "user_phase630",
    email: "phase630@example.com",
    name: "Phase 630",
    organizationId,
    workspaceId: "ws_phase630",
    membershipId: "mem_phase630",
    role: "OWNER",
    sessionToken: "session_phase630",
  };
}

function completedImageProject(
  organizationId: string,
  overrides: Partial<CreativeProject> = {},
): CreativeProject {
  const assetId = "casset_phase630_primary";
  const url = buildDurableCreativeAssetUrl("creative_phase630", assetId);
  return {
    id: "creative_phase630",
    organizationId,
    profileId: "profile_1",
    name: "Phase 63 Publish",
    creativeType: "IMAGE_AD",
    platform: "instagram_feed",
    status: "COMPLETED",
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
      customerRequest: "Publish test brief",
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
    productionResult: {
      available: true,
      generated: true,
      status: "completed",
      reason: "generated",
      providerId: "openai",
      assets: [
        {
          providerId: "openai",
          providerAssetId: assetId,
          url,
          mimeType: "image/jpeg",
          width: 512,
          height: 512,
        },
      ],
    },
    publishExecutionJobId: "publish_job_1",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    ...overrides,
  };
}

function publishState(
  organizationId: string,
  patch: {
    project?: Partial<CreativeProject>;
    job?: Partial<ExecutionJob>;
    approval?: Partial<AgentApproval>;
    socialAccountState?: "DISCONNECTED" | "CONNECTED";
  } = {},
): AgentsPersistedState {
  const project = completedImageProject(organizationId, patch.project);
  const approval: AgentApproval = {
    id: "publish_approval_1",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_publish_1",
    stepId: "step_1",
    toolId: "creative_publish",
    action: "creative_publish",
    reason: "External publish",
    state: "APPROVED",
    requestedAt: "2026-08-28T00:00:00.000Z",
    decidedAt: "2026-08-28T00:01:00.000Z",
    decidedBy: "op",
    ...patch.approval,
  };
  const job: ExecutionJob = {
    id: "publish_job_1",
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_publish",
    title: "Publish",
    status: patch.job?.status ?? "WAITING_FOR_APPROVAL",
    priority: "HIGH",
    requiresApproval: true,
    approvalId: approval.id,
    paused: false,
    queueSeq: 1,
    attempts: [],
    maxAttempts: 1,
    retryable: false,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    taskId: "task_publish_1",
    params: {
      creativeId: project.id,
      growthAction: "creative_publish",
    },
    ...patch.job,
  };
  return {
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
    socialAccounts: [
      {
        id: "sacc_1",
        organizationId,
        platform: "instagram",
        state: patch.socialAccountState ?? "DISCONNECTED",
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      },
    ],
    campaigns: [],
    growthProfiles: [],
    tasks: [],
    socialContent: [],
    websiteProjects: [],
    runtimes: [],
    executions: [],
    stepExecutions: [],
    memories: [],
    knowledge: [],
    plans: [],
    traces: [],
    messages: [],
    contexts: [],
    settings: [],
    toolInvocationCount24h: 0,
    growthStrategies: [],
    socialStrategies: [],
    socialCalendars: [],
    publishingJobs: [],
    growthInsights: [],
    executionAttempts: [],
    executionEvents: [],
    growthCrmLinks: [],
    campaignCrmSyncs: [],
    crmFollowUps: [],
  };
}

async function seedPrimaryAsset(organizationId: string, creativeProjectId: string) {
  const store = createMemoryCreativeAssetStore();
  setCreativeAssetStoreForTests(store);
  await store.put({
    organizationId,
    creativeProjectId,
    assetId: "casset_phase630_primary",
    mimeType: "image/jpeg",
    bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
    byteSize: 4,
    width: 512,
    height: 512,
    providerId: "openai",
    providerAssetId: "prov_1",
  });
}

describe("Phase 63.0 creative publish orchestration", () => {
  beforeEach(() => {
    agentsStore.clearMemory();
    setAgentsRepository(new MemoryAgentsRepository());
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setPersistPublishResultForTests(async (_actor, state) => state);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setCreativePublishLoadStateForTests(null);
    setCreativeAssetStoreForTests(null);
    setPublishAttemptStoreForTests(null);
    setPersistPublishResultForTests(null);
    vi.restoreAllMocks();
  });

  it("canRequestPublish is true only for COMPLETED creatives with durable assets", () => {
    const project = completedImageProject(ORG_A);
    expect(canRequestPublish(project)).toBe(true);
    expect(canRequestPublish({ ...project, status: "READY_FOR_APPROVAL" })).toBe(false);
  });

  it("rejects cross-org publish", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_B), {
        creativeProjectId: "creative_phase630",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
  });

  it("rejects publish without approval", async () => {
    const state = publishState(ORG_A, {
      approval: { state: "REQUIRES_APPROVAL" },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects missing publishExecutionJobId", async () => {
    const state = publishState(ORG_A, {
      project: { publishExecutionJobId: undefined },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects stale publishExecutionJobId", async () => {
    const state = publishState(ORG_A, {
      project: { publishExecutionJobId: "stale_job" },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects creative_generate approval for creative_publish", () => {
    const state = publishState(ORG_A);
    state.approvals[0] = { ...state.approvals[0]!, toolId: "creative_generate" };
    expect(() =>
      authorizeCreativePublishFromState(state, ORG_A, "creative_phase630"),
    ).toThrow(PersistenceError);
  });

  it("rejects non-COMPLETED creative", async () => {
    const state = publishState(ORG_A, {
      project: { status: "READY_FOR_APPROVAL" },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("rejects missing durable asset in store", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("rejects client assetId override mismatch", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
        assetId: "foreign_asset",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects client assetUrl override", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
        assetUrl: "https://evil.example/asset.jpg",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects client organizationId mismatch", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
        organizationId: ORG_B,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns honest unavailable for disconnected social account", async () => {
    const state = publishState(ORG_A, { socialAccountState: "DISCONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase630",
    });
    expect(result.publishResult.published).toBe(false);
    expect(result.publishResult.status).toBe("unavailable");
    expect(result.publishResult.reason).toBe("social_credential_missing");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns honest unavailable from default adapter when account is connected", async () => {
    const state = publishState(ORG_A, { socialAccountState: "CONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase630",
    });
    expect(result.publishResult.published).toBe(false);
    expect(result.publishResult.status).toBe("unavailable");
    expect(result.publishResult.available).toBe(false);
    expect(result.publishResult.reason).toBe("social_credential_missing");
  });

  it("does not call adapter on authorization failure", async () => {
    const state = publishState(ORG_A, {
      approval: { state: "REJECTED" },
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    await expect(
      publishCreativeForActor(actorFor(ORG_A), {
        creativeProjectId: "creative_phase630",
      }),
    ).rejects.toBeInstanceOf(PersistenceError);
    expect(spy).not.toHaveBeenCalled();
  });

  it("replays completed publish job idempotently", async () => {
    const prior: CreativePublishResult = {
      available: true,
      status: "published",
      published: true,
      reason: "published",
      platform: "instagram",
      contentType: "POST",
      externalId: "ext_1",
      executionJobId: "publish_job_1",
      publishedAt: "2026-08-28T00:05:00.000Z",
    };
    const state = publishState(ORG_A, {
      job: { status: "COMPLETED" },
      project: { publishResult: prior },
      socialAccountState: "CONNECTED",
    });
    setCreativePublishLoadStateForTests(async () => state);
    await seedPrimaryAsset(ORG_A, "creative_phase630");
    const spy = vi.spyOn(invokeSocialPublish, "invokeSocialAdapterForCreativePublish");
    const result = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase630",
    });
    expect(result.idempotentReplay).toBe(true);
    expect(result.publishResult).toEqual(prior);
    expect(spy).not.toHaveBeenCalled();
  });

  it("preserves productionResult when publish is unavailable", async () => {
    agentsStore.clearMemory();
    setAgentsRepository(new MemoryAgentsRepository());
    const project = completedImageProject(ORG_A);
    agentsStore.upsertCreativeProject(project);
    await seedPrimaryAsset(ORG_A, project.id);

    const state = publishState(ORG_A, { socialAccountState: "DISCONNECTED" });
    setCreativePublishLoadStateForTests(async () => state);

    const priorProduction = project.productionResult;
    const applied = await creativeService.runServerProviderPublish(
      ORG_A,
      project.id,
      project,
    );
    expect(applied.productionResult).toEqual(priorProduction);
    expect(applied.publishResult?.published).toBe(false);
    expect(applied.status).toBe("COMPLETED");
  });

  it("requestPublish enqueues creative_publish with publishExecutionJobId", async () => {
    agentsStore.clearMemory();
    setAgentsRepository(new MemoryAgentsRepository());
    const project = completedImageProject(ORG_A);
    agentsStore.upsertCreativeProject(project);
    const { job, project: queued } = await creativeService.requestPublish(
      ORG_A,
      project.id,
    );
    expect(job.toolId).toBe("creative_publish");
    expect(queued.publishExecutionJobId).toBe(job.id);
    expect(queued.executionJobId).toBeUndefined();
  });

  it("phase 57 production gate remains coherent", () => {
    const gate = evaluateFirstCustomerProductionGate({
      nodeEnv: "production",
      agxoraEnv: "production",
      authRequired: true,
      authMode: "server",
      crmPersistence: "database",
      agentOsPersistence: "server",
      emailProvider: "resend",
      useMocks: false,
    });
    expect(gate.ready).toBe(true);
  });
});

describe("Phase 63.0 regenerate after failed publish", () => {
  beforeEach(() => {
    agentsStore.clearMemory();
    setAgentsRepository(new MemoryAgentsRepository());
    setCreativeAssetStoreForTests(createMemoryCreativeAssetStore());
    setCreativePublishLoadStateForTests(null);
  });

  it("still allows regenerate queue after unavailable publish result", async () => {
    const project = completedImageProject(ORG_A, {
      publishResult: {
        available: false,
        status: "unavailable",
        published: false,
        reason: "social_account_disconnected",
      },
    });
    agentsStore.upsertCreativeProject(project);
    const { job } = await creativeService.requestRegenerateProduction(
      ORG_A,
      project.id,
    );
    expect(job.toolId).toBe("creative_generate");
    expect(job.params.regenerate).toBe(true);
  });
});
