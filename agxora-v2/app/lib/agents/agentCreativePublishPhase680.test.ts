/**
 * Phase 68.0 — async publish attempt TTL alignment & duplicate-upload prevention.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativeProject } from "@/features/agents/creative/types";
import type { AgentApproval } from "@/features/agents/types";
import type { ExecutionJob } from "@/features/agents/execution/jobs";
import type { Actor } from "@/app/lib/tenancy/types";
import {
  publishCreativeForActor,
  setCreativePublishLoadStateForTests,
} from "@/app/lib/creative/publish";
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
  acquireCreativePublishAttempt,
  completeCreativePublishAttempt,
  getCreativePublishAttemptByJobId,
  seedMemoryPublishAttemptForTests,
  setPublishAttemptStoreForTests,
} from "@/app/lib/creative/publishIdempotency";
import { setPersistPublishResultForTests } from "@/app/lib/creative/persistPublishResult";
import { upsertSocialCredentialForActor } from "@/app/lib/social/credentials";
import { setYouTubeResumableDepsForTests } from "@/app/lib/social/adapters/youtubeResumable";
import { setYouTubeUploadDepsForTests } from "@/app/lib/social/adapters/youtubePublish";
import {
  getYouTubeUploadSessionTtlMs,
  PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS,
} from "@/app/lib/social/config";
import { setYouTubeUploadSessionStoreForTests } from "@/app/lib/creative/youtubeUploadSession";
import * as agentsPersistence from "@/app/lib/agents/persistence";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASYNC_THRESHOLD = 12 * 1024 * 1024;
const JOB_ID = "publish_job_680";

function actorFor(organizationId: string, userId = USER_A): Actor {
  return {
    userId,
    email: "phase680@example.com",
    name: "Phase 680",
    organizationId,
    workspaceId: "ws_phase680",
    membershipId: "mem_phase680",
    role: "OWNER",
    sessionToken: "session_phase680",
  };
}

function youtubeVideoProject(organizationId: string): CreativeProject {
  const assetId = "casset_phase680_primary";
  const url = buildDurableCreativeAssetUrl("creative_phase680", assetId);
  return {
    id: "creative_phase680",
    organizationId,
    profileId: "profile_1",
    name: "Phase 68 YouTube",
    creativeType: "VIDEO_AD",
    platform: "youtube",
    status: "COMPLETED",
    brief: {
      productOrService: "Jackets",
      targetAudience: "Shoppers",
      campaignGoal: "Awareness",
      language: "en",
      tone: "friendly",
      durationSeconds: 15,
      aspectRatio: "16:9",
      cta: "Shop now",
      brandNotes: "Clean",
      customerRequest: "Publish video",
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
      summary: "Video ad",
      creativeType: "VIDEO_AD",
      platform: "youtube",
      modality: "video",
      estimatedDurationSeconds: 15,
      aspectRatio: "16:9",
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
          mimeType: "video/mp4",
          durationMs: 15000,
        },
      ],
    },
    publishExecutionJobId: JOB_ID,
    createdAt: "2026-08-30T00:00:00.000Z",
    updatedAt: "2026-08-30T00:00:00.000Z",
  };
}

function publishState(organizationId: string): AgentsPersistedState {
  const project = youtubeVideoProject(organizationId);
  const approval: AgentApproval = {
    id: "publish_approval_680",
    organizationId,
    agentInstanceId: "agent_1",
    executionId: "exec_1",
    taskId: "task_publish_680",
    stepId: "step_1",
    toolId: "creative_publish",
    action: "creative_publish",
    reason: "External publish",
    state: "APPROVED",
    requestedAt: "2026-08-30T00:00:00.000Z",
    decidedAt: "2026-08-30T00:01:00.000Z",
    decidedBy: "op",
  };
  const job: ExecutionJob = {
    id: JOB_ID,
    organizationId,
    agentId: "creative_producer",
    toolId: "creative_publish",
    title: "Publish",
    status: "WAITING_FOR_APPROVAL",
    priority: "HIGH",
    requiresApproval: true,
    approvalId: approval.id,
    paused: false,
    queueSeq: 1,
    attempts: [],
    maxAttempts: 1,
    retryable: false,
    createdAt: "2026-08-30T00:00:00.000Z",
    updatedAt: "2026-08-30T00:00:00.000Z",
    taskId: "task_publish_680",
    params: { creativeId: project.id, growthAction: "creative_publish" },
  };
  return {
    version: 7,
    creativeProjects: [project],
    approvals: [approval],
    executionJobs: [job],
    socialAccounts: [
      {
        id: "sacc_680",
        organizationId,
        platform: "youtube",
        state: "CONNECTED",
        createdAt: "2026-08-30T00:00:00.000Z",
        updatedAt: "2026-08-30T00:00:00.000Z",
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

function youtubeFetchMock(): typeof fetch {
  return vi.fn(async (url: string) => {
    if (url.includes("uploadType=resumable")) {
      return new Response(null, {
        status: 200,
        headers: { Location: "https://upload.example/resumable/phase680" },
      });
    }
    if (url.includes("oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "refreshed_token", expires_in: 3600 });
    }
    return new Response(null, { status: 308 });
  }) as typeof fetch;
}

async function seedLargeObjectS3Video(organizationId: string, creativeProjectId: string) {
  const blobStore = createMemoryCreativeBlobStore();
  setCreativeBlobStoreForTests(blobStore);
  const store = createMemoryCreativeAssetStore();
  setCreativeAssetStoreForTests(store);
  const bytes = new Uint8Array(ASYNC_THRESHOLD);
  bytes.fill(9);
  await store.put({
    organizationId,
    creativeProjectId,
    assetId: "casset_phase680_primary",
    mimeType: "video/mp4",
    bytes,
    durationMs: 15000,
    modality: "video",
    providerId: "openai",
    providerAssetId: "prov_680",
  });
}

async function seedYouTubeCredential(actor: Actor) {
  await upsertSocialCredentialForActor(actor, "youtube", {
    tokens: { accessToken: "yt_access_token", refreshToken: "yt_refresh" },
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    externalAccountId: "channel_680",
    externalAccountName: "Test Channel",
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
  });
}

describe("Phase 68.0 async attempt TTL alignment", () => {
  const persistedStates = new Map<string, AgentsPersistedState>();
  let resumableInitCount = 0;

  beforeEach(() => {
    vi.restoreAllMocks();
    persistedStates.clear();
    resumableInitCount = 0;
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setYouTubeUploadSessionStoreForTests(null);
    setYouTubeResumableDepsForTests(null);
    setYouTubeUploadDepsForTests(null);
    setPersistPublishResultForTests(async (actor, state) => {
      persistedStates.set(actor.organizationId, state);
      return state;
    });
    vi.spyOn(agentsPersistence, "getAgentOsStateForActor").mockImplementation(
      async (actor) => {
        const state = persistedStates.get(actor.organizationId);
        if (!state) throw new Error(`missing_state:${actor.organizationId}`);
        return state;
      },
    );
    vi.spyOn(agentsPersistence, "putAgentOsStateForActor").mockImplementation(
      async (actor, state) => {
        persistedStates.set(actor.organizationId, state);
        return state;
      },
    );
    process.env.AGXORA_YOUTUBE_PUBLISH_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_ENABLED = "true";
    process.env.AGXORA_YOUTUBE_ASYNC_UPLOAD_THRESHOLD_BYTES = String(ASYNC_THRESHOLD);
    process.env.AGXORA_SOCIAL_OAUTH_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.AGXORA_CREATIVE_BLOB_STORE = "memory";
    process.env.AGXORA_CREATIVE_ASSET_STORE = "memory";
    const fetchMock = youtubeFetchMock();
    setYouTubeResumableDepsForTests({
      fetch: vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("uploadType=resumable")) {
          resumableInitCount += 1;
        }
        return fetchMock(url, init);
      }),
      now: () => Date.now(),
    });
    setYouTubeUploadDepsForTests({
      fetch: fetchMock,
      now: () => Date.now(),
    });
  });

  afterEach(() => {
    setCreativePublishLoadStateForTests(null);
    setPublishAttemptStoreForTests(null);
    setYouTubeUploadSessionStoreForTests(null);
    setYouTubeResumableDepsForTests(null);
    setYouTubeUploadDepsForTests(null);
    setPersistPublishResultForTests(null);
  });

  it("extends attempt expiresAt to upload session TTL on async publish", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase680");
    await seedYouTubeCredential(actorFor(ORG_A));

    const before = Date.now();
    await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase680",
    });
    const attempt = await getCreativePublishAttemptByJobId(ORG_A, JOB_ID);
    expect(attempt?.status).toBe("uploading");

    const sessionTtlMs = getYouTubeUploadSessionTtlMs();
    const inFlightTtlMs = PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS;
    const expiresMs = attempt!.expiresAt.getTime() - before;
    expect(expiresMs).toBeGreaterThan(inFlightTtlMs);
    expect(expiresMs).toBeGreaterThanOrEqual(sessionTtlMs - 5_000);
    expect(expiresMs).toBeLessThanOrEqual(sessionTtlMs + 5_000);
  });

  it("replays uploading attempt with publishResult after in-flight TTL elapsed", async () => {
    setPublishAttemptStoreForTests(null);
    seedMemoryPublishAttemptForTests({
      organizationId: ORG_A,
      publishExecutionJobId: JOB_ID,
      creativeProjectId: "creative_phase680",
      status: "uploading",
      expiresAt: new Date(Date.now() - PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS),
      publishResult: {
        available: true,
        status: "uploading",
        published: false,
        reason: "youtube_upload_in_progress",
        executionJobId: JOB_ID,
      },
    });

    const result = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: JOB_ID,
      creativeProjectId: "creative_phase680",
      assetId: "casset_phase680_primary",
      platform: "youtube",
    });
    expect(result.kind).toBe("replay");
    if (result.kind === "replay") {
      expect(result.publishResult.status).toBe("uploading");
    }
  });

  it("requires new job for expired uploading attempt without publishResult", async () => {
    setPublishAttemptStoreForTests(null);
    seedMemoryPublishAttemptForTests({
      organizationId: ORG_A,
      publishExecutionJobId: JOB_ID,
      status: "uploading",
      expiresAt: new Date(Date.now() - 60_000),
    });

    const result = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: JOB_ID,
      creativeProjectId: "creative_phase680",
      assetId: "casset_phase680_primary",
      platform: "youtube",
    });
    expect(result).toEqual({
      kind: "requires_new_job",
      reason: "uploading_without_result_expired",
    });
  });

  it("does not re-init YouTube resumable upload on duplicate async publish POST", async () => {
    const state = publishState(ORG_A);
    setCreativePublishLoadStateForTests(async () => state);
    persistedStates.set(ORG_A, state);
    await seedLargeObjectS3Video(ORG_A, "creative_phase680");
    await seedYouTubeCredential(actorFor(ORG_A));

    const first = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase680",
    });
    expect(first.publishResult.status).toBe("uploading");
    expect(resumableInitCount).toBe(1);

    const second = await publishCreativeForActor(actorFor(ORG_A), {
      creativeProjectId: "creative_phase680",
    });
    expect(second.publishResult.status).toBe("uploading");
    expect(resumableInitCount).toBe(1);
  });

  it("completeCreativePublishAttempt(uploading) defaults expiresAt to session TTL", async () => {
    setPublishAttemptStoreForTests(null);
    const acquired = await acquireCreativePublishAttempt({
      organizationId: ORG_A,
      publishExecutionJobId: "publish_job_complete_ttl",
      creativeProjectId: "creative_phase680",
      assetId: "casset_phase680_primary",
      platform: "youtube",
    });
    expect(acquired.kind).toBe("acquired");
    if (acquired.kind !== "acquired") return;

    const before = Date.now();
    await completeCreativePublishAttempt({
      attemptId: acquired.attemptId,
      organizationId: ORG_A,
      status: "uploading",
      publishResult: {
        available: true,
        status: "uploading",
        published: false,
        reason: "youtube_upload_in_progress",
        executionJobId: "publish_job_complete_ttl",
      },
    });

    const attempt = await getCreativePublishAttemptByJobId(
      ORG_A,
      "publish_job_complete_ttl",
    );
    const expiresMs = attempt!.expiresAt.getTime() - before;
    expect(expiresMs).toBeGreaterThan(PUBLISH_ATTEMPT_IN_FLIGHT_TTL_MS);
    expect(expiresMs).toBeGreaterThanOrEqual(getYouTubeUploadSessionTtlMs() - 5_000);
  });
});
